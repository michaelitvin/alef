// Space Cat's section in the parent area (src/parent; parent text, English allowed), in the spec's order: where he is on
// the ladder, the sums he finds hard, the highest level and the switches, find his level again, the time for one sum, music during
// flight, the game's sounds, and the way to the Data section. Each change is tracked as `settings` by the parent.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useDeviceSettings } from '../../shared/deviceSettings'
import { readLog } from '../../shared/telemetryChunks'
import type { SectionProps } from '../../parent/types'
import { playSfx, startTune, stopTune } from '../audio/spaceCatAudio'
import { SFX_NAMES, type SfxName } from '../audio/sfx'
import { itemById } from '../logic/facts'
import { statusText } from '../logic/ladder/index'
import { RUNGS, rungDef } from '../logic/rungs'
import { predictItem, priorOf, type ItemStats } from '../logic/predict'
import { speedOfBand, type FixedArrival } from '../logic/speed'
import type { Settings as SettingsT } from '../saveFormat'
import { useSpaceCatStore } from '../store'
import { SPACECAT_LOG } from '../telemetryLog'
import { BAND_TEXT, RUNG_TEXT, STRANDS, STRAND_TITLE, changeText, rungStatus, rungsOfStrand, whereHeIs, workingOn } from './ladderText'
import { recentChanges } from './recentChanges'
import { rungTallies, shareText } from './rungs'
import { sumText } from './sumText'

const SFX_LABEL: Record<SfxName, string> = {
  'new-sum': 'new sum', right: 'right', 'right-zoom': 'right with a zoom', wrong: 'wrong', timeout: 'time-out', heart: 'heart lost',
  level: 'level done', ship: 'new ship', end: 'end of run',
}
const HARD_ROWS = 20
const RECENT_ROWS = 20

/** an example with signs: left to right inside a right-to-left page, so that < and > do not mirror */
const Ltr = ({ children }: { children: string }) => <bdi dir="ltr">{children}</bdi>
const L = (t: string) => <Ltr>{t}</Ltr>

type SwitchKey = 'compare' | 'jumps' | 'times' | 'divide' | 'missing100' | 'hundreds'
const SWITCHES: { key: SwitchKey; label: string; hebrew: string; explain: ReactNode }[] = [
  { key: 'compare', label: 'Compare two numbers', hebrew: 'השוואת מספרים', explain: <>Rounds like {L('7 ◌ 5')}: three planets with {L('<')}, {L('=')} and {L('>')}, and he flies to the sign that fits. First numbers to 20, later to 100.</> },
  { key: 'jumps', label: 'Counting in jumps', hebrew: 'ספירה בקפיצות', explain: <>Rounds with a row of numbers that grow by the same jump, like {L('5, 10, 15')}, and he flies to the next number. First jumps of 2, 5 and 10, later 3 and 4. It comes before times.</> },
  { key: 'times', label: 'Times (×)', hebrew: 'כפל', explain: <>From {L('3 + 3 + 3')} to the tables up to {L('10 × 10')}. The first times rounds show the sum as equal groups of dots.</> },
  { key: 'divide', label: 'Divide (÷)', hebrew: 'חילוק', explain: <>First {L('3 × ◌ = 12')}, then {L('12 ÷ 3 = ◌')}, only from times tables he already knows.</> },
  { key: 'missing100', label: 'Missing number above 20', hebrew: 'מספר חסר מעל 20', explain: <>Sums to 100 with the empty ring in the place of a number, like {L('37 + ◌ = 50')}. Off: the ring moves only in sums to 20.</> },
  { key: 'hundreds', label: 'Hundreds in the head', hebrew: 'מאות בעל פה', explain: <>Sums with 3-digit numbers that need no carrying, like {L('240 + 30')} or {L('500 − 200')}.</> },
]

