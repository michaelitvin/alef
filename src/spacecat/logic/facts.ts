// Space Cat's items: sums, comparisons and jump rows, each belonging to exactly one rung of the ladder (rungs.ts).
// Pure, no state. A rung's items are built lazily (the big rungs hold thousands) and cached; `itemById` parses the id
// and classifies, it never builds a rung.
import type { RungId } from './rungs'

export type Op = '+' | '−' | '×' | '÷'
/** which place is the ring: a op b = c */
export type Hole = 'c' | 'a' | 'b'
export type Sign = '<' | '=' | '>'
type Kind = 'sum' | 'compare' | 'jumps'

interface ItemBase {
  kind: Kind
  id: string
  fact: string
  rung: RungId
  /** a ring variant: no rung of its own; tallied to its fact's rung, offered only in review */
  variant?: true
}
export interface SumItem extends ItemBase {
  kind: 'sum'; a: number; op: Op; b: number; c: number; hole: Hole; answer: number
  /** T1: a repeated three times (b === a) */
  thrice?: true
}
export interface CompareItem extends ItemBase { kind: 'compare'; a: number; b: number; answer: Sign }
export interface JumpsItem extends ItemBase { kind: 'jumps'; row: [number, number, number, number]; hole: 0 | 1 | 2 | 3; step: number; answer: number }
export type Item = SumItem | CompareItem | JumpsItem

// ---------- the numbers of the design (each pinned in facts.test.ts)

/** rung 1 sums to this; the tens, twenty and hundred the design counts to */
export const RUNG_1_MAX = 5, TEN = 10, TWENTY = 20, HUNDRED = 100
/** comparisons: C1 takes every pair 0 to 20, C2 every other pair 10 to 99 */
export const COMPARE_SMALL_MAX = 20, COMPARE_BIG_MIN = 10, COMPARE_BIG_MAX = 99
/** jump rows: the last number of each step (S1 jumps of 2, 5, 10; S2 jumps of 3, 4, and 10 off the tens) */
export const S1_LAST_MAX: Readonly<Record<number, number>> = { 2: 20, 5: 50, 10: 100 }
export const S2_LAST_MAX: Readonly<Record<number, number>> = { 3: 30, 4: 40 }
export const S2_TENS_LAST_MAX = 97
/** T1: the addend a of a + a + a */
export const T1_MIN = 2, T1_MAX = 6
/** the factors of T2 (one of them) and T3 (both) */
export const T2_FACTORS: readonly number[] = [2, 5, 10]
export const T3_FACTORS: readonly number[] = [3, 4, 6]
/** T4a and T4b: the product is at most this */
export const T4_PRODUCT_MAX = 36
/** H1: the answer lies in this range */
export const H1_ANSWER_MIN = 100, H1_ANSWER_MAX = 999

const ASCII: Record<Op, string> = { '+': '+', '−': '-', '×': 'x', '÷': '/' }
const OP_OF: Record<string, Op> = { '+': '+', '-': '−', x: '×', '/': '÷' }

function factKey(op: Op, a: number, b: number): string {
  if (op === '+' || op === '×') return `${ASCII[op]}${Math.min(a, b)},${Math.max(a, b)}`
  return `${ASCII[op]}${a},${b}`
}

const ones = (n: number) => n % 10
const wholeTen = (n: number) => n >= 10 && n % 10 === 0
const between = (n: number, lo: number, hi: number) => n >= lo && n <= hi
const range = (lo: number, hi: number, step = 1) => {
  const out: number[] = []
  for (let n = lo; n <= hi; n += step) out.push(n)
  return out
}

// ---------- classification of a sum

type Form = (a: number, op: Op, b: number, c: number) => boolean
const plus = (op: Op) => op === '+'
const minus = (op: Op) => op === '−'

