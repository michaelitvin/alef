// Parent area (text allowed): progress, per-screen and per-item results, his top mix-ups, sound, telemetry export, reset,
// and the screen gallery.
import { useDuel2Store, type Duel2Settings } from '../store'
import { duel2Telemetry } from '../telemetry'
import { ITEMS } from '../logic/content'

const STAGE_NAME = ['', 'letters', 'plain syllables', 'the dot changes the sound', 'words on doors']
const name = (id: string) => ITEMS.find((i) => i.id === id)?.glyph ?? id

export function Parent({ onClose, onGallery }: { onClose: () => void; onGallery: () => void }) {
  const s = useDuel2Store()
  const setSettings = (p: Partial<Duel2Settings>) => { s.setSettings(p); duel2Telemetry.track('settings', { keys: Object.keys(p), ...p }) }
  const download = () => {
    const blob = new Blob([duel2Telemetry.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `duel2-telemetry-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const rows = (prefix: string) => Object.entries(s.tallies).filter(([k]) => k.startsWith(prefix))
    .map(([k, t]) => ({ k: k.slice(prefix.length), seen: t.seen ?? 0, wrong: t.wrong ?? 0 }))
    .filter((r) => prefix !== 'l:' || ITEMS.some((i) => i.id === r.k))
    .sort((a, b) => b.wrong / Math.max(1, b.seen) - a.wrong / Math.max(1, a.seen))
  const conf = (c: Record<string, Record<string, number>>) => Object.entries(c)
    .flatMap(([a, row]) => Object.entries(row).map(([b, n]) => ({ a, b, n }))).sort((x, y) => y.n - x.n).slice(0, 10)
  const table = (r: { k: string; seen: number; wrong: number }[], label: (k: string) => string) => (
    <table style={{ borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ textAlign: 'left' }}>Item</th><th>Seen</th><th>Wrong / near</th></tr></thead>
      <tbody>{r.map((x) => <tr key={x.k}><td>{label(x.k)}</td><td>{x.seen}</td><td>{x.wrong}</td></tr>)}</tbody>
    </table>
  )
  return (
    <div className="d2-parent">
      <button onClick={onClose} style={{ float: 'right', fontSize: 18 }}>Close</button>
      <h2>Book 2 — parent</h2>
      <p>Stage {s.stage.stage}: {STAGE_NAME[s.stage.stage]}. Runs: {s.runs}. Best run: {s.bestRun} right answers. Crystals: {s.crystals}.</p>
      <p><button onClick={onGallery} style={{ fontSize: 17, padding: '8px 14px' }}>Screens (review each screen)</button></p>
      <h3>By screen</h3>
      {table(rows('sc:'), (k) => k)}
      <h3>By letter (hardest first)</h3>
      {table(rows('l:'), name)}
      <h3>By vowel</h3>
      {table(rows('v:'), (k) => k)}
      <h3>Top mix-ups (asked → tapped)</h3>
      <ul>{conf(s.confusions.letters).map((x) => <li key={`l${x.a}${x.b}`}>{name(x.a)} → {name(x.b)}: {x.n}</li>)}</ul>
      <ul>{conf(s.confusions.vowels).map((x) => <li key={`v${x.a}${x.b}`}>vowel {x.a} → {x.b}: {x.n}</li>)}</ul>
      <h3>Sound</h3>
      <label><input type="checkbox" checked={s.settings.sfx} onChange={(e) => setSettings({ sfx: e.target.checked })} /> Effects</label>{' '}
      <label><input type="checkbox" checked={s.settings.music} onChange={(e) => setSettings({ music: e.target.checked })} /> Music</label>{' '}
      <label>Volume <input type="range" min={0} max={1} step={0.05} value={s.settings.volume} onChange={(e) => setSettings({ volume: Number(e.target.value) })} /></label>
      <h3>Data</h3>
      <p>
        <button onClick={download}>Export telemetry</button>{' '}
        <button onClick={() => { if (window.confirm('Clear the telemetry log?')) duel2Telemetry.clear() }}>Clear telemetry</button>{' '}
        <button onClick={() => { if (window.confirm('Reset all Book 2 progress?')) s.resetProgress() }}>Reset progress</button>
      </p>
      <p style={{ color: '#666' }}>Events logged: {duel2Telemetry.count()}</p>
    </div>
  )
}
