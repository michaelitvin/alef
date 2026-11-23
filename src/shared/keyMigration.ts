// The key migration of the Spell Quest rename (spec 2026-11-22-spell-quest-rename-design.md, "The migration"): Book 2's
// save, play-time days and telemetry move to the `spellquest` names, and the frozen first-duel log to the tower's
// history key. A pure function over the `Storage` a page uses (the staging build's prefixed view, or the plain one), so it
// never sees another view's keys. Each key moves by copy, read back, compare, remove the old key. It never throws,
// changes nothing on a second run, and a run that stops (no space, a conflict) goes on at the next call.
// It uses a plain `setItem` with a catch, not `safeSetItem`: that one may evict telemetry while this moves it.
//
// A page of the old build can outlive the release (a tab left open, or Back from the new home page restores it from the
// back-forward cache) and write the old keys again after the step is done. So every load also looks for the old save
// key, the old open chunk, the old roll-up and a `book2` entry in the play time (a few `getItem`s) and, when one is back,
// runs the step's moves again. A late save moves over the new one only when the new one is unchanged since the move (the
// marker keeps a fingerprint of what the move wrote); when both changed, both stay and the step reports a conflict. A
// late open chunk next to the new one becomes sealed chunks of the new log, listed in the new open chunk.
import { chunkKey, chunkT0, dropSealedCopies, isChunkKey, ownsKey, parseOpen, rollupKey, type DecodedChunk } from './telemetryChunks'
import { decodeChunk, encodeChunk } from './telemetryCodec'
import type { TelemetryEvent } from './telemetry'

export type KeyStatus = 'moved' | 'already' | 'conflict' | 'waiting-space' | 'absent'
export interface MigrationReport {
  steps: { id: string; status: 'done' | 'waiting-space' | 'conflict'; keys: { from: string; to: string; status: KeyStatus }[] }[]
}

/** `{v:1, done: string[], fp?: {[saveKey]: fingerprint}}`: the ids of the steps that are complete, and a fingerprint of
 * the value each save move wrote (to know later whether the new save changed since) */
export const MIGRATIONS_KEY = 'alef-migrations'

const OLD_SAVE = 'alef-duel2'
const NEW_SAVE = 'alef-spellquest'
const OLD_LOG = `${OLD_SAVE}-telemetry`
const NEW_LOG = `${NEW_SAVE}-telemetry`
const FROZEN_OLD = 'alef-duel-telemetry'
const FROZEN_NEW = 'alef-tower-history-telemetry'
const PLAYTIME_KEY = 'alef-playtime'

const STEP_RENAME = 'spellquest-rename'
const STEP_TOWER = 'tower-history'

/** the new name of a sealed chunk key of the old log (`alef-duel2~t0~s-telemetry` → `alef-spellquest~t0~s-telemetry`) */
const newChunkName = (k: string) => `${NEW_SAVE}${k.slice(OLD_SAVE.length)}`
const rewriteKey = (k: unknown) => (typeof k === 'string' && k.startsWith(`${OLD_SAVE}~`) ? newChunkName(k) : k)

type Key = MigrationReport['steps'][number]['keys'][number]
type Step = MigrationReport['steps'][number]

const allKeys = (s: Storage): string[] => {
  const keys: string[] = []
  try { for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k !== null) keys.push(k) } } catch { /* no storage */ }
  return keys
}
const get = (s: Storage, k: string): string | null => { try { return s.getItem(k) } catch { return null } }
const remove = (s: Storage, k: string) => { try { s.removeItem(k) } catch { /* nothing to do */ } }

/** the sealed chunk keys of the old log, oldest first */
const oldChunkKeys = (keys: string[]) => keys
  .filter((k) => ownsKey(OLD_LOG, k) && isChunkKey(k))
  .sort((a, b) => chunkT0(a) - chunkT0(b) || (a < b ? -1 : a > b ? 1 : 0))

/** how the text under the new name differs from the old: the roll-up's tombstones and the open chunk's list hold chunk keys */
type Kind = 'plain' | 'rollup' | 'open'
function convert(kind: Kind, value: string): string {
  if (kind === 'plain') return value
  try {
    const doc = JSON.parse(value)
    if (kind === 'open') {
      if (Array.isArray(doc?.sealed)) doc.sealed = doc.sealed.map(rewriteKey)
    } else if (Array.isArray(doc?.folded)) {
      doc.folded = doc.folded.map((t: unknown) => (t && typeof t === 'object' && 'k' in t ? { ...(t as object), k: rewriteKey((t as { k: unknown }).k) } : t))
    }
    return JSON.stringify(doc)
  } catch {
    return value // does not parse: moved as it is
  }
}

interface Move { from: string; to: string; kind: Kind }

/** the key moves of step 1 in order: the save, the roll-up, the sealed chunks oldest first, the open chunk last (its list names the new chunk keys) */
const renameMoves = (keys: string[]): Move[] => [
  { from: OLD_SAVE, to: NEW_SAVE, kind: 'plain' },
  { from: rollupKey(OLD_LOG), to: rollupKey(NEW_LOG), kind: 'rollup' },
  ...oldChunkKeys(keys).map((k): Move => ({ from: k, to: newChunkName(k), kind: 'plain' })),
  { from: OLD_LOG, to: NEW_LOG, kind: 'open' },
]
const towerMoves = (): Move[] => [{ from: FROZEN_OLD, to: FROZEN_NEW, kind: 'plain' }]

