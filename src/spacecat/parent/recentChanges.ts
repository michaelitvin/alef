// The ladder changes the parent area lists under "Recent changes", read from the telemetry `ladder` events (the save keeps
// no list of them).
import type { TelemetryEvent } from '../../shared/telemetry'
import type { By, Change } from '../logic/ladder/state'
import type { RungId } from '../logic/rungs'

export interface ChangeRow { t: number; rung: RungId; change: Change; by?: By; days?: number }

/** the last `n` ladder changes of the log, newest first */
export function recentChanges(events: readonly TelemetryEvent[], n: number): ChangeRow[] {
  const rows: ChangeRow[] = []
  for (const e of events) {
    if (e.e !== 'ladder' || typeof e.rung !== 'string' || typeof e.change !== 'string') continue
    rows.push({
      t: e.t, rung: e.rung as RungId, change: e.change as Change,
      ...(typeof e.by === 'string' ? { by: e.by as By } : {}), ...(typeof e.days === 'number' ? { days: e.days } : {}),
    })
  }
  return rows.sort((a, b) => a.t - b.t).slice(-n).reverse()
}
