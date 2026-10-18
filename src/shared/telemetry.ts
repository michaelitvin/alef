// Telemetry: an event log in localStorage (it survives closing the tab) so a parent can export it and analyse play
// offline. Capped so it can never crowd out the progress save, and it never throws.
export interface TelemetryEvent { t: number; s: string; run: number; e: string; [field: string]: unknown }

export function createTelemetry(key: string, maxChars = 1_000_000) {
  const FLUSH_MS = 1000
  const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  let run = 0
  let events: TelemetryEvent[] | null = null
  let timer: number | undefined

  const load = (): TelemetryEvent[] => {
    try {
      const doc = JSON.parse(localStorage.getItem(key) ?? 'null')
      return Array.isArray(doc?.events) ? doc.events : []
    } catch {
      return []
    }
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
    all().push({ t: Date.now(), s: session, run, e, ...data })
    if (timer === undefined) timer = window.setTimeout(flush, FLUSH_MS)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    track,
    flush,
    setRun: (n: number) => { run = n },
    count: () => all().length,
    exportJson: () => {
      flush()
      return JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), events: all() }, null, 1)
    },
    clear: () => {
      events = []
      window.clearTimeout(timer)
      timer = undefined
      try { localStorage.removeItem(key) } catch { /* nothing to clear */ }
    },
  }
}
