// The player setting shared by all the games (spec: docs/superpowers/specs/2026-11-07-girls-design.md): boy or girl, kept
// on the device in one key that every entry reads (they share the origin). Unset → the game asks the child before the
// first round. A girl hears the feminine take of each line that speaks to the child (`<id>-f`) and sees the girl wizard.
import { useSyncExternalStore } from 'react'

export type Gender = 'boy' | 'girl'
export interface PlayerSetting { gender: Gender; by: 'child' | 'parent'; at: number }
export const PLAYER_KEY = 'alef-player'
/** the suffix of a feminine voice file and of a girl picture */
export const FEMININE_SUFFIX = '-f'
export const GIRL_SUFFIX = '-girl'

const listeners = new Set<() => void>()
let cache: { raw: string | null; value: PlayerSetting | null } | null = null

function read(): PlayerSetting | null {
  let raw: string | null = null
  try { raw = localStorage.getItem(PLAYER_KEY) } catch { return null }
  if (cache && cache.raw === raw) return cache.value
  let value: PlayerSetting | null = null
  try {
    const doc = JSON.parse(raw ?? 'null')
    if (doc && (doc.gender === 'boy' || doc.gender === 'girl'))
      value = { gender: doc.gender, by: doc.by === 'parent' ? 'parent' : 'child', at: Number(doc.at) || 0 }
  } catch { /* a broken value: ask again */ }
  cache = { raw, value }
  return value
}
const notify = () => listeners.forEach((l) => l())

export const getPlayer = (): PlayerSetting | null => read()
export const getGender = (): Gender | null => read()?.gender ?? null

export function setGender(gender: Gender, by: 'child' | 'parent') {
  try { localStorage.setItem(PLAYER_KEY, JSON.stringify({ gender, by, at: Date.now() })) } catch { /* storage full: this session only */ }
  notify()
}
/** The parent's "ask again": the next start shows the question. */
export function clearGender() {
  try { localStorage.removeItem(PLAYER_KEY) } catch { /* ignore */ }
  notify()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => { if (e.key === PLAYER_KEY || e.key === null) cb() }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage) }
}
export const useGender = (): Gender | null => useSyncExternalStore(subscribe, getGender, () => null)

/**
 * The voice file to play for `id`: the feminine take of a gendered line when the player is a girl. A missing feminine file
 * falls back to the masculine one (never silence); `fallback` tells the caller to note it in telemetry.
 */
export function voiceFor(id: string, gender: Gender | null, has: (id: string) => boolean, gendered: (id: string) => boolean) {
  if (gender !== 'girl' || !gendered(id)) return { id, fallback: false }
  const f = id + FEMININE_SUFFIX
  return has(f) ? { id: f, fallback: false } : { id, fallback: true }
}

/** The wizard picture `name` for this player: `<name>-girl` for a girl when it exists. */
export function wizardArt(images: Record<string, string>, name: string, gender: Gender | null): string | undefined {
  return (gender === 'girl' && images[name + GIRL_SUFFIX]) || images[name]
}
