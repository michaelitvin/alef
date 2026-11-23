// The English path's section in the parent area (parent text, English allowed): the path on or off, the drawing on or
// off, and the number range for shopping (one setting for both paths, src/shared/numberRange.ts).
import { setNumberRange, useNumberRange } from '../../../shared/numberRange'
import type { SectionProps } from '../../../parent/types'
import { englishSavePort } from '../savePort'
import { useEnglishStore } from '../store'
import { englishTelemetry } from '../telemetry'
import type { EnglishSettings } from '../saveFormat'
import OffScreenCheck from './OffScreenCheck'
import Level from './Level'
import Units from './Units'
import Words from './Words'

export default function EnglishSettingsSection({ goTo }: SectionProps) {
  const settings = useEnglishStore((s) => s.settings) as EnglishSettings
  const range = useNumberRange()
  const set = (p: Partial<EnglishSettings>) => { englishSavePort().setSettings(p); englishTelemetry.track('settings', { keys: Object.keys(p), ...p }) }
  return (
    <div data-english-settings>
      <h3>The English path</h3>
      <p>
        <label><input type="checkbox" data-setting-path checked={settings.path !== false} onChange={(e) => set({ path: e.target.checked })} /> The English path on the home screen</label>
      </p>
      <p>
        <label><input type="checkbox" data-setting-drawing checked={!!settings.drawing} onChange={(e) => set({ drawing: e.target.checked })} /> Drawing screens in the game</label>
      </p>
      <h3>Number range for shopping</h3>
      <p>
        At the merchant he pays the exact price of a potion from his coins. The range sets the coin values and the highest
        price. It is one setting: Spell Quest uses the same range.
      </p>
      <p>
        {([10, 100, 1000] as const).map((r) => (
          <label key={r} style={{ marginRight: 14 }}>
            <input type="radio" name="en-range" data-range={r} checked={range === r}
              onChange={() => { setNumberRange(r); englishTelemetry.track('range-set', { range: r }) }} /> Up to {r}
          </label>
        ))}
      </p>
      <Level />
      <Units />
      <Words />
      <OffScreenCheck />
      <h3>Telemetry</h3>
      <p>
        Export or clear the English path’s event log in{' '}
        <button type="button" data-goto-data onClick={() => goTo('data')}>Data</button>.
      </p>
    </div>
  )
}
