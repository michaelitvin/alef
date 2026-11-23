// The parent area's contract with the games. Each game declares one `src/<game>/parent/index.ts` that exports a
// GameParent, and registry.ts lists it. That file stays light: it reads the game's save as raw text and loads its
// screens with React.lazy, so the area can show every game without creating another game's store (creating a store
// writes its save) and without building an audio kit or a telemetry log (a log instance rewrites its key on pagehide).
import type { ComponentType, LazyExoticComponent } from 'react'
import type { TelemetryEvent, TelemetryLog } from '../shared/telemetry'

/** the games that have a part in the area (the lessons are the main app's reading course) */
export type GameId = 'spellquest-he' | 'clock' | 'lessons' | 'spacecat' | 'spellquest-en'

/** the area's sections, top to bottom */
export type SectionId = 'child' | 'sound' | 'progress' | 'game' | 'data' | 'developer'

/** the open game's telemetry (`track` of its log); the lessons have none */
export type Track = (event: string, fields?: Record<string, unknown>) => void

/**
 * The open game's log instance (`createTelemetry`): the Data section reads and clears the open game's log through it, so
 * its unflushed events are in the export and a cleared log does not come back on its next flush.
 */
export interface LiveLog {
  key: string
  /** every event, flushed first */
  events: () => TelemetryEvent[]
  /** write its unflushed events, so storage-side counts include them */
  flush: () => void
  clear: () => void
}

/** one mix-up: what was asked, what the child chose, how often */
export interface Mixup { asked: string; chosen: string; n: number }

/** a short titled list under a game's summary line in the Progress section (the lessons' levels and achievements) */
export interface ProgressDetail { id: string; title: string; items: string[] }

/** what the area gives the open game's lazy screens */
export interface SectionProps {
  /** scroll the area to a section (a game section links to Data, say) */
  goTo: (section: SectionId) => void
  track?: Track
}

export interface DevToolsProps extends SectionProps {
  /** open one of the page's developer screens by its id (the app decides what an id shows) */
  openDev?: (id: string) => void
}

export interface GameParent {
  id: GameId
  /** the section heading (parent text: English is allowed) */
  title: string
  /** the save's localStorage key: summary and mixups get its raw text */
  saveKey: string
  /** the telemetry logs this game owns: the Data section lists, exports and clears them */
  logs?: TelemetryLog[]
  /** the game's own settings: shown only when the area is open on this game's page */
  Settings?: LazyExoticComponent<ComponentType<SectionProps>>
  /** the game's developer tools: shown only on this game's page */
  DevTools?: LazyExoticComponent<ComponentType<DevToolsProps>>
  /** one line about the child's progress, from the raw save (null: no save yet) */
  summary: (raw: string | null) => string | null
  /** more about the child's progress, from the raw save: short lists under the summary line (none: no save yet) */
  details?: (raw: string | null) => ProgressDetail[]
  /** the child's mix-ups, most frequent first, from the raw save */
  mixups: (raw: string | null) => Mixup[]
  /** reset this game's progress (only the open game shows the button); it loads the game's store itself */
  reset: () => Promise<void>
}

/** the persisted state of a zustand save, or null (no save, or one that does not parse) */
export function persistedState<T = Record<string, unknown>>(raw: string | null): Partial<T> | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as { state?: Partial<T> }
    return p && typeof p === 'object' && p.state && typeof p.state === 'object' ? p.state : null
  } catch { return null }
}

/** a confusion table (asked → chosen → n) as a list, most frequent first */
export function confusionList(table: Record<string, Record<string, number>> | undefined, label: (id: string) => string = (x) => x): Mixup[] {
  return Object.entries(table ?? {})
    .flatMap(([a, row]) => Object.entries(row ?? {}).map(([b, n]) => ({ asked: label(a), chosen: label(b), n: Number(n) || 0 })))
    .filter((m) => m.n > 0)
    .sort((x, y) => y.n - x.n)
}
