// Telemetry: an event log in localStorage (it survives closing the tab) so a parent can export it and analyse play
// offline. Capped so it can never crowd out the progress save, and it never throws.
import { isStaging } from './stagingStorage'

/** The game an event belongs to. Every event carries it as `g`; events written before it existed have none. */
export type TelemetryGame = 'book2' | 'clock' | 'duel'

export interface TelemetryEvent { t: number; s: string; run: number; e: string; g?: TelemetryGame; [field: string]: unknown }

/** What an exported log says about itself: a parent can hand the file to an AI coding tool, which then finds the code and
 * the design documents that explain each event. */
export interface TelemetryAbout { game: string; docs: string[]; code?: string[] }
const REPO = 'https://github.com/michaelitvin/alef'

/** One id per page load, shared by every log on the page (so a page with two logs still has one session). */
export const SESSION = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/**
 * The caps in characters (localStorage counts UTF-16, so ≈2 bytes each). The origin's quota (≈5 MB) is shared by every
 * log and every save of production and of staging (ADR 0001), so the sum stays well under it. The first duel's log is
 * frozen at what it holds (owner decision: an update never deletes the child's history); 1 M is its old cap.
 */
export const TELEMETRY_CAPS: Record<TelemetryGame, number> = { book2: 700_000, clock: 500_000, duel: 1_000_000 }
/** The staging build shares production's quota, so it keeps a quarter of each cap. */
export const STAGING_CAP_SHARE = 0.25

export function telemetryCap(game: TelemetryGame, staging = isStaging): number {
  return staging ? Math.floor(TELEMETRY_CAPS[game] * STAGING_CAP_SHARE) : TELEMETRY_CAPS[game]
}

interface TelemetryOptions {
  game: TelemetryGame
  /** the cap in characters; default `telemetryCap(game)` */
  maxChars?: number
  about?: TelemetryAbout
  /**
   * Never trim or drop a stored event: past the cap (or on a full storage) the NEW events are dropped instead, and an
   * unreadable stored log is never overwritten. For a log that holds history which must not be lost.
   */
  appendOnly?: boolean
}

function parseLog(raw: string | null): TelemetryEvent[] | null {
  if (raw === null) return []
  try {
    const doc = JSON.parse(raw)
    return Array.isArray(doc?.events) ? doc.events : null
  } catch {
    return null
  }
}

/** Read a stored log without an instance (no listeners, no writes): for logs of games that are not loaded on this page. */
export function readLog(key: string): TelemetryEvent[] {
  try {
    return parseLog(localStorage.getItem(key)) ?? []
  } catch {
    return []
  }
}

export function filterEvents(events: TelemetryEvent[], { since }: { since?: number } = {}): TelemetryEvent[] {
  return since === undefined ? events : events.filter((ev) => typeof ev.t === 'number' && ev.t >= since)
}

function aboutNote(about: TelemetryAbout) {
  return {
    game: about.game,
    repo: REPO,
    docs: [...about.docs, 'docs/minigame-rules.md'],
    code: about.code ?? [],
    howToAnalyse: `Clone ${REPO}, open Claude Code (or another AI coding tool) in it, and give it this file. Ask it to read the `
      + 'docs above (the telemetry section of each design says what every event means) and the code that sends the events, '
      + 'then analyse the child\'s progress: accuracy per screen and over time, his real mix-ups, where runs end, and what to change.',
  }
}

/** One export document for one or more games: each part keeps its own `about` and its events. */
export function exportDoc(parts: { about: TelemetryAbout; events: TelemetryEvent[] }[]): string {
  return JSON.stringify({
    v: 2,
    exportedAt: new Date().toISOString(),
    games: parts.map((p) => ({ about: aboutNote(p.about), events: p.events })),
  }, null, 1)
}

export function createTelemetry(key: string, { game, maxChars = telemetryCap(game), about, appendOnly = false }: TelemetryOptions) {
  const FLUSH_MS = 1000
  let run = 0
  let events: TelemetryEvent[] | null = null
  /** how many of `events` are already in storage (append-only mode) */
  let stored = 0
  /** the stored log could not be read: in append-only mode it is never overwritten */
  let unreadable = false
  let timer: number | undefined

  const load = (): TelemetryEvent[] => {
    let raw: string | null = null
    try { raw = localStorage.getItem(key) } catch { /* no storage */ }
    const evs = parseLog(raw)
    unreadable = evs === null
    stored = evs?.length ?? 0
    return evs ?? []
  }
  const all = () => (events ??= load())

  function flushAppendOnly(evs: TelemetryEvent[]) {
    if (unreadable) { evs.splice(stored); return }
    if (evs.length === stored) return
    let size = JSON.stringify({ v: 1, events: evs.slice(0, stored) }).length
    let keep = stored
    while (keep < evs.length) {
      const add = JSON.stringify(evs[keep]).length + (keep > 0 ? 1 : 0)
      if (size + add > maxChars) break
      size += add
      keep++
    }
    evs.splice(keep)
    if (keep === stored) return
    try {
      localStorage.setItem(key, JSON.stringify({ v: 1, events: evs }))
      stored = evs.length
    } catch {
      evs.splice(stored)
    }
  }

  function flush() {
    window.clearTimeout(timer)
    timer = undefined
    const evs = all()
    if (appendOnly) { flushAppendOnly(evs); return }
    let json = JSON.stringify({ v: 1, events: evs })
    while (json.length > maxChars && evs.length > 1) {
      evs.splice(0, Math.max(1, Math.ceil(evs.length * ((json.length - maxChars) / json.length + 0.02))))
      json = JSON.stringify({ v: 1, events: evs })
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        localStorage.setItem(key, json)
        return
      } catch {
        if (evs.length <= 1) return
        evs.splice(0, Math.ceil(evs.length / 2))
        json = JSON.stringify({ v: 1, events: evs })
      }
    }
  }

  function track(e: string, data: Record<string, unknown> = {}) {
    all().push({ t: Date.now(), s: SESSION, run, e, g: game, ...data })
    if (timer === undefined) timer = window.setTimeout(flush, FLUSH_MS)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    key,
    game,
    about,
    maxChars,
    track,
    flush,
    setRun: (n: number) => { run = n },
    count: () => all().length,
    /** every event, flushed first, so the unflushed ones are in it too */
    events: (): TelemetryEvent[] => { flush(); return [...all()] },
    exportJson: () => {
      flush()
      const note = about && aboutNote(about)
      return JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), ...(note ? { about: note } : {}), events: all() }, null, 1)
    },
    clear: () => {
      events = []
      stored = 0
      unreadable = false
      window.clearTimeout(timer)
      timer = undefined
      try { localStorage.removeItem(key) } catch { /* nothing to clear */ }
    },
  }
}