const median = (xs: number[] | undefined) => {
  if (!xs) return null
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const topPick = (picks: Record<string, number> | undefined) => Object.entries(picks ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
const right = (s: ItemStats) => s.seen - s.wrong - s.timeout

export default function SpaceCatSettings({ goTo, track }: SectionProps) {
  const s = useSpaceCatStore()
  const device = useDeviceSettings()
  const [tune, setTune] = useState(false)
  useEffect(() => () => stopTune(), [])
  const set = (p: Partial<SettingsT>) => {
    s.setSettings(p)
    track?.('settings', { ...p, by: 'parent' })
  }
  const items = Object.entries(s.items).map(([id, st]) => ({ id, st, it: itemById(id) })).filter((x) => x.it)
  const tallies = rungTallies(s.items)
  const hard = items
    .map((x) => ({ ...x, p: predictItem(x.st, priorOf(x.it!)) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, HARD_ROWS)
  const where = whereHeIs(s.ladder, s.settings)
  // decoding the log is slow: read it again only when the ladder or the run count changed
  const recent = useMemo(() => recentChanges(readLog(SPACECAT_LOG.key), RECENT_ROWS), [s.ladder, s.runs])
  const band = where.frontier ? rungDef(where.frontier).band : 'small'
  const findAgain = () => {
    if (!window.confirm('Find his level again? Every rung goes back to "not yet" and the game checks him from the start. His points, ships and hard sums stay.')) return
    s.findLevelAgain()
    track?.('settings', { relevel: true, by: 'parent' })
  }

  return (
    <div data-spacecat-settings>
      <h3>Where he is</h3>
      <p data-where>
        Working on: <b>{workingOn(where)}</b>
        {!where.placing && where.frontier && <> (<Ltr>{RUNG_TEXT[where.frontier].example}</Ltr>)</>}. Passed {where.passed} of {RUNGS.length} rungs. {where.held} held.
      </p>
      <div className="pa-wide"><table data-rungs style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Rung</th><th align="left">Example</th><th>Status</th><th>Right</th></tr></thead>
        {STRANDS.map((strand) => (
          <tbody key={strand} data-strand={strand}>
            <tr><th colSpan={4} align="left">{STRAND_TITLE[strand]}</th></tr>
            {rungsOfStrand(strand).map((id) => (
              <tr key={id} data-rung={id} data-status={statusText(s.ladder, id, s.settings)}>
                <td>{RUNG_TEXT[id].name}</td><td style={{ whiteSpace: 'nowrap' }}><Ltr>{RUNG_TEXT[id].example}</Ltr></td>
                <td align="center">{rungStatus(s.ladder, id, s.settings)}</td><td align="center">{shareText(tallies.get(id))}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table></div>

      <h3>Recent changes</h3>
      {recent.length ? (
        <ul data-recent>
          {recent.map((h, i) => <li key={`${h.t}-${i}`}>{new Date(h.t).toLocaleDateString('en-CA')}: {changeText(h)}</li>)}
        </ul>
      ) : <p>No changes yet.</p>}

      <h3>Sums he finds hard</h3>
      <div className="pa-wide"><table data-hard style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Sum</th><th>Right / seen</th><th>Time-outs</th><th>Usual time</th><th>Most frequent wrong pick</th></tr></thead>
        <tbody>
          {hard.map(({ id, st }) => {
            const m = median(st.times)
            return (
              <tr key={id} data-item={id}>
                <td>{sumText(id)}</td><td align="center">{right(st)} / {st.seen}</td><td align="center">{st.timeout}</td>
                <td align="center">{m === null ? '—' : `${(m / 1000).toFixed(1)} s`}</td><td align="center">{topPick(st.picks)}</td>
              </tr>
            )
          })}
        </tbody>
      </table></div>
      {!hard.length && <p>No sums played yet.</p>}

      <h3>Settings</h3>
      <label style={{ display: 'block' }}>
        Highest level (הרמה הגבוהה ביותר){' '}
        <select aria-label="range" style={{ maxWidth: '100%' }} value={s.settings.range} onChange={(e) => set({ range: e.target.value as SettingsT['range'] })}>
          <option value="auto">automatic</option>
          {STRANDS.map((strand) => (
            <optgroup key={strand} label={STRAND_TITLE[strand]}>
              {rungsOfStrand(strand).map((id) => <option key={id} value={id}>up to: {RUNG_TEXT[id].name} ({RUNG_TEXT[id].example})</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <p data-explain="range">
        Automatic: the game finds his level and moves him up and down by itself. Or choose the highest kind of sum he may get; nothing above it comes.
      </p>
      {SWITCHES.map((w) => (
        <div key={w.key} data-switch={w.key}>
          <label style={{ display: 'block' }}>
            <input type="checkbox" aria-label={w.key} checked={s.settings[w.key]} onChange={(e) => set({ [w.key]: e.target.checked })} /> {w.label} ({w.hebrew})
          </label>
          <p data-explain={w.key}>{w.explain}</p>
        </div>
      ))}
      <div data-relevel-box>
        <button type="button" data-relevel onClick={findAgain}>Find his level again (למצוא שוב את הרמה)</button>
        <p data-explain="relevel">
          His next run starts with the short check of the first run again, and the game finds his level from the start. His points, ships and the sums he found hard stay.
        </p>
      </div>

      <h3>Time for one sum</h3>
      <div data-arrival>
        <label style={{ display: 'block' }}>
          <input type="radio" name="sc-arrival" aria-label="automatic time" checked={s.settings.arrival === 'auto'} onChange={() => set({ arrival: 'auto' })} />{' '}
          Automatic (now <span data-arrival-auto>{(speedOfBand(s.speed, band).arrivalMs / 1000).toFixed(1)} s</span> for {BAND_TEXT[band]})
        </label>
        {([8000, 5000, 4000] as FixedArrival[]).map((ms) => (
          <label key={ms} style={{ display: 'block' }}>
            <input type="radio" name="sc-arrival" aria-label={`${ms / 1000} s`} checked={s.settings.arrival === ms} onChange={() => set({ arrival: ms })} /> {ms / 1000} s
          </label>
        ))}
      </div>

      <h3>Music during flight</h3>
      <label style={{ display: 'block' }}>
        <input type="checkbox" aria-label="music during flight" checked={s.settings.flightMusic} onChange={(e) => set({ flightMusic: e.target.checked })} /> Play the tune during flight too
      </label>
      <p data-flight-music-note>
        This plays only while music is on for this device (Sound section). With the device&apos;s music off, no tune plays anywhere, and this switch changes nothing.
        {!device.music && <b> Music is off on this device now.</b>}
      </p>

      <h3>The game&apos;s sounds</h3>
      {!device.sfx && <p data-sfx-off>Effects are off on this device (Sound section): these buttons play nothing.</p>}
      <div data-sounds style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SFX_NAMES.map((n) => (
          <button type="button" key={n} data-sfx={n} onClick={() => { void playSfx(n) }}>
            {SFX_LABEL[n]}{device.sfx ? '' : ' (effects off)'}
          </button>
        ))}
        <button type="button" data-sfx="tune" onClick={() => { if (tune) { stopTune(); setTune(false) } else if (device.music) { startTune(); setTune(true) } }}>
          {tune ? 'stop the tune' : 'the tune'}{device.music ? '' : ' (music off)'}
        </button>
      </div>

      <h3>Telemetry</h3>
      <p>
        Export or clear Space Cat&apos;s event log in{' '}
        <button type="button" data-goto-data onClick={() => goTo('data')}>Data</button>.
      </p>
    </div>
  )
}
