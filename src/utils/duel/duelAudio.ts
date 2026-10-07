// Duel audio: effects and music on Web Audio; speech on html5 audio, whose playbackRate keeps the pitch,
// so lines can play faster without sounding like chipmunks. Every spoken line ducks the music; dramatic
// lines pause it outright. Anything missing, failing or silent resolves via a safety timeout so the game
// can never stall waiting for audio.
import { Howl, Howler } from 'howler'
import { MUSIC_SETS, SFX_URLS, VOICE_URLS } from '../../assets/duel/audioFiles'
import { LINE_CUES, type LineCue } from '../../assets/duel/lineCues'

export type SfxName = 'arrival' | 'cast' | 'boom' | 'ouch' | 'mega' | 'sparkle'
export type MusicTrack = 'calm' | 'mid' | 'fast' | 'boss' | 'victory'

const MUSIC_VOL = 0.35
const DUCK_VOL = 0.1
const LINE_TIMEOUT_MS = 9000 // > longest line (~4.2 s) plus a slow first load
const SFX_TIMEOUT_MS = 3000
/** Playtest: the recorded speech felt slow and made the whole game feel slow. */
export const VOICE_RATE = 1.15
/** Announcements that should land on their own: the background music pauses while they play. */
const DRAMATIC = new Set(['line-mega', 'line-boss', 'line-boss-win', 'line-new-monster', 'line-combo', 'line-record'])

let cfg = { sfx: true, music: true, volume: 0.8 }
const howls = new Map<string, Howl>()

function howl(src: string, loop = false, html5 = false): Howl {
  let h = howls.get(src)
  if (!h) {
    h = new Howl({ src: [src], loop, preload: true, html5 })
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
  Object.values(VOICE_URLS).forEach((u) => howl(u, false, true))
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

/**
 * Plays a voice line at VOICE_RATE; music ducks meanwhile, or pauses for a dramatic line.
 * `onCue` hears each LINE_CUES word as it is spoken; any not yet heard fire when the line ends
 * (early, failed or missing), so what a line promises — "tap the lightning" — always shows up.
 */
export function playLine(id: string, onCue?: (cue: LineCue) => void): Promise<void> {
  const cues = onCue ? (LINE_CUES[id] ?? []) : []
  const fired = new Set<number>()
  const fire = (i: number) => {
    if (fired.has(i)) return
    fired.add(i)
    onCue!(cues[i].cue)
  }
  const fireRest = () => cues.forEach((_, i) => fire(i))
  const url = VOICE_URLS[id]
  if (!url) {
    fireRest()
    return Promise.resolve()
  }
  const dramatic = DRAMATIC.has(id)
  duck(true)
  if (dramatic) hush(true)
  const timers = cues.map((c, i) => window.setTimeout(() => fire(i), (c.at / VOICE_RATE) * 1000))
  return playOnce(howl(url, false, true), VOICE_RATE, LINE_TIMEOUT_MS).finally(() => {
    timers.forEach((t) => window.clearTimeout(t))
    fireRest()
    duck(false)
    if (dramatic) hush(false)
  })
}

export function stopAllLines() {
  Object.values(VOICE_URLS).forEach((u) => howls.get(u)?.stop())
}

// ---- music ----
let current: Howl | null = null
let musicId: number | undefined // the playing sound in `current`, so a resume continues it instead of layering a new one
let ducks = 0
let hushes = 0
/** Which variation each tier played last (they rotate). */
const lastVariation: Partial<Record<MusicTrack, number>> = {}
/** The tier + wave the current track belongs to: a new wave (or a new boss fight) moves to the next variation. */
let currentKey = ''

export const trackForWave = (wave: number, boss: boolean): MusicTrack => (boss ? 'boss' : wave <= 2 ? 'calm' : wave <= 5 ? 'mid' : 'fast')

/** Starts the tier's music for this wave: the same wave keeps its track; a new wave gets the tier's next variation. */
export function playMusic(track: MusicTrack, wave = 0) {
  if (!cfg.music) return
  const key = track === 'victory' ? 'victory' : `${track}:${wave}`
  if (key === currentKey && current) return // same wave or same boss fight: keep the track (even while paused for a line)
  const set = MUSIC_SETS[track]
  const prev = lastVariation[track] ?? Math.floor(Math.random() * set.length) - 1
  const i = (prev + 1) % set.length
  lastVariation[track] = i
  const next = howl(set[i], track !== 'victory')
  stopMusic()
  currentKey = key
  current = next
  musicId = undefined
  next.volume(0)
  if (hushes > 0) return // a dramatic line is speaking: start when it ends
  musicId = next.play()
  next.fade(0, ducks > 0 ? DUCK_VOL : MUSIC_VOL, 800)
}

export function stopMusic() {
  if (!current) return
  const h = current
  current = null
  currentKey = ''
  musicId = undefined
  h.fade(h.volume(), 0, 300)
  window.setTimeout(() => h.stop(), 320)
}

/** Pause the music for a dramatic line (fade out, then pause); resume where it stopped once all have ended. */
function hush(on: boolean) {
  hushes = Math.max(0, hushes + (on ? 1 : -1))
  const h = current
  if (!h) return
  if (on && hushes === 1) {
    h.fade(h.volume(), 0, 150)
    window.setTimeout(() => {
      if (hushes > 0 && current === h && musicId !== undefined) h.pause(musicId)
    }, 160)
  } else if (!on && hushes === 0) {
    if (musicId !== undefined) h.play(musicId)
    else musicId = h.play()
    h.fade(0, ducks > 0 ? DUCK_VOL : MUSIC_VOL, 400)
  }
}

function duck(on: boolean) {
  ducks = Math.max(0, ducks + (on ? 1 : -1))
  if (current?.playing() && hushes === 0) current.fade(current.volume(), ducks > 0 ? DUCK_VOL : MUSIC_VOL, 200)
}

export function muteDuelAudio(on: boolean) {
  Howler.mute(on)
}
