// The plug-in interface for a round's content: a reading galaxy can later implement the same shape. Space Cat's own
// content is a sum, a comparison or a jump row: a box of tokens with one ring, and 3 or 4 labels on the planets.
import type { Rng } from '../shared/adaptive'
import type { Item, Kind, SumItem } from './logic/facts'
import type { RungId } from './logic/rungs'
import { COMPARE_LANES, LANES, SIGNS, placeLanes, wrongAnswers } from './logic/wrongs'

/** the equal groups drawn for a product or a quotient: `groups` pods of `each` dots; `share` for a divide (the dots fall in) */
export interface Pods { groups: number; each: number; share: boolean }

export interface RoundContent {
  kind: Kind
  /** the box's tokens; null is the ring (the missing place) */
  box: (string | null)[]
  /** one label per lane: 3 (a comparison) or 4 */
  labels: string[]
  rightLane: number
  /** the right answer as the planet shows it (a sign for a comparison) */
  flyNumber: string
  itemId: string
  fact: string
  rung: RungId
  /** a comparison: the box index of the bigger number, or both for = */
  bigger?: 0 | 2 | 'both'
  /** the rungs T1 to T4b: the equal groups */
  pods?: Pods
}

/** the rungs whose products (at most this) get pods */
const POD_RUNGS: readonly RungId[] = ['T1', 'T2', 'T3', 'T4a', 'T4b']
export const PODS_PRODUCT_MAX = 36

function podsOf(it: SumItem): Pods | undefined {
  if (!POD_RUNGS.includes(it.rung)) return undefined
  if (it.thrice) return { groups: 3, each: it.a, share: false }
  if (it.op === '÷') return it.a <= PODS_PRODUCT_MAX ? { groups: it.b, each: it.c, share: true } : undefined
  return it.op === '×' && it.a * it.b <= PODS_PRODUCT_MAX ? { groups: it.a, each: it.b, share: false } : undefined
}

/** whether a round of this item shows the equal groups (a pod rung, at most PODS_PRODUCT_MAX dots) */
export const hasPods = (it: Item): boolean => it.kind === 'sum' && podsOf(it) !== undefined

const digits = (s: string | undefined): number | undefined => (s !== undefined && /^\d+$/.test(s) ? Number(s) : undefined)

/** `confusion` is his most frequent wrong pick for the item, as the planet showed it (digits, or a sign) */
export function makeRound(rng: Rng, it: Item, shipLane: number, confusion?: string): RoundContent {
  const base = { kind: it.kind, itemId: it.id, fact: it.fact, rung: it.rung }
  if (it.kind === 'compare') {
    const wrongs = SIGNS.filter((s) => s !== it.answer)
    const { labels, rightLane } = placeLanes(rng, it.answer, wrongs, shipLane, COMPARE_LANES)
    const bigger = it.a === it.b ? 'both' : it.a > it.b ? 0 : 2
    return { ...base, box: [String(it.a), null, String(it.b)], labels, rightLane, flyNumber: it.answer, bigger }
  }
  const wrongs = wrongAnswers(rng, it, digits(confusion))
  const { labels, rightLane } = placeLanes(rng, String(it.answer), wrongs.map(String), shipLane, LANES)
  const flyNumber = String(it.answer)
  if (it.kind === 'jumps') {
    return { ...base, box: it.row.map((n, i) => (i === it.hole ? null : String(n))), labels, rightLane, flyNumber }
  }
  const tok = (hole: 'a' | 'b' | 'c', n: number) => (it.hole === hole ? null : String(n))
  const box = it.thrice
    ? [String(it.a), '+', String(it.a), '+', String(it.a), '=', null]
    : [tok('a', it.a), it.op, tok('b', it.b), '=', tok('c', it.c)]
  const pods = podsOf(it)
  return { ...base, box, labels, rightLane, flyNumber, ...(pods ? { pods } : {}) }
}
