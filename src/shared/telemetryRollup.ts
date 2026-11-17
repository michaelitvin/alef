// Roll-ups: what an evicted sealed chunk leaves behind. Per day (the device's local date of `t`) and per item: how often
// it was asked, wrong, near, special, the latency histogram, the child's mix-ups, hints and replays; per day also the
// minutes played, the runs and the abandons. A game decides what an item is (its log's `rollup`); core only folds.
//
// The roll-up holds only folded (evicted) events, never the raw events still in storage, so a day with both a roll-up
// and raw events is counted exactly by adding them. Stored at `<base>~sum-telemetry`.
import { getRaw, ownsKey, rollupKey, storageKeys } from './telemetryChunks'
import type { RollupFact, TelemetryEvent, TelemetryLog } from './telemetry'

/** the latency histogram's bin edges in ms: bin i holds `EDGES[i-1] <= ms < EDGES[i]`, the last bin the rest */
export const MS_EDGES = [500, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 12000, 20000] as const
/** a gap between two events of a session counts as play when it is shorter than this */
const PLAY_GAP_MS = 5 * 60 * 1000
/** days older than this fold into ISO weeks */
export const ROLLUP_DAYS = 90
/** the mix-ups kept per item (the most frequent) */
const MAX_CHOSEN = 5
/** the sessions whose last folded event is kept, so a session split over chunks counts its minutes once */
const MAX_TAILS = 20

export interface ItemStats {
  /** real answers (not special) */
  n: number
  wrong: number
  near: number
  /** special results: counted apart, never as right or wrong */
  special: number
  hints: number
  replays: number
  /** the latency histogram (MS_EDGES) */
  ms: number[]
  /** what he chose instead, the most frequent first */
  chosen: Record<string, number>
}

export interface DayStats {
  minutes: number
  runs: string[]
  abandons: Record<string, number>
  items: Record<string, ItemStats>
}

export interface Rollup {
  v: 1
  /** the chunk keys folded in (so a fold that runs twice counts once); only keys that still exist */
  folded: string[]
  /** events dropped with no fold (a chunk of a log that no page registered) */
  dropped: number
  /** per day `YYYY-MM-DD`, or per ISO week `YYYY-Www` after ROLLUP_DAYS */
  days: Record<string, DayStats>
  /** the last folded event per recent session (`s` → t) */
  tails: Record<string, number>
}

export const emptyRollup = (): Rollup => ({ v: 1, folded: [], dropped: 0, days: {}, tails: {} })

export function readRollup(logKey: string): Rollup {
  try {
    const r = JSON.parse(getRaw(rollupKey(logKey)) ?? 'null') as Rollup | null
    if (r && r.v === 1 && Array.isArray(r.folded) && r.days && typeof r.days === 'object') return { ...emptyRollup(), ...r }
  } catch { /* a broken roll-up reads as empty; the next fold rewrites it */ }
  return emptyRollup()
}

