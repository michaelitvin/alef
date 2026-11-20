// The three wrong planets of a round, and where the four numbers go.
import type { Rng } from '../../shared/adaptive'

export const LANES = 4
/** the wrong answers lie within this distance of the right one */
export const NEAR = 3
/** the right answer is not in the ship's own lane in this share of the rounds */
export const RIGHT_OFF_SHIP = 0.9

function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Three different wrong numbers from answer ± 1..NEAR within 0..max; the child's recorded wrong pick (`confusion`) is one of them. */
export function wrongAnswers(rng: Rng, answer: number, max: number, confusion?: number): number[] {
  const near: number[] = []
  for (let d = 1; d <= NEAR; d++) for (const n of [answer - d, answer + d]) if (n >= 0 && n <= max) near.push(n)
  const usable = confusion !== undefined && Number.isInteger(confusion) && confusion >= 0 && confusion <= max && confusion !== answer
  const out: number[] = usable ? [confusion] : []
  for (const n of shuffle(rng, near)) {
    if (out.length === 3) break
    if (!out.includes(n)) out.push(n)
  }
  return out
}

/** Four labels, one per lane, the right answer among them: off the ship's lane with probability RIGHT_OFF_SHIP. */
export function placeLanes(rng: Rng, answer: number, wrongs: number[], shipLane: number): { labels: number[]; rightLane: number } {
  const others = Array.from({ length: LANES }, (_, i) => i).filter((l) => l !== shipLane)
  const rightLane = rng() < RIGHT_OFF_SHIP ? others[Math.floor(rng() * others.length)] : shipLane
  const rest = shuffle(rng, wrongs)
  const labels = Array.from({ length: LANES }, (_, l) => (l === rightLane ? answer : rest.shift()!))
  return { labels, rightLane }
}