/** the rungs of the plain sums, read with the ring at c */
const FORM: Partial<Record<RungId, Form>> = {
  '1': (_a, op, _b, c) => plus(op) && c <= RUNG_1_MAX,
  '2': (a, op) => minus(op) && a <= RUNG_1_MAX,
  '3': (_a, op, _b, c) => plus(op) && between(c, 6, TEN),
  '5': (a, op) => minus(op) && between(a, 6, TEN),
  '8': (a, _op, b, c) => wholeTen(a) && wholeTen(b) && between(c, TEN, HUNDRED),
  '9': (a, op, b) => plus(op) && ((a === b && between(a, 6, 9)) || (Math.abs(a - b) === 1 && between(Math.min(a, b), 5, 8))),
  '7': (a, op, b, c) =>
    (plus(op) && between(c, 11, TWENTY) && ones(a) + ones(b) <= 9) ||
    (minus(op) && between(a, 11, 19) && between(b, 1, TEN) && (b === TEN || ones(a) >= b)),
  '10': (a, op, b, c) => plus(op) && between(a, 2, 9) && between(b, 2, 9) && c >= 11,
  '11': (a, op, b) => minus(op) && between(a, 11, 18) && between(b, 2, 9) && ones(a) < b,
  '13': (a, op, b, c) =>
    between(a, 20, 99) && between(b, 1, 9) && (plus(op) ? ones(a) + b <= 9 && c <= 99 : ones(a) >= b),
  '14': (a, _op, b, c) => between(a, 11, 99) && !wholeTen(a) && wholeTen(b) && between(c, 1, 99),
  '15': (a, op, b, c) =>
    between(a, 20, 99) && between(b, 2, 9) && (plus(op) ? ones(a) + b >= 10 && c <= HUNDRED : ones(a) < b),
  '16': (a, op, b, c) =>
    between(a, 11, 99) && between(b, 11, 99) && !wholeTen(b) &&
    (plus(op) ? ones(a) + ones(b) <= 9 && c <= HUNDRED : ones(a) >= ones(b) && a > b),
  '17': (a, op, b, c) => plus(op) && between(a, 11, 99) && between(b, 11, 99) && ones(a) + ones(b) >= 10 && c <= HUNDRED,
  '18': (a, op, b) => minus(op) && between(a, 11, 99) && between(b, 11, 99) && a > b && ones(a) < ones(b),
}
/** the order the plain rungs are tried in: 8 before 7, 9 before 7 and 10, the rest as the ladder */
const FORM_ORDER: RungId[] = ['1', '2', '3', '5', '8', '9', '7', '10', '11', '13', '14', '15', '16', '17', '18']
/** rung 19 takes a moved ring on a sum of these rungs */
const RUNG_19_FORMS: readonly RungId[] = ['8', '13', '14', '15', '16', '17', '18']
/** the rungs whose sums also come with the ring moved (in review): the design's layer 2 */
const VARIANT_RUNGS: readonly RungId[] = ['7', '8', '9', '10', '11', '13', '14', '15', '16', '17', '18', 'H1', 'T2', 'T3', 'T5']

/** H1: no regrouping in any digit */
function noRegroup(a: number, op: Op, b: number): boolean {
  let x = a, y = b
  while (x > 0 || y > 0) {
    const dx = x % 10, dy = y % 10
    if (plus(op) ? dx + dy > 9 : dx < dy) return false
    x = Math.floor(x / 10)
    y = Math.floor(y / 10)
  }
  return true
}
function isH1(a: number, op: Op, b: number, c: number): boolean {
  if (!(plus(op) || minus(op)) || a % 5 !== 0 || !between(a, 100, 995) || !between(c, H1_ANSWER_MIN, H1_ANSWER_MAX)) return false
  const okB = (between(b, 10, 90) && b % 10 === 0) || (between(b, 100, 800) && b % 100 === 0) || (a % 10 === 0 && between(b, 11, 99))
  return okB && noRegroup(a, op, b)
}

function timesForm(a: number, b: number): RungId | undefined {
  if (!between(a, 1, TEN) || !between(b, 1, TEN)) return undefined
  if (T2_FACTORS.includes(a) || T2_FACTORS.includes(b)) return 'T2'
  if (T3_FACTORS.includes(a) && T3_FACTORS.includes(b)) return 'T3'
  if (a >= 2 && b >= 2) return 'T5'
  return undefined
}

/** the rung of a sum with the ring at c (the form of every moved-ring item) */
function formRung(a: number, op: Op, b: number, c: number): RungId | undefined {
  if (op === '×') return timesForm(a, b)
  if (op === '÷') return undefined
  for (const r of FORM_ORDER) if (FORM[r]!(a, op, b, c)) return r
  return isH1(a, op, b, c) ? 'H1' : undefined
}

