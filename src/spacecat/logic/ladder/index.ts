// The ladder's API (the design's *Placement, practice, and the way up and down*): the store and the controller call
// only these. Pure: time comes in as `now`, chance as `rng`.
import type { Item } from '../facts'
import type { Mark } from '../predict'
import type { Band } from '../rungs'
import { choosePractice, type ChooseCtx } from './mix'
import { afterProbe, afterRecheck, choosePlacement, chooseRecheck } from './placement'
import { afterWarmup, chooseWarmup } from './playDay'
import { applyPractice, markGuard } from './practice'
import { FIRST_JUMP, FIRST_PROBES, placementMode, type Ladder, type LadderEvent, type LadderSettings, type Part } from './state'

export { frontier, needsClosure, offered, statusText } from './frontier'
export { MIGRATION_JUMP, MIGRATION_PROBES, probeList } from './placement'
export { beginRun } from './playDay'
export { FIRST_JUMP, FIRST_PROBES, LADDER_START, placementMode } from './state'
export type { By, Change, Ladder, LadderEvent, LadderSettings, Mode, Part, RungState, Status } from './state'

/** The next round: a probe in a placement or re-check, the warm-up's mix, or practice's. Counts down the mix's counters. */
export function chooseRound(l: Ladder, ctx: ChooseCtx): { item: Item; part: Part; ladder: Ladder } {
  const m = l.mode
  switch (m.kind) {
    case 'placement':
      return { ...choosePlacement(l, m, ctx), part: 'probe' }
    case 'recheck':
      if (l.guardLeft > 0) return choosePractice(l, ctx)
      return { ...chooseRecheck(l, m, ctx), part: 'probe' }
    case 'warmup':
      return chooseWarmup(l, m, ctx)
    case 'practice':
      return choosePractice(l, ctx)
  }
}

/** One tallied answer (not a demo or cut round). `fast`: fast.ts isFast. */
export function afterAnswer(
  l: Ladder, a: { item: Item; part: Part; mark: Mark; fast: boolean; now: number; set: LadderSettings },
): { ladder: Ladder; events: LadderEvent[]; holdSpeed?: Band } {
  const marked = { ...markGuard(l, a.mark), lastAt: a.now }
  const m = marked.mode
  if (a.part === 'probe') {
    if (m.kind === 'placement') return afterProbe(marked, m, a)
    if (m.kind === 'recheck') return afterRecheck(marked, m, a)
    return { ladder: marked, events: [] }
  }
  if (m.kind === 'warmup') return afterWarmup(marked, m, a)
  return applyPractice(marked, a)
}

/** "Find his level again" (the parent): every rung new, holds and strikes cleared, a placement from rung 1. Stats stay (they are the store's). */
export function relevel(l: Ladder): Ladder {
  return {
    ...l, rungs: {}, passes: [], mode: placementMode('parent', '1', FIRST_JUMP, FIRST_PROBES),
    strikeLeft: 0, guardLeft: 0, lastMarks: '', recheckDue: false,
  }
}
