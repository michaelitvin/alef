// The area's Data section: how many events each telemetry log holds. Task 17 adds the one export and the clear buttons;
// until then the game sections keep their own.
import { readLog } from '../../shared/telemetry'
import { GAMES } from '../registry'

export function DataSection() {
  const logs = GAMES.flatMap((g) => g.logs ?? [])
  return (
    <table data-logs style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {logs.map((l) => <tr key={l.key} data-log={l.key}><td style={{ paddingRight: 16 }}>{l.label}</td><td data-log-count>{readLog(l.key).length} events</td></tr>)}
      </tbody>
    </table>
  )
}
