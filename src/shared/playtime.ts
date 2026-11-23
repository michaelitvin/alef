// The play-time ledger: how long the child played each game, per day, for the parent area's Progress section.
// Telemetry cannot give this (its logs are trimmed, and the lessons have none). One key, `alef-playtime`:
//   { v: 1, days: { 'YYYY-MM-DD': { 'spellquest-he': ms, clock: ms, lessons: ms, 'spellquest-en': ms } } }   (the device's local days, kept 60 days)
// Two pages can write it (the main app and Hebrew Spell Quest's page), and a page can come back from the back/forward cache, so a
// flush always reads the key, adds its own span and writes: no copy in memory is ever written back. It is a save-like
// key: `?copy-prod` copies it (it is a few hundred bytes), and the staging build keeps its own under `staging:`.
import { useEffect, useRef } from 'react'
import { safeSetItem } from './saveStorage'
import { aliasGame } from './telemetryAliases'

export type PlaytimeGame = 'spellquest-he' | 'clock' | 'lessons' | 'spacecat' | 'spellquest-en'
export const PLAYTIME_GAMES: readonly PlaytimeGame[] = ['spellquest-he', 'clock', 'lessons', 'spacecat', 'spellquest-en']
export const PLAYTIME_KEY = 'alef-playtime'
export const PLAYTIME_KEEP_DAYS = 60
/** how often a visible, running screen writes its time (ms) */
export const PLAYTIME_FLUSH_MS = 15_000

export type PlaytimeDay = Partial<Record<PlaytimeGame, number>>
export interface Playtime { v: 1; days: Record<string, PlaytimeDay> }

const pad = (n: number) => String(n).padStart(2, '0')
/** the local day of a time as `YYYY-MM-DD` */
export const dayKey = (t: number | Date): string => {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const nextMidnight = (t: number): number => { const d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime() }

/** the stored ledger, or an empty one (no storage, or a value that does not parse) */
/** a day that still has an old entry (`book2`, `spellquest`, `english`: the key migration has not run, or it waits for
 * space) reads under the new id (the aliases of telemetryAliases.ts), summed */
const OLD_IDS = ['book2', 'spellquest', 'english'] as const
function aliasDays(doc: Playtime): Playtime {
  for (const day of Object.values(doc.days) as Record<string, number | undefined>[]) {
    if (!day || typeof day !== 'object') continue
    for (const id of OLD_IDS) {
      if (!(id in day)) continue
      const old = day[id]
      if (typeof old === 'number') day[aliasGame(id)] = (day[aliasGame(id)] ?? 0) + old
      delete day[id]
    }
  }
  return doc
}

export function readPlaytime(): Playtime {
  try {
    const doc = JSON.parse(localStorage.getItem(PLAYTIME_KEY) ?? 'null') as Playtime | null
    if (doc && doc.v === 1 && doc.days && typeof doc.days === 'object') return aliasDays(doc)
  } catch { /* fall through */ }
  return { v: 1, days: {} }
}

/** add the span [from, to) of a game to the ledger; a span over midnight splits between the days. Never throws. */
export function addPlaytime(game: PlaytimeGame, from: number, to: number, now = to): void {
  if (!(to > from)) return
  try {
    const doc = readPlaytime()
    for (let t = from; t < to;) {
      const end = Math.min(to, nextMidnight(t))
      const day = (doc.days[dayKey(t)] ??= {})
      day[game] = (day[game] ?? 0) + (end - t)
      t = end
    }
    const oldest = dayKey(now - PLAYTIME_KEEP_DAYS * 86_400_000)
    for (const k of Object.keys(doc.days)) if (k < oldest) delete doc.days[k]
    safeSetItem(PLAYTIME_KEY, JSON.stringify(doc))
  } catch { /* storage full or missing: the ledger is a convenience */ }
}

/** the last `n` days up to `now`, oldest first, with ms per game */
export function lastDays(n: number, now = Date.now(), doc: Playtime = readPlaytime()): { day: string; ms: Record<PlaytimeGame, number> }[] {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const day = dayKey(d)
    const row = doc.days[day] ?? {}
    out.push({ day, ms: { 'spellquest-he': row['spellquest-he'] ?? 0, clock: row.clock ?? 0, lessons: row.lessons ?? 0, spacecat: row.spacecat ?? 0, 'spellquest-en': row['spellquest-en'] ?? 0 } })
  }
  return out
}

/**
 * A meter for one game. It counts while `running` is true and the page is visible; `flush` writes the time since the
 * last flush. Hidden pages count nothing: call `setVisible(false)` as the page hides (it flushes first).
 */
export function createMeter(game: PlaytimeGame, now: () => number = Date.now) {
  let running = false
  let visible = true
  let since: number | null = null
  const counting = () => running && visible
  const flush = () => {
    if (since === null) return
    const t = now()
    addPlaytime(game, since, t)
    since = counting() ? t : null
  }
  const update = (next: () => void) => {
    flush()
    next()
    since = counting() ? now() : null
  }
  return {
    setRunning: (r: boolean) => update(() => { running = r }),
    setVisible: (v: boolean) => update(() => { visible = v }),
    flush,
  }
}

/**
 * Count the time this component's screen is on and not paused, for `game`. Writes each 15 s, when the page hides, and on
 * unmount. A page that hides counts nothing while hidden.
 */
export function usePlaytime(game: PlaytimeGame, active: boolean): void {
  const meter = useRef<ReturnType<typeof createMeter> | null>(null)
  useEffect(() => {
    const m = createMeter(game)
    meter.current = m
    m.setVisible(document.visibilityState !== 'hidden')
    const vis = () => m.setVisible(document.visibilityState !== 'hidden')
    const leave = () => m.setVisible(false)
    const timer = window.setInterval(m.flush, PLAYTIME_FLUSH_MS)
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', leave)
    window.addEventListener('pageshow', vis)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('pageshow', vis)
      m.setRunning(false)
      meter.current = null
    }
  }, [game])
  useEffect(() => { meter.current?.setRunning(active) }, [active])
}
