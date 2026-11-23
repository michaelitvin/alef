// The sound settings of this device, one for every game: effects on or off, music on or off, and the volume. Kept in one
// key (`alef-device`) that every entry reads (they share the origin; staging gets its own `staging:` copy by itself).
// Not `alef-settings`: old browsers can still hold the data of a settings store that is gone (src/shared/README.md).
//
// The first read on a device seeds the key once, from the settings the parent set before: Spell Quest's save, else the
// clock's, else the defaults. The old fields stay in those saves, unread (no save migration).
// The lessons' voice follows the volume only: `sfx` never silences a voice line (the child cannot read).
import { useSyncExternalStore } from 'react'
import { safeSetItem } from './saveStorage'
import { SPELLQUEST_SAVE_KEY } from './saveKeys'

export interface DeviceSettings { v: 1; sfx: boolean; music: boolean; volume: number }
export const DEVICE_KEY = 'alef-device'
const DEFAULTS: DeviceSettings = { v: 1, sfx: true, music: true, volume: 0.8 }
/** the saves the seed reads, in order: the first one that holds a field gives it */
const SEED_SOURCES = [SPELLQUEST_SAVE_KEY, 'alef-clock'] as const

const bool = (x: unknown): boolean | undefined => (typeof x === 'boolean' ? x : undefined)
const vol = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : undefined)

function getRaw(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

/** the settings object of a game's persisted save (`{ state: { settings }, version }`), or null */
function savedSettings(key: string): Record<string, unknown> | null {
  try {
    const s = JSON.parse(getRaw(key) ?? 'null')?.state?.settings
    return s && typeof s === 'object' ? s : null
  } catch {
    return null
  }
}

function parse(raw: string | null): DeviceSettings | null {
  if (raw === null) return null
  try {
    const d = JSON.parse(raw)
    if (d?.v !== 1) return null
    const sfx = bool(d.sfx), music = bool(d.music), volume = vol(d.volume)
    if (sfx === undefined || music === undefined || volume === undefined) return null
    return { v: 1, sfx, music, volume }
  } catch {
    return null
  }
}

/** The one-time seed: each field from Spell Quest's save, else the clock's, else the default. */
function seedFromSaves(): DeviceSettings {
  const sources = SEED_SOURCES.map(savedSettings)
  const pick = <T,>(f: 'sfx' | 'music' | 'volume', check: (x: unknown) => T | undefined, dflt: T): T => {
    for (const s of sources) {
      const x = s ? check(s[f]) : undefined
      if (x !== undefined) return x
    }
    return dflt
  }
  return { v: 1, sfx: pick('sfx', bool, DEFAULTS.sfx), music: pick('music', bool, DEFAULTS.music), volume: pick('volume', vol, DEFAULTS.volume) }
}

const listeners = new Set<() => void>()
let cache: { raw: string | null; value: DeviceSettings } | null = null

function write(value: DeviceSettings) {
  safeSetItem(DEVICE_KEY, JSON.stringify(value)) // storage still full: this page only
  cache = { raw: getRaw(DEVICE_KEY), value }
}

function read(): DeviceSettings {
  const raw = getRaw(DEVICE_KEY)
  if (cache && cache.raw === raw) return cache.value
  const value = parse(raw)
  if (value) {
    cache = { raw, value }
    return value
  }
  // missing (or broken): seed once and write it at once, so a later change in a game's save never seeds again
  write(seedFromSaves())
  return cache!.value
}
const notify = () => listeners.forEach((l) => l())

export const getDeviceSettings = (): DeviceSettings => read()

export function setDeviceSettings(p: Partial<Omit<DeviceSettings, 'v'>>) {
  const cur = read()
  write({
    v: 1,
    sfx: bool(p.sfx) ?? cur.sfx,
    music: bool(p.music) ?? cur.music,
    volume: vol(p.volume) ?? cur.volume,
  })
  notify()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  // another page changed it (in staging the event's key carries the prefix)
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key.endsWith(DEVICE_KEY)) cb() }
  // a page restored from the back/forward cache gets no storage event for a change made meanwhile: read again
  const onShow = () => cb()
  window.addEventListener('storage', onStorage)
  window.addEventListener('pageshow', onShow)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('pageshow', onShow)
  }
}

export const useDeviceSettings = (): DeviceSettings => useSyncExternalStore(subscribe, getDeviceSettings, () => DEFAULTS)
