// The area's Data section: every game's telemetry log, one export and a clear per log (ADR 0004).
// The export is one JSON file (`exportDoc`: one part per log, each with its own `about`) for the logs the parent ticks
// (by default the open game's) and the period he picks (by default the last 30 days). The open game's log is read and
// cleared through its instance (`live`): its unflushed events are then in the export, and a cleared log does not come
// back on the instance's next flush. The other logs are read from storage (`readLog`); nothing of theirs is loaded here.
// The counts and sizes come from the chunk headers (`logStats`); only Download decodes every chunk. The storage line
// shows the live telemetry against its budget, the frozen log's size, the browser's answer to `persist()` and a save
// that failed on this page.
// The first duel's history is exported as it is and has no Clear: it is never cleared or rewritten.
import { useEffect, useMemo, useState } from 'react'
import {
  clearLog, exportDoc, exportFileName, filterEvents, frozenLogSizes, liveBudget, liveChars, logStats, readLog, rollupKey, rollupsFor,
  type TelemetryEvent, type TelemetryLog,
} from '../../shared/telemetry'
import { readRollup } from '../../shared/telemetryRollup'
import { persistedAnswer, saveFailed } from '../../shared/saveStorage'
import { STAGING_PREFIX } from '../../shared/stagingStorage'
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

const logs = GAMES.flatMap((g) => (g.logs ?? []).map((log) => ({ log, game: g.id })))

const readFrom = (live: LiveLog | undefined, log: TelemetryLog): TelemetryEvent[] =>
  (live && live.key === log.key ? live.events() : readLog(log.key))

/** characters as the parent reads them: 12.3k */
const kchars = (n: number) => `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`

export function DataSection({ game, live }: DataSectionProps) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () => new Set(logs.filter((l) => l.game === game && !l.log.history).map((l) => l.log.key)),
  )
  const [period, setPeriod] = useState<Period>('recent')
  /** bumps after a clear or a download, so the counts are read again */
  const [version, setVersion] = useState(0)

  const read = (log: TelemetryLog) => readFrom(live, log)
  // the counts: once per version, from the chunk headers (a flush of the open game's log first, so its unflushed events
  // count); only a chunk that straddles the 30-day cut is decoded. Downloading decodes the rest.
  const rows = useMemo(() => {
    void version // a clear or a download bumps it: read again
    live?.flush()
    const recentFrom = Date.now() - PERIOD_DAYS * DAY_MS
    return logs.map(({ log }) => {
      const st = logStats(log.key, recentFrom)
      const summarized = log.history ? 0 : Object.keys(readRollup(log.key).days).length
      const rollupChars = log.history ? 0 : (localStorage.getItem(rollupKey(log.key))?.length ?? 0)
      return { log, all: st.events, recent: st.recent, unreadable: st.unreadable, summarized, chars: st.chars + rollupChars }
    })
  }, [live, version])
  // the browser's answer to persist() (the area asks once, behind the gate): read it here too, so a late answer shows
  const [persisted, setPersisted] = useState<boolean | null>(persistedAnswer)
  useEffect(() => {
    let alive = true
    try {
      void navigator.storage?.persisted?.().then((p) => { if (alive) setPersisted(p) }, () => {})
    } catch { /* no API */ }
    return () => { alive = false }
  }, [version])
  const storage = useMemo(() => {
    void version
    return { used: liveChars(), budget: liveBudget(), frozen: frozenLogSizes(), failed: saveFailed() }
  }, [version])

  const toggle = (key: string) => setPicked((p) => {
    const next = new Set(p)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const chosen = logs.filter(({ log }) => picked.has(log.key)).map(({ log }) => log)
  const download = () => {
    const since = period === 'recent' ? Date.now() - PERIOD_DAYS * DAY_MS : undefined
    const parts = chosen.map((log) => {
      const all = read(log)
      const rollups = rollupsFor(log.key, all, since)
      return { key: log.key, about: log.about, events: filterEvents(all, { since }), ...(rollups ? { rollups } : {}) }
    })
    downloadJson(exportDoc(parts, { since }), exportFileName(chosen.map((l) => l.game)))
    setVersion((v) => v + 1)
  }
  const clear = (log: TelemetryLog) => {
    if (!window.confirm(`Clear the ${log.label} telemetry log? Its events are deleted on this device.`)) return
    if (live && live.key === log.key) live.clear()
    else clearLog(log.key)
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
          {rows.map(({ log, all, recent, unreadable, summarized, chars }) => (
            <tr key={log.key} data-log={log.key}>
              <td style={{ paddingRight: 16 }}>
                <label>
                  <input type="checkbox" data-log-pick checked={picked.has(log.key)} onChange={() => toggle(log.key)} /> {log.label}
                </label>
              </td>
              <td style={{ paddingRight: 16 }} data-log-count>{all} events</td>
              <td style={{ paddingRight: 16 }} data-log-recent>{recent} in the last {PERIOD_DAYS} days</td>
              <td style={{ paddingRight: 16 }} data-log-size>{kchars(chars)} chars</td>
              <td style={{ paddingRight: 16 }}>
                {summarized > 0 && <span data-log-summarized>{summarized} older days summarized </span>}
                {unreadable > 0 && <span data-log-unreadable>{unreadable} unreadable chunks</span>}
              </td>
              <td>
                {log.history
                  ? <span data-log-history>kept as history (never cleared)</span>
                  : <button type="button" data-log-clear onClick={() => clear(log)}>Clear</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p data-storage>
        Storage: telemetry <span data-storage-used>{kchars(storage.used)}</span> of {kchars(storage.budget)} chars
        {Object.entries(storage.frozen).map(([k, n]) => (
          <span key={k} data-storage-frozen={k}> · {k.startsWith(STAGING_PREFIX) ? 'staging’s copy of the first duel’s history' : 'first duel’s history'} {kchars(n)} chars</span>
        ))}
        {' · '}kept by the browser: <span data-storage-persisted>{persisted === null ? 'not known' : persisted ? 'yes' : 'no'}</span>
        {storage.failed !== null && <span data-storage-save-failed> · a save failed on this page ({storage.failed})</span>}
      </p>
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