/** The one rung of a sum (the design's *Content* column, with its precedence), or undefined when it belongs to none. */
export function classifySum(a: number, op: Op, b: number, c: number, hole: Hole): RungId | undefined {
  if (op === '×') {
    if (hole === 'c') return timesForm(a, b)
    if (hole !== 'b') return undefined
    const f = timesForm(a, b)
    if (f === 'T5') return 'T6'
    return (f === 'T2' || f === 'T3') && c <= T4_PRODUCT_MAX ? 'T4a' : undefined
  }
  if (op === '÷') {
    if (hole !== 'c') return undefined
    const f = timesForm(b, c)
    if (f === 'T5') return 'T6'
    return (f === 'T2' || f === 'T3') && a <= T4_PRODUCT_MAX ? 'T4b' : undefined
  }
  if (hole === 'c') return formRung(a, op, b, c)
  if (hole === 'b') {
    if (plus(op) && c === TEN && between(a, 1, 9)) return '4'
    if (a <= TEN && b <= TEN && c <= TEN) return '6'
  } else if (a <= TWENTY && b <= TWENTY && c <= TWENTY) return '12'
  const f = formRung(a, op, b, c)
  return f !== undefined && RUNG_19_FORMS.includes(f) ? '19' : undefined
}

// ---------- the items

const byId = new Map<string, Item | undefined>()
const intern = <T extends Item>(it: T): T => {
  const old = byId.get(it.id)
  if (old) return old as T
  byId.set(it.id, it)
  return it
}

function sumItem(a: number, op: Op, b: number, c: number, hole: Hole, rung: RungId, variant?: true): SumItem {
  return intern({
    kind: 'sum', id: `${a}${ASCII[op]}${b}=${c}/${hole}`, fact: factKey(op, a, b), a, op, b, c, hole, rung,
    answer: hole === 'c' ? c : hole === 'a' ? a : b, ...(variant ? { variant } : {}),
  })
}
function thriceItem(a: number): SumItem {
  return intern({
    kind: 'sum', id: `${a}+${a}+${a}=${3 * a}/c`, fact: `r${a}`, a, op: '+', b: a, c: 3 * a, hole: 'c', rung: 'T1', answer: 3 * a, thrice: true,
  })
}
const signOf = (a: number, b: number): Sign => (a < b ? '<' : a > b ? '>' : '=')
function compareItem(a: number, b: number, rung: RungId): CompareItem {
  return intern({ kind: 'compare', id: `${a}?${b}`, fact: `?${Math.min(a, b)},${Math.max(a, b)}`, rung, a, b, answer: signOf(a, b) })
}
function jumpsItem(first: number, step: number, hole: 0 | 1 | 2 | 3, rung: RungId): JumpsItem {
  const row = [0, 1, 2, 3].map((i) => first + i * step) as [number, number, number, number]
  return intern({
    kind: 'jumps', id: row.map((n, i) => (i === hole ? '_' : String(n))).join(','), fact: `j${step}:${first}`, rung, row, hole, step, answer: row[hole],
  })
}

export function classifyCompare(a: number, b: number): RungId | undefined {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return undefined
  if (between(a, 0, COMPARE_SMALL_MAX) && between(b, 0, COMPARE_SMALL_MAX)) return 'C1'
  if (between(a, COMPARE_BIG_MIN, COMPARE_BIG_MAX) && between(b, COMPARE_BIG_MIN, COMPARE_BIG_MAX)) return 'C2'
  return undefined
}

export function classifyJumps(first: number, step: number, hole: number): RungId | undefined {
  const last = first + 3 * step
  if (!Number.isInteger(first) || first < 0 || !Number.isInteger(hole)) return undefined
  if (hole === 3 && S1_LAST_MAX[step] !== undefined && first % step === 0 && last <= S1_LAST_MAX[step]) return 'S1'
  if (!between(hole, 1, 3)) return undefined
  if (S2_LAST_MAX[step] !== undefined && first % step === 0 && last <= S2_LAST_MAX[step]) return 'S2'
  if (step === 10 && first % 10 !== 0 && last <= S2_TENS_LAST_MAX) return 'S2'
  return undefined
}

