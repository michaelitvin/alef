// Round generators for the five screens (spec: Screens, Content). Rules every hearing choice keeps:
// - no two items that sound the same (same-sound spellings like תָּ/טָ never meet);
// - only items of opened stages (wrong answers only from content he learned);
// - one mark per vowel group in one choice (kamatz and patach never meet; which one rotates).
import type { Rng, Tally } from '../../shared/adaptive'
import {
  GROUPS, GROUP_MARKS, ITEMS, SHAPE_GROUPS, isAllowed, item as itemOf, mark as markOf, syllable,
  type Item, type Mark, type MarkId, type Syllable, type VowelGroup,
} from './content.ts'
import { features, pickTarget, predict, type ScreenId } from './predict'
import { LAST_STAGE, NEW_SHARE, WEAK_SHARE, WEAK_GATE } from './stages'
import { WORDS, type Word } from '../data/words'

export type Kind = 'letter' | 'syllable'
export interface Choice {
  /** 'unit' and 'word': the English course's choices (Hebrew choices are letters and syllables) */
  kind: Kind | 'unit' | 'word'
  /** item id (letter) or syllable id `<item>-<mark>` */
  id: string
  text: string
  /** voice id of what he hears: `ln-<item>` for a letter name, `syl-<sound>-<group>` for a syllable */
  soundId: string
  itemId: string
  group?: VowelGroup
  mark?: MarkId
  /** set on the other form of a dotted letter (ב for בּ): a near miss for that target */
  nearMissOf?: string
  /** the sound units of a word (the blend, the spell book) */
  units?: string[]
  picture?: string
  heart?: true
  nonsense?: true
}
export type Conf = Record<string, Record<string, number>>
export interface RoundCtx {
  rng: Rng
  stage: number
  tallies: Record<string, Tally>
  recent: Record<string, string>
  /** letters: item → item; syllables: `<item>-<group>` → `<item>-<group>` (asked → tapped) */
  confusions: { letters: Conf; syllables: Conf }
}

/** a mix-up he made this often (asked → tapped) makes a look-alike group of his own */
export const CONFUSION_GROUP_MIN = 3

const pick = <T,>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]
/** a Fisher–Yates shuffle with the round's rng (a new array) */
export function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const letterChoice = (it: Item): Choice => ({ kind: 'letter', id: it.id, text: it.glyph, soundId: `ln-${it.id}`, itemId: it.id })
export const syllableChoice = (s: Syllable): Choice => ({
  kind: 'syllable', id: s.id, text: s.text, soundId: s.soundId, itemId: s.item.id, group: s.mark.group, mark: s.mark.id,
})

/** Letter names never sound alike; syllables sound alike when their sound ids match. */
export function sameSound(a: Choice, b: Choice): boolean {
  return a.soundId === b.soundId
}

const openedItems = (stage: number): Item[] => (stage === 1 || stage >= 3 ? ITEMS : ITEMS.filter((i) => !i.soft))
const syllableItems = (stage: number): Item[] => (stage >= 3 ? ITEMS : ITEMS.filter((i) => !i.soft))

/** True when the answer counts towards passing the current stage (it is on that stage's new content). */
export function isNewStageChoice(stage: number, c: Choice): boolean {
  if (stage === 1) return c.kind === 'letter'
  if (stage === 2) return c.kind === 'syllable' && !itemOf(c.itemId).soft
  if (stage === 3) return c.kind === 'syllable' && itemOf(c.itemId).soft
  return false
}

/** One mark for each group in this choice, chosen at random (they rotate between rounds). */
function marksFor(rng: Rng): Record<VowelGroup, Mark> {
  const out = {} as Record<VowelGroup, Mark>
  for (const g of GROUPS) out[g] = markOf(pick(rng, GROUP_MARKS[g]))
  return out
}

function featureOf(c: Choice, screen: ScreenId): string[] {
  const it = itemOf(c.itemId)
  return features(c.mark ? { item: it, mark: markOf(c.mark) } : { item: it }, screen)
}

