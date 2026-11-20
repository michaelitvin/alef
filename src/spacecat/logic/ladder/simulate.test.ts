// The design's placement simulation, run on the real ladder (`SC_SIM=1 npx vitest run <this file> --disableConsoleIntercept`
// prints the table; SC_SIM_N children
// per kind, 1000 by default). A child knows every rung through order position K: right 95% (fast 80%) there, 60%
// (fast 20%) one rung above, 30% (fast 5%) higher. Runs as the controller plays them: the demo skipped, a level is 7
// right answers, a run ends after 3 mistakes in a level, and each run starts a new play day.
import { describe, expect, it } from 'vitest'
import type { ItemStats, Mark } from '../predict'
import { pushMark } from '../predict'
import { isRareFact } from '../facts'
import { RUNGS, rungDef } from '../rungs'
import { afterAnswer, beginRun, chooseRound, frontier } from './index'
import { LADDER_START, statusOf, type Ladder } from './state'
import type { Rng } from '../../../shared/adaptive'
import { ALL_ON } from './testkit'

const N = Number(process.env.SC_SIM_N ?? 1000)
const CAP = 3000
const ANSWER_MS = 6000, NEXT_DAY_MS = 13 * 3600e3

/** mulberry32: a small rng whose streams of nearby seeds are independent (the tests' LCG is not, for 1000 children) */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Child { placed: number; probes: number; mistakes: number; answers: number; worst: number }

function simulate(K: number, seed: number): Child {
  const rng = mulberry32(seed * 7919 + K)
  const chance = (order: number) => (order <= K ? [0.95, 0.8] : order === K + 1 ? [0.6, 0.2] : [0.3, 0.05])
  let l: Ladder = LADDER_START
  let stats: Record<string, ItemStats> = {}
  let last: { fact?: string; sinceZero: number } = { sinceZero: 0 }
  let now = 0, answers = 0, run = 0, worst = 0
  let placed = 0, probes = 0, mistakes = 0
  const passedK = () => {
    const f = frontier(l, ALL_ON)
    return f === null || rungDef(f).order > K
  }
  while (answers < CAP) {
    l = beginRun(l, { now, set: ALL_ON }).ladder
    let hearts = 3, right = 0
    while (hearts > 0 && answers < CAP) {
      const ch = chooseRound(l, { rng, set: ALL_ON, stats, last })
      const [p, f] = chance(rungDef(ch.item.rung).order)
      const ok = rng() < p
      const fast = ok && rng() < f
      const mark: Mark = ok ? 'o' : 'x'
      const out = afterAnswer(ch.ladder, { item: ch.item, part: ch.part, mark, fast, now, set: ALL_ON })
      l = out.ladder
      answers++
      now += ANSWER_MS
      const old = stats[ch.item.id] ?? { seen: 0, wrong: 0, timeout: 0, recent: '', times: [], picks: {} }
      stats = { ...stats, [ch.item.id]: { ...old, seen: old.seen + 1, wrong: old.wrong + (ok ? 0 : 1), recent: pushMark(old.recent, mark) } }
      last = { fact: ch.item.fact, sinceZero: isRareFact(ch.item) ? 0 : last.sinceZero + 1 }
      run = ch.part === 'frontier' && !ok ? run + 1 : 0
      worst = Math.max(worst, run)
      for (const e of out.events) {
        if (e.e === 'placement' && e.phase === 'end' && e.kind === 'first') {
          probes = e.probes
          mistakes = e.mistakes
          placed = Math.max(0, ...RUNGS.filter((r) => statusOf(l, r.id) === 'placed').map((r) => r.order))
        }
      }
      if (l.mode.kind !== 'placement' && passedK()) return { placed, probes, mistakes, answers, worst }
      if (ok) {
        if (++right === 7) { right = 0; hearts = 3 }
      } else hearts--
    }
    now += NEXT_DAY_MS
  }
  return { placed, probes, mistakes, answers, worst }
}

const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]

describe.skipIf(!process.env.SC_SIM)('the placement simulation on the real ladder', () => {
  it('strong, typical and weak children', () => {
    const rows: string[] = ['kind (K) | placed median, p10 | probes median | placement mistakes median | answers to pass K median, p90 | longest frontier mistake run p90, max']
    for (const [label, K] of [['strong', 31], ['typical', 20], ['weak', 4]] as const) {
      const kids = Array.from({ length: N }, (_, i) => simulate(K, i + 1))
      const col = (k: keyof Child) => kids.map((c) => c[k])
      rows.push(`${label} (${K}) | ${q(col('placed'), 0.5)}, ${q(col('placed'), 0.1)} | ${q(col('probes'), 0.5)} | ${q(col('mistakes'), 0.5)} | ` +
        `${q(col('answers'), 0.5)}, ${q(col('answers'), 0.9)} | ${q(col('worst'), 0.9)}, ${Math.max(...col('worst'))}`)
      expect(Math.max(...col('worst'))).toBeLessThanOrEqual(2)
    }
    console.log(rows.join('\n'))
  }, 3_600_000)
})
