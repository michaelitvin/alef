// The staging check `?migrate-check` (spec 2026-11-22-spell-quest-rename-design.md, "Staging check"): it proves the key
// migration (keyMigration.ts) and the saves' version steps on a copy of the child's real saves, before a release.
// Pure over two storage views: `prod` (only read: its unprefixed keys) and `staging` (the view a staging page uses).
// The page glue is in stagingStorage.ts; the save steps (game code) come in from migrateCheckSteps.ts; the end page with
// the before and after downloads is migrateCheckPage.ts.
// The tables below name production's ORIGINAL keys as sources (production never ran a migration) and the final names
// (spec 2026-11-22, addendum 2026-11-23: `alef-spellquest-he`, `alef-spellquest-en`) as targets. Staging's own copies
// under any name (original, the 2026-11-23 in-between `alef-spellquest`, final) are removed first.
//
// In order: (1) remove staging's copies of the keys that move (old and new names) and the markers; (2) copy production's
// old-named keys into staging under their old names (a quota error removes the copies and stops); (3) keep the old values
// as the expected snapshot; (4) run `migrateKeys`, then each save's version step on the moved save, and write the result
// back the way a store does on load (the new state, the current version); (5) verify each key; (6) run the migration
// again (nothing may change), then the half-done case (one old key put back, no marker; it must resume to the same result).
// The expected value of a save is built from this file's OWN table of old and new field paths, never from the migration's
// map, so a wrong map in the migration fails here.
import { migrateKeys, MIGRATIONS_KEY, STEP_TWO_NAMES } from './keyMigration'
import { STAGING_PREFIX } from './stagingPrefix'
import { decodeChunk } from './telemetryCodec'
import { isChunkKey, ownsKey, parseOpen } from './telemetryChunks'

/** staging only: the last result */
export const MIGRATION_CHECK_KEY = 'alef-migration-check'

export interface CheckRow {
  /** the key as the parent reads it (the new name) */
  key: string
  /** old name gone and new name present (null: not a move) */
  moved: boolean | null
  /** the new value is what it must be */
  content: boolean
  /** the counts agree (null: this key has none) */
  counts: boolean | null
  detail?: string
}
export type CheckVerdict = 'pass' | 'fail' | 'already' | 'no-space'
/** `v: 2` and `step`: the migration step the check ran (an older result, of an older step, is never shown as current) */
export interface CheckResult { v: 2; step: string; at: number; verdict: CheckVerdict; message?: string; rows: CheckRow[] }

export function readCheckResult(storage: Storage): CheckResult | null {
  try {
    const d = JSON.parse(storage.getItem(MIGRATION_CHECK_KEY) ?? 'null') as CheckResult | null
    return d && d.v === 2 && d.step === STEP_TWO_NAMES && Array.isArray(d.rows) ? d : null
  } catch { return null }
}

/** a result is stored, but of an older check (an older step): it is not shown as current */
export function staleCheckResult(storage: Storage): boolean {
  try { return storage.getItem(MIGRATION_CHECK_KEY) !== null && readCheckResult(storage) === null } catch { return false }
}

/** a save's version step and its current version, given in by migrateCheckSteps.ts */
export interface SaveStep { version: number; migrate: (state: unknown, version: number) => unknown }

