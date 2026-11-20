// The English tower's content (the first duel's board, ADR 0002): two TowerContents, so that the tower keeps one round
// path (DuelController.makeRound → content.makeRound). The placement tower of the first English run (design Part 4): its
// rounds ask what the walk (./placement.ts) asks next, read from the English save; its answers are walked and saved at
// once (`placementAnswer`), so a pause or a reload goes on where it was. And the English tower's own letter and word
// rounds (design Part 5, `englishTower`): a picture or a sound and four letter runes, a nonsense name and three word
// runes, and from stage 6 a picture and three word runes.
import type { TowerContent } from '../../utils/duel/content'
import type { BlendPlan } from '../../duel2/course/types'
import type { MakeRoundOpts } from '../../utils/duel/rounds'
import { bossFor, newMonsterAt, unlockedMonsters, walkMs } from '../../utils/duel/rules'
import type { Choice, DuelMark, Round, TowerRune } from '../../types/duel'
import { pickTarget, type ScreenId } from '../../duel2/logic/predict'
import { shuffle, type Choice as RunChoice, type RoundCtx } from '../../duel2/logic/rounds'
import { NEW_SHARE } from '../../duel2/logic/stages'
import { PLACEMENT_ROUNDS, type PlacementText } from '../content/placementRounds'
import { UNITS, unit, type Unit, type UnitKind } from '../content/units'
import { heartVoice, nonsenseVoice, soundVoice, wordVoice } from '../content/voiceIds'
import { WORDS, word, type EnWord } from '../content/words'
import type { EnglishSave, IntroState, PlacementSave } from '../saveFormat'
import type { Tally } from '../../shared/adaptive'
import { introAfter } from './intro'
import { enFeatures, enPrior, pickUnit, unitChoice } from './pick'
import { askOf, creditOf, seedAfterPlacement, startPlacement, stepPlacement, type PlacementState } from './placement'

type PlacementRound = (typeof PLACEMENT_ROUNDS)[number]
type Kind = 'picture' | 'name'

/** what the placement reads and writes of the English save (EnglishSavePort's part) */
export interface PlacementPort {
  read(): Readonly<Pick<EnglishSave, 'placement' | 'tallies'>>
  setPlacement(p: PlacementSave): void
  setStage(stage: number): void
  seedTallies(t: Record<string, Tally>): void
  openStations(ids: ScreenId[]): void
}

/** the placement is due: asked again by the parent, running, or never done (Task 6's rule) */
export const placementDue = (p: PlacementSave): boolean => p.requested || p.state !== null || p.done === null

/** the walk as it is now: the saved one, or a new one (nothing is saved before his first answer) */
const current = (p: PlacementSave, ready: number[]): PlacementState => p.state ?? startPlacement(ready).state

/** the rune count of the placement (spec Part 4: three word runes) */
const RUNES = 3

/**
 * Every placement round's walk (the duel's walkOverride: the tower's pace never adapts during the check): the first
 * wave's walk. The placement measures his reading, not his speed (my call); a monster that reaches the tower is a miss,
 * which costs nothing here.
 */
export const PLACEMENT_WALK_MS = walkMs(1, false)

const voiceOf = (id: string): string => {
  const w = word(id)
  return w.kind === 'heart' ? heartVoice(w.text) : w.kind === 'nonsense' ? nonsenseVoice(w.text) : wordVoice(w.text)
}

/**
 * a picture round needs its target's picture and its file (a picture dropped in review, or not made yet, leaves the round
 * out: a word without a picture is used only in rounds without pictures)
 */
const usable = (r: PlacementRound, picture: PictureOf) => {
  const key = word(r.target).picture
  return r.kind === 'name' || (!!key && !!picture(key))
}
/** a picture's file when none is given: its key (every picture counts as there) */
const keyAsFile: PictureOf = (k) => k

/**
 * The round of `stage` and `kind` he has seen least (`seen`: the tower's tallies, by target); at random among those.
 * When the rounds of `kind` have all been asked more than one of the other kind (stage 1 has two picture rounds), the
 * other kind's round instead: the walk alternates the kinds, the content does not always have enough of one.
 */
