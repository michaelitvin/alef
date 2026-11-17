// The area's Sound section: the device's one sound setting for every game (effects, music, volume).
import { setDeviceSettings, useDeviceSettings, type DeviceSettings } from '../../shared/deviceSettings'
import type { Track } from '../types'

export function SoundSection({ track }: { track?: Track }) {
  const sound = useDeviceSettings()
  const set = (p: Partial<Omit<DeviceSettings, 'v'>>) => { setDeviceSettings(p); track?.('settings', { keys: Object.keys(p), ...p }) }
  return (
    <div data-sound>
      <label style={{ display: 'block' }}><input type="checkbox" data-sound-sfx checked={sound.sfx} onChange={(e) => set({ sfx: e.target.checked })} /> Effects</label>
      <label style={{ display: 'block' }}><input type="checkbox" data-sound-music checked={sound.music} onChange={(e) => set({ music: e.target.checked })} /> Music</label>
      <label style={{ display: 'block' }}>Volume <input type="range" data-sound-volume min={0} max={1} step={0.05} value={sound.volume} onChange={(e) => set({ volume: Number(e.target.value) })} /></label>
    </div>
  )
}
