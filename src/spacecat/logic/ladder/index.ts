// The ladder's API (the design's *Placement, practice, and the way up and down*): the store and the controller call
// only these. Pure: time comes in as `now`, chance as `rng`.
import type { Item } from '../facts'
import type { Mark } from '../predict'
import type { Band } from '../rungs'
import { choosePractice, type ChooseCtx } from './mix'
import { applyPractice, markGuard } from './practice'
import type { Ladder, LadderEvent, LadderSettings, Part } from './state'

export { frontier, offered, statusText } from './frontier'
export { LADDER_START } from './state'
export type { By, Change, Ladder, LadderEvent, LadderSettings, Mode, Part, RungState, Status } from './state'

export function chooseRound(l: Ladder, ctx: ChooseCtx): { item: Item; part: Part; ladder: Ladder } {
  return choosePractice(l, ctx)
}

export function afterAnswer(
  l: Ladder, a: { item: Item; part: Part; mark: Mark; fast: boolean; now: number; set: LadderSettings },
): { ladder: Ladder; events: LadderEvent[]; holdSpeed?: Band } {
  const marked = { ...markGuard(l, a.mark), lastAt: a.now }
  return applyPractice(marked, a)
}
