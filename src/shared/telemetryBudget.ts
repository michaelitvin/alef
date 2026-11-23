// One budget for every live telemetry log of every game: it does not grow with the number of games. Past it, the oldest
// sealed chunk across all logs goes, folded into its log's roll-up first (telemetryRollup.ts). The frozen tower-history log
// is never counted here, trimmed or evicted; neither is a save, nor an unreadable chunk.
//
// Each build budgets its own keys: the production build sees the staging build's `staging:` keys too (the raw storage)
// and leaves them out of its sum; the staging build sees only its own keys and keeps a quarter of each budget.
import { STAGING_PREFIX, isStaging, isTelemetryKey } from './stagingStorage'
import { chunkHeader, decodeChunk } from './telemetryCodec'
import { chunkT0, dropSealedCopies, getRaw, isChunkKey, isFrozenLog, parseOpen, storageKeys } from './telemetryChunks'
import { foldChunk, trimRollups } from './telemetryRollup'
import type { TelemetryLog } from './telemetry'

/** the live logs' open and sealed chunks, in characters (UTF-16 code units, ≈2 bytes each), all games together */
export const LIVE_BUDGET = 800_000
/** every log's roll-up together */
export const ROLLUP_BUDGET = 150_000
/** the staging build shares production's quota, so it keeps this share of each budget */
export const STAGING_SHARE = 0.25
/** production never evicts a chunk with an event this recent to keep the budget (a save under pressure may) */
export const RAW_FLOOR_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export const liveBudget = (staging = isStaging) => (staging ? Math.floor(LIVE_BUDGET * STAGING_SHARE) : LIVE_BUDGET)
export const rollupBudget = (staging = isStaging) => (staging ? Math.floor(ROLLUP_BUDGET * STAGING_SHARE) : ROLLUP_BUDGET)

const isRollupKey = (k: string) => k.endsWith('~sum-telemetry')
/** a live log's key of this build: telemetry, not frozen, not a roll-up, not the other build's (`staging:`) */
const isLiveKey = (k: string) => isTelemetryKey(k) && !isFrozenLog(k) && !isRollupKey(k) && !k.startsWith(STAGING_PREFIX)

/** the characters this build's live logs hold (open and sealed chunks; key names too) */
export function liveChars(keys = storageKeys()): number {
  let n = 0
  for (const k of keys) if (isLiveKey(k)) n += k.length + (getRaw(k)?.length ?? 0)
  return n
}

/** the open key of the log a chunk or roll-up key belongs to (`<base>~…-telemetry` → `<base>-telemetry`) */
export const logKeyOf = (k: string) => `${k.split('~')[0]}-telemetry`

/** the registered log of a key (with or without the staging prefix) */
const logOf = (logKey: string, logs: readonly TelemetryLog[]) =>
  logs.find((l) => l.key === logKey || STAGING_PREFIX + l.key === logKey)

/**
 * Evict one sealed chunk: fold it into its log's roll-up (with its tombstone), then remove it. A chunk that does not
 * read is never evicted, nor one whose events the stored open chunk still holds (its `sealed` lacks the chunk: an open
 * rewrite that failed after the seal, or a tab that flushed an older view): those would come back as raw events.
 * For a save (`forSave`), a roll-up write that finds no room comes after the removal.
 * Gives the characters freed (0 when it stays). A crash between the two steps folds nothing twice (the roll-up holds the
 * tombstone). Never throws.
 */
export function evictChunk(k: string, logs: readonly TelemetryLog[], now = Date.now(), { forSave = false } = {}): number {
  try {
    const value = getRaw(k)
    const head = chunkHeader(value)
    const events = decodeChunk(value)
    if (!head || !events) return 0
    const logKey = logKeyOf(k)
    const open = parseOpen(getRaw(logKey))
    if (open && dropSealedCopies(open.events, [{ key: k, events }], new Set(open.sealed)).removed.length > 0) return 0
    const log = logOf(logKey, logs)
    if (!foldChunk(logKey, log, k, head, log ? events : null, now)) {
      // a full storage has no room for the roll-up: for a save, the chunk goes first, then the fold gets its room
      if (!forSave) return 0
      localStorage.removeItem(k)
      foldChunk(logKey, log, k, head, log ? events : null, now)
      return k.length + value!.length
    }
    localStorage.removeItem(k)
    return k.length + value!.length
  } catch {
    return 0
  }
}

/** this build's evictable chunks (readable header), oldest first by t0 across all logs; `staging` keys only when asked */
function chunksByAge(keys: readonly string[], { stagingKeys = false } = {}) {
  return keys
    .filter((k) => isChunkKey(k) && isTelemetryKey(k) && !isFrozenLog(k) && (stagingKeys ? k.startsWith(STAGING_PREFIX) : !k.startsWith(STAGING_PREFIX)))
    .map((k) => ({ k, head: chunkHeader(getRaw(k)) }))
    .filter((c): c is { k: string; head: NonNullable<typeof c.head> } => c.head !== null)
    .sort((a, b) => a.head.t0 - b.head.t0 || chunkT0(a.k) - chunkT0(b.k) || (a.k < b.k ? -1 : 1))
}

/**
 * Keep this build's live logs within their budget (after a seal): evict the oldest sealed chunks across all logs, folding
 * each first. Production keeps every chunk with an event in the last RAW_FLOOR_DAYS days even past the budget. Then keep
 * the roll-ups within theirs. Never throws.
 */
export function enforceBudget(logs: readonly TelemetryLog[], { now = Date.now(), staging = isStaging } = {}) {
  try {
    const keys = storageKeys()
    let used = liveChars(keys)
    const budget = liveBudget(staging)
    if (used > budget) {
      const floor = now - RAW_FLOOR_DAYS * DAY_MS
      for (const { k, head } of chunksByAge(keys)) {
        if (used <= budget) break
        if (!staging && head.t1 >= floor) continue
        used -= evictChunk(k, logs, now)
      }
    }
    const rollups = [...new Set(storageKeys().filter((k) => isRollupKey(k) && !k.startsWith(STAGING_PREFIX)).map(logKeyOf))]
    trimRollups(rollups, rollupBudget(staging))
  } catch { /* best-effort */ }
}

/**
 * A save needs room: free at least `chars` characters of telemetry, saves first. The staging build's sealed chunks first
 * (in the production build), then the oldest sealed chunks of any live log (no floor here), each folded first; then
 * `trimOpen` (the open chunks' oldest events). Never a frozen log, never an unreadable chunk, never a save. Gives the
 * characters freed. Never throws.
 */
export function freeChunks(chars: number, logs: readonly TelemetryLog[], now = Date.now()): number {
  let freed = 0
  try {
    const keys = storageKeys()
    for (const { k } of [...chunksByAge(keys, { stagingKeys: true }), ...chunksByAge(keys)]) {
      if (freed >= chars) break
      freed += evictChunk(k, logs, now, { forSave: true })
    }
  } catch { /* no storage */ }
  return freed
}

/** the stored size of each frozen log (with and without the staging prefix), read once per page: for the Data section */
let frozenSizes: Record<string, number> | null = null
export function frozenLogSizes(): Record<string, number> {
  if (frozenSizes) return frozenSizes
  const out: Record<string, number> = {}
  for (const k of storageKeys()) if (isFrozenLog(k)) out[k] = k.length + (getRaw(k)?.length ?? 0)
  frozenSizes = out
  return out
}