/** Items he mixes up with this one (3+ recorded mix-ups), else the shape groups it belongs to. First = the item itself. */
export function lookAlikeGroup(ctx: RoundCtx, itemId: string): string[] {
  const row = ctx.confusions.letters[itemId] ?? {}
  const partners = Object.entries(row).filter(([, n]) => n >= CONFUSION_GROUP_MIN).sort((a, b) => b[1] - a[1]).map(([id]) => id)
  if (partners.length) return [itemId, ...partners.filter((p) => p !== itemId)]
  const shape = SHAPE_GROUPS.filter((g) => g.includes(itemId)).flat().filter((id) => id !== itemId)
  return [itemId, ...new Set(shape)]
}

function syllablePartner(ctx: RoundCtx, c: Choice): { itemId: string; group: VowelGroup } | null {
  const row = ctx.confusions.syllables[`${c.itemId}-${c.group}`] ?? {}
  const best = Object.entries(row).filter(([, n]) => n >= CONFUSION_GROUP_MIN).sort((a, b) => b[1] - a[1])[0]
  if (!best) return null
  const i = best[0].lastIndexOf('-')
  return { itemId: best[0].slice(0, i), group: best[0].slice(i + 1) as VowelGroup }
}

/** Adds candidates in order, skipping any that repeats an id or sounds like one already in. */
function fill(_rng: Rng, start: Choice[], ordered: Choice[], random: () => Choice, n = 3): Choice[] {
  const out = [...start]
  const ok = (c: Choice) => !out.some((o) => o.id === c.id || sameSound(o, c)) && (!c.mark || isAllowed(c.itemId, c.mark))
  for (const c of ordered) if (out.length < n && ok(c)) out.push(c)
  for (let guard = 0; out.length < n && guard < 500; guard++) {
    const c = random()
    if (ok(c)) out.push(c)
  }
  return out
}

function markNearMiss(target: Choice, cs: Choice[]): Choice[] {
  const pair = itemOf(target.itemId).pair
  return cs.map((c) => (pair && c.itemId === pair && c.group === target.group ? { ...c, nearMissOf: target.id } : c))
}

/** The item with this group's chosen mark, or the group's other mark when that syllable is left out; null if none is allowed. */
function sylFor(itemId: string, g: VowelGroup, preferred: Mark): Choice | null {
  if (isAllowed(itemId, preferred.id)) return syl(itemId, preferred)
  const alt = GROUP_MARKS[g].find((m) => isAllowed(itemId, m))
  return alt ? syl(itemId, markOf(alt)) : null
}

function syl(itemId: string, m: Mark): Choice {
  return syllableChoice(syllable(itemId, m.id))
}

/** Items he mixed up 3+ times (either side of the mix-up), and syllables with such a mix-up of their own */
function confusedIds(ctx: RoundCtx): { letters: Set<string>; syllables: Set<string> } {
  const out = { letters: new Set<string>(), syllables: new Set<string>() }
  const scan = (conf: Conf, into: Set<string>) => {
    for (const [a, row] of Object.entries(conf)) for (const [b, n] of Object.entries(row)) if (n >= CONFUSION_GROUP_MIN) { into.add(a); into.add(b) }
  }
  scan(ctx.confusions.letters, out.letters)
  scan(ctx.confusions.syllables, out.syllables)
  return out
}

/** a vowel group counts as weak only from this predicted rate, and when it is this far above the mean of the groups */
const WEAK_GROUP_MIN = 0.1
const WEAK_GROUP_GAP = 0.05

/** His weakest vowel group: the highest predicted `v:` rate among groups that he has answered, if it is really weak */
export function weakestGroup(ctx: RoundCtx): VowelGroup | null {
  let best: VowelGroup | null = null
  let top = -1
  let sum = 0
  let n = 0
  for (const g of GROUPS) {
    if (!ctx.tallies[`v:${g}`]?.seen) continue
    const r = predict([`v:${g}`], ctx.tallies, ctx.recent)
    sum += r; n++
    if (r > top) { top = r; best = g }
  }
  return best && top >= WEAK_GROUP_MIN && top - sum / n >= WEAK_GROUP_GAP ? best : null
}

/** The candidates that he mixes up (or, for syllables, of his weakest vowel group) */
function weakSubset(ctx: RoundCtx, cands: Choice[]): Choice[] {
  const conf = confusedIds(ctx)
  const group = weakestGroup(ctx)
  return cands.filter((c) =>
    c.kind === 'letter' ? conf.letters.has(c.itemId)
      : conf.letters.has(c.itemId) || conf.syllables.has(`${c.itemId}-${c.group}`) || (group !== null && c.group === group))
}

