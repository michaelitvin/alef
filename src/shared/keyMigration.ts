// The key migration of the Spell Quest rename (spec 2026-11-22-spell-quest-rename-design.md, "The migration" and its
// 2026-11-23 addendum; ADR 0009): Hebrew Spell Quest's save, play-time days and telemetry move to the `spellquest-he`
// names, English Spell Quest's to the `spellquest-en` names, and the frozen first-duel log to the tower's history key. A
// pure function over the `Storage` a page uses (the staging build's prefixed view, or the plain one), so it never sees
// another view's keys. Each key moves by copy, read back, compare, remove the old key. It never throws, changes nothing
// on a second run, and a run that stops (no space, a conflict) goes on at the next call.
// It uses a plain `setItem` with a catch, not `safeSetItem`: that one may evict telemetry while this moves it.
//
// Every earlier name is a source. Production has the original names (`alef-duel2`, `alef-english`, playtime `book2` and
// `english`); staging and dev devices may also have the in-between names of the 2026-11-23 build (`alef-spellquest`,
// playtime `spellquest`, the marker's `spellquest-rename` step with a fingerprint of `alef-spellquest`). The step
// `spellquest-two-names` moves all of them, once on every device, also where `spellquest-rename` is done (that step's
// moves are part of this one, so its own code is gone; its id stays in the marker, unused).
//
// A page of an old build can outlive the release (a tab left open, or Back from the new home page restores it from the
// back-forward cache) and write its old keys again after the step is done: a page of EITHER older build. So every load
// also looks for each old save key, old open chunk, old roll-up and an old play-time entry (a few `getItem`s) and, when
// one is back, runs the step's moves again. A late save moves over the new one only when the new one is unchanged since
// the move (the marker keeps a fingerprint of what each save move wrote); when both changed, both stay and the step
// reports a conflict. A late open chunk next to the new one becomes sealed chunks of the new log, listed in the new open
// chunk.
//
// Two sources for one save (Hebrew: `alef-duel2` and `alef-spellquest`). The sources are generations, oldest first, and
// each one resolves against the next generation that exists, by the one rule above:
//   1. `alef-duel2` and `alef-spellquest` both there: `alef-duel2` is a late write of a page of the first build's
//      predecessor (the first build moved it). It moves over `alef-spellquest` when that one is unchanged since the first
//      build's move (`fp['alef-spellquest']`); else both stay, a conflict, and the Hebrew save goes no further this load
//      (`alef-spellquest` does not move on: the conflict stays visible and nothing is decided against the child's save,
//      and the store goes on reading `alef-spellquest`, as the first build did). With no `alef-spellquest`,
//      `alef-duel2` resolves against `alef-spellquest-he` the same way (or moves to it when it is not there).
//   2. Then `alef-spellquest` resolves against `alef-spellquest-he` (`fp['alef-spellquest-he']`).
// So a late write of either older build wins over a new save that nobody changed since its move, and two changes that
// cannot be ordered are never merged or dropped: both stay and the Data section reports them.
import { chunkKey, chunkT0, dropSealedCopies, isChunkKey, ownsKey, parseOpen, rollupKey, type DecodedChunk } from './telemetryChunks'
import { decodeChunk, encodeChunk } from './telemetryCodec'
import { SPELLQUEST_EN_SAVE_KEY, SPELLQUEST_HE_SAVE_KEY, TOWER_HISTORY_LOG_KEY, OLD_TOWER_HISTORY_LOG_KEY } from './saveKeys'
import type { TelemetryEvent } from './telemetry'

export type KeyStatus = 'moved' | 'already' | 'conflict' | 'waiting-space' | 'absent'
export interface MigrationReport {
  steps: { id: string; status: 'done' | 'waiting-space' | 'conflict'; keys: { from: string; to: string; status: KeyStatus }[] }[]
}

/** `{v:1, done: string[], fp?: {[saveKey]: fingerprint}}`: the ids of the steps that are complete, and a fingerprint of
 * the value each save move wrote (to know later whether the new save changed since) */
export const MIGRATIONS_KEY = 'alef-migrations'

