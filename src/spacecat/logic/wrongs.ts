// The three wrong planets of a round, and where the numbers go (the design's *The planets of every round*).
import type { Rng } from '../../shared/adaptive'
import type { JumpsItem, Sign, SumItem } from './facts'
import { maxOfRung } from './facts'
import { misconceptions } from './misconceptions'
import { rungDef } from './rungs'

/** the lanes of a sum or jump round, and of a comparison */
export const LANES = 4, COMPARE_LANES = 3
/** a planet with no legal number tries the answer ± 2, then ± 3 */
export const NEAR = 3
/** the right answer is not in the ship's own lane in this share of the rounds */
export const RIGHT_OFF_SHIP = 0.9
/** the signs of a comparison round, one planet each */
export const SIGNS: readonly Sign[] = ['<', '=', '>']
/** from this rung order on, an answer of 10 to 99 needs a wrong with its ones digit and one with its tens digit */
export const TWO_DIGIT_FROM_ORDER = 7
/** rung 8: the near and place planets are whole tens, this far from the answer */
export const WHOLE_TENS_NEAR = 10, WHOLE_TENS_PLACE = 20

function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const both = (rng: Rng, answer: number, d: number) => shuffle(rng, [answer + d, answer - d])
const TIMES = new Set(['T2', 'T3', 'T4a', 'T4b', 'T5', 'T6'])

/** neighbour products of a × b, shuffled */
function neighbourProducts(rng: Rng, a: number, b: number): number[] {
  return shuffle(rng, [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b])
}

/** Three different wrong numbers: the misconception (or his recorded wrong pick), the near planet and the place planet. */
export function wrongAnswers(rng: Rng, it: SumItem | JumpsItem, confusion?: number): number[] {
  const answer = it.answer
  const max = maxOfRung(it.rung)
  const tensOnly = it.rung === '8'
  const base = (n: number) => Number.isInteger(n) && n >= 0 && n <= max && n !== answer
  const legal = (n: number) => base(n) && (!tensOnly || n % 10 === 0)
  const out: number[] = []
  const take = (candidates: number[], ok: (n: number) => boolean = legal): boolean => {
    for (const n of candidates) if (ok(n) && !out.includes(n)) { out.push(n); return true }
    return false
  }
  // 1. his recorded wrong pick if legal, else the first legal misconception (on rung 8 it is the dropped zero: not a ten)
  if (confusion === undefined || !take([confusion], base)) take(misconceptions(it), base)

  // 2. near planet, 3. place planet
  const plan = (kind: 'near' | 'place'): number[] => {
    if (tensOnly) return both(rng, answer, kind === 'near' ? WHOLE_TENS_NEAR : WHOLE_TENS_PLACE)
    if (kind === 'near') return both(rng, answer, 1)
    if (it.kind === 'sum' && TIMES.has(it.rung) && it.hole === 'c' && it.op === '×') return neighbourProducts(rng, it.a, it.b)
    if (TIMES.has(it.rung)) return both(rng, answer, 1)   // a quotient or a factor: the other neighbour
    return both(rng, answer, answer >= 10 ? 10 : 2)
  }
  const fallbacks = (): number[] => {
    if (tensOnly) return range10(max).sort((x, y) => Math.abs(x - answer) - Math.abs(y - answer))
    return [...both(rng, answer, 2), ...both(rng, answer, 3)]
  }
  for (const kind of ['near', 'place'] as const) {
    if (!take(plan(kind)) && !take(fallbacks())) take(nearest(answer, max, tensOnly ? 10 : 1))
  }
  while (out.length < 3) if (!take(fallbacks()) && !take(nearest(answer, max, tensOnly ? 10 : 1))) break

  if (it.answer >= 10 && it.answer <= 99 && !tensOnly && rungDef(it.rung).order >= TWO_DIGIT_FROM_ORDER) coverDigits(rng, out, answer, legal)
  return out
}

const range10 = (max: number) => Array.from({ length: Math.floor(max / 10) + 1 }, (_, i) => i * 10)
const nearest = (answer: number, max: number, unit: number): number[] => {
  const out: number[] = []
  for (let d = unit; d <= max; d += unit) out.push(answer + d, answer - d)
  return out
}

/** the wrongs must hold a number with the answer's ones digit and one with its tens digit */
function coverDigits(rng: Rng, out: number[], answer: number, legal: (n: number) => boolean) {
  const hasOnes = (xs: number[]) => xs.some((n) => n % 10 === answer % 10)
  const hasTens = (xs: number[]) => xs.some((n) => Math.floor(n / 10) === Math.floor(answer / 10))
  if (hasOnes(out) && hasTens(out)) return
  const ones = shuffle(rng, Array.from({ length: 9 }, (_, i) => [answer + 10 * (i + 1), answer - 10 * (i + 1)]).flat())
  const tensSame = shuffle(rng, Array.from({ length: 9 }, (_, i) => [answer + i + 1, answer - i - 1]).flat())
  const fixes = [...ones, ...tensSame]
  for (const slot of [1, 2]) {
    if (slot >= out.length) continue
    for (const n of fixes) {
      if (!legal(n) || out.includes(n)) continue
      const next = [...out]
      next[slot] = n
      if (hasOnes(next) && hasTens(next)) { out[slot] = n; return }
    }
  }
}

/**
 * Labels for `lanes` lanes, one per lane, the right answer among them: off the ship's lane with probability
 * RIGHT_OFF_SHIP; the wrong ones shuffled into the other lanes.
 */
export function placeLanes(rng: Rng, answer: string, wrongs: string[], shipLane: number, lanes: number = LANES): { labels: string[]; rightLane: number } {
  const others = Array.from({ length: lanes }, (_, i) => i).filter((l) => l !== shipLane)
  const rightLane = rng() < RIGHT_OFF_SHIP ? others[Math.floor(rng() * others.length)] : shipLane
  const rest = shuffle(rng, wrongs)
  const labels = Array.from({ length: lanes }, (_, l) => (l === rightLane ? answer : rest.shift()!))
  return { labels, rightLane }
}
