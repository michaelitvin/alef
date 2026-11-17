// Telemetry: an event log in localStorage (it survives closing the tab) so a parent can export it and analyse play
// offline. Capped so it can never crowd out the progress save, and it never throws.
import { isStaging, isTelemetryKey, STAGING_PREFIX } from './stagingStorage'

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

/**
 * Logs that are never trimmed, cleared or rewritten: the first duel's old log (owner decision, 2026-11-16, ADR 0004). A
 * key matches with or without the staging prefix.
 */
export const FROZEN_LOG_KEYS: readonly string[] = ['alef-duel-telemetry']
const isFrozenLog = (k: string) => FROZEN_LOG_KEYS.some((f) => k === f || k === STAGING_PREFIX + f)

/** The logs a save write may trim when the storage is full: every `*-telemetry` key except the frozen ones. */
const isLiveLog = (k: string) => isTelemetryKey(k) && !isFrozenLog(k)

export function telemetryCap(game: TelemetryGame, staging = isStaging): number {
  const cap = (TELEMETRY_CAPS as Record<string, number>)[game] ?? DEFAULT_CAP
  return staging ? Math.floor(cap * STAGING_CAP_SHARE) : cap
}

// ---- keys
// A log `<base>-telemetry` keeps its open chunk at its own key, its sealed chunks at `<base>~<t0 base36>~<s>-telemetry`
// and its roll-up at `<base>~sum-telemetry`. Every key ends in `-telemetry`, so `?copy-prod` copies none of them. The `~`
// keeps the logs apart: `alef-duel~` never matches a key of `alef-duel2`.
const SUFFIX = '-telemetry'
const logBase = (logKey: string) => (logKey.endsWith(SUFFIX) ? logKey.slice(0, -SUFFIX.length) : logKey)

/** the key of the sealed chunk of `logKey` that starts at `t0` in session `s` */
export const chunkKey = (logKey: string, t0: number, s: string) => `${logBase(logKey)}~${t0.toString(36)}~${s}${SUFFIX}`
/** the key of the roll-up of `logKey` */
export const rollupKey = (logKey: string) => `${logBase(logKey)}~sum${SUFFIX}`
/** a sealed chunk or the roll-up of `logKey` (not its open chunk, which is `logKey` itself) */
export const ownsKey = (logKey: string, k: string) => k.startsWith(`${logBase(logKey)}~`) && k.endsWith(SUFFIX)
/** a sealed chunk's key (of any log): `<base>~<t0>~<s>-telemetry`; a roll-up key is not one */
export const isChunkKey = (k: string) => k.endsWith(SUFFIX) && !k.endsWith(`~sum${SUFFIX}`) && k.split('~').length >= 3

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
}

/** The logs the games declare, by key: every game page registers them (src/parent/registry.ts). */
const registry = new Map<string, TelemetryLog>()

/** Register the games' logs. Core looks them up when it seals, folds or evicts; an instance may exist before this runs. */
export function registerTelemetryLogs(logs: readonly TelemetryLog[]) {
  for (const log of logs) registry.set(log.key, log)
}

export const registeredLogs = (): TelemetryLog[] => [...registry.values()]

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
function trimToLength(evs: TelemetryEvent[], maxLen: number): string | null {
  let json = JSON.stringify({ v: 1, events: evs })
  while (json.length > maxLen && evs.length > 0) {
    evs.splice(0, Math.max(1, Math.ceil(evs.length * ((json.length - maxLen) / json.length + 0.02))))
    json = JSON.stringify({ v: 1, events: evs })
  }
  return evs.length > 0 ? json : null
}

/**
 * Shorten the stored log `key` by at least `chars` characters, oldest events first, from `evs` (the instance's events, or
 * the stored ones). Gives the characters it freed; 0 if it could not write.
 */
function shrinkStored(key: string, chars: number, evs: TelemetryEvent[]): number {
  let stored = 0
  try { stored = localStorage.getItem(key)?.length ?? 0 } catch { return 0 }
  if (stored === 0) return 0
  const json = trimToLength(evs, stored - chars)
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
      if (k && isLiveLog(k) && !pageLogs.has(k)) others.push(k)
    }
    others.sort((a, b) => Number(b.startsWith(STAGING_PREFIX)) - Number(a.startsWith(STAGING_PREFIX)))
    for (const k of others) {
      if (freed >= chars) return freed
      freed += shrinkStored(k, chars - freed, readLog(k))
    }
  } catch { /* no storage */ }
  return freed
}

export function createTelemetry(key: string, { game, maxChars = telemetryCap(game), about }: TelemetryOptions) {
  const FLUSH_MS = 1000
  let run = 0
  let events: TelemetryEvent[] | null = null
  let timer: number | undefined

  const load = (): TelemetryEvent[] => {
    let raw: string | null = null
    try { raw = localStorage.getItem(key) } catch { /* no storage */ }
    return parseLog(raw) ?? []
  }
  const all = () => (events ??= load())

  function flush() {
    window.clearTimeout(timer)
    timer = undefined
    const evs = all()
    let json = JSON.stringify({ v: 1, events: evs })
    while (json.length > maxChars && evs.length > 1) {
      evs.splice(0, Math.max(1, Math.ceil(evs.length * ((json.length - maxChars) / json.length + 0.02))))
      json = JSON.stringify({ v: 1, events: evs })
    }
    // A full storage: the log gives up its own oldest events, never another key's space (a save is never evicted).
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

  if (isLiveLog(key)) pageLogs.set(key, (chars) => shrinkStored(key, chars, all()))

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
      window.clearTimeout(timer)
      timer = undefined
      try { localStorage.removeItem(key) } catch { /* nothing to clear */ }
    },
  }
}
