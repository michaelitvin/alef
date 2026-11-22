// Spell Quest's section in the parent area (src/parent; parent text, English allowed): the stage, the "open Spell Quest" placement
// control, drawing, the shopping range and the money table, the per-screen, letter and vowel tables, the top mix-ups,
// the first duel's history and the flight speed. The frame has the close, boy or girl, sound, reset and developer tools.
import { useSpellQuestStore, type SpellQuestSettings } from '../store'
import { spellQuestTelemetry } from '../telemetry'
import { setNumberRange, useNumberRange } from '../../shared/numberRange'
import { ITEMS } from '../logic/content'
import type { SectionProps } from '../../parent/types'
import { TowerHistory } from './TowerHistory'

const STAGE_NAME = ['', 'letters', 'plain syllables', 'the dot changes the sound', 'words on doors']
const name = (id: string) => ITEMS.find((i) => i.id === id)?.glyph ?? id

export default function SpellQuestSettings({ goTo }: SectionProps) {
  const s = useSpellQuestStore()
  const range = useNumberRange()
  const setSettings = (p: Partial<SpellQuestSettings>) => { s.setSettings(p); spellQuestTelemetry.track('settings', { keys: Object.keys(p), ...p }) }
  const rows = (prefix: string) => Object.entries(s.tallies).filter(([k]) => k.startsWith(prefix))
    .map(([k, t]) => ({ k: k.slice(prefix.length), seen: t.seen ?? 0, wrong: t.wrong ?? 0 }))
    .filter((r) => prefix !== 'l:' || ITEMS.some((i) => i.id === r.k))
    .sort((a, b) => b.wrong / Math.max(1, b.seen) - a.wrong / Math.max(1, a.seen))
  const conf = (c: Record<string, Record<string, number>>) => Object.entries(c)
    .flatMap(([a, row]) => Object.entries(row).map(([b, n]) => ({ a, b, n }))).sort((x, y) => y.n - x.n).slice(0, 10)
  const table = (r: { k: string; seen: number; wrong: number }[], label: (k: string) => string) => (
    <div className="pa-wide"><table style={{ borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ textAlign: 'left' }}>Item</th><th>Seen</th><th>Wrong / near</th></tr></thead>
      <tbody>{r.map((x) => <tr key={x.k}><td>{label(x.k)}</td><td>{x.seen}</td><td>{x.wrong}</td></tr>)}</tbody>
    </table></div>
  )
  return (
    <div data-book2-settings>
      <p data-stage-line>{s.screensOpen === false ? 'Stage 0: the tower (the first duel) alone; Book 2’s minigames open when its marks are mastered.' : <>Stage {s.stage.stage}: {STAGE_NAME[s.stage.stage]}.</>} Runs: {s.runs}. Best run: {s.bestRun} right answers. Crystals: {s.crystals}. Flight bosses beaten: {(s.bossesBeaten ?? []).join(', ') || 'none yet'}.</p>
      {s.screensOpen === false && (
        <p data-open-book>
          <label>
            <input type="checkbox" data-setting-open-book checked={false}
              onChange={() => { s.markScreensOpen(); spellQuestTelemetry.track('book-open', { by: 'parent', stars: s.totalStars }) }} /> Already knows
            nikkud: open Book 2 (its minigames join the tower in the run)
          </label>
        </p>
      )}
      <h3>Drawing letters</h3>
      <p>
        Two drawing screens, after the doors: one in print, one in handwriting. They teach stroke order. Drawing is on by
        default; the stroke review shows which letters you checked (<span data-stroke-count>{Object.keys(s.strokeMarks ?? {}).length}</span> of 54 checked).
      </p>
      <p>
        <label><input type="checkbox" data-setting-drawing checked={!!s.settings.drawing} onChange={(e) => setSettings({ drawing: e.target.checked })} /> Drawing screens in the game</label>{' '}
        <button type="button" data-goto-dev onClick={() => goTo('developer')}>Stroke review and test board (Developer)</button>
      </p>
      <h3>Number range for shopping</h3>
      <p>
        At the merchant he pays the exact price of a potion (a heart) from his coins. The range sets the coin values and
        the highest price: up to 10 (coins 1, 2, 5, 10), up to 100 (also 20, 50), up to 1000 (also 100, 200, 500).
      </p>
      <p>
        {([10, 100, 1000] as const).map((r) => (
          <label key={r} style={{ marginRight: 14 }}>
            <input type="radio" name="d2-range" data-range={r} checked={range === r} onChange={() => { setNumberRange(r); setSettings({ range: r }) }} /> Up to {r}
          </label>
        ))}
      </p>
      <h3>Money</h3>
      <div className="pa-wide"><table data-money style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td>Merchant visits</td><td data-money-visits>{s.merchant?.visits ?? 0}</td></tr>
          <tr><td>Potions bought</td><td data-money-purchases>{s.merchant?.purchases ?? 0}</td></tr>
          <tr><td>Declined (✗)</td><td data-money-declines>{s.merchant?.declines ?? 0}</td></tr>
          <tr><td>Tries that were not enough</td><td data-money-short>{s.merchant?.short ?? 0}</td></tr>
          <tr><td>Tries that were too much</td><td data-money-over>{s.merchant?.over ?? 0}</td></tr>
          <tr><td>Hints</td><td data-money-hints>{s.merchant?.hints ?? 0}</td></tr>
          <tr><td>Coin level (0: one or two coins make the price; 1: three or more; 2: and a coin that is too big)</td><td data-money-level>{s.merchant?.level ?? 0}</td></tr>
        </tbody>
      </table></div>
      <h3>By screen</h3>
      {table(rows('sc:'), (k) => k)}
      <h3>By letter (hardest first)</h3>
      {table(rows('l:'), name)}
      <h3>By vowel</h3>
      {table(rows('v:'), (k) => k)}
      <h3>Top mix-ups (asked → tapped)</h3>
      <ul>{conf(s.confusions.letters).map((x) => <li key={`l${x.a}${x.b}`}>{name(x.a)} → {name(x.b)}: {x.n}</li>)}</ul>
      <ul>{conf(s.confusions.vowels).map((x) => <li key={`v${x.a}${x.b}`}>vowel {x.a} → {x.b}: {x.n}</li>)}</ul>
      <TowerHistory goTo={goTo} />
      <h3>Flight speed</h3>
      <p>
        The broom flight adapts to him and is saved on this device only: <span data-pace>{s.pace.toFixed(2)}</span>× the normal
        flight time (0.85 = fastest, 1.6 = slowest): a catch makes it 1% faster, a mistake 4% slower.{' '}
        <button type="button" onClick={() => s.setPace(1)}>Reset flight speed</button>
      </p>
      <h3>Telemetry</h3>
      <p>
        Export or clear Book 2’s event log (the tower’s events are in it) in{' '}
        <button type="button" data-goto-data onClick={() => goTo('data')}>Data</button>.
      </p>
    </div>
  )
}