// ---- the check's own table: where each save's fields go (written out on purpose, not read from the migration)
interface SaveSpec { oldKey: string; newKey: string; renames: [string, string][]; fullFrom: number }
const BOOK_FIELDS: [string, string][] = [['bookOpen', 'screensOpen'], ['firstDuelImported', 'towerImported']]
const SAVES: SaveSpec[] = [
  { oldKey: 'alef-progress', newKey: 'alef-progress', renames: [['duel', 'tower'], ['settings.duelMusic', 'settings.towerMusic']], fullFrom: 0 },
  // before version 7 a Spell Quest save also gets `screensOpen` from its stage: then only the renamed fields are compared
  { oldKey: 'alef-duel2', newKey: 'alef-spellquest-he', renames: BOOK_FIELDS, fullFrom: 7 },
  // English Spell Quest's save (version 2 renamed the same two fields)
  { oldKey: 'alef-english', newKey: 'alef-spellquest-en', renames: BOOK_FIELDS, fullFrom: 0 },
]
/** the in-between save name of the 2026-11-23 build (staging and dev devices only): removed with the others in step 1 */
const BETWEEN_SAVES = ['alef-spellquest']
const PLAYTIME = 'alef-playtime'
/** old play-time entry → new */
const PLAYTIME_IDS: Record<string, string> = { book2: 'spellquest-he', spellquest: 'spellquest-he', english: 'spellquest-en' }
const OLD_PLAYTIME_IDS = ['book2', 'spellquest', 'english']
/** the logs by their base (the log's key is `<base>-telemetry`, its chunks `<base>~…-telemetry`) */
const LOGS = [{ old: 'alef-duel2', new: 'alef-spellquest-he' }, { old: 'alef-english', new: 'alef-spellquest-en' }]
const ALL_LOG_BASES = [...LOGS.flatMap((l) => [l.old, l.new]), 'alef-spellquest']
const FROZEN = [{ old: 'alef-duel-telemetry', new: 'alef-tower-history-telemetry' }]
const STEPS = ['spellquest-two-names', 'tower-history']
const FORBIDDEN = new Set(['duel', 'duel2', 'book', 'book2'])

// ---- helpers
const keysOf = (s: Storage): string[] => {
  const out: string[] = []
  for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k !== null) out.push(k) }
  return out
}
const isRollup = (k: string) => k.endsWith('~sum-telemetry')
const ofLog = (base: string, k: string) => k === `${base}-telemetry` || ownsKey(`${base}-telemetry`, k)
/** the log (of LOGS) whose old key this is */
const oldLogOf = (k: string) => LOGS.find((l) => ofLog(l.old, k))
const isOldLogKey = (k: string) => !!oldLogOf(k)
const isAnyLogKey = (k: string) => ALL_LOG_BASES.some((b) => ofLog(b, k))
const newLogName = (k: string) => { const l = oldLogOf(k); return l ? `${l.new}${k.slice(l.old.length)}` : k }
const isFrozen = (k: string) => FROZEN.some((f) => f.old === k || f.new === k)

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a), kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => k in b && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

function getPath(o: unknown, path: string): unknown {
  let cur = o
  for (const p of path.split('.')) cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[p] : undefined
  return cur
}
function movePath(o: Record<string, unknown>, from: string, to: string) {
  const f = from.split('.'), t = to.split('.')
  const parent = (path: string[]) => path.slice(0, -1).reduce<unknown>((c, p) => (c && typeof c === 'object' ? (c as Record<string, unknown>)[p] : undefined), o) as Record<string, unknown> | undefined
  const src = parent(f), dst = parent(t)
  const fl = f[f.length - 1]!, tl = t[t.length - 1]!
  if (!src || !dst || !(fl in src)) return
  if (dst[tl] === undefined) dst[tl] = src[fl]
  delete src[fl]
}
/** the save as it must be after the rename: the check's own table applied to the old state */
function expectedState(spec: SaveSpec, state: unknown): unknown {
  const s = clone(state) as Record<string, unknown>
  for (const [from, to] of spec.renames) movePath(s, from, to)
  return s
}
/** where a field or an id named duel, duel2, book or book2 (a key, or a text value) is left: its path, or null */
function forbiddenIn(x: unknown, path = ''): string | null {
  if (typeof x === 'string') return FORBIDDEN.has(x) ? `${path} = "${x}"` : null
  if (!x || typeof x !== 'object') return null
  for (const [k, v] of Object.entries(x)) {
    if (!Array.isArray(x) && FORBIDDEN.has(k)) return `${path}.${k}`
    const f = forbiddenIn(v, `${path}.${k}`)
    if (f) return f
  }
  return null
}
const parse = (raw: string | null): unknown => { try { return raw === null ? undefined : JSON.parse(raw) } catch { return undefined } }