/** a game's names: its save key (also its log's base), oldest source first */
interface Names { to: string; from: readonly string[] }
const HE: Names = { to: SPELLQUEST_HE_SAVE_KEY, from: ['alef-duel2', 'alef-spellquest'] }
const EN: Names = { to: SPELLQUEST_EN_SAVE_KEY, from: ['alef-english'] }
const GAMES: readonly Names[] = [HE, EN]
const logOf = (save: string) => `${save}-telemetry`
const PLAYTIME_KEY = 'alef-playtime'
/** old play-time entry → new (summed when several are there) */
const PLAYTIME_IDS: Readonly<Record<string, string>> = { book2: 'spellquest-he', spellquest: 'spellquest-he', english: 'spellquest-en' }

export const STEP_TWO_NAMES = 'spellquest-two-names'
const STEP_TOWER = 'tower-history'

/** a key of the log with base `from` under the base `to` (`alef-duel2~t0~s-telemetry` → `alef-spellquest-he~t0~s-telemetry`) */
const rebase = (k: unknown, from: string, to: string) => (typeof k === 'string' && k.startsWith(`${from}~`) ? `${to}${k.slice(from.length)}` : k)

type Key = MigrationReport['steps'][number]['keys'][number]
type Step = MigrationReport['steps'][number]

const allKeys = (s: Storage): string[] => {
  const keys: string[] = []
  try { for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k !== null) keys.push(k) } } catch { /* no storage */ }
  return keys
}
const get = (s: Storage, k: string): string | null => { try { return s.getItem(k) } catch { return null } }
const remove = (s: Storage, k: string) => { try { s.removeItem(k) } catch { /* nothing to do */ } }

/** the sealed chunk keys of a log, oldest first */
const chunkKeysOf = (log: string, keys: string[]) => keys
  .filter((k) => ownsKey(log, k) && isChunkKey(k))
  .sort((a, b) => chunkT0(a) - chunkT0(b) || (a < b ? -1 : a > b ? 1 : 0))

/** how the text under the new name differs from the old: the roll-up's tombstones and the open chunk's list hold chunk keys */
type Kind = 'plain' | 'rollup' | 'open'
interface Move { from: string; to: string; kind: Kind; /** the log bases, for the chunk keys inside a roll-up or an open chunk */ bases?: [string, string] }
function convert(m: Move, value: string): string {
  if (m.kind === 'plain' || !m.bases) return value
  const [a, b] = m.bases
  try {
    const doc = JSON.parse(value)
    if (m.kind === 'open') {
      if (Array.isArray(doc?.sealed)) doc.sealed = doc.sealed.map((k: unknown) => rebase(k, a, b))
    } else if (Array.isArray(doc?.folded)) {
      doc.folded = doc.folded.map((t: unknown) => (t && typeof t === 'object' && 'k' in t ? { ...(t as object), k: rebase((t as { k: unknown }).k, a, b) } : t))
    }
    return JSON.stringify(doc)
  } catch {
    return value // does not parse: moved as it is
  }
}

/** the log moves of one old log base into the new one, in order: the roll-up, the sealed chunks oldest first, the open
 * chunk last (its list names the new chunk keys) */
const logMoves = (from: string, to: string, keys: string[]): Move[] => {
  const bases: [string, string] = [from, to]
  return [
    { from: rollupKey(logOf(from)), to: rollupKey(logOf(to)), kind: 'rollup', bases },
    ...chunkKeysOf(logOf(from), keys).map((k): Move => ({ from: k, to: rebase(k, from, to) as string, kind: 'plain' })),
    { from: logOf(from), to: logOf(to), kind: 'open', bases },
  ]
}
const towerMoves = (): Move[] => [{ from: OLD_TOWER_HISTORY_LOG_KEY, to: TOWER_HISTORY_LOG_KEY, kind: 'plain' }]
/** copy, read back, compare, remove the old key */
function moveKey(s: Storage, m: Move): Key {
  const out = (status: KeyStatus): Key => ({ from: m.from, to: m.to, status })
  const old = get(s, m.from)
  const cur = get(s, m.to)
  if (old === null) return out(cur === null ? 'absent' : 'already')
  const want = convert(m, old)
  if (cur !== null) {
    if (cur !== want) return out('conflict')
    remove(s, m.from)
    return out('already')
  }
  try {
    s.setItem(m.to, want)
  } catch {
    remove(s, m.to) // a partial write, if the browser kept one
    return out('waiting-space')
  }
  if (get(s, m.to) !== want) { remove(s, m.to); return out('waiting-space') }
  remove(s, m.from)
  return out('moved')
}

