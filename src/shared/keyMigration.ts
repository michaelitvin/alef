// The key migration of the Spell Quest rename (spec 2026-11-22-spell-quest-rename-design.md, "The migration"): Book 2's
// save, play-time days and telemetry move to the `spellquest` names, and the frozen first-duel log to the tower's
// history key. A pure function over the `Storage` a page uses (the staging build's prefixed view, or the plain one), so it
// never sees another view's keys. Each key moves by copy, read back, compare, remove the old key. It never throws,
// changes nothing on a second run, and a run that stops (no space, a conflict) goes on at the next call.
// It uses a plain `setItem` with a catch, not `safeSetItem`: that one may evict telemetry while this moves it.
import { chunkT0, isChunkKey, ownsKey, rollupKey } from './telemetryChunks'

export type KeyStatus = 'moved' | 'already' | 'conflict' | 'waiting-space' | 'absent'
export interface MigrationReport {
  steps: { id: string; status: 'done' | 'waiting-space' | 'conflict'; keys: { from: string; to: string; status: KeyStatus }[] }[]
}

/** `{v:1, done: string[]}`: the ids of the steps that are complete */
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

function readDone(s: Storage): string[] {
  try {
    const d = JSON.parse(get(s, MIGRATIONS_KEY) ?? 'null')?.done
    return Array.isArray(d) ? d.filter((x: unknown): x is string => typeof x === 'string') : []
  } catch { return [] }
}
function markDone(s: Storage, id: string) {
  const done = readDone(s)
  if (done.includes(id)) return
  try { s.setItem(MIGRATIONS_KEY, JSON.stringify({ v: 1, done: [...done, id] })) } catch { /* no space: the step runs again, harmlessly */ }
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

/** Run the steps that are not done. Never throws; a second call changes nothing. */
export function migrateKeys(storage: Storage): MigrationReport {
  const steps: Step[] = []
  try {
    const done = readDone(storage)
    if (done.includes(STEP_RENAME)) steps.push({ id: STEP_RENAME, status: 'done', keys: [] })
    else {
      const [save, ...rest] = renameMoves(allKeys(storage))
      steps.push(runStep(storage, STEP_RENAME, [
        () => moveKey(storage, save!), () => movePlaytime(storage), ...rest.map((m) => () => moveKey(storage, m)),
      ]))
    }
    if (done.includes(STEP_TOWER)) steps.push({ id: STEP_TOWER, status: 'done', keys: [] })
    else steps.push(runStep(storage, STEP_TOWER, towerMoves().map((m) => () => moveKey(storage, m))))
  } catch { /* never throws */ }
  return { steps }
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
