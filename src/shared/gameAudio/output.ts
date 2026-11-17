// The device's audio output, one for every game on the page (Howler's mute and volume are global): the player in use,
// the device's sound setting (src/shared/deviceSettings.ts), the mute while the page is hidden (src/shared/shell/usePageHidden.ts),
// the pause cover's hold.
import { useEffect } from 'react'
import { useDeviceSettings } from '../deviceSettings'
import { howlerPlayer } from './howlerPlayer'
import type { AudioPlayer } from './port'

let player: AudioPlayer = howlerPlayer
/** the player every kit plays through now */
export const audioPlayer = (): AudioPlayer => player
/** Test seam (fakePlayer.ts `installFakeAudio`): play through another player; null restores Howler. */
export function setAudioPlayer(p: AudioPlayer | null) {
  player = p ?? howlerPlayer
}

let sound = { sfx: true, music: true, volume: 0.8 }
export const effectsOn = () => sound.sfx
export const musicOn = () => sound.music
const musicStops = new Set<() => void>()
/** a kit's stopMusic: called when the device turns music off */
export function onMusicOff(stop: () => void) {
  musicStops.add(stop)
}
/** The device's sound setting: the volume of everything, effects on or off, music on or off (off stops what plays). */
export function applySound(o: { sfx: boolean; music: boolean; volume: number }) {
  sound = { sfx: o.sfx, music: o.music, volume: o.volume }
  player.setVolume(o.volume)
  if (!o.music) musicStops.forEach((stop) => stop())
}

let hidden = false
let held = false
const applyMute = () => player.setMute(hidden || held)
/** The page was hidden (another app, the tablet locked) or shown again. */
export function setHidden(on: boolean) {
  hidden = on
  applyMute()
}
/** The pause cover keeps the audio silent after the page shows again, until play is tapped. */
export function holdAudio(on: boolean) {
  held = on
  applyMute()
}
/** Call inside a user tap: resumes the audio (autoplay policies). */
export const unlockAudioOutput = () => player.unlock()

/** A game's root (the shell, src/shared/shell/GameShell.tsx): follows the device's sound setting. */
export function useAudioOutput() {
  const s = useDeviceSettings()
  useEffect(() => applySound(s), [s])
}
