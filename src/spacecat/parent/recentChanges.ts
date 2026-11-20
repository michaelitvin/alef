// The ladder changes the parent area lists under "Recent changes", read from the telemetry `ladder` events (the save keeps
// no list of them). The rungs one placement places are one row: a placement places up to all 31 at once.
import type { TelemetryEvent } from '../../shared/telemetry'
import type { By, Change } from '../logic/ladder/state'
import { rungDef, type RungId } from '../logic/rungs'

/** one change; `count` (2 or more): the placed rungs of one placement, `rung` the top one of them, `t` the newest's time */
export interface ChangeRow { t: number; rung: RungId; change: Change; by?: By; days?: number; count?: number }

/** placed rungs further apart than this are not one placement */
const GROUP_GAP_MS = 30 * 60_000

const orderOf = (r: RungId): number => rungDef(r)?.order ?? 0

/** the last `n` ladder changes of the log (one placement's placed rungs as one row), newest first */
export function recentChanges(events: readonly TelemetryEvent[], n: number): ChangeRow[] {
  const sorted = [...events].sort((a, b) => a.t - b.t)
  const rows: ChangeRow[] = []
  // the row that the next placed rung of the same placement joins; a placement's start ends it
  let open: ChangeRow | null = null
  for (const e of sorted) {
    if (e.e === 'placement' && e.phase === 'start') { open = null; continue }
    if (e.e !== 'ladder' || typeof e.rung !== 'string' || typeof e.change !== 'string') continue
    const row: ChangeRow = {
      t: e.t, rung: e.rung as RungId, change: e.change as Change,
      ...(typeof e.by === 'string' ? { by: e.by as By } : {}), ...(typeof e.days === 'number' ? { days: e.days } : {}),
    }
    if (row.change === 'placed' && open && open.by === row.by && row.t - open.t <= GROUP_GAP_MS) {
      open.count = (open.count ?? 1) + 1
      open.t = row.t
      if (orderOf(row.rung) > orderOf(open.rung)) open.rung = row.rung
      continue
    }
    rows.push(row)
    open = row.change === 'placed' ? row : null
  }
  return rows.slice(-n).reverse()
}
