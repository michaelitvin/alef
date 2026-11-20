// The ladder as the parent reads it: the rungs' names and examples, the strands' titles, the summary of where he is and
// the plain-English line of a saved change. Pure (logic modules only; no store, audio or telemetry), so the light parent
// index uses it too.
import { isEarned, isOn, frontier, statusText } from '../logic/ladder/frontier'
import { RUNGS, rungDef, type RungId, type Strand } from '../logic/rungs'
import type { Ladder, LadderSettings } from '../logic/ladder/state'
import type { HistoryEntry } from '../saveFormat'

/** the design's rung names and examples (parent text, English; no rung numbers) */
export const RUNG_TEXT: Record<RungId, { name: string; example: string }> = {
  '1': { name: 'plus, sum to 5', example: '3 + 2 = ◌' },
  '2': { name: 'minus within 5', example: '5 − 2 = ◌' },
  '3': { name: 'plus, sum 6 to 10', example: '6 + 3 = ◌' },
  '4': { name: 'make ten', example: '7 + ◌ = 10' },
  '5': { name: 'minus within 10', example: '9 − 4 = ◌' },
  '6': { name: 'missing number within 10', example: '4 + ◌ = 9' },
  '7': { name: 'the second ten, no crossing', example: '13 + 4 = ◌' },
  '8': { name: 'whole tens', example: '30 + 40 = ◌' },
  '9': { name: 'doubles and near doubles', example: '7 + 8 = ◌' },
  '10': { name: 'plus, crossing ten', example: '8 + 5 = ◌' },
  '11': { name: 'minus, crossing ten', example: '13 − 6 = ◌' },
  '12': { name: 'missing number first, within 20', example: '◌ + 4 = 9' },
  '13': { name: '2-digit ± 1-digit, no regrouping', example: '23 + 4 = ◌' },
  '14': { name: '2-digit ± tens', example: '45 + 30 = ◌' },
  '15': { name: '2-digit ± 1-digit with regrouping', example: '45 + 9 = ◌' },
  '16': { name: '2-digit ± 2-digit, no regrouping', example: '17 + 12 = ◌' },
  '17': { name: '2-digit + 2-digit with regrouping', example: '26 + 34 = ◌' },
  '18': { name: '2-digit − 2-digit with regrouping', example: '85 − 19 = ◌' },
  '19': { name: 'missing number within 100', example: '37 + ◌ = 50' },
  H1: { name: 'hundreds and tens, in the head', example: '240 + 30 = ◌' },
  C1: { name: 'compare to 20', example: '7 ◌ 5' },
  C2: { name: 'compare to 100', example: '38 ◌ 83' },
  S1: { name: 'counting in jumps of 2, 5, 10', example: '5, 10, 15, ◌' },
  S2: { name: 'counting in jumps of 3, 4, and 10 off the tens', example: '4, 8, ◌, 16' },
  T1: { name: 'the same number added', example: '3 + 3 + 3 = ◌' },
  T2: { name: 'times 2, 5, 10', example: '4 × 5 = ◌' },
  T3: { name: 'tables to 6 × 6', example: '4 × 6 = ◌' },
  T4a: { name: 'missing factor to 6 × 6', example: '3 × ◌ = 12' },
  T4b: { name: 'divide to 6 × 6', example: '12 ÷ 3 = ◌' },
  T5: { name: 'tables to 10 × 10', example: '7 × 8 = ◌' },
  T6: { name: 'divide to 10 × 10', example: '56 ÷ 8 = ◌' },
}

export const STRAND_TITLE: Record<Strand, string> = {
  plus: 'Plus and minus', compare: 'Comparison', times: 'Counting in jumps, times and divide',
}
export const STRANDS: Strand[] = ['plus', 'compare', 'times']

/** the rungs of one strand, in the order */
export const rungsOfStrand = (s: Strand): RungId[] => RUNGS.filter((r) => r.strand === s).map((r) => r.id)

export interface Where {
  /** the name of the rung he works on, null when nothing new is open */
  frontier: RungId | null
  placing: boolean
  /** earned rungs (passed or placed) that are on, of the 31 */
  passed: number
  held: number
}

/** where he is: the frontier, how many on rungs are earned, how many are held (a switched-off rung is not counted) */
export function whereHeIs(l: Ladder, set: LadderSettings): Where {
  let passed = 0, held = 0
  for (const r of RUNGS) {
    if (!isOn(r.id, set)) continue
    if (isEarned(l, r.id)) passed++
    else if (l.rungs?.[r.id]?.status === 'held') held++
  }
  return { frontier: frontier(l, set), placing: l.mode?.kind === 'placement', passed, held }
}

export const workingOn = (w: Where): string =>
  w.placing ? 'finding his level' : w.frontier ? RUNG_TEXT[w.frontier].name : 'nothing new yet'

const days = (n: number) => `${n} play day${n === 1 ? '' : 's'}`

/** the status column: statusText, with the held rung's days and the placed rung's note */
export function rungStatus(l: Ladder, r: RungId, set: LadderSettings): string {
  const t = statusText(l, r, set)
  if (t === 'held') return `held: back in ${days(Math.max(1, (l.rungs[r]?.freeOn ?? l.day) - l.day))}`
  if (t === 'placed') return 'placed (not checked yet)'
  return t
}

const BY: Record<string, string> = { recheck: 're-check', warmup: 'warm-up', migration: 'update', placement: 'placement', probation: 'probation', rejump: 'placement' }

/** one saved change in plain English: "passed (fast): 2-digit ± tens" */
export function changeText(h: HistoryEntry): string {
  const name = rungDef(h.rung) ? RUNG_TEXT[h.rung].name : String(h.rung)
  const via = h.by && BY[h.by] ? ` (${BY[h.by]})` : ''
  switch (h.change) {
    case 'passed': return `passed${h.by === 'fast' || h.by === 'slow' ? ` (${h.by})` : via}: ${name}`
    case 'placed': return `placed${via}: ${name}`
    case 'strike': return `a strike on: ${name}`
    case 'held': return `held${h.days ? ` for ${days(h.days)}` : ''}: ${name}`
    case 'free': return `back from hold: ${name}`
    case 'unpassed': return `back to "not yet"${via}: ${name}`
  }
}
