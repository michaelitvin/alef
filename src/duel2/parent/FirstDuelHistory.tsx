// The first duel's history in Book 2's section of the parent area (read only). The first duel is now the tower, the first
// minigame of Book 2's run; its own save (`duel` in the lessons' save) stopped growing there. This is the one place it
// shows (it was in Book 2's old parent screen and in the lessons' progress page).
import { useProgressStore } from '../../stores/progressStore'
import { DUEL_MARKS } from '../../utils/duel/marks'
import { exportTelemetry, telemetryCount } from '../../utils/duel/telemetry'
import type { ScreenType, Tally } from '../../types/duel'
import { downloadJson } from '../../shared/download'

// the first duel's screens (the picture-choice screen D was dropped, so it has no row)
const TYPE_NAMES: Partial<Record<ScreenType, string>> = { A: 'picture → mark', B: 'sound → mark', C: 'name → mark' }
const COLS: { key: keyof Tally | 'correctPct'; label: string }[] = [
  { key: 'seen', label: 'Seen' },
  { key: 'correctPct', label: 'Right' },
  { key: 'wrong', label: 'Wrong' },
  { key: 'timeout', label: 'Too slow' },
  { key: 'twin', label: 'Twin (forgiven)' },
  { key: 'mega', label: 'Lightning' },
]
const cell = (t: Tally | undefined, key: (typeof COLS)[number]['key']) => {
  if (key === 'correctPct') return t && t.seen ? `${Math.round((100 * t.correct) / t.seen)}%` : '—'
  return String(t?.[key] ?? 0)
}
const col = (key: (typeof COLS)[number]['key']) => (key === 'correctPct' ? 'correct' : key)
const misses = (t?: Tally) => (t ? (t.wrong ?? 0) + (t.timeout ?? 0) : -1)

export function FirstDuelHistory() {
  const d = useProgressStore((p) => p.duel)
  const byMark = d?.byMark ?? {}
  const rows = [...DUEL_MARKS].filter((m) => byMark[m.id]).sort((a, b) => misses(byMark[b.id]) - misses(byMark[a.id]))
  const head = (first: string) => <thead><tr><th style={{ textAlign: 'left' }}>{first}</th>{COLS.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
  return (
    <div data-first-duel>
      <h3>First duel (history)</h3>
      <p>
        The first duel is now the tower, the first minigame of the run; its points and its own records stopped there. Its
        right answers were added to his stars and coins once. Sessions: <span data-duel-sessions>{d?.sessions ?? 0}</span>.
        Minutes: <span data-duel-minutes>{Math.round((d?.roundsMs ?? 0) / 60000)}</span>.
        Best score: <span data-duel-best>{d?.bestScore ?? 0}</span>. Best wave: <span data-duel-wave>{d?.bestWave ?? 0}</span>.
      </p>
      {rows.length > 0 && <>
        <table data-duel-marks style={{ borderCollapse: 'collapse' }}>
          {head('Mark (most misses first)')}
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} data-duel-mark={m.id}>
                <td>{m.name}</td>
                {COLS.map((c) => <td key={c.key} data-col={col(c.key)}>{cell(byMark[m.id], c.key)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <table data-duel-types style={{ borderCollapse: 'collapse', marginTop: 12 }}>
          {head('Screen')}
          <tbody>
            {(['A', 'B', 'C'] as const).map((k) => (
              <tr key={k} data-duel-type={k}>
                <td>{TYPE_NAMES[k]}</td>
                {COLS.map((c) => <td key={c.key} data-col={col(c.key)}>{cell(d?.byType?.[k], c.key)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </>}
      {/* Task 17 replaces this with the Data section's one export */}
      <p>
        <button type="button" data-duel-export
          onClick={() => downloadJson(exportTelemetry(), `alef-duel-telemetry-${new Date().toISOString().slice(0, 10)}.json`)}>
          Export first duel telemetry ({telemetryCount()} events)
        </button>
      </p>
    </div>
  )
}
