// Telemetry: an event log in localStorage (it survives closing the tab) so a parent can export it and analyse play
// offline. Capped so it can never crowd out the progress save, and it never throws.
import { isStaging, isTelemetryKey, STAGING_PREFIX } from './stagingStorage'
import {
  OPEN_SEAL_CHARS, SESSION_IDLE_MS, clearLog, getRaw, isFrozenLog, onIdle, openJson, parseOpen, readLog, reconcile, writeChunk,
} from './telemetryChunks'

export {
  FROZEN_LOG_KEYS, chunkKey, clearLog, isChunkKey, logStats, ownsKey, readLog, rollupKey, type LogStats,
} from './telemetryChunks'

/**
 * The game an event belongs to (`book2`, `clock`, `duel`, …). Every event carries it as `g`; events written before it
 * existed have none. A string, so a new game declares its log without a change here.
 */
export type TelemetryGame = string

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
 * frozen at what it holds (owner decision: an update never deletes the child's history; nothing writes it since its
 * events go to Book 2's log, ADR 0004); 1 M is its old cap, the most it can hold.
 */
export const TELEMETRY_CAPS: Record<'book2' | 'clock' | 'duel', number> = { book2: 700_000, clock: 500_000, duel: 1_000_000 }
/** the cap of a game with no entry in TELEMETRY_CAPS */
const DEFAULT_CAP = 500_000
/** The staging build shares production's quota, so it keeps a quarter of each cap. */
export const STAGING_CAP_SHARE = 0.25

/** The logs a save write may trim when the storage is full: every `*-telemetry` key except the frozen ones. */
const isLiveLog = (k: string) => isTelemetryKey(k) && !isFrozenLog(k)

export function telemetryCap(game: TelemetryGame, staging = isStaging): number {
  const cap = (TELEMETRY_CAPS as Record<string, number>)[game] ?? DEFAULT_CAP
  return staging ? Math.floor(cap * STAGING_CAP_SHARE) : cap
}

interface TelemetryOptions {
  game: TelemetryGame
  /** the cap in characters; default `telemetryCap(game)` */
  maxChars?: number
  about?: TelemetryAbout
}

/**
 * A stored log as the parent area's Data section lists it. A game declares its logs (in its `parent/index.ts`); the
 * export reads them with `readLog`, or through the open game's instance.
 */
export interface TelemetryLog {
  key: string
  /** the picker's label (parent text) */
  label: string
  /** the game in the export's file name */
  game: TelemetryGame
  about: TelemetryAbout
  /** history: nothing writes it any more, and it is never cleared or rewritten (the first duel's old log) */
  history?: boolean
  /** what an evicted chunk of this log leaves behind: the facts of one chunk's events (one page session, in order) */
  rollup?: (events: TelemetryEvent[]) => RollupFact[]
}

/** One answer-like fact a game's `rollup` gives for an evicted chunk; core folds them per day and item. */
export interface RollupFact {
  /** what was asked (the game decides: `screen:target`, `exercise:time`, …) */
  item: string
  ok?: boolean
  near?: boolean
  /** a special result (not a real round): counted apart, never as right or wrong */
  special?: boolean
  ms?: number
  /** what the child chose, when it was wrong */
  chosen?: string
  hint?: boolean
  replay?: boolean
  /** the time of the event it comes from: its day (else the chunk's first day) */
  t?: number
}

/** The logs the games declare, by key: every game page registers them (src/parent/registry.ts). */
const registry = new Map<string, TelemetryLog>()

/** Register the games' logs. Core looks them up when it seals, folds or evicts; an instance may exist before this runs. */
export function registerTelemetryLogs(logs: readonly TelemetryLog[]) {
  for (const log of logs) registry.set(log.key, log)
}

export const registeredLogs = (): TelemetryLog[] => [...registry.values()]

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

/** One export document for one or more logs: each part keeps its own key, its `about` and its events. */
export function exportDoc(
  parts: { key?: string; about: TelemetryAbout; events: TelemetryEvent[] }[],
  { since, now = new Date() }: { since?: number; now?: Date } = {},
): string {
  return JSON.stringify({
    v: 2,
    exportedAt: now.toISOString(),
    since: since === undefined ? null : new Date(since).toISOString(),
    games: parts.map((p) => ({ ...(p.key ? { key: p.key } : {}), about: aboutNote(p.about), events: p.events })),
  }, null, 1)
}

/** `alef-telemetry-<games>-<date>.json`, the export's file name */
export function exportFileName(games: readonly string[], now = new Date()): string {
  return `alef-telemetry-${games.join('-')}-${now.toISOString().slice(0, 10)}.json`
}

/**
 * Drop the oldest events of `evs` (in place) until the log's JSON is at most `maxLen` characters. Gives the JSON, or
 * null when no event is left.
 */
function trimToLength(evs: TelemetryEvent[], maxLen: number, sealed: readonly string[]): string | null {
  let json = openJson(evs, sealed)
  while (json.length > maxLen && evs.length > 0) {
    evs.splice(0, Math.max(1, Math.ceil(evs.length * ((json.length - maxLen) / json.length + 0.02))))
    json = openJson(evs, sealed)
  }
  return evs.length > 0 ? json : null
}

/**
 * Shorten the stored log `key` by at least `chars` characters, oldest events first, from `evs` (the instance's events, or
 * the stored ones). Gives the characters it freed; 0 if it could not write.
 */
function shrinkStored(key: string, chars: number, evs: TelemetryEvent[], sealed: readonly string[]): number {
  let stored = 0
  try { stored = localStorage.getItem(key)?.length ?? 0 } catch { return 0 }
  if (stored === 0) return 0
  const json = trimToLength(evs, stored - chars, sealed)
  try {
    if (json === null) localStorage.removeItem(key)
    else localStorage.setItem(key, json)
  } catch { return 0 }
  return stored - (json?.length ?? 0)
}

/** This page's logs (the games loaded here), in the order they were made: a save write trims them first. */
const pageLogs = new Map<string, (chars: number) => number>()

/**
 * Free at least `chars` characters of localStorage by trimming the live telemetry logs, oldest events first: this page's
 * logs first, then the other live logs in storage (staging's before production's). It never touches a frozen log or
 * any key that is not a log (a save). Gives the characters it freed. Never throws.
 */
export function freeTelemetrySpace(chars: number): number {
  let freed = 0
  try {
    for (const shrink of pageLogs.values()) {
      if (freed >= chars) return freed
      freed += shrink(chars - freed)
    }
    const others: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      // open chunks only: a sealed chunk or a roll-up (a `~` key) is never trimmed here
      if (k && isLiveLog(k) && !k.includes('~') && !pageLogs.has(k)) others.push(k)
    }
    others.sort((a, b) => Number(b.startsWith(STAGING_PREFIX)) - Number(a.startsWith(STAGING_PREFIX)))
    for (const k of others) {
      if (freed >= chars) return freed
      const open = parseOpen(getRaw(k))
      if (open) freed += shrinkStored(k, chars - freed, open.events, open.sealed)
    }
  } catch { /* no storage */ }
  return freed
}

