// Duel audio: Howler on Web Audio (html5 off — per-monster playback rates need it).
// Every spoken line ducks the music; anything missing, failing or silent resolves via a safety timeout
// so the game can never stall waiting for audio.
import { Howl, Howler } from 'howler'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS } from '../../assets/duel/audioFiles'

export type SfxName = 'arrival' | 'cast' | 'boom' | 'ouch' | 'mega' | 'sparkle'
export type MusicTrack = 'calm' | 'mid' | 'fast' | 'boss' | 'victory'

const MUSIC_VOL = 0.35
const DUCK_VOL = 0.1
const LINE_TIMEOUT_MS = 5000
const SFX_TIMEOUT_MS = 3000

let cfg = { sfx: true, music: true, volume: 0.8 }
const howls = new Map<string, Howl>()

function howl(src: string, loop = false): Howl {
  let h = howls.get(src)
  if (!h) {
    h = new Howl({ src: [src], loop, preload: true, html5: false })
    howls.set(src, h)
  }
  return h
}

export function configureDuelAudio(o: { sfx: boolean; music: boolean; volume: number }) {
  cfg = o
  Howler.volume(o.volume)
  if (!o.music) stopMusic()
}

/** Call inside the ▶ tap: resumes the AudioContext (autoplay policies). */
export function unlockDuelAudio() {
  const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

export function preloadDuelAudio() {
  Object.values(SFX_URLS).forEach((u) => howl(u))
  Object.values(VOICE_URLS).forEach((u) => howl(u))
}

/** Play once; resolve on end, stop or error, or after `timeout`. */
function playOnce(h: Howl, rate: number, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    const id = h.play()
    h.rate(rate, id)
    h.once('end', finish, id)
    h.once('stop', finish, id)
    h.once('playerror', finish, id)
    h.once('loaderror', finish)
    window.setTimeout(finish, timeout)
  })
}

const VARIANTS: Record<SfxName, string[]> = {
  arrival: [SFX_URLS.arrival1, SFX_URLS.arrival2, SFX_URLS.arrival3],
  cast: [SFX_URLS.cast],
  boom: [SFX_URLS.boom1, SFX_URLS.boom2],
  ouch: [SFX_URLS.ouch],
  mega: [SFX_URLS.mega],
  sparkle: [SFX_URLS.sparkle],
}

/** Plays a sound effect (arrival and boom rotate between variants); resolves when it ends. */
export function playSfx(name: SfxName, power = 1): Promise<void> {
  if (!cfg.sfx) return Promise.resolve()
  const vs = VARIANTS[name]
  const h = howl(vs[Math.floor(Math.random() * vs.length)])
  h.volume(name === 'boom' ? Math.min(1, 0.6 + 0.3 * power) : 0.8)
  return playOnce(h, 1, SFX_TIMEOUT_MS)
}

/** Plays a voice line at a rate clamped to 0.7–1.3 (lines are verified at rate 1); music ducks meanwhile. */
export function playLine(id: string, rate = 1): Promise<void> {
  const url = VOICE_URLS[id]
  if (!url) return Promise.resolve()
  duck(true)
  const r = Math.min(1.3, Math.max(0.7, rate))
  return playOnce(howl(url), r, LINE_TIMEOUT_MS).finally(() => duck(false))
}

export function stopAllLines() {
  Object.values(VOICE_URLS).forEach((u) => howls.get(u)?.stop())
}

// ---- music ----
let current: Howl | null = null
let ducks = 0
let bossToggle = false

export const trackForWave = (wave: number, boss: boolean): MusicTrack => (boss ? 'boss' : wave <= 2 ? 'calm' : wave <= 5 ? 'mid' : 'fast')

export function playMusic(track: MusicTrack) {
  if (!cfg.music) return
  let url: string
  if (track === 'boss') {
    bossToggle = !bossToggle
    url = bossToggle ? MUSIC_URLS.boss1 : MUSIC_URLS.boss2
  } else url = MUSIC_URLS[track]
  const next = howl(url, track !== 'victory')
  if (current === next && next.playing()) return
  stopMusic()
  current = next
  next.volume(0)
  next.play()
  next.fade(0, ducks > 0 ? DUCK_VOL : MUSIC_VOL, 800)
}

export function stopMusic() {
  if (!current) return
  const h = current
  current = null
  h.fade(h.volume(), 0, 300)
  window.setTimeout(() => h.stop(), 320)
}

function duck(on: boolean) {
  ducks = Math.max(0, ducks + (on ? 1 : -1))
  if (current?.playing()) current.fade(current.volume(), ducks > 0 ? DUCK_VOL : MUSIC_VOL, 200)
}

export function muteDuelAudio(on: boolean) {
  Howler.mute(on)
}