export function choosePlacementRound(
  stage: number, kind: Kind, seen: (target: string) => number, rng: () => number, picture: PictureOf = keyAsFile,
): PlacementRound {
  const ofStage = PLACEMENT_ROUNDS.filter((r) => r.stage === stage && usable(r, picture))
  if (!ofStage.length) throw new Error(`no placement round at stage ${stage}`)
  const least = (rs: PlacementRound[]) => Math.min(...rs.map((r) => seen(r.target)))
  const own = ofStage.filter((r) => r.kind === kind)
  const other = ofStage.filter((r) => r.kind !== kind)
  const pool = !own.length || (other.length && least(other) < least(own)) ? other : own
  const min = least(pool)
  const cands = pool.filter((r) => seen(r.target) === min)
  return cands[Math.floor(rng() * cands.length) % cands.length]
}


const textOf = (x: string | PlacementText) => (typeof x === 'string' ? word(x).text : x.text)
const mark = (id: string, text: string): DuelMark => ({ id, name: text, group: 'a' })

/** a placement round as the duel plays it: a picture round is screen A (it walks at once), a name round screen C (said first) */
function placementRound(o: MakeRoundOpts, pr: PlacementRound, picture: PictureOf): Round {
  const words = shuffle(o.rng, [pr.target, ...pr.others].slice(0, RUNES).map((x) => ({ id: textOf(x), text: textOf(x) })))
  const runes = words.map((w) => mark(w.id, w.text))
  const runeTexts: TowerRune[] = words.map((w) => ({ id: w.id, text: w.text, alphabet: 'latin' }))
  const target = word(pr.target)
  const unlocked = unlockedMonsters(o.wave)
  return {
    id: o.id, type: pr.kind === 'picture' ? 'A' : 'C', target: mark(target.id, target.text),
    runes, runeTexts, word: { key: target.id, group: 'a', he: '' }, padWords: [],
    ...(pr.kind === 'picture' ? { picture: picture(target.picture!) } : {}),
    // right after "a new monster!" comes that monster
    monster: (o.kills === 0 && newMonsterAt(o.wave)) || unlocked[Math.floor(o.rng() * unlocked.length) % unlocked.length],
    boss: false,
    // (the duel's walkOverride sets every round's walk: PLACEMENT_WALK_MS)
    walkMs: PLACEMENT_WALK_MS,
  }
}

/**
 * The placement tower over his save: each round asks the walk's next stage and kind. No hint, no twin. `picture`: the
 * file of a word's picture (the course gives assets/images' `wordPicture`).
 */
export function placementTower(save: PlacementPort, ready: number[], picture: PictureOf = keyAsFile): TowerContent {
  return {
    makeRound(o) {
      const ask = askOf(current(save.read().placement, ready))
      const pr = choosePlacementRound(ask.stage, ask.kind, (t) => o.lifetime[t]?.seen ?? 0, o.rng, picture)
      return placementRound(o, pr, picture)
    },
    isCorrect: (r, c: Choice) => c.kind === 'rune' && c.mark.id === r.target.id,
    isTwin: () => false,
    // a name round: the wizard says the monster's name; a picture round: the picture is the question
    questionParts: (r) => (r.type === 'C' ? [voiceOf(r.target.id)] : []),
    // after the tap (right or wrong), the wizard says the right word
    feedbackParts: (r) => [voiceOf(r.target.id)],
    howLine: (r) => (r.type === 'C' ? { id: 'line-how-C', key: 'C', cues: [] } : { id: 'line-how-word', key: 'word', cues: [] }),
    twinParts: () => [],
    runeOf: (r, i) => r.runeTexts![i],
  }
}

/**
 * The credit of one answer to his unit tallies (design Part 4, credit per sound unit): a right word, one right answer
 * for each of its units and blend skills; a miss, one wrong answer for the unit the round tests. Merged as the seed is
 * (seedTallies never lowers a count), so a re-run the parent asks for adds to what he has.
 */
function credit(save: PlacementPort, target: string, right: boolean) {
  const r = PLACEMENT_ROUNDS.find((x) => x.target === target)
  if (!r) return
  const now = save.read().tallies
  const add: Record<string, Tally> = {}
  for (const c of creditOf(word(target), r.stageUnit, right)) {
    const t = now[c.unit] ?? {}
    add[c.unit] = { seen: (t.seen ?? 0) + 1, wrong: (t.wrong ?? 0) + (c.right ? 0 : 1) }
  }
  save.seedTallies(add)
}

/**
 * One answer of the placement: credited, walked and saved at once. When the walk has found his level: he is placed at it, the
 * units below it are seeded as known, every station open at it opens (spec Part 1), and the placement is done.
 * `stage`: the stage this answer was asked at (the next ask of the saved walk, never `state.stage`).
 */