interface LogSummary { n: number; first: number | null; last: number | null }
/** a log's events counted (its open chunk and every sealed chunk, decoded), with the first and the last `t` */
function summarize(s: Storage, openKey: string): LogSummary {
  const times: number[] = []
  const add = (events: unknown) => { if (Array.isArray(events)) for (const e of events) if (typeof e?.t === 'number') times.push(e.t) }
  add(parseOpen(s.getItem(openKey))?.events)
  for (const k of keysOf(s)) if (ownsKey(openKey, k) && isChunkKey(k)) add(decodeChunk(s.getItem(k)))
  return { n: times.length, first: times.length ? Math.min(...times) : null, last: times.length ? Math.max(...times) : null }
}

/** the two snapshots the end page offers as downloads (kept in memory only: the data is about as large as the quota) */
export interface CheckSnapshots {
  /** production's keys exactly as the check copied them (old names, raw strings) */
  before?: Record<string, string>
  /** the migrated keys as the check left them (staging's prefix stripped, raw strings) */
  after?: Record<string, string>
}

// ---- the run
export function runMigrateCheck(prod: Storage, staging: Storage, steps: Record<string, SaveStep>, now = Date.now(), snap: CheckSnapshots = {}): CheckResult {
  const done = (verdict: CheckVerdict, rows: CheckRow[], message?: string): CheckResult => ({ v: 2, step: STEP_TWO_NAMES, at: now, verdict, rows, ...(message ? { message } : {}) })
  const prodKeys = keysOf(prod).filter((k) => !k.startsWith(STAGING_PREFIX))
  const isOld = (k: string) => isOldLogKey(k) || FROZEN.some((f) => f.old === k) || SAVES.some((v) => v.oldKey === k && v.oldKey !== v.newKey)
  if (!prodKeys.some(isOld)) return done('already', [], 'production is already migrated: nothing to check')

  // 1. staging's copies of the moving keys (old and new names) and the markers (kept in memory: a stop for space puts them back)
  const removed = new Map(keysOf(staging)
    .filter((k) => isAnyLogKey(k) || isFrozen(k) || k === MIGRATIONS_KEY || k === PLAYTIME || BETWEEN_SAVES.includes(k) || SAVES.some((v) => v.oldKey === k || v.newKey === k))
    .map((k) => [k, staging.getItem(k)!]))
  removed.forEach((_, k) => staging.removeItem(k))

  // 2. production's old-named keys, under their old names
  const toCopy = prodKeys.filter((k) => isOld(k) || k === PLAYTIME || SAVES.some((v) => v.oldKey === k))
  const attempted: string[] = []
  try {
    for (const k of toCopy) { attempted.push(k); staging.setItem(k, prod.getItem(k)!) }
  } catch {
    attempted.forEach((k) => staging.removeItem(k))
    let back = true
    removed.forEach((v, k) => { try { staging.setItem(k, v) } catch { back = false } })
    return done('no-space', [], back
      ? 'no space: staging has no room for a copy of production’s saves and logs; the check copied nothing and put staging’s own saves back'
      : 'no space: staging has no room for a copy of production’s saves and logs; the check copied nothing, and some of staging’s own saves could not be put back')
  }

  // 3. the expected snapshot: the old values as they were copied
  const old = new Map(toCopy.map((k) => [k, prod.getItem(k)!]))
  snap.before = Object.fromEntries(old)
  const oldLogs = LOGS.map((l) => summarize(staging, `${l.old}-telemetry`))
  const oldFrozen = FROZEN.map((f) => summarize(staging, f.old))

  // 4. the migration, then the saves' version steps (written back as a store does on load)
  migrateKeys(staging)
  const rows: CheckRow[] = []

  for (const spec of SAVES) {
    const raw = old.get(spec.oldKey)
    if (raw === undefined) continue
    const step = steps[spec.newKey]
    const doc = parse(raw) as { state?: unknown; version?: unknown } | undefined
    if (!doc || typeof doc !== 'object' || !doc.state || typeof doc.state !== 'object' || !step) {
      rows.push({ key: spec.newKey, moved: false, content: false, counts: null, detail: 'the old save cannot be read' })
      continue
    }
    const version = typeof doc.version === 'number' ? doc.version : 0
    const present = staging.getItem(spec.newKey) !== null
    const moved = present && (spec.oldKey === spec.newKey || staging.getItem(spec.oldKey) === null)
    let content = false
    let detail: string | undefined
    if (moved) {
      try {
        const cur = parse(staging.getItem(spec.newKey)) as { state?: unknown; version?: unknown }
        const migrated = step.migrate(cur.state, typeof cur.version === 'number' ? cur.version : 0)
        staging.setItem(spec.newKey, JSON.stringify({ ...cur, state: migrated, version: step.version }))
        const actual = (parse(staging.getItem(spec.newKey)) as { state: unknown }).state
        const expected = expectedState(spec, doc.state)
        content = version >= spec.fullFrom
          ? deepEqual(actual, expected)
          : spec.renames.every(([from, to]) => deepEqual(getPath(actual, to), getPath(expected, to)) && getPath(actual, from) === undefined)
        const left = forbiddenIn(actual)
        if (left) { content = false; detail = `a name from before the rename is left: ${left}` }
        else if (!content) detail = 'the saved value differs from the expected one'
      } catch { detail = 'the save step failed' }
    } else detail = present ? 'the old key is still there' : 'the new key is missing'
    rows.push({ key: spec.newKey, moved, content, counts: null, ...(detail ? { detail } : {}) })
  }

  // play time: the `book2` entries became `spellquest-he`, the `english` ones `spellquest-en`; the totals are equal
  const oldPt = old.get(PLAYTIME)
  if (oldPt !== undefined) {
    type Days = Record<string, Record<string, unknown>>
    const before = (parse(oldPt) as { days?: Days } | undefined)?.days ?? {}
    const after = (parse(staging.getItem(PLAYTIME)) as { days?: Days } | undefined)?.days ?? {}
    const num = (x: unknown) => (typeof x === 'number' ? x : 0)
    const total = (days: Days) => Object.values(days).reduce((a, d) => a + Object.values(d ?? {}).reduce<number>((b, ms) => b + num(ms), 0), 0)
    const noOld = Object.values(after).every((d) => !d || OLD_PLAYTIME_IDS.every((id) => !(id in d)))
    const daysEqual = Object.entries(before).every(([day, d]) => {
      const a = after[day]
      if (!a) return false
      const want: Record<string, number> = {}
      for (const [id, ms] of Object.entries(d ?? {})) { const to = PLAYTIME_IDS[id] ?? id; want[to] = (want[to] ?? 0) + num(ms) }
      return Object.entries(want).every(([id, ms]) => num(a[id]) === ms)
    })
    const sums = total(before) === total(after)
    rows.push({ key: PLAYTIME, moved: null, content: noOld && daysEqual, counts: sums, ...(noOld && daysEqual && sums ? {} : { detail: 'the play-time days differ' }) })
  }

  // the logs: each old key is gone, the new one is there and equal (the open chunk and the roll-up change only their key names)
  for (const k of toCopy.filter(isOldLogKey)) {
    const to = newLogName(k)
    const oldVal = old.get(k)!
    const newVal = staging.getItem(to)
    const moved = newVal !== null && staging.getItem(k) === null
    let content = false
    if (newVal !== null) {
      if (k === `${oldLogOf(k)!.old}-telemetry`) {
        const a = parseOpen(oldVal), b = parseOpen(newVal)
        content = !!a && !!b && deepEqual(a.events, b.events) && deepEqual(a.sealed.map(newLogName), b.sealed)
      } else if (isRollup(k)) {
        type Tomb = { k?: unknown }
        const a = parse(oldVal) as { folded?: Tomb[] } | undefined
        const b = parse(newVal) as { folded?: Tomb[] } | undefined
        content = !!a && !!b && deepEqual({ ...a, folded: 0 }, { ...b, folded: 0 })
          && deepEqual((a.folded ?? []).map((t) => ({ ...t, k: typeof t.k === 'string' ? newLogName(t.k) : t.k })), b.folded ?? [])
      } else content = newVal === oldVal
    }
    rows.push({ key: to, moved, content, counts: null, ...(moved && content ? {} : { detail: moved ? 'the moved value differs' : 'not moved' }) })
  }
  LOGS.forEach((l, i) => {
    if (!toCopy.some((k) => ofLog(l.old, k))) return
    const was = oldLogs[i]!
    const now2 = summarize(staging, `${l.new}-telemetry`)
    const same = deepEqual(was, now2)
    rows.push({ key: `${l.new}-telemetry: whole log, ${now2.n} events`, moved: null, content: true, counts: same, ...(same ? {} : { detail: `was ${was.n} events, now ${now2.n}` }) })
  })
  FROZEN.forEach((f, i) => {
    const oldVal = old.get(f.old)
    if (oldVal === undefined) return
    const newVal = staging.getItem(f.new)
    const moved = newVal !== null && staging.getItem(f.old) === null
    const counts = deepEqual(summarize(staging, f.new), oldFrozen[i])
    rows.push({ key: f.new, moved, content: newVal === oldVal, counts, ...(moved && newVal === oldVal && counts ? {} : { detail: 'the frozen log changed or did not move' }) })
  })

  // the markers
  const marks = (parse(staging.getItem(MIGRATIONS_KEY)) as { done?: string[] } | undefined)?.done ?? []
  const marked = STEPS.every((id) => marks.includes(id))
  rows.push({ key: MIGRATIONS_KEY, moved: null, content: marked, counts: null, ...(marked ? {} : { detail: 'a step is not marked done' }) })

  // 6. a second run changes nothing; a half-done run (one old key put back, no marker) resumes to the same result
  // (the marker by its steps: a resume that moves no save writes no save fingerprint)
  const markerSteps = (v: string) => JSON.stringify((parse(v) as { done?: unknown } | undefined)?.done ?? null)
  const snapshot = () => new Map(keysOf(staging).map((k) => [k, k === MIGRATIONS_KEY ? markerSteps(staging.getItem(k)!) : staging.getItem(k)!]))
  const sameMap = (a: Map<string, string>, b: Map<string, string>) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v)
  const finished = snapshot()
  snap.after = Object.fromEntries(keysOf(staging)
    .filter((k) => isAnyLogKey(k) || isFrozen(k) || k === MIGRATIONS_KEY || k === PLAYTIME || BETWEEN_SAVES.includes(k) || SAVES.some((v) => v.oldKey === k || v.newKey === k))
    .sort().map((k) => [k, staging.getItem(k)!]))
  migrateKeys(staging)
  const second = sameMap(finished, snapshot())
  rows.push({ key: 'second run', moved: null, content: second, counts: null, ...(second ? {} : { detail: 'a key changed on the second run' }) })

  const back = toCopy.find((k) => isOldLogKey(k) && isChunkKey(k)) ?? toCopy.find(isOldLogKey)
  if (back) {
    staging.setItem(back, old.get(back)!)
    staging.removeItem(MIGRATIONS_KEY)
    migrateKeys(staging)
    const resumed = sameMap(finished, snapshot())
    rows.push({ key: `half-done run (${back} put back)`, moved: null, content: resumed, counts: null, ...(resumed ? {} : { detail: 'it did not resume to the same result' }) })
  }

  return done(rows.every((r) => r.moved !== false && r.content && r.counts !== false) ? 'pass' : 'fail', rows)
}
