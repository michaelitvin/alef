// The ids that old events carry, and the ids they are read as (spec 2026-11-22-spell-quest-rename-design.md, "Old ids inside
// events"). Old compressed chunks are never rewritten: every reader maps through this one table. New events have the new ids.
import type { TelemetryEvent } from './telemetry'

/** old `g` → new `g` (Book 2 is Spell Quest; the first duel is the tower) */
export const GAME_ALIASES: Readonly<Record<string, string>> = { book2: 'spellquest', duel: 'tower' }
export const aliasGame = (g: string): string => GAME_ALIASES[g] ?? g

/** an event as the new code reads it: `book2` is `spellquest`, `duel` is `tower`. The same object when nothing changes.
 * The tower's frozen history log (its events have no `g`) is not aliased: it is read and exported as it is stored (ADR 0004). */
export function aliasEvent(ev: TelemetryEvent): TelemetryEvent {
  if (ev.g === undefined) return ev
  const g = aliasGame(ev.g)
  return g === ev.g ? ev : { ...ev, g }
}
export const aliasEvents = (events: TelemetryEvent[]): TelemetryEvent[] => events.map(aliasEvent)