export function placementAnswer(
  save: PlacementPort, right: boolean, target: string, at: number, ready: number[], stations: (stage: number) => ScreenId[],
): { stage: number; done: { level: number; answers: number } | null } {
  credit(save, target, right)
  const p = save.read().placement
  const cur = current(p, ready)
  const stage = askOf(cur).stage
  const step = stepPlacement(cur, right, ready)
  if ('ask' in step.next) {
    save.setPlacement({ ...p, state: step.state })
    return { stage, done: null }
  }
  const level = step.next.done.level
  const answers = step.state.asked
  save.setStage(level)
  save.seedTallies(seedAfterPlacement(level))
  save.openStations(stations(level))
  save.setPlacement({ state: null, requested: false, done: { level, answers, at }, runs: p.runs + 1 })
  return { stage, done: { level, answers } }
}

// ---- the English tower's letter and word rounds (design Part 5)

/** the file of a word's picture (its EnWord.picture key); undefined: none yet */
export type PictureOf = (key: string) => string | undefined

/** what the English tower reads and writes of the English save (EnglishSavePort's part) */
export interface EnTowerPort {
  read(): Readonly<Pick<EnglishSave, 'stage' | 'tallies' | 'recent' | 'introSeen'>>
  setIntro(id: string, s: IntroState): void
}

/**
 * the English tower over a save (the course gives the real one, looked up on each call), its pictures, and which voice
 * files are there (a unit is asked by its sound only when its sound clip is)
 */
export interface EnTowerDeps {
  save: () => EnTowerPort
  picture: PictureOf
  voice: (id: string) => boolean
  /**
   * the blend of a word, for the hint of a word round (the course gives logic/blend's `blendOf`; the rounds of this file
   * are imported by blend.ts's own imports, so it is handed in); unset: no hint
   */
  blend?: (w: EnWord) => BlendPlan
}

/**
 * what a round asks: a unit's letter (`by` its picture or its sound; unset: by its picture when it has one, about half of
 * them by sound when its clip is there too), a nonsense name, or the word of a picture
 */
export type TowerAsk = { kind: 'letter'; unit: string; by?: 'picture' | 'sound' } | { kind: 'name'; word: string } | { kind: 'word'; word: string }

/** letter runes at every wave (spec Part 5: four; the Hebrew pad grows to six from wave 3); word runes */
const LETTER_RUNES = 4
const WORD_RUNES = 3
/**
 * The share of word rounds (a nonsense name, or from stage 6 a picture with word runes) by stage: none at stage 1, then
 * growing, as the spec has the runes carry words later (Part 5). My call; the rest are letter rounds. From stage 6, when
 * pictures with word runes are there, half of the word rounds are those.
 */
const WORD_SHARE_BY_STAGE: Record<number, number> = { 1: 0, 2: 0.2, 3: 0.25, 4: 0.3, 5: 0.4, 6: 0.45, 7: 0.5, 8: 0.55, 9: 0.6 }
/** of a unit that has both a picture and its sound clip: the share asked by its sound (so that sound rounds stay) */
const BY_SOUND_SHARE = 0.5
/** of the word rounds from stage 6, when pictures with word runes are there: the share that are those */
const PICTURE_WORD_SHARE = 0.5
/** a mix-up he made this often is put on the board (as the Hebrew tower does) */
const CONFUSION_MIN = 2

/**
 * The units a letter round asks: one letter or team that makes one sound, of his stage or below. Not a second reading
 * (its text is its main unit's), a silent e (`a e`) or an ending (`-s`): those are read inside words, in the name and
 * picture-word rounds.
 */
const LETTER_KINDS: readonly UnitKind[] = ['vowel', 'consonant', 'digraph', 'double', 'r-vowel', 'team']
export const letterPool = (stage: number): Unit[] => UNITS.filter((u) => u.stage <= stage && !u.secondOf && LETTER_KINDS.includes(u.kind))
const UNIT_IDS = new Set(UNITS.map((u) => u.id))
/** a letter round asks a unit; a name or picture-word round a word (by the round's kind: the heart word `a` is no unit) */
const isUnitRound = (r: Round) => r.ask === 'letter'

/** the pictures of a unit's first sound (or last, `endOnly`): the asset plan's `Tl` words whose file is there */
const picturesOf = (u: Unit, picture: PictureOf) => WORDS.filter((w) => w.picture && w.uses.includes(`Tl:${u.id}`) && picture(w.picture))

