// The misconception planet: the number a child gets from a typical slip, per rung (the design's *Misconception planet*
// column). Pure. The list is in order of preference; `wrongAnswers` takes the first legal one.
import type { JumpsItem, SumItem } from './facts'
import type { RungId } from './rungs'

const ones = (n: number) => n % 10
const tens = (n: number) => Math.floor(n / 10)

/** the slips of one rung for an item with the ring at c (a op b = c) */
function ofRung(r: RungId, it: SumItem): number[] {
  const { a, b, c, op } = it
  const plus = op === '+'
  switch (r) {
    case '1': return [a, b]
    case '2': return [a + b]
    case '3': return [a, b, c - 1]
    case '5': return [a, b]
    case '7': return [c - 10]
    case '8': return [c / 10]
    case '9': return a === b ? [2 * (a + 1), 2 * (a - 1)] : [2 * Math.min(a, b), 2 * Math.max(a, b)]
    case '10': return [c % 10]
    case '11': return [10 + b - ones(a)]
    case '13': return plus ? [(tens(a) + b) * 10 + ones(a), c - 10, c + 10] : [c - 10, c + 10]
    case '14': return [plus ? a + b / 10 : a - b / 10]
    case '15': return plus ? [c - 10] : [tens(a) * 10 + (b - ones(a))]
    case '16': return plus ? [c + 10, c - 10] : [a + b]
    case '17': return [c - 10]
    case '18': return [(tens(a) - tens(b)) * 10 + Math.abs(ones(a) - ones(b)), c + 10]
    case 'T1': return [c - a, c + a]
    case 'T2': return [a + b, c - b, c + b]
    case 'T3': return [a + b, (a - 1) * b, a * (b - 1)]
    case 'T4b': return [b, a - b]
    case 'T5': return [(a - 1) * b, a * (b + 1), (a + 1) * b, a * (b - 1)]
    case 'T6': return [b, a - b]
    case 'H1': {
      const slip = b % 100 === 0 ? (plus ? a + b / 10 : a - b / 10) : (plus ? a + b * 10 : a - b * 10)
      return [slip, c + 100, c - 100, c + 10, c - 10]
    }
    default: return []
  }
}

/** the slips of a moved ring (the rungs 4, 6, 12, 19 and T4a/T6 read the ring's place, not the rung of the form) */
function ofHole(it: SumItem): number[] {
  const { a, b, c, op, hole } = it
  const big = Math.max(a, b, c) > 20
  if (op === '×') return [a * c, Math.abs(c - a)]
  if (hole === 'b' && !big) {
    if (it.rung === '4') return [a + c, a]
    return [a + c]
  }
  if (hole === 'a' && !big) return [op === '+' ? c + b : c - b]
  // rung 19, and the moved ring on big numbers: the two shown numbers added; for a minus with the ring at a that is the
  // answer itself, so the difference of the shown numbers comes instead
  const shown = hole === 'a' ? [b, c] : [a, c]
  return [shown[0] + shown[1], Math.abs(shown[0] - shown[1])]
}

/** the slips of a jump row */
function ofJumps(it: JumpsItem): number[] {
  const n = it.answer
  return it.rung === 'S1' ? [n + 1, n + it.step] : [n + 1, n - 1, n + it.step, n - it.step]
}

/** The misconception numbers of an item's rung, in order of preference (may include illegal numbers: the caller filters). */
export function misconceptions(it: SumItem | JumpsItem): number[] {
  if (it.kind === 'jumps') return ofJumps(it)
  if (it.thrice) return ofRung('T1', it)
  const moved = it.hole !== 'c'
  if (moved && it.op !== '÷') return ofHole(it)
  return ofRung(it.rung, it)
}
