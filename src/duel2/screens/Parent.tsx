// Parent area (text allowed): progress, per-screen and per-item results, his top mix-ups, sound, telemetry export, reset,
// and the screen gallery.
import { useDuel2Store, type Duel2Settings } from '../store'
import { duel2Telemetry } from '../telemetry'
import { ITEMS } from '../logic/content'
import { PlayerSetting } from '../../shared/PlayerSetting'
import { useProgressStore } from '../../stores/progressStore'
import { DUEL_MARKS } from '../../utils/duel/marks'

const STAGE_NAME = ['', 'letters', 'plain syllables', 'the dot changes the sound', 'words on doors']
const name = (id: string) => ITEMS.find((i) => i.id === id)?.glyph ?? id

export function Parent({ onClose, onGallery, onStrokes, onDrawTest }: { onClose: () => void; onGallery: () => void; onStrokes?: () => void; onDrawTest?: () => void }) {
  const s = useDuel2Store()
  // the first duel's own save: shown as history (read only)
  const duel = useProgressStore((p) => p.duel)
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
      {/* the way out of the game lives here, behind the hold: on the child's screens a home button took him to the old duel */}
      <a data-alef-menu href={import.meta.env.BASE_URL} style={{ float: 'right', fontSize: 18, marginRight: 16 }}>Alef menu</a>
      <h2>Book 2 — parent</h2>
      <p data-stage-line>{s.bookOpen === false ? 'Stage 0: the tower (the first duel) alone; Book 2’s minigames open when its marks are mastered.' : <>Stage {s.stage.stage}: {STAGE_NAME[s.stage.stage]}.</>} Runs: {s.runs}. Best run: {s.bestRun} right answers. Crystals: {s.crystals}. Flight bosses beaten: {(s.bossesBeaten ?? []).join(', ') || 'none yet'}.</p>
      {s.bookOpen === false && (
        <p data-open-book>
          <label>
            <input type="checkbox" data-setting-open-book checked={false}
              onChange={() => { s.openBook(); duel2Telemetry.track('book-open', { by: 'parent', stars: s.totalStars }) }} /> Already knows
            nikkud: open Book 2 (its minigames join the tower in the run)
          </label>
        </p>
      )}
      <p><button onClick={onGallery} style={{ fontSize: 17, padding: '8px 14px' }}>Screens (review each screen)</button></p>
      <h3>Boy or girl</h3>
      <PlayerSetting onChange={(g) => duel2Telemetry.track('player', { gender: g, by: 'parent' })} />
      <h3>Drawing letters</h3>
      <p>
        Two drawing screens, after the doors: one in print, one in handwriting. They teach stroke order. Drawing is on by
        default; the stroke review shows which letters you checked ({Object.keys(s.strokeMarks ?? {}).length} of 54 checked).
      </p>
      <p>
        <label><input type="checkbox" data-setting-drawing checked={!!s.settings.drawing} onChange={(e) => setSettings({ drawing: e.target.checked })} /> Drawing screens in the game</label>{' '}
        <button onClick={onStrokes}>Stroke review</button>{' '}
        <button onClick={onDrawTest}>Drawing test board</button>
      </p>
      <h3>Number range for shopping</h3>
      <p>
        At the merchant he pays the exact price of a potion (a heart) from his coins. The range sets the coin values and
        the highest price: up to 10 (coins 1, 2, 5, 10), up to 100 (also 20, 50), up to 1000 (also 100, 200, 500).
      </p>
      <p>
        {([10, 100, 1000] as const).map((r) => (
          <label key={r} style={{ marginRight: 14 }}>
            <input type="radio" name="d2-range" data-range={r} checked={(s.settings.range ?? 100) === r} onChange={() => setSettings({ range: r })} /> Up to {r}
          </label>
        ))}
      </p>
      <h3>Money</h3>
      <table data-money style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td>Merchant visits</td><td data-money-visits>{s.merchant?.visits ?? 0}</td></tr>
          <tr><td>Potions bought</td><td data-money-purchases>{s.merchant?.purchases ?? 0}</td></tr>
          <tr><td>Declined (✗)</td><td data-money-declines>{s.merchant?.declines ?? 0}</td></tr>
          <tr><td>Tries that were not enough</td><td data-money-short>{s.merchant?.short ?? 0}</td></tr>
          <tr><td>Tries that were too much</td><td data-money-over>{s.merchant?.over ?? 0}</td></tr>
          <tr><td>Hints</td><td data-money-hints>{s.merchant?.hints ?? 0}</td></tr>
          <tr><td>Coin level (0: one or two coins make the price; 1: three or more; 2: and a coin that is too big)</td><td data-money-level>{s.merchant?.level ?? 0}</td></tr>
        </tbody>
      </table>
      <h3>By screen</h3>
      {table(rows('sc:'), (k) => k)}
      <h3>By letter (hardest first)</h3>
      {table(rows('l:'), name)}
      <h3>By vowel</h3>
      {table(rows('v:'), (k) => k)}
      <h3>Top mix-ups (asked → tapped)</h3>
      <ul>{conf(s.confusions.letters).map((x) => <li key={`l${x.a}${x.b}`}>{name(x.a)} → {name(x.b)}: {x.n}</li>)}</ul>
      <ul>{conf(s.confusions.vowels).map((x) => <li key={`v${x.a}${x.b}`}>vowel {x.a} → {x.b}: {x.n}</li>)}</ul>
      <h3>First duel (history)</h3>
      <p>
        The first duel is now the tower, the first minigame of the run; its points and its own records stopped there. Its
        right answers were added to his stars and coins once. Sessions: <span data-duel-sessions>{duel?.sessions ?? 0}</span>.
        Best score: <span data-duel-best>{duel?.bestScore ?? 0}</span>. Best wave: <span data-duel-wave>{duel?.bestWave ?? 0}</span>.
      </p>
      <table data-duel-marks style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th style={{ textAlign: 'left' }}>Mark</th><th>Right</th><th>Wrong</th><th>Too slow</th><th>Lightning</th></tr></thead>
        <tbody>
          {DUEL_MARKS.filter((m) => duel?.byMark?.[m.id]).map((m) => {
            const t = duel!.byMark[m.id]
            return <tr key={m.id} data-duel-mark={m.id}><td>{m.name}</td><td>{t.correct ?? 0}</td><td>{t.wrong ?? 0}</td><td>{t.timeout ?? 0}</td><td>{t.mega ?? 0}</td></tr>
          })}
        </tbody>
      </table>
      <h3>Flight speed</h3>
      <p>
        The broom flight adapts to him and is saved on this device only: <span data-pace>{s.pace.toFixed(2)}</span>× the normal
        flight time (0.85 = fastest, 1.6 = slowest): a catch makes it 1% faster, a mistake 4% slower.{' '}
        <button onClick={() => s.setPace(1)}>Reset flight speed</button>
      </p>
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
