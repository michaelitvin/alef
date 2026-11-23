// The area's Progress section: each game's summary line, its short detail lists (the lessons' levels and achievements)
// and its top mix-ups, read from the raw saves (no other game's
// store is created). Above them: the minutes played per day per game over the last 7 days (the play-time ledger).
import { GAMES, rawSave } from '../registry'
import { lastDays, PLAYTIME_GAMES, type PlaytimeGame } from '../../shared/playtime'

const TOP = 5
const DAYS = 7
/** the ledger's games that have a section here (English only where it can be opened: production shows no English column) */
const COLUMNS = PLAYTIME_GAMES.filter((g) => GAMES.some((p) => p.id === g))
const TITLE: Record<PlaytimeGame, string> = { 'spellquest-he': 'Spell Quest', clock: 'Clock', lessons: 'Lessons', spacecat: 'Space Cat', 'spellquest-en': 'English' }
/** whole minutes, but a short play shows as `<1` rather than as nothing */
const minutes = (ms: number) => (ms <= 0 ? '0' : ms < 60_000 ? '<1' : String(Math.round(ms / 60_000)))

export function ProgressSection() {
  return (
    <div>
      <h4 style={{ marginBottom: 4 }}>Minutes played, last 7 days</h4>
      <div className="pa-wide"><table data-playtime>
        <thead><tr><th>Day</th>{COLUMNS.map((g) => <th key={g}>{TITLE[g]}</th>)}</tr></thead>
        <tbody>
          {lastDays(DAYS).map((d) => (
            <tr key={d.day} data-day={d.day}>
              <td>{d.day}</td>
              {COLUMNS.map((g) => <td key={g} data-game={g}>{minutes(d.ms[g])}</td>)}
            </tr>
          ))}
        </tbody>
      </table></div>
      {GAMES.map((g) => {
        const raw = rawSave(g.saveKey)
        const line = g.summary(raw)
        const details = g.details?.(raw) ?? []
        const mix = g.mixups(raw).slice(0, TOP)
        return (
          <div key={g.id} data-progress-game={g.id}>
            <h4 style={{ marginBottom: 4 }}>{g.title}</h4>
            <p data-summary style={{ margin: 0 }}>{line ?? 'Not played yet.'}</p>
            {details.map((d) => (
              <div key={d.id} data-detail={d.id}>
                <h5 style={{ margin: '8px 0 2px' }}>{d.title}</h5>
                <ul style={{ margin: 0 }}>{d.items.map((it) => <li key={it}>{it}</li>)}</ul>
              </div>
            ))}
            {mix.length > 0 && <ul data-mixups>{mix.map((m) => <li key={m.asked + '→' + m.chosen}>{m.asked} → {m.chosen}: {m.n}</li>)}</ul>}
          </div>
        )
      })}
    </div>
  )
}
