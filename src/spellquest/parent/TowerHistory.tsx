// The tower's history in Spell Quest's section of the parent area (read only). The tower is now the tower, the first
// minigame of Spell Quest's run; its own save (`duel` in the lessons' save before the rename) stopped growing there. This is the one place it
// shows (it was in Spell Quest's old parent screen and in the lessons' progress page).
import { useProgressStore } from '../../stores/progressStore'
import { TOWER_MARKS } from '../tower/logic/marks'
import type { ScreenType, Tally } from '../tower/types'
import type { SectionProps } from '../../parent/types'

// the tower's screens (the picture-choice screen D was dropped, so it has no row)
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

export function TowerHistory({ goTo }: Pick<SectionProps, 'goTo'>) {
  const d = useProgressStore((p) => p.tower)
  const byMark = d?.byMark ?? {}
  const rows = [...TOWER_MARKS].filter((m) => byMark[m.id]).sort((a, b) => misses(byMark[b.id]) - misses(byMark[a.id]))
  const head = (first: string) => <thead><tr><th style={{ textAlign: 'left' }}>{first}</th>{COLS.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
  return (
    <div data-tower>
      <h3>Tower (history)</h3>
      <p>
        The first duel became the tower, the first minigame of the run; its points and its own records stopped there. Its
        right answers were added to his stars and coins once. Sessions: <span data-tower-sessions>{d?.sessions ?? 0}</span>.
        Minutes: <span data-tower-minutes>{Math.round((d?.roundsMs ?? 0) / 60000)}</span>.
        Best score: <span data-tower-best>{d?.bestScore ?? 0}</span>. Best wave: <span data-tower-wave>{d?.bestWave ?? 0}</span>.
      </p>
      {rows.length > 0 && <>
        <div className="pa-wide"><table data-tower-marks style={{ borderCollapse: 'collapse' }}>
          {head('Mark (most misses first)')}
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} data-tower-mark={m.id}>
                <td>{m.name}</td>
                {COLS.map((c) => <td key={c.key} data-col={col(c.key)}>{cell(byMark[m.id], c.key)}</td>)}
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="pa-wide"><table data-tower-types style={{ borderCollapse: 'collapse', marginTop: 12 }}>
          {head('Screen')}
          <tbody>
            {(['A', 'B', 'C'] as const).map((k) => (
              <tr key={k} data-tower-type={k}>
                <td>{TYPE_NAMES[k]}</td>
                {COLS.map((c) => <td key={c.key} data-col={col(c.key)}>{cell(d?.byType?.[k], c.key)}</td>)}
              </tr>
            ))}
          </tbody>
        </table></div>
      </>}
      <p>
        Its old event log is kept as it is: export it in{' '}
        <button type="button" data-goto-data onClick={() => goTo('data')}>Data</button> as “Tower (history)”. The tower’s
        events now go to Spell Quest’s log, marked <code>via: tower</code>.
      </p>
    </div>
  )
}
