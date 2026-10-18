// Desirable difficulty, shared by the minigames: predict the chance of a mistake from recent answers (decaying)
// blended with the lifetime rate, then choose the candidate nearest one mistake in five.
export type Rng = () => number
export interface Tally { seen?: number; wrong?: number; timeout?: number }

/** Desirable difficulty: aim each round at about one mistake in five. */
export const TARGET_MISTAKE_RATE = 0.2
/** How fast older answers fade: the newest counts 1, the one before 0.75, then 0.56… */
export const RECENT_DECAY = 0.75
/** The lifetime rate counts like this many recent answers: recent results lead, history is remembered. */
export const HISTORY_WEIGHT = 3
/** Answers kept per item (x = wrong or too slow, o = right), newest last. */
export const RECENT_KEEP = 12

/** Predicted chance of a miss. `prior` is the rate assumed before any answer (worth 2 answers). */
export function predictedMistakeRate(t: Tally | undefined, recent = '', prior = 0.25) {
  const history = ((t?.wrong ?? 0) + (t?.timeout ?? 0) + 2 * prior) / ((t?.seen ?? 0) + 2)
  let weight = 0
  let missed = 0
  let w = 1
  for (let i = recent.length - 1; i >= 0; i--) {
    weight += w
    if (recent[i] === 'x') missed += w
    w *= RECENT_DECAY
  }
  return (missed + HISTORY_WEIGHT * history) / (weight + HISTORY_WEIGHT)
}

/**
 * Index of the candidate to use: the one whose predicted rate is closest to the target; when none is that hard,
 * the hardest. Weight = 0.03 (variety) + a bell around the aim whose width scales with it.
 */
export function pickNearTarget(rng: Rng, predicted: number[], target = TARGET_MISTAKE_RATE): number {
  const aim = Math.min(target, Math.max(...predicted))
  const width = Math.max(0.03, aim * 0.35)
  const w = predicted.map((x) => 0.03 + Math.exp(-(((x - aim) / width) ** 2)))
  let r = rng() * w.reduce((s, x) => s + x, 0)
  for (let i = 0; i < w.length; i++) {
    r -= w[i]
    if (r <= 0) return i
  }
  return w.length - 1
}

export const pushRecent = (recent: string | undefined, miss: boolean) => ((recent ?? '') + (miss ? 'x' : 'o')).slice(-RECENT_KEEP)