/** the word said after a unit's sound ("fff. fox."): a `Tl` word (with or without its file), else a word that has the unit */
function exampleOf(u: Unit): EnWord | undefined {
  return WORDS.find((w) => w.uses.includes(`Tl:${u.id}`))
    ?? WORDS.find((w) => w.kind === 'real' && (u.endOnly ? w.units[w.units.length - 1] : w.units[0]) === u.id)
}

/** the nonsense names of the name rounds (stage 2 on) */
const namePool = (stage: number) => (stage >= 2 ? WORDS.filter((w) => w.kind === 'nonsense' && w.stage <= stage) : [])
/** the picture-word rounds (stages 6–9): the asset plan's `Tw` words whose picture file is there */
const pictureWordPool = (stage: number, picture: PictureOf) =>
  (stage >= 6 ? WORDS.filter((w) => w.uses.includes('Tw') && w.stage <= stage && w.picture && picture(w.picture)) : [])

/** b is a, with one unit changed, added or dropped */
function oneApart(a: string[], b: string[]): boolean {
  if (a.length === b.length) return a.filter((x, i) => x !== b[i]).length === 1
  const [long, short] = a.length > b.length ? [a, b] : [b, a]
  if (long.length !== short.length + 1) return false
  return long.some((_, i) => long.filter((_, j) => j !== i).every((x, j) => x === short[j]))
}

const markOf = (id: string, text: string): DuelMark => ({ id, name: text, group: 'a' })
const runeOf = (id: string, text: string): TowerRune => ({ id, text, alphabet: 'latin' })
const pickOne = <T,>(rng: () => number, xs: T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]

/** the item he taps most often when `target` is asked, if he did it CONFUSION_MIN times (rows: asked; columns: tapped) */
function partnerOf(target: string, confusions: MakeRoundOpts['confusions']): string | null {
  let best: [string, number] | null = null
  for (const [k, n] of Object.entries(confusions?.[target] ?? {})) if (k !== target && n >= CONFUSION_MIN && (!best || n > best[1])) best = [k, n]
  return best?.[0] ?? null
}

/**
 * What the choice of a target reads: the English save's tallies, which hold every screen's answers, the tower's too (the
 * run records them: `towerFacts`), and the placement's credit per unit. The tower's own tallies (`o.lifetime`) also hold
 * its targets and the placement's words: only the word rounds' mix-ups read them, so nothing counts twice.
 */
function ctxOf(o: MakeRoundOpts, save: EnTowerPort): RoundCtx {
  const s = save.read()
  return { rng: o.rng, stage: s.stage.stage, tallies: s.tallies, recent: s.recent, confusions: { letters: {}, syllables: {} } }
}

const wordChoice = (w: EnWord): RunChoice => ({ kind: 'word', id: w.id, text: w.text, soundId: '', itemId: w.id })

/** a word near the aim; the stage's own words on NEW_SHARE of the rounds (as pickUnit picks units) */
function pickWord(ctx: RoundCtx, pool: EnWord[]): EnWord {
  const fresh = pool.filter((w) => w.stage === ctx.stage)
  const cands = fresh.length && fresh.length < pool.length && ctx.rng() < NEW_SHARE ? fresh : pool
  return pickTarget(ctx.rng, cands, (w) => enFeatures(wordChoice(w), 'tower'), ctx.tallies, ctx.recent, enPrior)
}

/** what the round of `o` asks: bosses carry a unit of his stage, or a word when his stage has none (stages 5–7) */
function towerAsk(o: MakeRoundOpts, deps: EnTowerDeps): TowerAsk {
  const save = deps.save()
  const ctx = ctxOf(o, save)
  const stage = ctx.stage
  const names = namePool(stage)
  const pictures = pictureWordPool(stage, deps.picture)
  const wordAsk = (): TowerAsk => (pictures.length && (!names.length || ctx.rng() < PICTURE_WORD_SHARE)
    ? { kind: 'word', word: pickWord(ctx, pictures).id }
    : { kind: 'name', word: pickWord(ctx, names).id })
  if (o.boss) {
    const own = letterPool(stage).filter((u) => u.stage === stage)
    if (own.length) return { kind: 'letter', unit: pickUnit(ctx, own, 'tower').id }
    if (names.length || pictures.length) return wordAsk()
  } else if (names.length && ctx.rng() < (WORD_SHARE_BY_STAGE[stage] ?? 0)) {
    return wordAsk()
  }
  return { kind: 'letter', unit: pickUnit(ctx, letterPool(stage), 'tower').id }
}

