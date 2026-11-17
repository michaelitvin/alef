// The area's Progress section: each game's summary line and its top mix-ups, read from the raw saves (no other game's
// store is created). Above them: the minutes played per day per game over the last 7 days (the play-time ledger).
import { GAMES, rawSave } from '../registry'
import { lastDays, PLAYTIME_GAMES, type PlaytimeGame } from '../../shared/playtime'

const TOP = 5
const DAYS = 7
const TITLE: Record<PlaytimeGame, string> = { book2: 'Book 2', clock: 'Clock', lessons: 'Lessons' }
/** whole minutes, but a short play shows as `<1` rather than as nothing */
const minutes = (ms: number) => (ms <= 0 ? '0' : ms < 60_000 ? '<1' : String(Math.round(ms / 60_000)))

export function ProgressSection() {
  return (
    <div>
      <h4 style={{ marginBottom: 4 }}>Minutes played, last 7 days</h4>
      <table data-playtime>
        <thead><tr><th>Day</th>{PLAYTIME_GAMES.map((g) => <th key={g}>{TITLE[g]}</th>)}</tr></thead>
        <tbody>
          {lastDays(DAYS).map((d) => (
            <tr key={d.day} data-day={d.day}>
              <td>{d.day}</td>
              {PLAYTIME_GAMES.map((g) => <td key={g} data-game={g}>{minutes(d.ms[g])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {GAMES.map((g) => {
        const raw = rawSave(g.saveKey)
        const line = g.summary(raw)
        const mix = g.mixups(raw).slice(0, TOP)
        return (
          <div key={g.id} data-progress-game={g.id}>
            <h4 style={{ marginBottom: 4 }}>{g.title}</h4>
            <p data-summary style={{ margin: 0 }}>{line ?? 'Not played yet.'}</p>
            {mix.length > 0 && <ul data-mixups>{mix.map((m) => <li key={m.asked + '→' + m.chosen}>{m.asked} → {m.chosen}: {m.n}</li>)}</ul>}
          </div>
        )
      })}
    </div>
  )
}
