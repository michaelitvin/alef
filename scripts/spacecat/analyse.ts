// Space Cat's telemetry, from the parent area's one export (Data section). Reads only the export file.
//   node scripts/spacecat/analyse.ts <alef-telemetry-…json>
// Prints: the days that come only from roll-ups, per run (answers, levels, points, how it ended), per rung (by the ladder's
// ids: right share, time-outs), per part of the mix (answers, right share, fast share), the ladder changes in time order,
// each placement and each warm-up, the 15 hardest items with his wrong picks, and the arrival time over the rounds.
// Event names and fields: the spec's *Tracking* and src/spacecat/controller.ts. Plain Node: erasable TypeScript only.
import { readFileSync } from 'node:fs'

const KEY = 'alef-spacecat-telemetry'

interface Ev { t: number; s: string; run: number; e: string; g?: string; [k: string]: unknown }
interface RollItem { n: number; wrong: number; special: number; chosen: Record<string, number> }
interface RollDay { items: Record<string, RollItem>; runs?: string[]; abandons?: Record<string, number> }
interface Part { key?: string; events?: Ev[]; rollups?: Record<string, RollDay> }

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/spacecat/analyse.ts <export.json>')
  process.exit(2)
}
const doc = JSON.parse(readFileSync(file, 'utf8')) as { games?: Part[] }
const part = (doc.games ?? []).find((p) => p.key === KEY)
if (!part) {
  console.error(`${file}: no Space Cat part (${KEY}) in this export`)
  process.exit(1)
}
const events = (part.events ?? []).filter((e) => e.g === 'spacecat').sort((a, b) => a.t - b.t)
const rounds = events.filter((e) => e.e === 'round')
const counted = rounds.filter((e) => e.demo !== true && e.cut !== true)
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '-')
const sumText = (id: string) => {
  const cmp = /^(\d+)\?(\d+)$/.exec(id)
  if (cmp) return `${cmp[1]} ◌ ${cmp[2]}`
  const thrice = /^(\d+)\+(\d+)\+(\d+)=(\d+)\/c$/.exec(id)
  if (thrice) return `${thrice[1]} + ${thrice[2]} + ${thrice[3]} = ◌`
  if (/^[\d_]+(,[\d_]+)+$/.test(id)) return id.split(',').map((x) => (x === '_' ? '◌' : x)).join(', ')
  const m = /^(\d+)([-+x/])(\d+)=(\d+)\/([abc])$/.exec(id)
  if (!m) return id
  const op = ({ '+': '+', '-': '−', x: '×', '/': '÷' } as Record<string, string>)[m[2]!]
  const at = (h: string, v: string) => (m[5] === h ? '◌' : v)
  return `${at('a', m[1]!)} ${op} ${at('b', m[3]!)} = ${at('c', m[4]!)}`
}
const day = (t: number) => new Date(t).toISOString().slice(0, 10)

// per item: right, wrong, time-outs and the wrong picks, from the raw rounds plus the roll-ups (they never overlap)
interface Tally { n: number; wrong: number; timeout: number; picks: Record<string, number> }
const items = new Map<string, Tally>()
const tally = (id: string) => { let t = items.get(id); if (!t) items.set(id, (t = { n: 0, wrong: 0, timeout: 0, picks: {} })); return t }
for (const e of counted) {
  const t = tally(String(e.item))
  t.n++
  if (e.result === 'timeout') t.timeout++
  else if (e.result !== 'right') { t.wrong++; const k = String(e.number); t.picks[k] = (t.picks[k] ?? 0) + 1 }
}
const rawDays = new Set(events.map((e) => day(e.t)))
const rollDays = Object.keys(part.rollups ?? {}).filter((d) => !rawDays.has(d)).sort()
for (const d of Object.values(part.rollups ?? {})) {
  for (const [id, it] of Object.entries(d.items ?? {})) {
    const t = tally(id)
    const timeouts = it.chosen?.timeout ?? 0
    t.n += it.n
    t.timeout += timeouts
    t.wrong += it.wrong - timeouts
    for (const [k, n] of Object.entries(it.chosen ?? {})) if (k !== 'timeout') t.picks[k] = (t.picks[k] ?? 0) + n
  }
}

console.log(`Space Cat: ${events.length} events, ${rounds.length} rounds (${counted.length} counted, ${rounds.length - counted.length} demo or cut)`)
console.log(rollDays.length ? `${rollDays.length} day(s) only from roll-ups (counts added to the sums below): ${rollDays.join(', ')}` : 'No day comes only from roll-ups.')