export function createTelemetry(key: string, { game, maxChars = telemetryCap(game), about }: TelemetryOptions) {
  const FLUSH_MS = 1000
  let run = 0
  /** the open chunk's events as this page sees them (loaded once, then tracked), and its `sealed` list */
  let mem: TelemetryEvent[] | null = null
  let sealed: string[] = []
  let timer: number | undefined
  let tracked = false
  let cancelSeal: (() => void) | null = null
  /** a seal pass began: it seals every complete session, then the own one while the open chunk is too long */
  let sealing = false

  if (isFrozenLog(key)) {
    // The frozen log is history: nothing opens it for writing (ADR 0004). A bug in dev, a no-op in production.
    if (import.meta.env.DEV) throw new Error(`${key} is frozen: it is never opened for writing`)
    const none = () => {}
    return { key, game, about, maxChars, track: none, flush: none, setRun: none, events: () => readLog(key), clear: none }
  }

  const all = (): TelemetryEvent[] => {
    if (mem === null) {
      const open = parseOpen(getRaw(key))
      mem = open?.events ?? []
      sealed = open?.sealed ?? []
    }
    return mem
  }

  function flush() {
    try {
      window.clearTimeout(timer)
      timer = undefined
      const evs = all()
      let json = openJson(evs, sealed)
      while (json.length > maxChars && evs.length > 1) {
        evs.splice(0, Math.max(1, Math.ceil(evs.length * ((json.length - maxChars) / json.length + 0.02))))
        json = openJson(evs, sealed)
      }
      // A full storage: never another key's space (a save is never evicted). A long open chunk keeps its events in
      // memory and the stored one stays as it was, until a seal shrinks it; a short one gives up its own oldest events.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          localStorage.setItem(key, json)
          break
        } catch {
          if (json.length > OPEN_SEAL_CHARS) { scheduleSeal(); return }
          if (evs.length <= 1) return
          evs.splice(0, Math.ceil(evs.length / 2))
          json = openJson(evs, sealed)
        }
      }
      if (json.length > OPEN_SEAL_CHARS) scheduleSeal()
    } catch { /* never into a game */ }
  }

  /** the next seal of a pass: the oldest complete session that is not this page's, else this page's past the limit */
  function sealNext(): boolean {
    const evs = all()
    reconcile(key, evs, sealed)
    const now = Date.now()
    const last = new Map<string, number>()
    const first = new Map<string, number>()
    for (const e of evs) {
      if (typeof e.t !== 'number') continue
      if (!first.has(e.s)) first.set(e.s, e.t)
      last.set(e.s, Math.max(last.get(e.s) ?? -Infinity, e.t))
    }
    const complete = [...last].filter(([s, t]) => s !== SESSION && now - t > SESSION_IDLE_MS).map(([s]) => s)
      .sort((a, b) => first.get(a)! - first.get(b)!)
    const own = openJson(evs, sealed).length > OPEN_SEAL_CHARS
    const s = complete[0] ?? (own && last.has(SESSION) ? SESSION : null)
    if (s === null) return false
    const take = evs.filter((e) => e.s === s)
    if (!take.every((e) => Number.isSafeInteger(e.t))) return false // an odd old event: the session stays open
    const k = writeChunk(key, take)
    if (k === null) return false // nothing safe was written: the open chunk stays as it is
    const gone = new Set(take)
    mem = evs.filter((e) => !gone.has(e))
    if (!sealed.includes(k)) sealed.push(k)
    flush()
    return complete.length > 1 || openJson(all(), sealed).length > OPEN_SEAL_CHARS
  }

  /** one seal per idle slot until the pass is done */
  function scheduleSeal() {
    if (cancelSeal || typeof window === 'undefined') return
    sealing = true
    cancelSeal = onIdle(() => {
      cancelSeal = null
      let more = false
      try { more = sealNext() } catch { /* a seal that fails leaves the open chunk as it is */ }
      if (more) scheduleSeal()
      else sealing = false
    })
  }

  function track(e: string, data: Record<string, unknown> = {}) {
    try {
      all().push({ t: Date.now(), s: SESSION, run, e, g: game, ...data })
      if (!tracked) {
        tracked = true
        // the page's first event: a large open chunk (an old log, or sessions of earlier pages) starts a seal pass
        if (!sealing && openJson(all(), sealed).length > OPEN_SEAL_CHARS) scheduleSeal()
      }
      if (timer === undefined) timer = window.setTimeout(flush, FLUSH_MS)
    } catch { /* never into a game */ }
  }

  if (isLiveLog(key)) pageLogs.set(key, (chars) => shrinkStored(key, chars, all(), sealed))

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
    /** every event (its sealed chunks and the open chunk), flushed first, so the unflushed ones are in it too */
    events: (): TelemetryEvent[] => { flush(); return readLog(key) },
    clear: () => {
      mem = []
      sealed = []
      window.clearTimeout(timer)
      timer = undefined
      cancelSeal?.()
      cancelSeal = null
      sealing = false
      clearLog(key)
    },
  }
}
