// Round generators for the five screens (spec: Screens, Content). Rules every hearing choice keeps:
// - no two items that sound the same (same-sound spellings like תָּ/טָ never meet);
// - only items of opened stages (wrong answers only from content he learned);
// - one mark per vowel group in one choice (kamatz and patach never meet; which one rotates).
import type { Rng, Tally } from '../../shared/adaptive'
import {
  GROUPS, GROUP_MARKS, ITEMS, SHAPE_GROUPS, item as itemOf, mark as markOf, syllable,
  type Item, type Mark, type MarkId, type Stage, type Syllable, type VowelGroup,
} from './content.ts'
import { features, pickTarget, type ScreenId } from './predict'
import { NEW_SHARE } from './stages'

export type Kind = 'letter' | 'syllable'
export interface Choice {
  kind: Kind
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
}
export type Conf = Record<string, Record<string, number>>
export interface RoundCtx {
  rng: Rng
  stage: Stage
  tallies: Record<string, Tally>
  recent: Record<string, string>
  /** letters: item → item; syllables: `<item>-<group>` → `<item>-<group>` (asked → tapped) */
  confusions: { letters: Conf; syllables: Conf }
}

export const CONFUSION_GROUP_MIN = 3

const pick = <T,>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]
function shuffle<T>(rng: Rng, xs: T[]): T[] {
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

const openedItems = (stage: Stage): Item[] => (stage === 1 || stage >= 3 ? ITEMS : ITEMS.filter((i) => !i.soft))
const syllableItems = (stage: Stage): Item[] => (stage >= 3 ? ITEMS : ITEMS.filter((i) => !i.soft))

/** True when the answer counts towards passing the current stage (it is on that stage's new content). */
export function isNewStageChoice(stage: Stage, c: Choice): boolean {
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
  const ok = (c: Choice) => !out.some((o) => o.id === c.id || sameSound(o, c))
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

function syl(itemId: string, m: Mark): Choice {
  return syllableChoice(syllable(itemId, m.id))
}

/** The target of a broom flight (and of ghost rounds): a letter, or a syllable with a rotating mark. */
export function broomTarget(ctx: RoundCtx, kind: Kind, avoid?: string, screen: ScreenId = 'broom'): Choice {
  const { rng, stage } = ctx
  let cands: Choice[]
  if (kind === 'letter') cands = openedItems(stage).map(letterChoice)
  else {
    const marks = marksFor(rng)
    cands = syllableItems(stage).flatMap((it) => GROUPS.map((g) => syl(it.id, marks[g])))
  }
  if (avoid) cands = cands.filter((c) => c.id !== avoid && c.soundId !== avoid)
  const fresh = cands.filter((c) => isNewStageChoice(stage, c))
  if (fresh.length && fresh.length < cands.length && rng() < NEW_SHARE) cands = fresh
  return pickTarget(rng, cands, (c) => featureOf(c, screen), ctx.tallies, ctx.recent)
}

/** A wave of 3 for the broom flight: the target, the same letter with another vowel, a look-alike (or his mix-up). */
export function broomWave(ctx: RoundCtx, target: Choice, kind: Kind): Choice[] {
  const { rng, stage } = ctx
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
export function cauldronRound(ctx: RoundCtx): { letter: Item; target: Syllable; orbs: Mark[] } {
  const { rng } = ctx
  const t = broomTarget(ctx, 'syllable', undefined, 'cauldron')
  const target = syllable(t.itemId, t.mark!)
  const others = shuffle(rng, GROUPS.filter((g) => g !== target.mark.group)).slice(0, 2).map((g) => markOf(pick(rng, GROUP_MARKS[g])))
  return { letter: target.item, target, orbs: shuffle(rng, [target.mark, ...others]) }
}

export interface LadderStep { target: Choice; plates: Choice[] }
/** A ladder: one part stays the same on every rung (the letter, the vowel, or the dot contrast from stage 3). */
export function ladderPlan(ctx: RoundCtx, rungs: number): { fixed: 'letter' | 'vowel' | 'dot'; steps: LadderStep[] } {
  const { rng, stage } = ctx
  const items = syllableItems(stage)
  const r = rng()
  const fixed: 'letter' | 'vowel' | 'dot' = stage >= 3 && r < 0.3 ? 'dot' : r < 0.65 ? 'letter' : 'vowel'
  const steps: LadderStep[] = []
  if (fixed === 'letter') {
    const L = broomTarget(ctx, 'syllable', undefined, 'ladder').itemId
    for (let k = 0; k < rungs; k++) {
      const marks = marksFor(rng)
      const groups = shuffle(rng, GROUPS).slice(0, 3)
      const plates = groups.map((g) => syl(L, marks[g]))
      const target = pickTarget(rng, plates, (c) => featureOf(c, 'ladder'), ctx.tallies, ctx.recent)
      steps.push({ target, plates: markNearMiss(target, plates) })
    }
  } else if (fixed === 'vowel') {
    const m = markOf(pick(rng, GROUP_MARKS[pick(rng, GROUPS)]))
    for (let k = 0; k < rungs; k++) {
      const cands = items.map((it) => syl(it.id, m))
      const target = pickTarget(rng, cands, (c) => featureOf(c, 'ladder'), ctx.tallies, ctx.recent)
      const look = lookAlikeGroup(ctx, target.itemId).slice(1).filter((id) => items.some((i) => i.id === id)).map((id) => syl(id, m))
      const plates = shuffle(rng, fill(rng, [target], shuffle(rng, look), () => syl(pick(rng, items).id, m)))
      steps.push({ target, plates: markNearMiss(target, plates) })
    }
  } else {
    const dotted = ITEMS.filter((i) => i.pair)
    for (let k = 0; k < rungs; k++) {
      const it = pick(rng, dotted)
      const g = pick(rng, GROUPS)
      const m = markOf(pick(rng, GROUP_MARKS[g]))
      const target = syl(it.id, m)
      const pair = syl(it.pair!, m)
      const look = lookAlikeGroup(ctx, it.id).slice(1).filter((id) => id !== it.pair).map((id) => syl(id, m))
      const plates = shuffle(rng, fill(rng, [target, pair], shuffle(rng, look), () => syl(pick(rng, ITEMS).id, m)))
      steps.push({ target, plates: markNearMiss(target, plates) })
    }
  }
  return { fixed, steps }
}

/** Ghosts: the target and two look-alikes (his real mix-ups when known), all of one kind. */
export function ghostRound(ctx: RoundCtx, kind: Kind): { target: Choice; signs: Choice[] } {
  const { rng, stage } = ctx
  const target = broomTarget(ctx, kind, undefined, 'ghosts')
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
