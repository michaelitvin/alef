// Telemetry: an event log in localStorage (it survives closing the tab) so a parent can export it and analyse play
// offline. Capped so it can never crowd out the progress save, and it never throws.
import { isStaging, isTelemetryKey, STAGING_PREFIX } from './stagingStorage'
import {
  FROZEN_LOG_KEYS, OPEN_SEAL_CHARS, SESSION_IDLE_MS, clearLog, getRaw, isFrozenLog, onIdle, openJson, parseOpen, readLog, reconcile,
  writeChunk,
} from './telemetryChunks'
import { enforceBudget, freeChunks } from './telemetryBudget'
import { MS_EDGES, readRollup, weekOf } from './telemetryRollup'

export {
  LIVE_BUDGET, RAW_FLOOR_DAYS, ROLLUP_BUDGET, STAGING_SHARE, frozenLogSizes, liveBudget, liveChars, rollupBudget,
} from './telemetryBudget'
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

/** The logs a save write may trim when the storage is full: every `*-telemetry` key except the frozen ones. */
const isLiveLog = (k: string) => isTelemetryKey(k) && !isFrozenLog(k)

/**
 * The open chunk's hard cap: a page that never idles seals its own session at a flush past it (one long frame, rare),
 * and drops its oldest events only when that seal fails.
 */
export const OPEN_HARD_CAP = 4 * OPEN_SEAL_CHARS

