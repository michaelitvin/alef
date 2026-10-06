// Duel telemetry: an event log kept in localStorage (it survives closing the tab, unlike sessionStorage) so a
// parent can export it from the Progress page and analyse gameplay and learning offline. Capped so it can never
// crowd out the progress save, and it never throws: a full or broken storage only loses old telemetry.

const KEY = 'alef-duel-telemetry'
/** ≈2 MB of the origin's ~5 MB localStorage (UTF-16); the progress save needs far less. */
export const TELEMETRY_MAX_CHARS = 1_000_000
const FLUSH_MS = 1000

export interface TelemetryEvent {
  /** wall-clock time, ms since epoch */
  t: number
  /** this page load */
  s: string
  /** run number within the page load (0 = outside a run) */
  run: number
  /** event type */
  e: string
  [field: string]: unknown
}

const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
let run = 0
let events: TelemetryEvent[] | null = null
let timer: number | undefined

function load(): TelemetryEvent[] {
  try {
    const doc = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return Array.isArray(doc?.events) ? doc.events : []
  } catch {
    return []
  }
}
const all = () => (events ??= load())

export function setTelemetryRun(n: number) {
  run = n
}

/** Records an event; written to storage in a batch shortly after. */
export function track(e: string, data: Record<string, unknown> = {}) {
  all().push({ t: Date.now(), s: session, run, e, ...data })
  if (timer === undefined) timer = window.setTimeout(flushTelemetry, FLUSH_MS)
}

/** Writes now, dropping the oldest events while over the cap or while the browser reports its storage full. */
export function flushTelemetry() {
  window.clearTimeout(timer)
  timer = undefined
  const evs = all()
  let json = JSON.stringify({ v: 1, events: evs })
  while (json.length > TELEMETRY_MAX_CHARS && evs.length > 1) {
    evs.splice(0, Math.max(1, Math.ceil(evs.length * ((json.length - TELEMETRY_MAX_CHARS) / json.length + 0.02))))
    json = JSON.stringify({ v: 1, events: evs })
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      localStorage.setItem(KEY, json)
      return
    } catch {
      if (evs.length <= 1) return
      evs.splice(0, Math.ceil(evs.length / 2)) // storage full: shed the older half and retry
      json = JSON.stringify({ v: 1, events: evs })
    }
  }
}

export function telemetryCount() {
  return all().length
}

/** One JSON document with every stored event, for download. */
export function exportTelemetry(): string {
  flushTelemetry()
  return JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), events: all() }, null, 1)
}

export function clearTelemetry() {
  events = []
  window.clearTimeout(timer)
  timer = undefined
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}

// Leaving or locking the tablet: write what is pending.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushTelemetry)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushTelemetry()
  })
}