const pad2 = (n: number) => String(n).padStart(2, '0')
/** the device's local date of a time */
export const dayOf = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
/** the ISO week of a `YYYY-MM-DD` day */
export function weekOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dow)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${pad2(week)}`
}

const emptyDay = (): DayStats => ({ minutes: 0, runs: [], abandons: {}, items: {} })
const emptyItem = (): ItemStats => ({ n: 0, wrong: 0, near: 0, special: 0, hints: 0, replays: 0, ms: MS_EDGES.map(() => 0).concat(0), chosen: {} })
export const msBin = (ms: number) => { const i = MS_EDGES.findIndex((e) => ms < e); return i < 0 ? MS_EDGES.length : i }

function topChosen(c: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, MAX_CHOSEN))
}

function addFact(day: DayStats, f: RollupFact) {
  const it = (day.items[f.item] ??= emptyItem())
  if (f.hint) it.hints++
  if (f.replay) it.replays++
  if (f.special) { it.special++; return }
  if (f.ok === undefined) return
  it.n++
  if (!f.ok) it.wrong++
  if (f.near) it.near++
  if (typeof f.ms === 'number' && Number.isFinite(f.ms)) it.ms[msBin(f.ms)]!++
  if (!f.ok && f.chosen !== undefined) { it.chosen[f.chosen] = (it.chosen[f.chosen] ?? 0) + 1; it.chosen = topChosen(it.chosen) }
}

/**
 * Fold one chunk's events (one session, in order) into a roll-up, in place: core counts (minutes, runs, abandons) and the
 * game's facts. A fact falls on the day of its `t`; one without falls on the chunk's first day.
 */
export function foldEvents(r: Rollup, events: readonly TelemetryEvent[], facts: readonly RollupFact[]) {
  if (events.length === 0) return
  const s = events[0]!.s
  let prev = r.tails[s]
  for (const e of events) {
    if (typeof e.t !== 'number') continue
    const day = (r.days[dayOf(e.t)] ??= emptyDay())
    if (prev !== undefined && e.t >= prev && e.t - prev < PLAY_GAP_MS) day.minutes = Math.round((day.minutes + (e.t - prev) / 60_000) * 1000) / 1000
    prev = e.t
    const run = `${e.s}:${e.run}`
    if (!day.runs.includes(run)) day.runs.push(run)
    if (e.e === 'abandon') {
      const where = String(e.screen ?? e.phase ?? '?')
      day.abandons[where] = (day.abandons[where] ?? 0) + 1
    }
  }
  if (prev !== undefined) r.tails[s] = prev
  const tails = Object.entries(r.tails).sort((a, b) => b[1] - a[1]).slice(0, MAX_TAILS)
  r.tails = Object.fromEntries(tails)
  const firstDay = dayOf(events.find((e) => typeof e.t === 'number')?.t ?? 0)
  for (const f of facts) {
    const { t, ...fact } = f
    addFact((r.days[typeof t === 'number' ? dayOf(t) : firstDay] ??= emptyDay()), fact)
  }
}

function mergeDay(into: DayStats, d: DayStats) {
  into.minutes = Math.round((into.minutes + d.minutes) * 1000) / 1000
  for (const run of d.runs) if (!into.runs.includes(run)) into.runs.push(run)
  for (const [k, n] of Object.entries(d.abandons)) into.abandons[k] = (into.abandons[k] ?? 0) + n
  for (const [id, it] of Object.entries(d.items)) {
    const to = (into.items[id] ??= emptyItem())
    to.n += it.n; to.wrong += it.wrong; to.near += it.near; to.special += it.special; to.hints += it.hints; to.replays += it.replays
    it.ms.forEach((c, i) => { to.ms[i] = (to.ms[i] ?? 0) + c })
    for (const [c, n] of Object.entries(it.chosen)) to.chosen[c] = (to.chosen[c] ?? 0) + n
    to.chosen = topChosen(to.chosen)
  }
}

/** Fold days older than ROLLUP_DAYS (before `now`) into their ISO weeks, in place. */
export function foldOldDays(r: Rollup, now = Date.now()) {
  const cut = dayOf(now - ROLLUP_DAYS * 86_400_000)
  for (const [day, d] of Object.entries(r.days)) {
    if (day.includes('W') || day >= cut) continue
    mergeDay((r.days[weekOf(day)] ??= emptyDay()), d)
    delete r.days[day]
  }
}

/** facts of a game, with the `t` of the event each came from when the game gives it */
export function factsOf(log: TelemetryLog | undefined, events: TelemetryEvent[]): RollupFact[] {
  try { return log?.rollup?.(events) ?? [] } catch { return [] }
}

/**
 * Fold one evicted chunk into its log's roll-up and write it, with the chunk's key in `folded`. A chunk already folded
 * counts once (the key is there). A log with no registration only adds the chunk's count to `dropped`. Gives true when
 * the roll-up holds the chunk (so the chunk may go); false when the write failed. Never throws.
 */
export function foldChunk(logKey: string, log: TelemetryLog | undefined, chunk: string, events: TelemetryEvent[] | null, n: number, now = Date.now()): boolean {
  try {
    const r = readRollup(logKey)
    if (r.folded.includes(chunk)) return true
    if (log && events) foldEvents(r, events, factsOf(log, events))
    else r.dropped += n
    const exists = new Set(storageKeys().filter((k) => ownsKey(logKey, k)))
    r.folded = [...r.folded.filter((k) => exists.has(k)), chunk]
    foldOldDays(r, now)
    localStorage.setItem(rollupKey(logKey), JSON.stringify(r))
    return true
  } catch {
    return false
  }
}

/**
 * Keep the roll-ups of `logKeys` within `budget` characters: drop the oldest week (or day) of the largest one until they
 * fit. Never throws.
 */
export function trimRollups(logKeys: readonly string[], budget: number) {
  try {
    const sizes = new Map(logKeys.map((k) => [k, (getRaw(rollupKey(k)) ?? '').length]))
    let total = [...sizes.values()].reduce((a, b) => a + b, 0)
    while (total > budget) {
      const [key] = [...sizes].sort((a, b) => b[1] - a[1])[0]!
      const r = readRollup(key)
      const oldest = Object.keys(r.days).sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1))[0]
      if (oldest === undefined) break
      delete r.days[oldest]
      const json = JSON.stringify(r)
      localStorage.setItem(rollupKey(key), json)
      total += json.length - sizes.get(key)!
      sizes.set(key, json.length)
    }
  } catch { /* best-effort */ }
}

/** a day or week key in time order: a week sorts as its year and week (before the days of later weeks) */
function sortKey(k: string) {
  return k.includes('W') ? `${k}-` : `${weekOf(k)}-${k}`
}
