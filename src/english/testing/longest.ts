// The longest real words of each stage (asset plan 1.17): a set, since ties are all longest.
import { WORDS } from '../content/words'

export const longestPerStage = (): Record<number, Set<string>> => {
  const out: Record<number, Set<string>> = {}
  for (let s = 1; s <= 9; s++) {
    const real = WORDS.filter((w) => w.kind === 'real' && w.stage === s)
    const max = Math.max(...real.map((w) => w.text.length))
    out[s] = new Set(real.filter((w) => w.text.length === max).map((w) => w.text))
  }
  return out
}