function buildRung(r: RungId): Item[] {
  const out: Item[] = []
  if (r === 'T1') return range(T1_MIN, T1_MAX).map(thriceItem)
  if (r === 'C1' || r === 'C2') {
    const [lo, hi] = r === 'C1' ? [0, COMPARE_SMALL_MAX] : [COMPARE_BIG_MIN, COMPARE_BIG_MAX]
    for (const a of range(lo, hi)) for (const b of range(lo, hi)) if (classifyCompare(a, b) === r) out.push(compareItem(a, b, r))
    return out
  }
  if (r === 'S1' || r === 'S2') {
    const steps = r === 'S1' ? [2, 5, 10] : [3, 4, 10]
    for (const step of steps) for (const first of range(0, 97)) for (const hole of [1, 2, 3] as const) {
      if (classifyJumps(first, step, hole) === r) out.push(jumpsItem(first, step, hole, r))
    }
    return out
  }
  if (r === 'H1') {
    for (const a of range(100, 995, 5)) {
      for (const op of ['+', '−'] as Op[]) {
        for (const b of range(10, 800)) {
          const c = op === '+' ? a + b : a - b
          if (c >= 0 && isH1(a, op, b, c)) out.push(sumItem(a, op, b, c, 'c', 'H1'))
        }
      }
    }
    return out
  }
  if (r[0] === 'T') {
    for (const a of range(1, TEN)) for (const b of range(1, TEN)) {
      if (classifySum(a, '×', b, a * b, 'c') === r) out.push(sumItem(a, '×', b, a * b, 'c', r))
      if (classifySum(a, '×', b, a * b, 'b') === r) out.push(sumItem(a, '×', b, a * b, 'b', r))
      if (classifySum(a * b, '÷', a, b, 'c') === r) out.push(sumItem(a * b, '÷', a, b, 'c', r))
    }
    return out
  }
  return plainBuckets().get(r) ?? out
}

/** one pass over every plus and minus sum to 100 sorts it into its rung (the plain rungs share it) */
let plain: Map<RungId, Item[]> | undefined
function plainBuckets(): Map<RungId, Item[]> {
  if (plain) return plain
  const m = new Map<RungId, Item[]>()
  for (const a of range(0, HUNDRED)) for (const b of range(0, HUNDRED)) {
    for (const op of ['+', '−'] as Op[]) {
      const c = op === '+' ? a + b : a - b
      if (c < 0 || c > HUNDRED) continue
      for (const hole of ['c', 'b', 'a'] as Hole[]) {
        const r = classifySum(a, op, b, c, hole)
        if (r === undefined) continue
        let list = m.get(r)
        if (!list) m.set(r, (list = []))
        list.push(sumItem(a, op, b, c, hole, r))
      }
    }
  }
  plain = m
  return m
}

const rungCache = new Map<RungId, Item[]>()
/** the native items of a rung, built on first use */
export function itemsOfRung(r: RungId): Item[] {
  let items = rungCache.get(r)
  if (!items) {
    items = buildRung(r)
    rungCache.set(r, items)
  }
  return items
}

const SUM_ID = /^(\d+)([+\-x/])(\d+)=(\d+)\/([abc])$/
const THRICE_ID = /^(\d+)\+(\d+)\+(\d+)=(\d+)\/c$/
const COMPARE_ID = /^(\d+)\?(\d+)$/
const JUMPS_ID = /^(\d+|_),(\d+|_),(\d+|_),(\d+|_)$/

function parseSum(id: string): Item | undefined {
  const t = THRICE_ID.exec(id)
  if (t) {
    const [a, b, c, s] = t.slice(1).map(Number)
    return a === b && b === c && s === 3 * a && between(a, T1_MIN, T1_MAX) ? thriceItem(a) : undefined
  }
  const m = SUM_ID.exec(id)
  if (!m) return undefined
  const a = Number(m[1]), b = Number(m[3]), c = Number(m[4])
  const op = OP_OF[m[2]], hole = m[5] as Hole
  const exact = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : b !== 0 ? a / b : NaN
  if (exact !== c || c < 0) return undefined
  const native = classifySum(a, op, b, c, hole)
  if (native) return sumItem(a, op, b, c, hole, native)
  if (hole === 'c' || op === '÷' || (op === '×' && hole !== 'b')) return undefined
  const form = formRung(a, op, b, c)
  return form !== undefined && VARIANT_RUNGS.includes(form) ? sumItem(a, op, b, c, hole, form, true) : undefined
}

