// The plug-in interface for a round's content: a reading galaxy can later implement the same shape. Space Cat's own
// content is a sum: a box of tokens with one ring, and four numbers on the planets.
import type { Rng } from '../shared/adaptive'
import type { Item } from './logic/facts'
import { placeLanes, wrongAnswers } from './logic/wrongs'

export interface RoundContent {
  /** the sum box's tokens; null is the ring (the missing place) */
  box: (string | null)[]
  /** one label per lane */
  labels: string[]
  rightLane: number
  /** the right answer as the planet shows it */
  flyNumber: string
  itemId: string
  fact: string
}

export function makeRound(rng: Rng, it: Item, shipLane: number, confusion?: number): RoundContent {
  if (it.kind !== 'sum') throw new Error('TEMPORARY: comparisons and jump rows come with the next task')
  const wrongs = wrongAnswers(rng, it, confusion)
  const { labels, rightLane } = placeLanes(rng, String(it.answer), wrongs.map(String), shipLane)
  const tok = (hole: 'a' | 'b' | 'c', n: number) => (it.hole === hole ? null : String(n))
  return {
    box: [tok('a', it.a), it.op, tok('b', it.b), '=', tok('c', it.c)],
    labels, rightLane, flyNumber: String(it.answer), itemId: it.id, fact: it.fact,
  }
}