/** copy, read back, compare, remove the old key */
function moveKey(s: Storage, m: Move): Key {
  const out = (status: KeyStatus): Key => ({ from: m.from, to: m.to, status })
  const old = get(s, m.from)
  const cur = get(s, m.to)
  if (old === null) return out(cur === null ? 'absent' : 'already')
  const want = convert(m.kind, old)
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
  if (old === null || cur === null || cur === convert('open', old)) return moveKey(s, m)
  const o = parseOpen(old)
  let doc: { sealed?: unknown }
  try { doc = JSON.parse(cur) } catch { return out('conflict') }
  if (!o || !doc || typeof doc !== 'object') return out('conflict')
  const oldSealed = o.sealed.map((k) => rewriteKey(k) as string)
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

/** `alef-playtime`: the `book2` entry of each day becomes `spellquest`, in place (summed when both exist) */
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
      if (!day || typeof day !== 'object' || !('book2' in day)) continue
      const b = day.book2
      const q = day.spellquest
      day.spellquest = typeof b === 'number' && typeof q === 'number' ? b + q : (q ?? b)
      delete day.book2
      changed = true
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

function runStep(s: Storage, id: string, tasks: (() => Key)[]): Step {
  const keys: Key[] = []
  let conflict = false
  for (const task of tasks) {
    const k = task()
    keys.push(k)
    if (k.status === 'waiting-space') return { id, status: 'waiting-space', keys }
    if (k.status === 'conflict') conflict = true
  }
  if (conflict) return { id, status: 'conflict', keys }
  markDone(s, id)
  return { id, status: 'done', keys }
}

/** an old key is back after the rename step was done (an old page wrote it). A sealed chunk is written with its open
 * chunk, so the open chunk, the roll-up and the save are enough to look at: a few `getItem`s on each load. */
function lateWrite(s: Storage): boolean {
  if (get(s, OLD_SAVE) !== null || get(s, OLD_LOG) !== null || get(s, rollupKey(OLD_LOG)) !== null) return true
  return get(s, PLAYTIME_KEY)?.includes('"book2"') ?? false
}

/** Run the steps that are not done. Never throws; a second call changes nothing. */
export function migrateKeys(storage: Storage): MigrationReport {
  const steps: Step[] = []
  try {
    const done = readDone(storage)
    if (done.includes(STEP_RENAME) && !lateWrite(storage)) steps.push({ id: STEP_RENAME, status: 'done', keys: [] })
    else {
      const [save, ...rest] = renameMoves(allKeys(storage))
      steps.push(runStep(storage, STEP_RENAME, [
        () => moveSave(storage, save!), () => movePlaytime(storage),
        ...rest.map((m) => () => (m.kind === 'open' ? moveOpen(storage, m) : moveKey(storage, m))),
      ]))
    }
    if (done.includes(STEP_TOWER)) steps.push({ id: STEP_TOWER, status: 'done', keys: [] })
    else steps.push(runStep(storage, STEP_TOWER, towerMoves().map((m) => () => moveKey(storage, m))))
  } catch { /* never throws */ }
  return { steps }
}

/** the old key of a save that moves */
const OLD_SAVE_OF: Readonly<Record<string, string>> = { [NEW_SAVE]: OLD_SAVE }

/**
 * The key a save store reads and writes now. Normally `key`. While the save's move waits for space (the old key is there
 * and the new one is not), it frees space once (`freeSpace`: telemetry, never a save or the frozen log) and tries the
 * move again; if it still fails, the old key: the store goes on with the child's save there, and a later load moves it.
 * Never throws.
 */
export function saveKeyFor(storage: Storage, key: string, freeSpace?: (chars: number) => unknown): string {
  try {
    const from = OLD_SAVE_OF[key]
    if (!from) return key
    const old = get(storage, from)
    if (old === null || get(storage, key) !== null) return key
    try { freeSpace?.(key.length + old.length + 4096) } catch { /* nothing freed */ }
    return moveSave(storage, { from, to: key, kind: 'plain' }).status === 'moved' ? key : from
  } catch { return key }
}

/** a save's value, read only: under its key, else under its old key while its move waits for space (the home's view) */
export function readSaveValue(storage: Storage, key: string): string | null {
  const v = get(storage, key)
  const from = OLD_SAVE_OF[key]
  return v !== null || !from ? v : get(storage, from)
}

/** what `migrateKeys` would move now (for the staging check): the old keys that exist, with their new names */
export function plannedMoves(storage: Storage): { from: string; to: string }[] {
  try {
    const done = readDone(storage)
    const moves = [
      ...(done.includes(STEP_RENAME) ? [] : renameMoves(allKeys(storage))),
      ...(done.includes(STEP_TOWER) ? [] : towerMoves()),
    ]
    return moves.filter((m) => get(storage, m.from) !== null).map(({ from, to }) => ({ from, to }))
  } catch { return [] }
}
