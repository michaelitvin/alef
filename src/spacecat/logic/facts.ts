// Space Cat's sums: facts, items and the nine rungs of the ladder. Pure, no state.
export type Op = '+' | '−' | '×' | '÷'
/** which place is the ring: a op b = c */
export type Hole = 'c' | 'a' | 'b'
export type RungId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export interface Item { id: string; fact: string; a: number; op: Op; b: number; c: number; hole: Hole; rung: RungId; answer: number }

/** rungs 7 and 8 need the parent's times switch, rung 9 the divide switch */
export const RUNGS: { id: RungId; needs?: 'times' | 'divide' }[] = [
  { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 },
  { id: 7, needs: 'times' }, { id: 8, needs: 'times' }, { id: 9, needs: 'divide' },
]

const ASCII: Record<Op, string> = { '+': '+', '−': '-', '×': 'x', '÷': '/' }

function factKey(op: Op, a: number, b: number): string {
  if (op === '+' || op === '×') return `${ASCII[op]}${Math.min(a, b)},${Math.max(a, b)}`
  return `${ASCII[op]}${a},${b}`
}

function make(a: number, op: Op, b: number, c: number, hole: Hole, rung: RungId): Item {
  return {
    id: `${a}${ASCII[op]}${b}=${c}/${hole}`, fact: factKey(op, a, b), a, op, b, c, hole, rung,
    answer: hole === 'c' ? c : hole === 'a' ? a : b,
  }
}

const range = (lo: number, hi: number) => Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i)

function build(): Map<RungId, Item[]> {
  const rungs = new Map<RungId, Item[]>()
  const plus = (rung: RungId, ok: (a: number, b: number, c: number) => boolean) => {
    const out: Item[] = []
    for (const a of range(0, 20)) for (const b of range(0, 20)) if (ok(a, b, a + b)) out.push(make(a, '+', b, a + b, 'c', rung))
    return out
  }
  const minus = (rung: RungId, ok: (a: number, b: number) => boolean) => {
    const out: Item[] = []
    for (const a of range(0, 20)) for (const b of range(0, a)) if (ok(a, b)) out.push(make(a, '−', b, a - b, 'c', rung))
    return out
  }
  rungs.set(1, plus(1, (_a, _b, c) => c <= 5))
  rungs.set(2, plus(2, (_a, _b, c) => c >= 6 && c <= 10))
  rungs.set(3, minus(3, (a) => a <= 10))
  const base = [...rungs.get(1)!, ...rungs.get(2)!, ...rungs.get(3)!]
  rungs.set(4, base.flatMap((i) => (['a', 'b'] as Hole[]).map((h) => make(i.a, i.op, i.b, i.c, h, 4))))
  rungs.set(5, [
    ...plus(5, (a, b, c) => c >= 11 && c <= 20 && (a % 10) + (b % 10) <= 9),
    ...minus(5, (a, b) => a >= 11 && a <= 20 && b >= 1 && b <= 9 && a % 10 >= b),
  ])
  rungs.set(6, [
    ...plus(6, (a, b, c) => a >= 2 && a <= 9 && b >= 2 && b <= 9 && c >= 11),
    ...minus(6, (a, b) => a >= 11 && a <= 18 && b >= 2 && b <= 9 && a % 10 < b),
  ])
  const times = (rung: RungId, ok: (a: number, b: number) => boolean) => {
    const out: Item[] = []
    for (const a of range(1, 10)) for (const b of range(1, 10)) if (ok(a, b)) out.push(make(a, '×', b, a * b, 'c', rung))
    return out
  }
  rungs.set(7, times(7, (a, b) => a <= 5 || b <= 5))
  rungs.set(8, times(8, (a, b) => a > 5 && b > 5))
  rungs.set(9, [...rungs.get(7)!, ...rungs.get(8)!].map((i) => make(i.c, '÷', i.a, i.b, 'c', 9)))
  return rungs
}

let cache: Map<RungId, Item[]> | undefined
let byId: Map<string, Item> | undefined
function rungs() {
  if (!cache) {
    cache = build()
    byId = new Map([...cache.values()].flat().map((i) => [i.id, i]))
  }
  return cache
}

export function itemsOfRung(r: RungId): Item[] {
  return rungs().get(r)!
}

export function itemById(id: string): Item | undefined {
  rungs()
  return byId!.get(id)
}

/** + 0 or − 0: either operand 0 for +, b = 0 for − */
export const isZeroFact = (it: Item): boolean => (it.op === '+' ? it.a === 0 || it.b === 0 : it.op === '−' && it.b === 0)

/** the highest number in any item of these rungs */
export function maxNumber(open: RungId[]): number {
  let m = 0
  for (const r of open) for (const i of itemsOfRung(r)) m = Math.max(m, i.a, i.b, i.c)
  return m
}