/** a short fingerprint of a value: its length and a 32-bit FNV-1a hash */
export function fingerprint(v: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < v.length; i++) { h ^= v.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return `${v.length}:${h.toString(36)}`
}

/**
 * A save: as `moveKey`, and when both keys exist and differ, the old key is a late write of an old page. If the new save is
 * unchanged since the move (its fingerprint), the late write is newer: it moves over the new one. Else both stay: a conflict.
 */
function moveSave(s: Storage, m: Move): Key {
  const out = (status: KeyStatus): Key => ({ from: m.from, to: m.to, status })
  const old = get(s, m.from)
  const cur = get(s, m.to)
  if (old === null || cur === null || cur === old) {
    const r = moveKey(s, m)
    if (r.status === 'moved') setFingerprint(s, m.to, fingerprint(old!))
    return r
  }
  if (readMarker(s).fp[m.to] !== fingerprint(cur)) return out('conflict')
  try { s.setItem(m.to, old) } catch { return out('waiting-space') } // a failed setItem keeps the value it had
  if (get(s, m.to) !== old) { try { s.setItem(m.to, cur) } catch { /* the value it had */ } return out('waiting-space') }
  setFingerprint(s, m.to, fingerprint(old))
  remove(s, m.from)
  return out('moved')
}

/**
 * The open chunk: as `moveKey`, and when the new open chunk exists too (a late write of an old page), the old one's events
 * are sealed as chunks of the new log (one per session, `<t0>~<s>`, so the reader merges them by `t`) and listed in the new
 * open chunk's `sealed`; then the old key goes. A write that fails undoes the chunks it wrote (waiting for space).
 */
function moveOpen(s: Storage, m: Move): Key {
  const out = (status: KeyStatus): Key => ({ from: m.from, to: m.to, status })
  const old = get(s, m.from)
  const cur = get(s, m.to)
  if (old === null || cur === null || cur === convert(m, old)) return moveKey(s, m)
  const o = parseOpen(old)
  let doc: { sealed?: unknown }
  try { doc = JSON.parse(cur) } catch { return out('conflict') }
  if (!o || !doc || typeof doc !== 'object') return out('conflict')
  const oldSealed = o.sealed.map((k) => (m.bases ? rebase(k, m.bases[0], m.bases[1]) : k) as string)
  // the copies of chunks the old page sealed but did not list (as a reader drops them)
  const chunks: DecodedChunk[] = []
  for (const k of allKeys(s)) {
    if (!ownsKey(m.to, k) || !isChunkKey(k)) continue
    const evs = decodeChunk(get(s, k))
    if (evs) chunks.push({ key: k, events: evs })
  }
  const events = dropSealedCopies(o.events, chunks, new Set(oldSealed)).events
  const bySession = new Map<string, TelemetryEvent[]>()
  for (const e of events) { const list = bySession.get(e.s) ?? []; list.push(e); bySession.set(e.s, list) }
  const written: string[] = []
  const keys: string[] = []
  const undo = (status: KeyStatus) => { written.forEach((k) => remove(s, k)); return out(status) }
  for (const evs of bySession.values()) {
    let key: string, value: string
    try { key = chunkKey(m.to, evs[0]!.t, evs[0]!.s); value = encodeChunk(evs) } catch { return undo('conflict') }
    const want = JSON.stringify(evs)
    const before = get(s, key)
    if (before !== null) {
      if (JSON.stringify(decodeChunk(before)) !== want) return undo('conflict')
    } else {
      try { s.setItem(key, value) } catch { remove(s, key); return undo('waiting-space') }
      written.push(key)
      if (JSON.stringify(decodeChunk(get(s, key))) !== want) return undo('waiting-space')
    }
    keys.push(key)
  }
  const sealed = Array.isArray(doc.sealed) ? doc.sealed.filter((k): k is string => typeof k === 'string') : []
  const next = JSON.stringify({ ...doc, sealed: [...new Set([...sealed, ...oldSealed, ...keys])] })
  try { s.setItem(m.to, next) } catch { return undo('waiting-space') }
  if (get(s, m.to) !== next) { try { s.setItem(m.to, cur) } catch { /* the value it had */ } return undo('waiting-space') }
  remove(s, m.from)
  return out('moved')
}