/** The target of a broom flight (and of ghost rounds): a letter, or a syllable with a rotating mark. */
export function broomTarget(ctx: RoundCtx, kind: Kind, avoid?: string, screen: ScreenId = 'broom'): Choice {
  const { rng, stage } = ctx
  let cands: Choice[]
  if (kind === 'letter') cands = openedItems(stage).map(letterChoice)
  else {
    const marks = marksFor(rng)
    cands = syllableItems(stage).flatMap((it) => GROUPS.map((g) => sylFor(it.id, g, marks[g]))).filter((c): c is Choice => c !== null)
  }
  if (avoid) cands = cands.filter((c) => c.id !== avoid && c.soundId !== avoid)
  const fresh = cands.filter((c) => isNewStageChoice(stage, c))
  if (fresh.length && fresh.length < cands.length && rng() < NEW_SHARE) cands = fresh
  if (stage >= LAST_STAGE) {
    // the last stage: a share of the rounds go to his weak items, only while the subset is near 1 mistake in 5
    const weak = weakSubset(ctx, cands)
    if (weak.length && weak.length < cands.length) {
      const mean = weak.reduce((t, c) => t + predict(featureOf(c, screen), ctx.tallies, ctx.recent), 0) / weak.length
      if (mean <= WEAK_GATE && rng() < WEAK_SHARE) cands = weak
    }
  }
  return pickTarget(rng, cands, (c) => featureOf(c, screen), ctx.tallies, ctx.recent)
}

/** share of a dotted target's waves that are only the target and its twin (spec 2026-11-07: about a third) */
const TWIN_WAVE_SHARE = 1 / 3

/** The target and its twin (בּ/ב, כּ/כ, פּ/פ, שׁ/שׂ, same vowel) once the twin is opened (stage 3), else null. */
function dotTwin(stage: number, target: Choice): Choice | null {
  if (target.kind !== 'syllable' || !target.mark || stage < 3) return null
  const pair = itemOf(target.itemId).pair
  if (!pair || !isAllowed(pair, target.mark)) return null
  return { ...syl(pair, markOf(target.mark)), nearMissOf: target.id }
}

/**
 * A wave for the broom flight: the target, the same letter with another vowel, a look-alike (or his mix-up). For a dotted
 * target about a third of its waves are only the target and its twin (two orbs).
 */
export function broomWave(ctx: RoundCtx, target: Choice, kind: Kind): Choice[] {
  const { rng, stage } = ctx
  const twin = dotTwin(stage, target)
  if (twin && rng() < TWIN_WAVE_SHARE) return shuffle(rng, [target, twin])
  if (kind === 'letter') {
    const look = lookAlikeGroup(ctx, target.itemId).slice(1).filter((id) => openedItems(stage).some((i) => i.id === id))
    const out = fill(rng, [target], shuffle(rng, look).map((id) => letterChoice(itemOf(id))), () => letterChoice(pick(rng, openedItems(stage))))
    return shuffle(rng, out)
  }
  const marks = marksFor(rng)
  marks[target.group!] = markOf(target.mark!)
  const items = syllableItems(stage)
  const otherGroup = pick(rng, GROUPS.filter((g) => g !== target.group))
  const ordered: Choice[] = [syl(target.itemId, marks[otherGroup])]
  const partner = syllablePartner(ctx, target)
  const pairId = itemOf(target.itemId).pair
  if (partner && items.some((i) => i.id === partner.itemId)) ordered.unshift(syl(partner.itemId, marks[partner.group]))
  else if (pairId && stage >= 3 && rng() < 0.5) ordered.push(syl(pairId, marks[target.group!]))
  const look = lookAlikeGroup(ctx, target.itemId).slice(1).filter((id) => items.some((i) => i.id === id))
  for (const id of shuffle(rng, look)) ordered.push(syl(id, marks[target.group!]))
  const out = fill(rng, [target], ordered, () => syl(pick(rng, items).id, marks[pick(rng, GROUPS)]))
  return markNearMiss(target, shuffle(rng, out))
}