interface TelemetryOptions {
  game: TelemetryGame
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

let frozenCopyChecked = false
/**
 * The staging build's copy of the frozen log (`staging:alef-duel-telemetry`, from an old `?copy-prod`) is not the
 * child's history: the staging build deletes it once per page that finds it (owner decision, 2026-11-17). The production
 * build never does, and the staging build cannot see production's key (its storage is the prefixed view). Gives what it
 * removed. Never throws.
 */
export function removeStagingFrozenCopy(staging = isStaging): { key: string; chars: number }[] {
  if (!staging || frozenCopyChecked) return []
  frozenCopyChecked = true
  const out: { key: string; chars: number }[] = []
  for (const k of FROZEN_LOG_KEYS) {
    try {
      const v = localStorage.getItem(k)
      if (v === null) continue
      localStorage.removeItem(k)
      out.push({ key: STAGING_PREFIX + k, chars: v.length })
    } catch { /* no storage */ }
  }
  return out
}
/** for tests: look for the copy again */
export const resetFrozenCopyForTest = () => { frozenCopyChecked = false }

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

/** what the export says about a part's `rollups` (only a part that has them) */
const ROLLUPS_NOTE = 'rollups: per-day (per ISO week after 90 days) counts of events that were evicted from storage to keep it '
  + 'small. They hold only evicted events, never the ones under events, so a day that has both is counted exactly by adding '
  + 'them. Per item: n answers, wrong, near, special (counted apart, never as right or wrong), hints, replays, ms (a latency '
  + 'histogram, bin edges in msEdges), chosen (the most frequent mix-ups); per day: minutes, runs, abandons.'

/** One part of an export: a log's key, its `about`, its events and, when the period reaches past its raw events, its roll-ups. */
export interface ExportPart { key?: string; about: TelemetryAbout; events: TelemetryEvent[]; rollups?: Record<string, unknown> }

/** One export document for one or more logs: each part keeps its own key, its `about` and its events. */
export function exportDoc(parts: ExportPart[], { since, now = new Date() }: { since?: number; now?: Date } = {}): string {
  return JSON.stringify({
    v: 2,
    exportedAt: now.toISOString(),
    since: since === undefined ? null : new Date(since).toISOString(),
    games: parts.map((p) => ({
      ...(p.key ? { key: p.key } : {}), about: aboutNote(p.about), events: p.events,
      ...(p.rollups ? { rollups: p.rollups, rollupsNote: ROLLUPS_NOTE, msEdges: MS_EDGES } : {}),
    })),
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
 * Shorten the stored log `key` by at least `chars` characters, from `evs` (the instance's events, or the stored ones):
 * first the copies of chunks it still holds, then its oldest events. Gives the characters it freed; 0 if it could not
 * write.
 */
function shrinkStored(key: string, chars: number, evs: TelemetryEvent[], sealed: string[]): number {
  let stored = 0
  try { stored = localStorage.getItem(key)?.length ?? 0 } catch { return 0 }
  if (stored === 0) return 0
  // first the copies of sealed and evicted chunks: they are not history to lose (and a trimmed copy no longer matches)
  reconcile(key, evs, sealed)
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
 * Free at least `chars` characters of localStorage for a save: first sealed chunks (staging's first in the production
 * build, then the oldest of any live log, each folded into its roll-up first; no 30-day floor here, saves come first),
 * then the open chunks' oldest events (this page's logs first, then the others, staging's before production's). It
 * never touches a frozen log, an unreadable chunk or any key that is not a log (a save). Gives the characters it freed.
 * Never throws.
 */
export function freeTelemetrySpace(chars: number): number {
  let freed = 0
  try {
    freed += freeChunks(chars, registeredLogs())
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

export function createTelemetry(key: string, { game, about }: TelemetryOptions) {
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
  /** sessions this page cannot seal (an odd `t`, or their chunk key holds another chunk): the pass goes on without them */
  const skipped = new Set<string>()

  if (isFrozenLog(key)) {
    // The frozen log is history: nothing opens it for writing (ADR 0004). A bug in dev, a no-op in production.
    if (import.meta.env.DEV) throw new Error(`${key} is frozen: it is never opened for writing`)
    const none = () => {}
    return { key, game, about, track: none, flush: none, setRun: none, events: () => readLog(key), clear: none }
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
      const ownCount = () => all().reduce((n, e) => n + (e.s === SESSION ? 1 : 0), 0)
      // (only when this page's own events are a seal's worth: a long open chunk of other sessions waits for its pass)
      if (json.length > OPEN_HARD_CAP && JSON.stringify(all().filter((e) => e.s === SESSION)).length > OPEN_SEAL_CHARS) {
        // a page that never idles: seal its own session now; when that seal fails, drop its own oldest events (never
        // another session's: those wait for their seal pass, as an old log does while it migrates)
        try { sealSession(SESSION) } catch { /* the trim below */ }
        json = openJson(all(), sealed)
        while (json.length > OPEN_HARD_CAP && ownCount() > 1) {
          const own = all().filter((e) => e.s === SESSION)
          const drop = new Set(own.slice(0, Math.max(1, Math.ceil(own.length / 4))))
          mem = all().filter((e) => !drop.has(e))
          json = openJson(all(), sealed)
        }
      }
      const out = all()
      // A full storage: never another key's space (a save is never evicted). A long open chunk keeps its events in
      // memory and the stored one stays as it was, until a seal shrinks it; a short one gives up its own oldest events.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          localStorage.setItem(key, json)
          break
        } catch {
          if (json.length > OPEN_SEAL_CHARS) { scheduleSeal(); return }
          if (out.length <= 1) return
          out.splice(0, Math.ceil(out.length / 2))
          json = openJson(out, sealed)
        }
      }
      if (json.length > OPEN_SEAL_CHARS) scheduleSeal()
    } catch { /* never into a game */ }
  }

  /**
   * the next seal of a pass: the oldest complete session that is not this page's, else this page's past the limit. A
   * session that cannot be sealed is skipped (and recorded once); the pass goes on with the next one.
   */
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
    const complete = [...last].filter(([s, t]) => s !== SESSION && now - t > SESSION_IDLE_MS && !skipped.has(s)).map(([s]) => s)
      .sort((a, b) => first.get(a)! - first.get(b)!)
    const own = openJson(evs, sealed).length > OPEN_SEAL_CHARS && last.has(SESSION) && !skipped.has(SESSION)
    const candidates = own ? [...complete, SESSION] : complete
    for (let i = 0; i < candidates.length; i++) {
      const s = candidates[i]!
      const r = sealSession(s)
      if (r === 'write') return false // a full storage: the next flush past the limit starts a new pass
      if (r !== 'ok') { noteSkip(s, r); continue }
      flush()
      enforceBudget(registeredLogs())
      return i < complete.length - 1 || openJson(all(), sealed).length > OPEN_SEAL_CHARS
    }
    return false
  }

  /** a session this page cannot seal: the pass goes on without it; the log says so once (with why) */
  function noteSkip(s: string, reason: 'time' | 'taken') {
    skipped.add(s)
    if (all().some((e) => e.e === 'seal-skipped' && e.session === s)) return
    all().push({ t: Date.now(), s: SESSION, run, e: 'seal-skipped', g: game, session: s, reason })
  }

  /**
   * seal session `s` of the open events into a chunk: `ok` when they left the open events; `time` (a `t` that is not a
   * safe integer) or `taken` (its chunk key holds another chunk) when it never can be; `write` when the write failed
   */
  function sealSession(s: string): 'ok' | 'time' | 'taken' | 'write' {
    const take = all().filter((e) => e.s === s)
    if (take.length === 0) return 'write'
    if (!take.every((e) => Number.isSafeInteger(e.t))) return 'time' // an odd old event: the session stays open
    const w = writeChunk(key, take)
    if ('error' in w) return w.error === 'taken' ? 'taken' : 'write' // nothing safe was written: the open chunk stays
    const gone = new Set(take)
    mem = all().filter((e) => !gone.has(e))
    if (!sealed.includes(w.key)) sealed.push(w.key)
    return 'ok'
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
        // staging's stale copy of the frozen log goes once, and staging's log says so (owner decision, 2026-11-17)
        for (const r of removeStagingFrozenCopy()) all().push({ t: Date.now(), s: SESSION, run, e: 'frozen-copy-removed', g: game, ...r })
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

/**
 * A log's roll-ups for an export from `since`: only when the period starts before the log's oldest raw event (by
 * default, within the raw floor, never). Gives the days (and weeks) at or after `since`, or undefined.
 */
export function rollupsFor(key: string, events: readonly TelemetryEvent[], since?: number): Record<string, unknown> | undefined {
  if (isFrozenLog(key)) return undefined
  const r = readRollup(key)
  const days = Object.keys(r.days)
  if (days.length === 0) return undefined
  const oldest = events.reduce((m, e) => (typeof e.t === 'number' && e.t < m ? e.t : m), Infinity)
  if (since !== undefined && since >= oldest) return undefined
  const from = since === undefined ? '' : new Date(since).toISOString().slice(0, 10)
  const keep = Object.fromEntries(Object.entries(r.days).filter(([d]) => !from || (d.includes('W') ? d >= weekOf(from) : d >= from)))
  return Object.keys(keep).length > 0 ? keep : undefined
}
