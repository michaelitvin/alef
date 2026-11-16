// The clock's section in the parent area (src/parent; parent text, English allowed): languages, caption mixes, the level,
// rounds and gears, the feature table with its predicted miss and the top confusions. The frame has the close, boy or
// girl, sound and reset. Every settings change is logged (the changed keys and their new values).
import { useClockStore, type ClockSettings as ClockSettingsT } from '../store'
import { clockTelemetry } from '../telemetry'
import { predictedMistakeRate } from '../../shared/adaptive'
import { featurePrior } from '../logic/rounds'
import type { Lang } from '../logic/phrases'
import type { SectionProps } from '../../parent/types'

const LANG_LABEL: Record<Lang, string> = { he: 'עברית / Hebrew', en: 'English' }

export default function ClockSettings({ goTo }: SectionProps) {
  const s = useClockStore()
  const setSettings = (p: Partial<ClockSettingsT>) => {
    s.setSettings(p)
    clockTelemetry.track('settings', { keys: Object.keys(p), ...p })
  }
  const toggleLang = (l: Lang) => {
    const on = s.settings.langs.includes(l)
    const langs = on ? s.settings.langs.filter((x) => x !== l) : (['he', 'en'] as Lang[]).filter((x) => x === l || s.settings.langs.includes(x))
    if (langs.length) setSettings({ langs })
  }
  const rows = Object.entries(s.tallies).sort(([a], [b]) => a.localeCompare(b))
  const confusions = Object.entries(s.confusions)
    .flatMap(([asked, row]) => Object.entries(row).map(([chosen, n]) => ({ asked, chosen, n })))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10)

  return (
    <div data-clock-settings>
      <h3>Languages</h3>
      {(['he', 'en'] as Lang[]).map((l) => (
        <label key={l} style={{ display: 'block', fontSize: 18 }}>
          <input type="checkbox" aria-label={LANG_LABEL[l]} checked={s.settings.langs.includes(l)} onChange={() => toggleLang(l)} /> {LANG_LABEL[l]}
        </label>
      ))}
      <h3>Captions</h3>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={s.settings.heCursiveMix} onChange={(e) => setSettings({ heCursiveMix: e.target.checked })} /> Hebrew: mix print and cursive
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={s.settings.enCapsMix} onChange={(e) => setSettings({ enCapsMix: e.target.checked })} /> English: mix small letters and CAPITALS
      </label>
      <h3>Progress</h3>
      <p data-clock-progress>Level {s.progress.level} (recent new-time answers: {s.progress.newAnswers || '—'}) · rounds {s.roundNo} · gears {s.gears} · workdays {s.workdays} · best streak {s.bestStreak}</p>
      <table data-clock-features style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Feature</th><th>Seen</th><th>Wrong</th><th>Recent</th><th>Predicted miss</th></tr></thead>
        <tbody>
          {rows.map(([f, t]) => (
            <tr key={f} data-feature={f}>
              <td>{f}</td><td align="center">{t.seen ?? 0}</td><td align="center">{t.wrong ?? 0}</td>
              <td style={{ fontFamily: 'monospace' }}>{s.recent[f] ?? ''}</td>
              <td align="center">{Math.round(predictedMistakeRate(t, s.recent[f], featurePrior(f)) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Top confusions (asked → chosen)</h3>
      <ul>{confusions.map((c) => <li key={c.asked + c.chosen}>{c.asked} → {c.chosen} ×{c.n}</li>)}</ul>
      <h3>Telemetry</h3>
      <p>
        Export or clear the clock’s event log in{' '}
        <button type="button" data-goto-data onClick={() => goTo('data')}>Data</button>.
      </p>
    </div>
  )
}
