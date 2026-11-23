// The ids that old events carry, and the ids they are read as (spec 2026-11-22-spell-quest-rename-design.md, "Old ids inside
// events"). Old compressed chunks are never rewritten: every reader maps through this one table. New events have the new ids.
import { OLD_TOWER_HISTORY_LOG_KEY, TOWER_HISTORY_LOG_KEY } from './saveKeys'
import { STAGING_PREFIX } from './stagingPrefix'
import type { TelemetryEvent } from './telemetry'

/** old `g` → new `g` (Book 2 is Spell Quest; the first duel is the tower) */
export const GAME_ALIASES: Readonly<Record<string, string>> = { book2: 'spellquest', duel: 'tower' }
export const aliasGame = (g: string): string => GAME_ALIASES[g] ?? g

const isTowerHistory = (key: string) => [TOWER_HISTORY_LOG_KEY, OLD_TOWER_HISTORY_LOG_KEY].some((k) => key === k || key === STAGING_PREFIX + k)

/** an event as the new code reads it: `book2` is `spellquest`, an old first-duel event (`duel`, or no `g` in the tower's history) is `tower`.
 * The same object when nothing changes. */
export function aliasEvent(ev: TelemetryEvent, logKey: string): TelemetryEvent {
  if (ev.g === undefined) return isTowerHistory(logKey) ? { ...ev, g: 'tower' } : ev
  const g = aliasGame(ev.g)
  return g === ev.g ? ev : { ...ev, g }
}
export const aliasEvents = (events: TelemetryEvent[], logKey: string): TelemetryEvent[] => events.map((e) => aliasEvent(e, logKey))
