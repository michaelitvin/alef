// The chunk store: a live log is an open chunk (the log's own key, plain `{v:1, events, sealed?}` as before) and sealed
// chunks (one page session's events each, compact and deflated: telemetryCodec.ts) in keys of their own. This module
// reads, counts and clears such a log; telemetry.ts writes it.
//
// The open chunk's `sealed` lists the sealed chunks whose events it no longer holds. A sealed chunk that is NOT in it may
// still have its events in the open chunk (a seal that was cut between its two writes, a tab that flushed an older view,
// a build that rewrote the open chunk without the list): then those events are dropped from the open chunk when they
// are there, as a run of their session that starts with the chunk's first event and matches the chunk event by event.
// So no state loses or doubles an event (Decision 5 of the compact-telemetry plan).
//
// An evicted chunk leaves a tombstone in its log's roll-up (its session, first and last `t` and count). A chunk is
// evicted only when the stored open chunk no longer holds its events, but a stale view (a second tab) can still write
// them back: the reader and `reconcile` drop an open-chunk run that matches a tombstone, so the events count once (in
// the roll-up) and are never sealed or folded again.
import { STAGING_PREFIX } from './stagingStorage'
import { chunkHeader, decodeChunk, encodeChunk, type ChunkHeader } from './telemetryCodec'
import type { TelemetryEvent } from './telemetry'

// ---- keys
// A log `<base>-telemetry` keeps its open chunk at its own key, its sealed chunks at `<base>~<t0 base36>~<s>-telemetry`
// and its roll-up at `<base>~sum-telemetry`. Every key ends in `-telemetry`, so `?copy-prod` copies none of them. The `~`
// keeps the logs apart: `alef-duel~` never matches a key of `alef-duel2`.
const SUFFIX = '-telemetry'
const logBase = (logKey: string) => (logKey.endsWith(SUFFIX) ? logKey.slice(0, -SUFFIX.length) : logKey)

/** the key of the sealed chunk of `logKey` that starts at `t0` in session `s` */
export const chunkKey = (logKey: string, t0: number, s: string) => `${logBase(logKey)}~${t0.toString(36)}~${s}${SUFFIX}`
/** the key of the roll-up of `logKey` */
export const rollupKey = (logKey: string) => `${logBase(logKey)}~sum${SUFFIX}`
/** a sealed chunk or the roll-up of `logKey` (not its open chunk, which is `logKey` itself) */
export const ownsKey = (logKey: string, k: string) => k.startsWith(`${logBase(logKey)}~`) && k.endsWith(SUFFIX)
/** a sealed chunk's key (of any log): `<base>~<t0>~<s>-telemetry`; a roll-up key is not one */
export const isChunkKey = (k: string) => k.endsWith(SUFFIX) && !k.endsWith(`~sum${SUFFIX}`) && k.split('~').length >= 3

/**
 * Logs that are never trimmed, cleared or rewritten: the first duel's old log (owner decision, 2026-11-16, ADR 0004). A
 * key matches with or without the staging prefix.
 */
export const FROZEN_LOG_KEYS: readonly string[] = ['alef-duel-telemetry']
export const isFrozenLog = (k: string) => FROZEN_LOG_KEYS.some((f) => k === f || k === STAGING_PREFIX + f)

// ---- storage access (never throws)
/** every key of `localStorage` (the staging build's prefixed view in staging), read once */
export function storageKeys(): string[] {
  const keys: string[] = []
  try {
    const n = localStorage.length
    for (let i = 0; i < n; i++) {
      const k = localStorage.key(i)
      if (k !== null) keys.push(k)
    }
  } catch { /* no storage */ }
  return keys
}

