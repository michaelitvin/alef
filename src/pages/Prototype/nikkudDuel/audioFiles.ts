// PROTOTYPE — ElevenLabs audio picked on the review page (/nikkud-duel/review/), played with Howler.
// Picks: arrival 1–3 rotate, cast 3, boom round-2 options 1+3 rotate, ouch round-2 option 4, mega 1, sparkle 1.
import { Howl } from 'howler'
import arrival1 from './audio/arrival-1.mp3'
import arrival2 from './audio/arrival-2.mp3'
import arrival3 from './audio/arrival-3.mp3'
import castUrl from './audio/cast.mp3'
import boom1 from './audio/boom-1.mp3'
import boom2 from './audio/boom-2.mp3'
import ouchUrl from './audio/ouch.mp3'
import megaUrl from './audio/mega.mp3'
import sparkleUrl from './audio/sparkle.mp3'
import musicCalm from './audio/music-calm.mp3'
import musicMid from './audio/music-mid.mp3'
import musicFast from './audio/music-fast.mp3'
import musicBoss1 from './audio/music-boss-1.mp3'
import musicBoss2 from './audio/music-boss-2.mp3'
import musicVictory from './audio/music-victory.mp3'

const sfx = (src: string, volume = 1) => new Howl({ src: [src], volume, preload: true })

const ARRIVALS = [sfx(arrival1, 0.8), sfx(arrival2, 0.8), sfx(arrival3, 0.8)]
const CAST = sfx(castUrl, 0.8)
const BOOMS = [sfx(boom1), sfx(boom2)]
const OUCH = sfx(ouchUrl, 0.8)
const MEGA = sfx(megaUrl)
const SPARKLE = sfx(sparkleUrl, 0.6)

/** Resolves when the arrival sound has finished, so the clue never overlaps it. */
export function playArrival(): Promise<void> {
  const h = ARRIVALS[Math.floor(Math.random() * ARRIVALS.length)]
  return new Promise((resolve) => {
    const id = h.play()
    const done = () => resolve()
    h.once('end', done, id)
    window.setTimeout(done, 2500) // safety net
  })
}
export const playCast = () => CAST.play()
export const playBoom = (power = 1) => {
  const boom = BOOMS[Math.floor(Math.random() * BOOMS.length)]
  const id = boom.play()
  boom.volume(Math.min(1, 0.6 + 0.3 * power), id)
}
export const playOuch = () => OUCH.play()
export const playMega = () => MEGA.play()
export const playSparkle = () => SPARKLE.play()

// ---- music: one looping track at a time, ducked under speech ----
export type Track = 'calm' | 'mid' | 'fast' | 'boss' | 'victory'
const MUSIC_VOL = 0.35
const DUCK_VOL = 0.1
const music = (src: string, loop = true) => new Howl({ src: [src], loop, volume: 0, html5: false, preload: false })
const TRACKS: Record<string, Howl> = {
  calm: music(musicCalm),
  mid: music(musicMid),
  fast: music(musicFast),
  boss1: music(musicBoss1),
  boss2: music(musicBoss2),
  victory: music(musicVictory, false),
}
let current: Howl | null = null
let ducked = false
let enabled = localStorage.getItem('nd-music') !== 'off'
let bossToggle = false

export const musicEnabled = () => enabled
export function setMusicEnabled(on: boolean) {
  enabled = on
  localStorage.setItem('nd-music', on ? 'on' : 'off')
  if (!on) stopMusic()
}

/** Music by game speed: waves 1–2 calm, 3–5 mid, 6+ fast; boss tracks alternate. */
export function trackForWave(wave: number, boss: boolean): Track {
  if (boss) return 'boss'
  return wave <= 2 ? 'calm' : wave <= 5 ? 'mid' : 'fast'
}

export function playMusic(track: Track) {
  if (!enabled) return
  let key: string = track
  if (track === 'boss') {
    bossToggle = !bossToggle
    key = bossToggle ? 'boss1' : 'boss2'
  }
  const next = TRACKS[key]
  if (current === next && next.playing()) return
  stopMusic()
  current = next
  if (next.state() === 'unloaded') next.load()
  next.volume(0)
  next.play()
  next.fade(0, ducked ? DUCK_VOL : MUSIC_VOL, 800)
}

export function stopMusic() {
  if (!current) return
  const h = current
  h.fade(h.volume(), 0, 400)
  window.setTimeout(() => h.stop(), 420)
  current = null
}

export function duck(on: boolean) {
  ducked = on
  if (current?.playing()) current.fade(current.volume(), on ? DUCK_VOL : MUSIC_VOL, 250)
}