console.log('\nRuns')
const runs = new Map<string, Ev[]>()
for (const e of events) { const k = `${e.s}:${e.run}`; if (!runs.has(k)) runs.set(k, []); runs.get(k)!.push(e) }
for (const [k, evs] of runs) {
  const rs = evs.filter((e) => e.e === 'round' && e.demo !== true && e.cut !== true)
  if (!rs.length && !evs.some((e) => e.e === 'run-start')) continue
  const endEv = evs.find((e) => e.e === 'run-end' || e.e === 'abandon')
  const end = endEv?.e === 'run-end' ? `ended, ${endEv.points} points, ${endEv.levels} level(s)`
    : endEv ? `left at level ${endEv.level} (${endEv.phase ?? '?'}), ${endEv.points} points` : 'no end in the log'
  const right = rs.filter((e) => e.result === 'right').length
  console.log(`  ${day(evs[0]!.t)} ${k}: ${rs.length} answers, ${pct(right, rs.length)} right, ${evs.filter((e) => e.e === 'level-done').length} level(s) done; ${end}`)
}

console.log('\nPer rung (the ladder\'s ids)')
const rungs = new Map<string, { n: number; right: number; timeout: number }>()
for (const e of counted) {
  const r = String(e.rung)
  const x = rungs.get(r) ?? { n: 0, right: 0, timeout: 0 }
  x.n++
  if (e.result === 'right') x.right++
  if (e.result === 'timeout') x.timeout++
  rungs.set(r, x)
}
const rungKey = (r: string): [number, string] => (/^\d+$/.test(r) ? [Number(r), ''] : [100, r])
for (const [r, x] of [...rungs].sort((a, b) => rungKey(a[0])[0] - rungKey(b[0])[0] || rungKey(a[0])[1].localeCompare(rungKey(b[0])[1]))) {
  console.log(`  rung ${r}: ${x.n} answers, ${pct(x.right, x.n)} right, ${x.timeout} time-outs`)
}

console.log('\nPer part of the mix')
const parts = new Map<string, { n: number; right: number; fast: number }>()
for (const e of counted) {
  const k = typeof e.part === 'string' ? e.part : '(none: an older round)'
  const x = parts.get(k) ?? { n: 0, right: 0, fast: 0 }
  x.n++
  if (e.result === 'right') x.right++
  if (e.fast === true) x.fast++
  parts.set(k, x)
}
for (const [k, x] of [...parts].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${k.padEnd(10)} ${x.n} answers, ${pct(x.right, x.n)} right, ${pct(x.fast, x.n)} fast`)

console.log('\nLadder changes (in time order)')
const changes = events.filter((e) => e.e === 'ladder')
if (!changes.length) console.log('  none')
for (const e of changes) console.log(`  ${day(e.t)} ${e.s}:${e.run} rung ${e.rung}: ${e.change}${e.by ? ` (${e.by})` : ''}${typeof e.days === 'number' ? `, ${e.days} play day(s)` : ''}`)

console.log('\nPlacements')
const placements = events.filter((e) => e.e === 'placement')
if (!placements.length) console.log('  none')
for (const e of placements) {
  console.log(e.phase === 'start' ? `  ${day(e.t)} ${e.s}:${e.run} ${e.kind}: started` : `  ${day(e.t)} ${e.s}:${e.run} ${e.kind}: ended after ${e.probes} probes, ${e.mistakes} mistake(s), frontier ${e.frontier ?? 'none'}`)
}

console.log('\nWarm-ups')
const warmups = events.filter((e) => e.e === 'warmup')
if (!warmups.length) console.log('  none')
for (const e of warmups) console.log(`  ${day(e.t)} ${e.s}:${e.run} rung ${e.rung}: ${e.how} after ${e.rounds} round(s)`)

console.log('\nThe 15 hardest items (mistake share, at least 2 answers)')
const hard = [...items].filter(([, t]) => t.n >= 2).sort((a, b) => (b[1].wrong + b[1].timeout) / b[1].n - (a[1].wrong + a[1].timeout) / a[1].n || b[1].n - a[1].n).slice(0, 15)
for (const [id, t] of hard) {
  const picks = Object.entries(t.picks).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}×${n}`).join(' ')
  console.log(`  ${sumText(id).padEnd(18)} ${t.n - t.wrong - t.timeout}/${t.n} right, ${t.timeout} time-outs${picks ? `, picked ${picks}` : ''}`)
}

console.log('\nArrival time over the rounds (ms, every 10th counted round)')
const arr = counted.filter((e) => typeof e.arrivalMs === 'number')
for (let i = 0; i < arr.length; i += 10) console.log(`  round ${i + 1}: ${arr[i]!.arrivalMs} (${day(arr[i]!.t)})`)
if (arr.length) console.log(`  last: ${arr[arr.length - 1]!.arrivalMs}`)
