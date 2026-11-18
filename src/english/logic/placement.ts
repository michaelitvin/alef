// The placement: the first English run finds his level (design Part 4, the walk table). Pure: the run asks the stage
// and the kind that `next` gives, and gives the answer back to `stepPlacement`. A miss costs nothing here (no hint, no
// heart, no streak: the run's part); the walk only counts it. Its state is kept in the English save (saveFormat.ts).
import type { Tally } from '../../shared/adaptive'
import { BLENDS, unitsOfStage } from '../content/units'
import type { EnWord } from '../content/words'

/**
 * `asked`: answers so far (the walk's, then the confirmations'). `stage`: the stage asked; while confirming, the level
 * the walk found (the stage asked is `confirming[0]`). `missed`: he has missed once in the walk. `counts`: the walk's
 * answers per stage. `jumped`: the stages a right answer jumped over. `confirming`: the confirmations still to ask,
 * lowest first. `kind`: the kind of the round asked now; it alternates, picture first.
 */
export interface PlacementState { asked: number; stage: number; missed: boolean; counts: Record<number, { right: number; wrong: number }>; jumped: number[]; confirming: number[]; kind: 'picture' | 'name' }
export type PlacementNext = { ask: { stage: number; kind: 'picture' | 'name' } } | { done: { level: number } }
type Step = { state: PlacementState; next: PlacementNext }

/** the stage the walk starts at (spec: stage 4) */
const START = 4
/** the walk stops after this many answers; the confirmations come after */
const MAX_ANSWERS = 15

/**
 * The stages the walk can use: the ready stages from the lowest one up to the first gap. So it never asks or lands on
 * a stage that is not ready (a staging build), nor on one that the stage machine cannot reach from below.
 */
function range(ready: readonly number[]): { lo: number; top: number } {
  const lo = ready.length ? Math.min(...ready) : 1
  let top = lo
  while (ready.includes(top + 1)) top++
  return { lo, top }
}

const flip = (k: 'picture' | 'name'): 'picture' | 'name' => (k === 'picture' ? 'name' : 'picture')

const ask = (state: PlacementState, stage: number): Step => ({ state, next: { ask: { stage, kind: state.kind } } })

const done = (state: PlacementState, level: number): Step => ({ state: { ...state, stage: level, confirming: [] }, next: { done: { level } } })

export function startPlacement(ready: number[]): Step {
  const { lo, top } = range(ready)
  const stage = Math.max(lo, Math.min(START, top))
  return ask({ asked: 0, stage, missed: false, counts: {}, jumped: [], confirming: [], kind: 'picture' }, stage)
}

/** The walk found `level`: one confirming round for each jumped-over stage below it that the walk did not ask, lowest first. */
function found(s: PlacementState, level: number): Step {
  const confirming = s.jumped.filter((j) => j < level && !s.counts[j]).sort((a, b) => a - b)
  if (!confirming.length) return done(s, level)
  return ask({ ...s, stage: level, confirming }, confirming[0])
}

/**
 * The round a saved walk asks next (a resume: the save keeps the state, not `next`). While confirming, `state.stage` is
 * the level found, and the stage asked is the first confirmation.
 */
export function askOf(s: PlacementState): { stage: number; kind: 'picture' | 'name' } {
  return { stage: s.confirming.length ? s.confirming[0] : s.stage, kind: s.kind }
}

export function stepPlacement(s: PlacementState, right: boolean, ready: number[]): Step {
  const base: PlacementState = { ...s, asked: s.asked + 1, kind: flip(s.kind) }

  if (s.confirming.length) {
    const [stage, ...rest] = s.confirming
    if (!right) return done(base, stage)
    if (!rest.length) return done(base, s.stage)
    return ask({ ...base, confirming: rest }, rest[0])
  }

  const { lo, top } = range(ready)
  const stage = s.stage
  const was = s.counts[stage] ?? { right: 0, wrong: 0 }
  const c = right ? { ...was, right: was.right + 1 } : { ...was, wrong: was.wrong + 1 }
  const st: PlacementState = { ...base, missed: s.missed || !right, counts: { ...s.counts, [stage]: c } }
  /** the walk goes on at `to`, unless this was its last answer: then the stage asked is his level */
  const go = (next: PlacementState, to: number): Step => (next.asked >= MAX_ANSWERS ? found(next, stage) : ask({ ...next, stage: to }, to))

  if (stage === top && c.right >= 2) return found(st, top)

  if (!s.missed) {
    if (!right) return go(st, stage) // his first miss: ask the stage again
    const to = Math.min(stage + 2, top)
    const jumped = [...st.jumped]
    for (let j = stage + 1; j < to; j++) jumped.push(j)
    return go({ ...st, jumped }, to)
  }

  if (right) return go(st, c.right >= 2 ? stage + 1 : stage)
  if (c.wrong < 2) return go(st, stage)
  if (stage === lo || (st.counts[stage - 1]?.right ?? 0) > 0) return found(st, stage)
  return go(st, stage - 1)
}

const SEED: Tally = { seen: 3, wrong: 0 }

/** every unit and every stage-5 blend skill (`BLENDS`, spec Part 3 tracks them) of the stages below `level`: 3 right */
export function seedAfterPlacement(level: number): Record<string, Tally> {
  const out: Record<string, Tally> = {}
  for (let s = 1; s < level; s++) for (const u of unitsOfStage(s)) out[u.id] = { ...SEED }
  if (level > 5) for (const b of BLENDS) out[b.id] = { ...SEED }
  return out
}

/**
 * The credit of one placement answer (spec: credit per sound unit). Right: one right answer for each unit of the word
 * (once each) and for each of its blend skills. A miss: one wrong answer for the unit the stage tests, only.
 */
export function creditOf(w: EnWord, stageUnit: string, right: boolean): { unit: string; right: boolean }[] {
  if (!right) return [{ unit: stageUnit, right: false }]
  return [...new Set([...w.units, ...(w.blends ?? [])])].map((unit) => ({ unit, right: true }))
}
