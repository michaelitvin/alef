// The child's saves survive a full storage. The saves and the telemetry logs share one localStorage (and staging shares
// it too, ADR 0001). Zustand's `persist` does not catch a quota error: the write throws inside the child's game action
// and the save is lost. Every persisted save and every small direct writer (player, device settings, play time) writes
// through `safeSetItem`: on a quota error it frees space by trimming the live telemetry logs (oldest events first: this
// page's logs, then the others; never the frozen first-duel log, never another save) and tries once more. If that fails
// too, the state stays in memory and nothing throws into the game.
// It uses `localStorage` at each call, so the staging build's prefixed storage (stagingStorage.ts) applies.
import { createJSONStorage, type StateStorage } from 'zustand/middleware'
import { freeTelemetrySpace } from './telemetry'

/** what a save write frees beyond its own growth, so the next small write does not fail at once (characters) */
export const FREE_SLACK = 4096

/** a quota error, as the browsers name it (Safari and Chrome: `QuotaExceededError`, old Firefox: its own name, code 1014) */
export function isQuotaError(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false
  const { name, code } = e as { name?: unknown; code?: unknown }
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014
}

/**
 * Write `value` under `key`. On a quota error, trim telemetry to make room and try once more. Gives true when the value
 * is stored. Never throws.
 */
/** a save write failed even after freeing telemetry, on this page (in memory: the Data section shows it) */
let saveFailedKey: string | null = null
export const saveFailed = (): string | null => saveFailedKey

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (!isQuotaError(e)) return false
  }
  try {
    const old = localStorage.getItem(key)?.length ?? 0
    freeTelemetrySpace(Math.max(0, key.length + value.length - old) + FREE_SLACK)
    localStorage.setItem(key, value)
    return true
  } catch {
    saveFailedKey = key
    return false
  }
}

/** The `StateStorage` of every persisted child save. */
export const saveStorage: StateStorage = {
  getItem: (key) => {
    try { return localStorage.getItem(key) } catch { return null }
  },
  setItem: (key, value) => { safeSetItem(key, value) },
  removeItem: (key) => {
    try { localStorage.removeItem(key) } catch { /* no storage */ }
  },
}

/** `persist`'s `storage` for a child save: JSON over `saveStorage`. */
export const persistSaveStorage = <S>() => createJSONStorage<S>(() => saveStorage)

let persistRequested = false
/** the browser's answer to `persist()` on this page: true, false, or null (not asked, or no answer) */
let persistAnswer: boolean | null = null
export const persistedAnswer = (): boolean | null => persistAnswer

/**
 * Ask the browser once per page to keep this site's storage under pressure (without it, the browser may clear it).
 * Best-effort: no API, a refusal or an error changes nothing. `record` gets the result once.
 */
export async function requestPersistentStorage(record?: (persisted: boolean) => void): Promise<void> {
  if (persistRequested) return
  persistRequested = true
  try {
    const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
    if (!storage?.persist) return
    const persisted = (await storage.persisted?.()) || (await storage.persist())
    persistAnswer = persisted === true
    record?.(persisted === true)
  } catch { /* best-effort */ }
}

/** for tests: forget that the request was made */
export function resetPersistRequestForTest() { persistRequested = false; persistAnswer = null; saveFailedKey = null }
