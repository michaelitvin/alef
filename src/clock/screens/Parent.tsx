// Parent area (text allowed): languages, caption mixes, sound, stats, telemetry export, reset.
import { useClockStore, type ClockSettings } from '../store'
import { clockTelemetry } from '../telemetry'
import { predictedMistakeRate } from '../../shared/adaptive'
import { featurePrior } from '../logic/rounds'
import type { Lang } from '../logic/phrases'

const LANG_LABEL: Record<Lang, string> = { he: 'עברית / Hebrew', en: 'English' }

export function Parent({ onClose }: { onClose: () => void }) {
  const store = useClockStore()
  // every settings change from the parent area is logged (the changed keys and their new values)
  const s = { ...store, setSettings: (p: Partial<ClockSettings>) => {
    store.setSettings(p)
    clockTelemetry.track('settings', { keys: Object.keys(p), ...p })
  } }
  const toggleLang = (l: Lang) => {
    const on = s.settings.langs.includes(l)
    const langs = on ? s.settings.langs.filter((x) => x !== l) : (['he', 'en'] as Lang[]).filter((x) => x === l || s.settings.langs.includes(x))
    if (langs.length) s.setSettings({ langs })
  }
  const download = () => {
    const blob = new Blob([clockTelemetry.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `clock-telemetry-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const rows = Object.entries(s.tallies).sort(([a], [b]) => a.localeCompare(b))
  const confusions = Object.entries(s.confusions)
    .flatMap(([asked, row]) => Object.entries(row).map(([chosen, n]) => ({ asked, chosen, n })))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10)

  return (
    <div className="ck-parent" style={{ position: 'fixed', inset: 0, overflow: 'auto', background: '#fff8e7', padding: 24, fontFamily: 'system-ui', color: '#222' }}>
      <button onClick={onClose} style={{ float: 'right', fontSize: 18 }}>Close</button>
      <h2>Clock workshop — parent</h2>
      <h3>Languages</h3>
      {(['he', 'en'] as Lang[]).map((l) => (
        <label key={l} style={{ display: 'block', fontSize: 18 }}>
          <input type="checkbox" aria-label={LANG_LABEL[l]} checked={s.settings.langs.includes(l)} onChange={() => toggleLang(l)} /> {LANG_LABEL[l]}
        </label>
      ))}
      <h3>Captions</h3>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={s.settings.heCursiveMix} onChange={(e) => s.setSettings({ heCursiveMix: e.target.checked })} /> Hebrew: mix print and cursive
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={s.settings.enCapsMix} onChange={(e) => s.setSettings({ enCapsMix: e.target.checked })} /> English: mix small letters and CAPITALS
      </label>
      <h3>Sound</h3>
      <label style={{ display: 'block' }}><input type="checkbox" checked={s.settings.sfx} onChange={(e) => s.setSettings({ sfx: e.target.checked })} /> Effects</label>
      <label style={{ display: 'block' }}><input type="checkbox" checked={s.settings.music} onChange={(e) => s.setSettings({ music: e.target.checked })} /> Music</label>
      <label style={{ display: 'block' }}>Volume <input type="range" min={0} max={1} step={0.05} value={s.settings.volume} onChange={(e) => s.setSettings({ volume: Number(e.target.value) })} /></label>
      <h3>Progress</h3>
      <p>Level {s.progress.level} (recent new-time answers: {s.progress.newAnswers || '—'}) · rounds {s.roundNo} · gears {s.gears} · workdays {s.workdays} · best streak {s.bestStreak}</p>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Feature</th><th>Seen</th><th>Wrong</th><th>Recent</th><th>Predicted miss</th></tr></thead>
        <tbody>
          {rows.map(([f, t]) => (
            <tr key={f}>
              <td>{f}</td><td align="center">{t.seen ?? 0}</td><td align="center">{t.wrong ?? 0}</td>
              <td style={{ fontFamily: 'monospace' }}>{s.recent[f] ?? ''}</td>
              <td align="center">{Math.round(predictedMistakeRate(t, s.recent[f], featurePrior(f)) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Top confusions (asked → chosen)</h3>
      <ul>{confusions.map((c) => <li key={c.asked + c.chosen}>{c.asked} → {c.chosen} ×{c.n}</li>)}</ul>
      <h3>Data</h3>
      <button onClick={download}>Export telemetry ({clockTelemetry.count()} events)</button>{' '}
      <button onClick={() => window.confirm('Clear the clock telemetry log?') && clockTelemetry.clear()}>Clear telemetry</button>
      <p>
        <button style={{ color: '#a00' }} onClick={() => window.confirm('Reset all clock progress? (alef progress is not touched)') && s.resetProgress()}>
          Reset clock progress
        </button>
      </p>
    </div>
  )
}