/** Cauldron: a letter, the syllable he hears, and 3 vowel orbs (one per group, the target's among them). */
/** `avoid`: the sound of the round before (never the same twice in a row) */
export function cauldronRound(ctx: RoundCtx, avoid?: string): { letter: Item; target: Syllable; orbs: Mark[] } {
  const { rng } = ctx
  const t = broomTarget(ctx, 'syllable', avoid, 'cauldron')
  const target = syllable(t.itemId, t.mark!)
  const others = shuffle(rng, GROUPS.filter((g) => g !== target.mark.group)).slice(0, 2).map((g) => markOf(pick(rng, GROUP_MARKS[g])))
  return { letter: target.item, target, orbs: shuffle(rng, [target.mark, ...others]) }
}

export interface LadderStep { target: Choice; plates: Choice[] }
/** A ladder: one part stays the same on every rung (the letter, the vowel, or the dot contrast from stage 3). */
export function ladderPlan(ctx: RoundCtx, rungs: number, force?: 'letter' | 'vowel' | 'dot'): { fixed: 'letter' | 'vowel' | 'dot'; steps: LadderStep[] } {
  const { rng, stage } = ctx
  const items = syllableItems(stage)
  const r = rng()
  const fixed: 'letter' | 'vowel' | 'dot' = force && (force !== 'dot' || stage >= 3) ? force : stage >= 3 && r < 0.3 ? 'dot' : r < 0.65 ? 'letter' : 'vowel'
  const steps: LadderStep[] = []
  // no sound twice on one ladder: the plan is made before he answers, so the same weak syllable would win every rung
  // (the parent saw "da" three times in a row); with too few sounds left, at least never the rung before's sound
  const used = new Set<string>()
  const fresh = (cs: Choice[]) => {
    const prev = steps.length ? steps[steps.length - 1].target.soundId : null
    const a = cs.filter((c) => !used.has(c.soundId))
    return a.length ? a : cs.filter((c) => c.soundId !== prev)
  }
  // the rung below's syllable (none on the first rung): no plate offers it, matching it by sight is the trap
  const below = (): Choice | null => (steps.length ? steps[steps.length - 1].target : null)
  const notBelow = (cs: Choice[]) => { const b = below(); return b ? cs.filter((c) => c.id !== b.id && !sameSound(c, b)) : cs }
  const take = (target: Choice, plates: Choice[]) => { used.add(target.soundId); steps.push({ target, plates: markNearMiss(target, plates) }) }
  if (fixed === 'letter') {
    const L = broomTarget(ctx, 'syllable', undefined, 'ladder').itemId
    for (let k = 0; k < rungs; k++) {
      const marks = marksFor(rng)
      const all = shuffle(rng, GROUPS).map((g) => sylFor(L, g, marks[g])).filter((c): c is Choice => c !== null)
      const target = pickTarget(rng, fresh(all), (c) => featureOf(c, 'ladder'), ctx.tallies, ctx.recent)
      const others = all.filter((c) => c.soundId !== target.soundId)
      // the rung below's sound is left out when 2 others remain without it, else it may stay (the pool is too small)
      const clean = notBelow(others)
      take(target, shuffle(rng, [target, ...(clean.length >= 2 ? clean : others).slice(0, 2)]))
    }
  } else if (fixed === 'vowel') {
    const m = markOf(pick(rng, GROUP_MARKS[pick(rng, GROUPS)]))
    for (let k = 0; k < rungs; k++) {
      const cands = items.filter((it) => isAllowed(it.id, m.id)).map((it) => syl(it.id, m))
      const target = pickTarget(rng, fresh(cands), (c) => featureOf(c, 'ladder'), ctx.tallies, ctx.recent)
      const look = notBelow(lookAlikeGroup(ctx, target.itemId).slice(1).filter((id) => items.some((i) => i.id === id)).map((id) => syl(id, m)))
      const filler = () => { for (let g = 0; g < 50; g++) { const c = syl(pick(rng, items).id, m); if (notBelow([c]).length) return c } return syl(pick(rng, items).id, m) }
      take(target, shuffle(rng, fill(rng, [target], shuffle(rng, look), filler)))
    }
  } else {
    const dotted = ITEMS.filter((i) => i.pair)
    for (let k = 0; k < rungs; k++) {
      let it = pick(rng, dotted)
      let m = markOf(pick(rng, GROUP_MARKS[GROUPS[0]]))
      // draw until the sound is new on this ladder (8 dotted forms × 5 vowels leave plenty)
      for (let tries = 0; tries < 50; tries++) {
        it = pick(rng, dotted)
        const g = pick(rng, GROUPS)
        m = markOf(pick(rng, GROUP_MARKS[g].filter((x) => isAllowed(it.id, x) && isAllowed(it.pair!, x))))
        const b = below()
        if (!used.has(syl(it.id, m).soundId) && !(b && sameSound(syl(it.pair!, m), b))) break
      }
      const target = syl(it.id, m)
      const pair = syl(it.pair!, m)
      const look = notBelow(lookAlikeGroup(ctx, it.id).slice(1).filter((id) => id !== it.pair).map((id) => syl(id, m)))
      const filler = () => { for (let g = 0; g < 50; g++) { const c = syl(pick(rng, ITEMS).id, m); if (notBelow([c]).length) return c } return syl(pick(rng, ITEMS).id, m) }
      take(target, shuffle(rng, fill(rng, [target, pair], shuffle(rng, look), filler)))
    }
  }
  return { fixed, steps }
}