/**
 * A game's save from all its sources (oldest first, the rule at the top of this file): each source that exists resolves
 * against the next generation that exists (a later source, else the new key). A conflict or a wait for space stops the
 * game's save there. One row per source that was there.
 */
function moveSaves(s: Storage, g: Names): Key[] {
  const rows: Key[] = []
  for (let i = 0; i < g.from.length; i++) {
    const from = g.from[i]!
    if (get(s, from) === null) continue
    const next = g.from.slice(i + 1).find((k) => get(s, k) !== null) ?? g.to
    const r = moveSave(s, { from, to: next, kind: 'plain' })
    rows.push(r.status === 'conflict' ? r : { ...r, to: g.to }) // a conflict names the two keys that differ
    if (r.status === 'conflict' || r.status === 'waiting-space') return rows
  }
  return rows.length ? rows : [{ from: g.from[g.from.length - 1]!, to: g.to, status: get(s, g.to) === null ? 'absent' : 'already' }]
}

/** `alef-playtime`: each day's old entries (`book2`, `spellquest`, `english`) become the new ids, in place (summed) */
function movePlaytime(s: Storage): Key {
  const out = (status: KeyStatus): Key => ({ from: PLAYTIME_KEY, to: PLAYTIME_KEY, status })
  const raw = get(s, PLAYTIME_KEY)
  if (raw === null) return out('absent')
  let next: string
  try {
    const days = JSON.parse(raw)?.days
    if (!days || typeof days !== 'object') return out('already')
    let changed = false
    for (const day of Object.values(days) as Record<string, unknown>[]) {
      if (!day || typeof day !== 'object') continue
      for (const [old, id] of Object.entries(PLAYTIME_IDS)) {
        if (!(old in day)) continue
        const a = day[old]
        const b = day[id]
        day[id] = typeof a === 'number' && typeof b === 'number' ? a + b : (b ?? a)
        delete day[old]
        changed = true
      }
    }
    if (!changed) return out('already')
    next = JSON.stringify({ ...JSON.parse(raw), days })
  } catch {
    return out('already') // does not parse: left as it is
  }
  try { s.setItem(PLAYTIME_KEY, next) } catch { return out('waiting-space') } // a failed setItem keeps the old value
  if (get(s, PLAYTIME_KEY) !== next) { try { s.setItem(PLAYTIME_KEY, raw) } catch { /* keep going */ } return out('waiting-space') }
  return out('moved')
}

interface Marker { done: string[]; fp: Record<string, string> }
function readMarker(s: Storage): Marker {
  try {
    const m = JSON.parse(get(s, MIGRATIONS_KEY) ?? 'null')
    const done = Array.isArray(m?.done) ? m.done.filter((x: unknown): x is string => typeof x === 'string') : []
    const fp = m?.fp && typeof m.fp === 'object' ? m.fp as Record<string, string> : {}
    return { done, fp }
  } catch { return { done: [], fp: {} } }
}
const readDone = (s: Storage) => readMarker(s).done
function writeMarker(s: Storage, { done, fp }: Marker) {
  try { s.setItem(MIGRATIONS_KEY, JSON.stringify(Object.keys(fp).length ? { v: 1, done, fp } : { v: 1, done })) } catch { /* no space: the step runs again, harmlessly */ }
}
function markDone(s: Storage, id: string) {
  const m = readMarker(s)
  if (!m.done.includes(id)) writeMarker(s, { ...m, done: [...m.done, id] })
}
/** no space for it: a later late write of an old page is then a conflict (both kept), never a loss */
function setFingerprint(s: Storage, key: string, fp: string) {
  const m = readMarker(s)
  if (m.fp[key] !== fp) writeMarker(s, { ...m, fp: { ...m.fp, [key]: fp } })
}

function runStep(s: Storage, id: string, tasks: (() => Key | Key[])[]): Step {
  const keys: Key[] = []
  let conflict = false
  for (const task of tasks) {
    for (const k of [task()].flat()) {
      keys.push(k)
      if (k.status === 'waiting-space') return { id, status: 'waiting-space', keys }
      if (k.status === 'conflict') conflict = true
    }
  }
  if (conflict) return { id, status: 'conflict', keys }
  markDone(s, id)
  return { id, status: 'done', keys }
}

