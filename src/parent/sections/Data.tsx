// The area's Data section: every game's telemetry log, one export and a clear per log (ADR 0004).
// The export is one JSON file (`exportDoc`: one part per log, each with its own `about`) for the logs the parent ticks
// (by default the open game's) and the period he picks (by default the last 30 days). The open game's log is read and
// cleared through its instance (`live`): its unflushed events are then in the export, and a cleared log does not come
// back on the instance's next flush. The other logs are read from storage (`readLog`); nothing of theirs is loaded here.
// The first duel's history is exported as it is and has no Clear: it is never cleared or rewritten.
import { useState } from 'react'
import { exportDoc, exportFileName, filterEvents, readLog, type TelemetryEvent, type TelemetryLog } from '../../shared/telemetry'
import { downloadJson } from '../../shared/download'
import { GAMES } from '../registry'
import type { GameId, LiveLog } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_DAYS = 30
type Period = 'recent' | 'all'

export interface DataSectionProps {
  /** the game whose page is open: its logs are ticked at first */
  game: GameId
  /** the open game's log instance, if it has one */
  live?: LiveLog
}

export function DataSection({ game, live }: DataSectionProps) {
  const logs = GAMES.flatMap((g) => (g.logs ?? []).map((log) => ({ log, game: g.id })))
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () => new Set(logs.filter((l) => l.game === game && !l.log.history).map((l) => l.log.key)),
  )
  const [period, setPeriod] = useState<Period>('recent')
  /** bumps after a clear or a download, so the counts are read again */
  const [, setVersion] = useState(0)

  const read = (log: TelemetryLog): TelemetryEvent[] => (live && live.key === log.key ? live.events() : readLog(log.key))
  const recentFrom = Date.now() - PERIOD_DAYS * DAY_MS
  const rows = logs.map(({ log }) => {
    const evs = read(log)
    return { log, all: evs.length, recent: filterEvents(evs, { since: recentFrom }).length }
  })

  const toggle = (key: string) => setPicked((p) => {
    const next = new Set(p)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const chosen = logs.filter(({ log }) => picked.has(log.key)).map(({ log }) => log)
  const download = () => {
    const since = period === 'recent' ? Date.now() - PERIOD_DAYS * DAY_MS : undefined
    const parts = chosen.map((log) => ({ key: log.key, about: log.about, events: filterEvents(read(log), { since }) }))
    downloadJson(exportDoc(parts, { since }), exportFileName(chosen.map((l) => l.game)))
    setVersion((v) => v + 1)
  }
  const clear = (log: TelemetryLog) => {
    if (!window.confirm(`Clear the ${log.label} telemetry log? Its events are deleted on this device.`)) return
    if (live && live.key === log.key) live.clear()
    else try { localStorage.removeItem(log.key) } catch { /* no storage */ }
    setVersion((v) => v + 1)
  }

  return (
    <div data-telemetry-export>
      <p>
        One file for the games you tick: give it to an AI coding tool with the repository, and it can analyse his play (the
        file says where the code and the design notes are). The tower’s events are in Book 2’s log, marked
        <code> via: tower</code>.
      </p>
      <table data-logs style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(({ log, all, recent }) => (
            <tr key={log.key} data-log={log.key}>
              <td style={{ paddingRight: 16 }}>
                <label>
                  <input type="checkbox" data-log-pick checked={picked.has(log.key)} onChange={() => toggle(log.key)} /> {log.label}
                </label>
              </td>
              <td style={{ paddingRight: 16 }} data-log-count>{all} events</td>
              <td style={{ paddingRight: 16 }} data-log-recent>{recent} in the last {PERIOD_DAYS} days</td>
              <td>
                {log.history
                  ? <span data-log-history>kept as history (never cleared)</span>
                  : <button type="button" data-log-clear onClick={() => clear(log)}>Clear</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Period:{' '}
        <label><input type="radio" name="pa-period" data-period="recent" checked={period === 'recent'} onChange={() => setPeriod('recent')} /> last {PERIOD_DAYS} days</label>{' '}
        <label><input type="radio" name="pa-period" data-period="all" checked={period === 'all'} onChange={() => setPeriod('all')} /> all</label>
      </p>
      <p>
        <button type="button" data-telemetry-download disabled={chosen.length === 0} onClick={download}>
          Download {chosen.length === 0 ? '(tick a game)' : chosen.map((l) => l.label).join(' + ')}
        </button>
      </p>
    </div>
  )
}
