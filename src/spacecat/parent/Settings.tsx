// Space Cat's section in the parent area (src/parent; parent text, English allowed), in the spec's order: where he is on
// the ladder, the sums he finds hard, the range and the times and divide switches, the time for one sum, music during
// flight, the game's sounds, and the way to the Data section. Each change is tracked as `settings` by the parent.
import { useEffect, useState } from 'react'
import { useDeviceSettings } from '../../shared/deviceSettings'
import type { SectionProps } from '../../parent/types'
import { playSfx, startTune, stopTune } from '../audio/spaceCatAudio'
import { SFX_NAMES, type SfxName } from '../audio/sfx'
import { RUNGS, itemById, type RungId } from '../logic/facts'
import { openRungs } from '../logic/ladder'
import { predictItem, priorOf, type ItemStats } from '../logic/predict'
import type { FixedArrival } from '../logic/speed'
import type { Settings as SettingsT } from '../saveFormat'
import { useSpaceCatStore } from '../store'
import { RUNG_NAME, rungTallies, shareText } from './rungs'
import { sumText } from './sumText'

const SFX_LABEL: Record<SfxName, string> = {
  'new-sum': 'new sum', right: 'right', 'right-zoom': 'right with a zoom', wrong: 'wrong', timeout: 'time-out', heart: 'heart lost',
  level: 'level done', ship: 'new ship', end: 'end of run',
}
const HARD_ROWS = 20

const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const topPick = (picks: Record<string, number>) => Object.entries(picks).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
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
  const open = openRungs(s.ladder, s.settings)
  const items = Object.entries(s.items).map(([id, st]) => ({ id, st, it: itemById(id) })).filter((x) => x.it)
  const tallies = rungTallies(s.items)
  const hard = items
    .map((x) => ({ ...x, p: predictItem(x.st, priorOf(x.it!)) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, HARD_ROWS)
  const status = (r: (typeof RUNGS)[number]) => {
    if (r.needs && !s.settings[r.needs]) return 'switched off'
    return open.includes(r.id) ? 'open' : 'closed'
  }

  return (
    <div data-spacecat-settings>
      <h3>Where he is</h3>
      <div className="pa-wide"><table data-rungs style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Rung</th><th>Status</th><th>Right</th></tr></thead>
        <tbody>
          {RUNGS.map((r) => {
            return (
              <tr key={r.id} data-rung={r.id} data-status={status(r)}>
                <td>{r.id}. {RUNG_NAME[r.id]}</td><td align="center">{status(r)}</td>
                <td align="center">{shareText(tallies.get(r.id))}</td>
              </tr>
            )
          })}
        </tbody>
      </table></div>

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

      <h3>Range</h3>
      <label style={{ display: 'block' }}>
        Highest rung{' '}
        <select aria-label="range" value={String(s.settings.range)} onChange={(e) => set({ range: e.target.value === 'auto' ? 'auto' : (Number(e.target.value) as RungId) })}>
          <option value="auto">automatic (the game opens rungs as he is ready)</option>
          {RUNGS.map((r) => <option key={r.id} value={r.id}>up to rung {r.id}</option>)}
        </select>
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" aria-label="times" checked={s.settings.times} onChange={(e) => set({ times: e.target.checked })} /> Times (rungs 7 and 8)
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" aria-label="divide" checked={s.settings.divide} onChange={(e) => set({ divide: e.target.checked })} /> Divide (rung 9)
      </label>

      <h3>Time for one sum</h3>
      <div data-arrival>
        <label style={{ display: 'block' }}>
          <input type="radio" name="sc-arrival" aria-label="automatic time" checked={s.settings.arrival === 'auto'} onChange={() => set({ arrival: 'auto' })} />{' '}
          Automatic (now <span data-arrival-auto>{(s.speed.arrivalMs / 1000).toFixed(1)} s</span>)
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