/** the moves of the two-names step's logs, every old base of each game into its new one, oldest base first */
const twoNamesLogMoves = (keys: string[]): Move[] => GAMES.flatMap((g) => g.from.flatMap((from) => logMoves(from, g.to, keys)))

/** an old key is back after the two-names step was done (a page of an older build wrote it). A sealed chunk is written
 * with its open chunk, so the open chunk, the roll-up and the save are enough to look at: a few `getItem`s on each load. */
function lateWrite(s: Storage): boolean {
  for (const g of GAMES) {
    for (const from of g.from) {
      if (get(s, from) !== null || get(s, logOf(from)) !== null || get(s, rollupKey(logOf(from))) !== null) return true
    }
  }
  const pt = get(s, PLAYTIME_KEY)
  return pt !== null && Object.keys(PLAYTIME_IDS).some((id) => pt.includes(`"${id}"`))
}

/** Run the steps that are not done. Never throws; a second call changes nothing. */
export function migrateKeys(storage: Storage): MigrationReport {
  const steps: Step[] = []
  try {
    const done = readDone(storage)
    if (done.includes(STEP_TWO_NAMES) && !lateWrite(storage)) steps.push({ id: STEP_TWO_NAMES, status: 'done', keys: [] })
    else {
      steps.push(runStep(storage, STEP_TWO_NAMES, [
        ...GAMES.map((g) => () => moveSaves(storage, g)), () => movePlaytime(storage),
        ...twoNamesLogMoves(allKeys(storage)).map((m) => () => (m.kind === 'open' ? moveOpen(storage, m) : moveKey(storage, m))),
      ]))
    }
    if (done.includes(STEP_TOWER)) steps.push({ id: STEP_TOWER, status: 'done', keys: [] })
    else steps.push(runStep(storage, STEP_TOWER, towerMoves().map((m) => () => moveKey(storage, m))))
  } catch { /* never throws */ }
  return { steps }
}

const gameOf = (key: string) => GAMES.find((g) => g.to === key)
/** the newest old key of a save that is there, or null */
const newestSource = (s: Storage, g: Names) => [...g.from].reverse().find((k) => get(s, k) !== null) ?? null

/**
 * The key a save store reads and writes now. Normally `key`. While the save's move waits for space or has a conflict
 * (an old key is there and the new one is not), it frees space once (`freeSpace`: telemetry, never a save or the frozen
 * log) and tries the move again; if it still fails, the newest old key: the store goes on with the child's save there,
 * and a later load moves it. Never throws.
 */
export function saveKeyFor(storage: Storage, key: string, freeSpace?: (chars: number) => unknown): string {
  try {
    const g = gameOf(key)
    if (!g || get(storage, key) !== null) return key
    const size = Math.max(0, ...g.from.map((k) => get(storage, k)?.length ?? 0))
    if (!size) return key
    try { freeSpace?.(key.length + size + 4096) } catch { /* nothing freed */ }
    moveSaves(storage, g)
    return get(storage, key) !== null ? key : (newestSource(storage, g) ?? key)
  } catch { return key }
}

/** a save's value, read only: under its key, else under its newest old key while its move waits (the home's view) */
export function readSaveValue(storage: Storage, key: string): string | null {
  const v = get(storage, key)
  const g = gameOf(key)
  if (v !== null || !g) return v
  const from = newestSource(storage, g)
  return from === null ? null : get(storage, from)
}

/** what `migrateKeys` would move now (for the staging check): the old keys that exist, with their new names */
export function plannedMoves(storage: Storage): { from: string; to: string }[] {
  try {
    const done = readDone(storage)
    const keys = allKeys(storage)
    const moves: { from: string; to: string }[] = [
      ...(done.includes(STEP_TWO_NAMES) ? [] : [...GAMES.flatMap((g) => g.from.map((from) => ({ from, to: g.to }))), ...twoNamesLogMoves(keys)]),
      ...(done.includes(STEP_TOWER) ? [] : towerMoves()),
    ]
    return moves.filter((m) => get(storage, m.from) !== null).map(({ from, to }) => ({ from, to }))
  } catch { return [] }
}