/** the round's monster, walk and boss fight, as the Hebrew tower makes them */
function board(o: MakeRoundOpts): Pick<Round, 'monster' | 'boss' | 'walkMs' | 'startFrac'> {
  return {
    // right after "a new monster!" comes that monster
    monster: o.boss ? bossFor(o.wave) : (o.kills === 0 && newMonsterAt(o.wave)) || pickOne(o.rng, unlockedMonsters(o.wave)),
    boss: o.boss,
    walkMs: Math.round(walkMs(o.wave, o.boss) * (1 - (o.boss && o.bossStart ? o.bossStart : 0))),
    ...(o.boss && o.bossStart ? { startFrac: o.bossStart } : {}),
  }
}

/**
 * A letter round: the monster carries the unit's picture (screen A: tap its first sound's letter, or its last sound's for
 * `x ck ff ll ss zz ng nk`), or the wizard says its sound (screen B) when it has no picture. Four runes, each with
 * another sound, all units he has opened; his usual mix-up for it among them. A picture's other units are left out (fox:
 * no f, no o), so that only one rune is in the picture.
 */
function letterRound(o: MakeRoundOpts, u: Unit, deps: EnTowerDeps, by?: 'picture' | 'sound'): Round {
  const stage = deps.save().read().stage.stage
  const pool = letterPool(Math.max(stage, u.stage))
  const pictures = picturesOf(u, deps.picture)
  const bySound = by ? by === 'sound' : deps.voice(soundVoice(u)) && o.rng() < BY_SOUND_SHARE
  const pic = pictures.length && !bySound ? pickOne(o.rng, pictures) : null
  const inPicture = new Set(pic?.units ?? [])
  const runes: Unit[] = [u]
  const fits = (x: Unit) => !runes.some((y) => y.id === x.id || y.sound === x.sound) && !inPicture.has(x.id)
  const partner = partnerOf(u.id, o.confusions)
  const p = partner ? pool.find((x) => x.id === partner) : undefined
  if (p && fits(p)) runes.push(p)
  for (const x of shuffle(o.rng, pool)) {
    if (runes.length >= LETTER_RUNES) break
    if (fits(x)) runes.push(x)
  }
  const shown = shuffle(o.rng, runes)
  const example = pic ?? exampleOf(u)
  return {
    id: o.id, type: pic ? 'A' : 'B', ask: 'letter', target: markOf(u.id, u.text),
    runes: shown.map((x) => markOf(x.id, x.text)), runeTexts: shown.map((x) => runeOf(x.id, x.text)),
    word: { key: example?.id ?? '', group: 'a', he: '' }, padWords: [],
    ...(pic ? { picture: deps.picture(pic.picture!) } : {}),
    ...board(o),
  }
}

/**
 * A word round: three word runes, the target and two words one unit apart from it (`vap · vip · map`; `cats · cat`),
 * of his stage or below, his usual mix-up first. A name round (screen C): the wizard says a nonsense name. A
 * picture-word round (screen A): the monster carries the word's picture.
 */
function wordRound(o: MakeRoundOpts, w: EnWord, picture: boolean, deps: EnTowerDeps): Round {
  const stage = Math.max(deps.save().read().stage.stage, w.stage)
  const pool = WORDS.filter((x) => (x.kind === 'real' || x.kind === 'nonsense') && x.stage <= stage && x.text !== w.text)
  const others: EnWord[] = []
  const add = (x: EnWord | undefined) => { if (x && others.length < WORD_RUNES - 1 && !others.some((y) => y.text === x.text)) others.push(x) }
  const partner = partnerOf(w.id, o.confusions)
  add(partner ? pool.find((x) => x.id === partner) : undefined)
  for (const x of shuffle(o.rng, pool.filter((x) => oneApart(x.units, w.units)))) add(x)
  for (const x of shuffle(o.rng, pool.filter((x) => x.units.length === w.units.length))) add(x)
  const shown = shuffle(o.rng, [w, ...others])
  return {
    id: o.id, type: picture ? 'A' : 'C', ask: picture ? 'word' : 'name', target: markOf(w.id, w.text),
    runes: shown.map((x) => markOf(x.id, x.text)), runeTexts: shown.map((x) => runeOf(x.id, x.text)),
    word: { key: w.id, group: 'a', he: '' }, padWords: [],
    ...(picture ? { picture: deps.picture(w.picture!) } : {}),
    ...board(o),
  }
}

