// Staging (main, served at /alef/staging/) is on the same origin as production (release, at /alef/), so the two
// share one localStorage. In the staging build, every localStorage key gets a prefix: a staging session never reads
// or changes the child's real saves, and new keys on any branch are covered without a change here.
// Each entry point imports this module first, before any store reads localStorage.
// A parent can open a staging URL with ?copy-prod to replace staging's saves with a copy of production's.

import { migrateKeys, type MigrationReport } from './keyMigration'
import { STAGING_PREFIX } from './stagingPrefix'
export { STAGING_PREFIX }

export const isStaging = import.meta.env.BASE_URL.endsWith('/staging/')

/** A Storage that keeps its keys under `prefix` in `inner` and sees no other key. */
export function prefixedStorage(inner: Storage, prefix: string): Storage {
  const ownKeys = () => {
    const keys: string[] = []
    for (let i = 0; i < inner.length; i++) {
      const k = inner.key(i)
      if (k?.startsWith(prefix)) keys.push(k.slice(prefix.length))
    }
    return keys
  }
  return {
    get length() { return ownKeys().length },
    key: (i) => ownKeys()[i] ?? null,
    getItem: (k) => inner.getItem(prefix + k),
    setItem: (k, v) => inner.setItem(prefix + k, v),
    removeItem: (k) => inner.removeItem(prefix + k),
    clear: () => ownKeys().forEach((k) => inner.removeItem(prefix + k)),
  }
}

/** Telemetry logs (`*-telemetry`) are not saves: a copy of them could fill the origin's quota, and then the child's next
 * save write on production fails. */
export const isTelemetryKey = (k: string) => k.endsWith('-telemetry')

/** Replace the saves under `prefix` with a copy of every save that has no prefix. The telemetry logs are not copied. */
export function copyUnprefixedOver(storage: Storage, prefix: string) {
  const all: string[] = []
  for (let i = 0; i < storage.length; i++) all.push(storage.key(i)!)
  all.filter((k) => k.startsWith(prefix)).forEach((k) => storage.removeItem(k))
  all.filter((k) => !k.startsWith(prefix) && !isTelemetryKey(k)).forEach((k) => storage.setItem(prefix + k, storage.getItem(k)!))
}

/** Put a prefixed view of `win.localStorage` in its place (and do a requested ?copy-prod first). The view is installed
 * even when the copy fails (for example on a full storage): otherwise staging would read and write the child's real
 * saves. */
export function installStagingStorage(win: Window) {
  let storage: Storage
  try { storage = win.localStorage } catch { return /* no storage: nothing to keep apart */ }
  try {
    const url = new URL(win.location.href)
    if (url.searchParams.has('copy-prod')) {
      url.searchParams.delete('copy-prod')
      win.history.replaceState(null, '', url)
      if (win.confirm('Replace all staging saves with a copy of the production saves?')) {
        copyUnprefixedOver(storage, STAGING_PREFIX)
      }
    }
  } catch { /* the copy failed part way: staging keeps what it got */ }
  const view = prefixedStorage(storage, STAGING_PREFIX)
  Object.defineProperty(win, 'localStorage', { value: view, configurable: true })
  runKeyMigration(view)
}

let lastReport: MigrationReport | null = null
/** what the key migration did on this page load (null before it ran); the parent area's Data section shows it */
export const lastMigrationReport = (): MigrationReport | null => lastReport

/** Move the old keys to the Spell Quest names on the storage the page uses (ADR 0009). Never throws; one `getItem` when done. */
export function runKeyMigration(storage: Storage): MigrationReport | null {
  try {
    lastReport = migrateKeys(storage)
    const waiting = lastReport.steps.filter((s) => s.status !== 'done')
    if (waiting.length) console.info('key migration:', waiting.map((s) => `${s.id} ${s.status}`).join(', '))
  } catch { /* never throws */ }
  return lastReport
}

if (isStaging) installStagingStorage(window)
else {
  try { runKeyMigration(window.localStorage) } catch { /* no storage */ }
}