export function getRaw(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

/** the sealed chunk keys of a log, oldest first (by the t0 in the key, then the key) */
export function chunkKeysOf(logKey: string, keys = storageKeys()): string[] {
  return keys.filter((k) => ownsKey(logKey, k) && isChunkKey(k)).sort((a, b) => chunkT0(a) - chunkT0(b) || (a < b ? -1 : a > b ? 1 : 0))
}

/** the t0 written in a chunk key (NaN when the key is odd) */
export const chunkT0 = (k: string) => parseInt(k.split('~')[1] ?? '', 36)

// ---- the open chunk
export interface OpenChunk { events: TelemetryEvent[]; sealed: string[] }

/** The open chunk's events and its `sealed` list; an old `{v:1,events}` reads as `sealed: []`. Null when it does not parse. */
export function parseOpen(raw: string | null): OpenChunk | null {
  if (raw === null) return { events: [], sealed: [] }
  try {
    const doc = JSON.parse(raw)
    if (!Array.isArray(doc?.events)) return null
    return { events: doc.events, sealed: Array.isArray(doc.sealed) ? doc.sealed.filter((k: unknown) => typeof k === 'string') : [] }
  } catch {
    return null
  }
}

/** The open chunk's stored text: `{v:1,events}` as before, with `sealed` only when it lists a chunk. */
export const openJson = (events: readonly TelemetryEvent[], sealed: readonly string[]) =>
  JSON.stringify(sealed.length > 0 ? { v: 1, events, sealed } : { v: 1, events })

// ---- tombstones
/** what an evicted chunk leaves in its log's roll-up: its key, session, first and last `t`, count, and when it went */
export interface Tomb { k: string; s: string; t0: number; t1: number; n: number; at: number }

const isTomb = (x: unknown): x is Tomb => {
  const t = x as Tomb
  return !!t && typeof t === 'object' && typeof t.k === 'string' && typeof t.s === 'string' && typeof t.t0 === 'number'
    && typeof t.t1 === 'number' && typeof t.n === 'number' && typeof t.at === 'number'
}
/** the tombstones in a roll-up's `folded` (anything else in it is skipped) */
export const tombsIn = (folded: unknown): Tomb[] => (Array.isArray(folded) ? folded.filter(isTomb) : [])

/** the tombstones of a log (its roll-up's `folded`); none when there is no roll-up or it does not parse. Never throws. */
export function readTombs(logKey: string): Tomb[] {
  try { return tombsIn(JSON.parse(getRaw(rollupKey(logKey)) ?? 'null')?.folded) } catch { return [] }
}

/**
 * The open events without the runs that match a tombstone: a run of the tombstone's session that starts at an event
 * with `t === t0` and goes on, over that session's events, either for `n` events ending at `t1` (the whole chunk), or
 * for fewer events, none after `t1`, up to the session's end or its first event after `t1` (a stale view held only the
 * chunk's start). Gives `open` itself when nothing matches.
 */
export function dropTombstoned(open: TelemetryEvent[], tombs: readonly Tomb[]): TelemetryEvent[] {
  if (tombs.length === 0 || open.length === 0) return open
  const drop = new Set<number>()
  for (const tb of tombs) {
    const start = open.findIndex((e, i) => e.s === tb.s && e.t === tb.t0 && !drop.has(i))
    if (start < 0) continue
    const run = [start]
    let ok = true
    for (let i = start + 1; i < open.length && run.length < tb.n; i++) {
      const e = open[i]!
      if (e.s !== tb.s || drop.has(i)) continue
      if (typeof e.t !== 'number' || e.t < (open[run[run.length - 1]!]!.t as number)) { ok = false; break }
      if (e.t > tb.t1) break
      run.push(i)
    }
    if (!ok || (run.length === tb.n && open[run[run.length - 1]!]!.t !== tb.t1)) continue
    for (const i of run) drop.add(i)
  }
  return drop.size > 0 ? open.filter((_, i) => !drop.has(i)) : open
}

// ---- the dedupe and the merge
export interface DecodedChunk { key: string; events: TelemetryEvent[] }

/**
 * The open chunk's events without the copies of sealed chunks it still holds (chunks not in `sealed`, oldest first). A
 * copy is the run of the chunk's session in the open chunk that starts at the first event equal to the chunk's first
 * event and goes on event by event while they are equal (a prefix is enough: a tab may hold only the start of a session
 * another tab sealed). Gives a new array; `removed` names the chunks whose copies it dropped.
 */
export function dropSealedCopies(
  open: readonly TelemetryEvent[], chunks: readonly DecodedChunk[], sealed: ReadonlySet<string>,
): { events: TelemetryEvent[]; removed: string[] } {
  let rest = open.slice()
  const removed: string[] = []
  const strOf = new Map<TelemetryEvent, string>()
  const str = (e: TelemetryEvent) => { let x = strOf.get(e); if (x === undefined) { x = JSON.stringify(e); strOf.set(e, x) } return x }
  for (const c of chunks) {
    if (sealed.has(c.key) || c.events.length === 0) continue
    const s = c.events[0]!.s
    const first = JSON.stringify(c.events[0])
    const start = rest.findIndex((e) => e.s === s && str(e) === first)
    if (start < 0) continue
    const drop = new Set<number>([start])
    let j = 1
    for (let i = start + 1; i < rest.length && j < c.events.length; i++) {
      if (rest[i]!.s !== s) continue
      if (str(rest[i]!) !== JSON.stringify(c.events[j])) break
      drop.add(i)
      j++
    }
    rest = rest.filter((_, i) => !drop.has(i))
    removed.push(c.key)
  }
  return { events: rest, removed }
}

/**
 * Merge segments (each in its own order) by `t`, stable: ties go to the earlier segment, and a segment's order is kept
 * (an event with no numeric `t` stays after the one before it in its segment).
 */
export function mergeByT(segments: readonly (readonly TelemetryEvent[])[]): TelemetryEvent[] {
  const segs = segments.filter((s) => s.length > 0)
  if (segs.length <= 1) return segs[0]?.slice() ?? []
  const at = segs.map(() => 0)
  const lastT = segs.map(() => -Infinity)
  const keyOf = (k: number) => { const t = segs[k]![at[k]!]!.t; return typeof t === 'number' ? t : lastT[k]! }
  const out: TelemetryEvent[] = []
  for (;;) {
    let best = -1
    let bestT = 0
    for (let k = 0; k < segs.length; k++) {
      if (at[k]! >= segs[k]!.length) continue
      const t = keyOf(k)
      if (best < 0 || t < bestT) { best = k; bestT = t }
    }
    if (best < 0) return out
    const e = segs[best]![at[best]!++]!
    if (typeof e.t === 'number') lastT[best] = e.t
    out.push(e)
  }
}

// ---- reading a log
export interface ChunkInfo { key: string; head: ChunkHeader | null; value: string | null }

/** the sealed chunks of a log with their headers (no decode) */
export const chunksOf = (logKey: string, keys = storageKeys()): ChunkInfo[] =>
  chunkKeysOf(logKey, keys).map((key) => { const value = getRaw(key); return { key, value, head: chunkHeader(value) } })

/**
 * Every event of a stored log, without an instance and without a write: its sealed chunks (an unreadable one is skipped)
 * and its open chunk, without the open chunk's copies of sealed chunks and of evicted ones (tombstones), merged by `t`. A frozen log is read as it is
 * stored. Never throws.
 */
export function readLog(key: string): TelemetryEvent[] {
  try {
    const open = parseOpen(getRaw(key)) ?? { events: [], sealed: [] }
    if (isFrozenLog(key)) return open.events
    const tombs = readTombs(key)
    const gone = new Set(tombs.map((t) => t.k))
    const chunks: DecodedChunk[] = []
    for (const c of chunksOf(key)) {
      if (gone.has(c.key)) continue // folded already (an eviction cut before the removal): the roll-up counts it
      const events = decodeChunk(c.value)
      if (events) chunks.push({ key: c.key, events })
    }
    const rest = dropTombstoned(chunks.length > 0 ? dropSealedCopies(open.events, chunks, new Set(open.sealed)).events : open.events, tombs)
    if (chunks.length === 0) return rest
    return mergeByT([...chunks.map((c) => c.events), rest])
  } catch {
    return []
  }
}

export interface LogStats {
  /** every event of the log */
  events: number
  /** the events at or after `since` (all of them when no `since`) */
  recent: number
  /** its sealed chunks (unreadable ones too) */
  chunks: number
  /** sealed chunks that do not read: kept, never evicted, only the parent's Clear removes them */
  unreadable: number
  /** the characters its keys hold (open chunk and sealed chunks; key names too) */
  chars: number
}

/**
 * Count a stored log from the chunk headers and the open chunk. It decodes only a chunk that straddles `since` and a
 * chunk that is not in the open chunk's `sealed` list (to drop its copies). Never throws.
 */
export function logStats(key: string, since?: number): LogStats {
  const stats: LogStats = { events: 0, recent: 0, chunks: 0, unreadable: 0, chars: 0 }
  try {
    const raw = getRaw(key)
    stats.chars += raw === null ? 0 : key.length + raw.length
    const open = parseOpen(raw) ?? { events: [], sealed: [] }
    const sealed = new Set(open.sealed)
    const unsealed: DecodedChunk[] = []
    const tombs = isFrozenLog(key) ? [] : readTombs(key)
    const gone = new Set(tombs.map((t) => t.k))
    if (!isFrozenLog(key)) {
      for (const c of chunksOf(key)) {
        stats.chunks++
        stats.chars += c.key.length + (c.value?.length ?? 0)
        if (!c.head) { stats.unreadable++; continue }
        if (gone.has(c.key)) continue // folded already: the roll-up counts its events
        const straddles = since !== undefined && c.head.t0 < since && c.head.t1 >= since
        let events: TelemetryEvent[] | null = null
        if (straddles || !sealed.has(c.key)) {
          events = decodeChunk(c.value)
          if (!events) { stats.unreadable++; continue }
          if (!sealed.has(c.key)) unsealed.push({ key: c.key, events })
        }
        stats.events += c.head.n
        stats.recent += since === undefined || c.head.t0 >= since ? c.head.n
          : c.head.t1 < since ? 0 : events!.filter((e) => e.t >= since).length
      }
    }
    const rest = dropTombstoned(unsealed.length > 0 ? dropSealedCopies(open.events, unsealed, sealed).events : open.events, tombs)
    stats.events += rest.length
    stats.recent += since === undefined ? rest.length : rest.filter((e) => typeof e.t === 'number' && e.t >= since).length
  } catch { /* no storage */ }
  return stats
}

/** Remove a log: its open chunk, its sealed chunks and its roll-up. Never a frozen log. Never throws. */
export function clearLog(key: string) {
  if (isFrozenLog(key)) return
  for (const k of [key, ...storageKeys().filter((k) => ownsKey(key, k))]) {
    try { localStorage.removeItem(k) } catch { /* no storage */ }
  }
}

// ---- the write side's pieces (telemetry.ts runs them; each never throws)
/** the open chunk is sealed past this many characters */
export const OPEN_SEAL_CHARS = 40_000
/** a session with no event for this long is complete (a session live in another tab stays open) */
export const SESSION_IDLE_MS = 30 * 60 * 1000

/**
 * Take in the sealed chunks of a log that another tab (or an earlier seal cut short) wrote: drop their copies from
 * `mem` (the instance's open events) and list them in `sealed`; drop the runs of evicted chunks (tombstones) too.
 * `sealed` keeps only keys that still exist. Mutates both.
 */
export function reconcile(logKey: string, mem: TelemetryEvent[], sealed: string[]) {
  const tombs = readTombs(logKey)
  const keys = chunkKeysOf(logKey)
  const exists = new Set(keys)
  const known = new Set(sealed.filter((k) => exists.has(k)))
  const fresh: DecodedChunk[] = []
  for (const k of keys) {
    if (known.has(k)) continue
    const events = decodeChunk(getRaw(k))
    if (events) fresh.push({ key: k, events })
  }
  const rest = dropTombstoned(fresh.length > 0 ? dropSealedCopies(mem, fresh, known).events : mem, tombs)
  if (rest !== mem) mem.splice(0, mem.length, ...rest)
  sealed.splice(0, sealed.length, ...keys.filter((k) => known.has(k) || fresh.some((c) => c.key === k)))
}

/** what a chunk write gives: its key, or why nothing was written (`taken`: the key holds other or unreadable events) */
export type ChunkWrite = { key: string } | { error: 'taken' | 'write' }

/**
 * Write the events of one session (in order) as a sealed chunk, read it back and compare. Gives the chunk's key, or the
 * reason nothing safe was written: `taken` when the key already holds another chunk (or one that does not read), else
 * `write` (a quota error, a read-back that differs). Never throws.
 */
export function writeChunk(logKey: string, events: readonly TelemetryEvent[]): ChunkWrite {
  try {
    const value = encodeChunk(events)
    const key = chunkKey(logKey, events[0]!.t, events[0]!.s)
    const want = JSON.stringify(JSON.parse(JSON.stringify(events)))
    const before = getRaw(key)
    if (before !== null && before !== value) {
      // the same t0 and session: a chunk another tab sealed (same events, so it is ours too) or another one (keep it)
      return JSON.stringify(decodeChunk(before)) === want ? { key } : { error: 'taken' }
    }
    if (before === null) localStorage.setItem(key, value)
    const back = getRaw(key)
    if (back === value && JSON.stringify(decodeChunk(back)) === want) return { key }
    if (before === null && back === value) localStorage.removeItem(key) // our own write, and it does not read back
    return { error: 'write' }
  } catch {
    return { error: 'write' }
  }
}

/**
 * Run `fn` when the page is idle: `requestIdleCallback` (with a 10 s timeout) where it exists, else after 2 s with no
 * `pointerdown` or `keydown` (each one waits again), never a 0 ms timer during play. Gives a cancel.
 */
export function onIdle(fn: () => void): () => void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void }
  if (typeof w.requestIdleCallback === 'function') {
    const h = w.requestIdleCallback(fn, { timeout: 10_000 })
    return () => w.cancelIdleCallback?.(h)
  }
  const QUIET_MS = 2000
  let timer: number | undefined
  const stop = () => {
    window.clearTimeout(timer)
    window.removeEventListener('pointerdown', arm, true)
    window.removeEventListener('keydown', arm, true)
  }
  function arm() {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => { stop(); fn() }, QUIET_MS)
  }
  window.addEventListener('pointerdown', arm, true)
  window.addEventListener('keydown', arm, true)
  arm()
  return stop
}
