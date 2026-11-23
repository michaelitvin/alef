// Staging (main, served at /alef/staging/) is on the same origin as production (release, at /alef/), so the two
// share one localStorage. In the staging build, every localStorage key gets a prefix: a staging session never reads
// or changes the child's real saves, and new keys on any branch are covered without a change here.
// Each entry point imports this module first, before any store reads localStorage.
// A parent can open a staging URL with ?copy-prod to replace staging's saves with a copy of production's, or with
// ?export-prod to download a copy of them as one JSON file, or with
// ?migrate-check to prove the key migration on a copy of them (migrateCheck.ts; production ignores both).

import { downloadJson } from './download'
import { migrateKeys, type MigrationReport } from './keyMigration'
import type { CheckResult, CheckSnapshots } from './migrateCheck'
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

/** The file of `?export-prod`: every key that has no staging prefix, as the exact stored strings (no parsing, so the
 * compressed telemetry chunks stay byte-exact). No host name is in it. Only reads. */
export function buildProdExport(storage: Storage, prefix: string, now: Date, userAgent: string) {
  const keys: Record<string, string> = {}
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)!
    if (!k.startsWith(prefix)) keys[k] = storage.getItem(k) ?? ''
  }
  return { v: 1, kind: 'alef-prod-storage', exportedAt: now.toISOString(), userAgent, keys }
}

/** Put a prefixed view of `win.localStorage` in its place (and do a requested ?copy-prod first). The view is installed
 * even when the copy fails (for example on a full storage): otherwise staging would read and write the child's real
 * saves. */
export function installStagingStorage(win: Window, reload: (url: string) => void = (url) => win.location.replace(url), download: (json: string, filename: string) => void = downloadJson): Promise<boolean> | null {
  let storage: Storage
  try { storage = win.localStorage } catch { return null /* no storage: nothing to keep apart */ }
  let check = false
  let cleanUrl = ''
  try {
    const url = new URL(win.location.href)
    if (url.searchParams.has('migrate-check')) {
      url.searchParams.delete('migrate-check')
      win.history.replaceState(null, '', url)
      cleanUrl = url.href
      check = win.confirm('Run the migration check? It replaces the staging copies of the old saves and logs with copies of production’s, and runs the migration on them. Production is only read.')
    }
    if (url.searchParams.has('export-prod')) {
      // Production keys are only read here and staging never changes them, so the order against the migration is free.
      url.searchParams.delete('export-prod')
      win.history.replaceState(null, '', url)
      if (win.confirm('Download a copy of all the child’s real saves and logs from the real game, to test a change? Nothing is changed.')) {
        const now = new Date()
        download(JSON.stringify(buildProdExport(storage, STAGING_PREFIX, now, win.navigator.userAgent)), `alef-prod-storage-${now.toISOString().slice(0, 10)}.json`)
      }
    }
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
  if (check) return startMigrateCheck(storage, view, cleanUrl, reload, win, download)
  runKeyMigration(view)
  return null
}

/** Run `?migrate-check` (after the page's view is installed): the saves' steps load on demand, the old result is cleared,
 * the new one is written to `alef-migration-check` on staging, and the end page (migrateCheckPage.ts) shows it with the
 * before and after downloads. Its "Continue" reloads the page without the query. The promise is true when the reload is
 * asked for; the entry point waits for the gate (migrateCheckGate), so the app does not boot under the end page. */
function startMigrateCheck(storage: Storage, view: Storage, cleanUrl: string, reload: (url: string) => void, win: Window, download: (json: string, filename: string) => void): Promise<boolean> {
  const leave = () => { try { reload(cleanUrl); return true } catch { return false /* the result is in the Data section at the next visit */ } }
  return Promise.all([import('./migrateCheck'), import('./migrateCheckSteps'), import('./migrateCheckPage')]).then(([{ runMigrateCheck, MIGRATION_CHECK_KEY }, { SAVE_STEPS }, { showCheckEnd }]) => {
    try { view.removeItem(MIGRATION_CHECK_KEY) } catch { /* nothing to clear */ } // the last check's result (older names) never shows again
    let result: CheckResult
    const snap: CheckSnapshots = {}
    try {
      result = runMigrateCheck(storage, view, SAVE_STEPS, Date.now(), snap)
    } catch (e) { // a bug in the check: a FAIL with its message, never a blank page
      result = { v: 1, at: Date.now(), verdict: 'fail', message: `the check stopped: ${e instanceof Error ? e.message : String(e)}`, rows: [] }
    }
    try { view.setItem(MIGRATION_CHECK_KEY, JSON.stringify(result)) } catch { /* no space for the result: the end page still shows it */ }
    runKeyMigration(view)
    return new Promise<boolean>((resolve) => {
      try { showCheckEnd(win, result, snap, () => resolve(leave()), download) } catch { resolve(leave()) } // no page: reload as before
    })
  }).catch(() => { runKeyMigration(view); return leave() })
}

let lastReport: MigrationReport | null = null
/** what the key migration did on this page load (null before it ran); the parent area's Data section shows it */
export const lastMigrationReport = (): MigrationReport | null => lastReport

/** Move the old keys to the Spell Quest names on the storage the page uses (ADR 0009). Never throws; a few `getItem`s when done (the marker, and the old keys a stale old-build page could write again). */
export function runKeyMigration(storage: Storage): MigrationReport | null {
  try {
    lastReport = migrateKeys(storage)
    const waiting = lastReport.steps.filter((s) => s.status !== 'done')
    if (waiting.length) console.info('key migration:', waiting.map((s) => `${s.id} ${s.status}`).join(', '))
  } catch { /* never throws */ }
  return lastReport
}

let pendingCheck: Promise<boolean> | null = null
if (isStaging) pendingCheck = installStagingStorage(window)
else {
  try { runKeyMigration(window.localStorage) } catch { /* no storage */ }
}
/** The gate of `?migrate-check`: each entry point opens its app only after it (`migrateCheckGate().then(() => import('./boot'))`),
 * so no store module evaluates (hydrates, persists) while the check works. It resolves at once when there is no check (and
 * on production). With the check on staging it never resolves once the reload is asked for: the page is then reloading
 * without the query. It resolves, and the page starts, if the reload cannot be asked for or the check fails. */
export function migrateCheckGate(pending: Promise<boolean> | null = pendingCheck): Promise<void> {
  return pending ? pending.then((leaving) => (leaving ? new Promise<void>(() => {}) : undefined), () => undefined) : Promise.resolve()
}
