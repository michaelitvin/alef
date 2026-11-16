// The area's Progress section: each game's summary line and its top mix-ups, read from the raw saves (no other game's
// store is created). Task 16 adds the time played above them.
import { GAMES, rawSave } from '../registry'

const TOP = 5

export function ProgressSection() {
  return (
    <div>
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
