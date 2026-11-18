// The English tower's content (the first duel's board, ADR 0002). Here: the placement tower of the first English run
// (design Part 4), a second TowerContent, so that the tower keeps one round path (DuelController.makeRound →
// content.makeRound). Its rounds ask what the walk (./placement.ts) asks next, read from the English save; its answers
// are walked and saved at once (`placementAnswer`), so a pause or a reload goes on where it was. The letter and word
// rounds of the English tower come in Task 15.
import type { TowerContent } from '../../utils/duel/content'
import type { MakeRoundOpts } from '../../utils/duel/rounds'
import { newMonsterAt, unlockedMonsters, walkMs } from '../../utils/duel/rules'
import type { Choice, DuelMark, Round, TowerRune } from '../../types/duel'
import type { ScreenId } from '../../duel2/logic/predict'
import { PLACEMENT_ROUNDS, type PlacementText } from '../content/placementRounds'
import { heartVoice, nonsenseVoice, wordVoice } from '../content/voiceIds'
import { word } from '../content/words'
import type { EnglishSave, PlacementSave } from '../saveFormat'
import type { Tally } from '../../shared/adaptive'
import { askOf, seedAfterPlacement, startPlacement, stepPlacement, type PlacementState } from './placement'

type PlacementRound = (typeof PLACEMENT_ROUNDS)[number]
type Kind = 'picture' | 'name'

/** what the placement reads and writes of the English save (EnglishSavePort's part) */
export interface PlacementPort {
  read(): Readonly<Pick<EnglishSave, 'placement'>>
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

const voiceOf = (id: string): string => {
  const w = word(id)
  return w.kind === 'heart' ? heartVoice(w.text) : w.kind === 'nonsense' ? nonsenseVoice(w.text) : wordVoice(w.text)
}

/** a picture round needs its target's picture (a picture dropped in review leaves the round out) */
const usable = (r: PlacementRound) => r.kind === 'name' || !!word(r.target).picture

/**
 * The round of `stage` and `kind` he has seen least (`seen`: the tower's tallies, by target); at random among those.
 * When the rounds of `kind` have all been asked more than one of the other kind (stage 1 has two picture rounds), the
 * other kind's round instead: the walk alternates the kinds, the content does not always have enough of one.
 */
export function choosePlacementRound(stage: number, kind: Kind, seen: (target: string) => number, rng: () => number): PlacementRound {
  const ofStage = PLACEMENT_ROUNDS.filter((r) => r.stage === stage && usable(r))
  if (!ofStage.length) throw new Error(`no placement round at stage ${stage}`)
  const least = (rs: PlacementRound[]) => Math.min(...rs.map((r) => seen(r.target)))
  const own = ofStage.filter((r) => r.kind === kind)
  const other = ofStage.filter((r) => r.kind !== kind)
  const pool = !own.length || (other.length && least(other) < least(own)) ? other : own
  const min = least(pool)
  const cands = pool.filter((r) => seen(r.target) === min)
  return cands[Math.floor(rng() * cands.length) % cands.length]
}

function shuffle<T>(rng: () => number, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const textOf = (x: string | PlacementText) => (typeof x === 'string' ? word(x).text : x.text)
const mark = (id: string, text: string): DuelMark => ({ id, name: text, group: 'a' })

/** a placement round as the duel plays it: a picture round is screen A (it walks at once), a name round screen C (said first) */
function placementRound(o: MakeRoundOpts, pr: PlacementRound): Round {
  const words = shuffle(o.rng, [pr.target, ...pr.others].slice(0, RUNES).map((x) => ({ id: textOf(x), text: textOf(x) })))
  const runes = words.map((w) => mark(w.id, w.text))
  const runeTexts: TowerRune[] = words.map((w) => ({ id: w.id, text: w.text, alphabet: 'latin' }))
  const target = word(pr.target)
  const unlocked = unlockedMonsters(o.wave)
  return {
    id: o.id, type: pr.kind === 'picture' ? 'A' : 'C', target: mark(target.id, target.text),
    runes, runeTexts, word: { key: target.id, group: 'a', he: '' }, padWords: [],
    ...(pr.kind === 'picture' && target.picture ? { picture: target.picture } : {}),
    // right after "a new monster!" comes that monster
    monster: (o.kills === 0 && newMonsterAt(o.wave)) || unlocked[Math.floor(o.rng() * unlocked.length) % unlocked.length],
    boss: false,
    // the first wave's walk at every wave: the placement measures his reading, not his speed (my call)
    walkMs: walkMs(1, false),
  }
}

/** The placement tower over his save: each round asks the walk's next stage and kind. No hint, no twin. */
export function placementTower(save: PlacementPort, ready: number[]): TowerContent {
  return {
    makeRound(o) {
      const ask = askOf(current(save.read().placement, ready))
      const pr = choosePlacementRound(ask.stage, ask.kind, (t) => o.lifetime[t]?.seen ?? 0, o.rng)
      return placementRound(o, pr)
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
 * One answer of the placement: walked and saved at once. When the walk has found his level: he is placed at it, the
 * units below it are seeded as known, every station open at it opens (spec Part 1), and the placement is done.
 * `stage`: the stage this answer was asked at (the next ask of the saved walk, never `state.stage`).
 */
export function placementAnswer(
  save: PlacementPort, right: boolean, at: number, ready: number[], stations: (stage: number) => ScreenId[],
): { stage: number; done: { level: number; answers: number } | null } {
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