/** the round of an ask (the tests ask for one) */
export function enTowerRound(deps: EnTowerDeps, o: MakeRoundOpts, ask: TowerAsk): Round {
  if (ask.kind === 'letter') return letterRound(o, unit(ask.unit), deps, ask.by)
  const w = word(ask.word)
  if (ask.kind === 'name' || (w.picture && deps.picture(w.picture))) return wordRound(o, w, ask.kind === 'word', deps)
  // a picture whose file is not there: a name round instead
  const ctx = ctxOf(o, deps.save())
  return wordRound(o, pickWord(ctx, namePool(Math.max(ctx.stage, 2))), false, deps)
}

/**
 * What a tower answer counts for (the run records it, as for any screen): a unit round its unit, a word round its units
 * and blends (enFeatures), and the screen. It counts towards the stage pass when it asks his stage's new items: a unit of
 * his stage, or a word of his stage (its new units are in it).
 */
export function towerFacts(r: Round, stage: number): { features: string[]; newStage: boolean } {
  if (isUnitRound(r)) {
    const u = unit(r.target.id)
    return { features: enFeatures(unitChoice(u), 'tower'), newStage: u.stage === stage }
  }
  const w = word(r.target.id)
  return { features: enFeatures(wordChoice(w), 'tower'), newStage: w.stage === stage }
}

/** the English tower's own lines beyond the first duel's 13 (data/lines.ts, EN_TOWER_LINE_IDS) */
export const EN_TOWER_OWN_LINES = ['line-how-last', 'line-how-word'] as const

const wordVoiceOf = (w: EnWord) => (w.kind === 'nonsense' ? nonsenseVoice(w.text) : w.kind === 'heart' ? heartVoice(w.text) : wordVoice(w.text))

/**
 * The English tower: letter rounds (a picture or a sound, four letter runes), from stage 2 name rounds (a nonsense name,
 * three word runes), from stage 6 picture-word rounds. Feedback: the unit's sound, then the word ("fff. fox."). The
 * monsters never speak; the board, the waves, the bosses and the מגה spell are the duel's own. A new unit (or the
 * stage's first blend word) is asked once before its introduction (logic/intro.ts), which follows the feedback. A word
 * round has the hint (`?`): the words on its runes blend (logic/blend.ts).
 */
export function englishTower(deps: EnTowerDeps): TowerContent {
  return {
    makeRound: (o) => enTowerRound(deps, o, towerAsk(o, deps)),
    isCorrect: (r, c) => c.kind === 'rune' && c.mark.id === r.target.id,
    // no two runes of a round sound alike: no forgiven twin
    isTwin: () => false,
    // a picture round walks at once (a tap on its sign says the picture's word; a picture-word round says nothing, the
    // word is the answer); a sound round says the sound, a name round the name
    questionParts(r) {
      if (r.type === 'C') return [wordVoiceOf(word(r.target.id))]
      if (!isUnitRound(r)) return []
      if (r.type === 'B') return [soundVoice(unit(r.target.id))]
      return r.word.key ? [wordVoice(r.word.key)] : []
    },
    // the unit's sound, then the word ("fff. fox."); a short plan says only the sound; a word round says its word
    feedbackParts(r, plan) {
      if (!isUnitRound(r)) return [wordVoiceOf(word(r.target.id))]
      const sound = soundVoice(unit(r.target.id))
      return plan.say === 'full' && r.word.key ? [sound, wordVoice(r.word.key)] : [sound]
    },
    howLine(r) {
      const key = r.type === 'C' ? 'C' : r.type === 'B' ? 'B' : !isUnitRound(r) ? 'word' : unit(r.target.id).endOnly ? 'last' : 'A'
      return { id: `line-how-${key}`, key, cues: [] }
    },
    twinParts: (_r, c) => (c.kind === 'rune' ? ['line-almost', ...(UNIT_IDS.has(c.mark.id) ? [soundVoice(unit(c.mark.id))] : [])] : []),
    runeOf: (r, i) => r.runeTexts![i],
    // the `?` of a word round (a nonsense name, a picture's word): each word on the runes blends, left to right; a letter
    // round has none (a letter is a sound, not a word to read)
    hint: deps.blend && ((r) => (r.ask === 'name' || r.ask === 'word' ? r.runes.map((m) => deps.blend!(word(m.id))) : [])),
    answered: (r, right) => introAfter(deps.save(), isUnitRound(r) ? unit(r.target.id) : word(r.target.id), right),
  }
}