function parseCompare(id: string): Item | undefined {
  const m = COMPARE_ID.exec(id)
  if (!m) return undefined
  const a = Number(m[1]), b = Number(m[2])
  const rung = classifyCompare(a, b)
  return rung ? compareItem(a, b, rung) : undefined
}

function parseJumps(id: string): Item | undefined {
  const m = JUMPS_ID.exec(id)
  if (!m) return undefined
  const tokens = m.slice(1)
  const hole = tokens.indexOf('_')
  if (hole < 0 || tokens.lastIndexOf('_') !== hole) return undefined
  const known = tokens.map((t, i) => [i, Number(t)] as const).filter(([i]) => i !== hole)
  const [i0, v0] = known[0], [i1, v1] = known[1]
  const step = (v1 - v0) / (i1 - i0)
  const first = v0 - i0 * step
  if (!Number.isInteger(step) || step <= 0 || !known.every(([i, v]) => v === first + i * step)) return undefined
  const rung = classifyJumps(first, step, hole)
  return rung ? jumpsItem(first, step, hole as 0 | 1 | 2 | 3, rung) : undefined
}

/** The item of an id (parsed and classified, no rung is built); undefined when it belongs to no rung. */
export function itemById(id: string): Item | undefined {
  if (byId.has(id)) return byId.get(id)
  const it = parseSum(id) ?? parseCompare(id) ?? parseJumps(id)
  if (!it) byId.set(id, undefined)
  return it
}

const variantCache = new Map<string, SumItem[]>()
/**
 * The items of a plain rung with the ring moved (to b; to a as well for + and −): the design's ring variants. A moved
 * item that a native rung owns (12, 19, T4a, T6) is that native item; the others are variants of this rung.
 */
export function variantsOf(r: RungId, opts: { b: boolean; a: boolean }): SumItem[] {
  if (!VARIANT_RUNGS.includes(r)) return []
  const key = `${r}:${opts.b}:${opts.a}`
  let out = variantCache.get(key)
  if (!out) {
    const seen = new Set<string>()
    out = []
    for (const it of itemsOfRung(r)) {
      if (it.kind !== 'sum') continue
      const holes: Hole[] = []
      if (opts.b) holes.push('b')
      if (opts.a && (it.op === '+' || it.op === '−')) holes.push('a')
      for (const h of holes) {
        const moved = itemById(`${it.a}${ASCII[it.op]}${it.b}=${it.c}/${h}`)
        if (moved?.kind === 'sum' && !seen.has(moved.id)) {
          seen.add(moved.id)
          out.push(moved)
        }
      }
    }
    variantCache.set(key, out)
  }
  return out
}

const maxCache = new Map<RungId, number>()
/** the highest number in the native items of a rung */
export function maxOfRung(r: RungId): number {
  let m = maxCache.get(r)
  if (m === undefined) {
    m = 0
    for (const it of itemsOfRung(r)) {
      if (it.kind === 'sum') m = Math.max(m, it.a, it.b, it.c)
      else if (it.kind === 'compare') m = Math.max(m, it.a, it.b)
      else m = Math.max(m, ...it.row)
    }
    maxCache.set(r, m)
  }
  return m
}

/** + 0 or − 0: either operand 0 for +, b = 0 for − */
export const isZeroFact = (it: Item): boolean =>
  it.kind === 'sum' && (it.op === '+' ? it.a === 0 || it.b === 0 : it.op === '−' && it.b === 0)

/** facts that come at most once in 15 rounds: + 0, − 0, × 0, × 1, ÷ 1, and a × ◯ with a = 1 */
export const isRareFact = (it: Item): boolean => {
  if (it.kind !== 'sum' || it.thrice) return false
  switch (it.op) {
    case '+': return it.a === 0 || it.b === 0
    case '−': return it.b === 0
    case '×': return it.a === 0 || it.b === 0 || it.a === 1 || it.b === 1
    case '÷': return it.b === 1
  }
}