/** Ghosts: the target and two look-alikes (his real mix-ups when known), all of one kind. */
export function ghostRound(ctx: RoundCtx, kind: Kind, avoid?: string): { target: Choice; signs: Choice[] } {
  const { rng, stage } = ctx
  const target = broomTarget(ctx, kind, avoid, 'ghosts')
  if (kind === 'letter') {
    const look = lookAlikeGroup(ctx, target.itemId).slice(1).filter((id) => openedItems(stage).some((i) => i.id === id))
    const signs = fill(rng, [target], shuffle(rng, look).map((id) => letterChoice(itemOf(id))), () => letterChoice(pick(rng, openedItems(stage))))
    return { target, signs: shuffle(rng, signs) }
  }
  const items = syllableItems(stage)
  const m = markOf(target.mark!)
  const look = lookAlikeGroup(ctx, target.itemId).slice(1).filter((id) => items.some((i) => i.id === id)).map((id) => syl(id, m))
  const signs = fill(rng, [target], shuffle(rng, look), () => syl(pick(rng, items).id, m))
  return { target, signs: markNearMiss(target, shuffle(rng, signs)) }
}

/** The last stage: the doors pick his weakest words and aim their keys (stage 4, `HEBREW_STAGES.maxStage`). */
const REHEARSE_FROM = 4

/** The doors' words of a visit: `n` door words of the opened stages (at least stage 2's, at most stage 3's), no word twice.
 *  At the last stage each is picked by his weakest and least-seen first (`w:` feature); below it, shuffled. */
export function doorWords(ctx: RoundCtx, n: number): Word[] {
  const pool = WORDS.filter((w) => w.door && w.stage <= Math.max(2, Math.min(ctx.stage, 3)))
  if (ctx.stage < REHEARSE_FROM) return pool.sort(() => ctx.rng() - 0.5).slice(0, n)
  const left = [...pool]
  const out: Word[] = []
  while (out.length < n && left.length) {
    const w = pickTarget(ctx.rng, left, (x) => features({ wordId: x.id }, 'doors'), ctx.tallies, ctx.recent)
    out.push(w)
    left.splice(left.indexOf(w), 1)
  }
  return out
}

/** the first vowel group; the one tsere word (book) is a group of its own, so it gets random keys */
const firstGroup = (w: Word): VowelGroup | 'tsere' => (w.first.mark === 'tsere' ? 'tsere' : markOf(w.first.mark).group)

/** The keys of a door: its word and two other door words, shuffled. At the last stage key 2 shares the word's first
 *  letter, else its first vowel group; key 3 is another word of that group, else any door word. */
export function doorKeys(ctx: RoundCtx, word: Word): Word[] {
  const shuffled = (xs: Word[]) => xs.sort(() => ctx.rng() - 0.5)
  const others = shuffled(WORDS.filter((w) => w.door && w.id !== word.id))
  if (ctx.stage < REHEARSE_FROM) return shuffled([word, ...others.slice(0, 2)])
  const sameLetter = others.filter((w) => w.first.item === word.first.item)
  const sameGroup = others.filter((w) => firstGroup(w) === firstGroup(word))
  const keys: Word[] = []
  for (const w of [...sameLetter, ...sameGroup, ...others]) {
    if (keys.length < 2 && !keys.includes(w)) keys.push(w)
  }
  return shuffled([word, ...keys])
}
