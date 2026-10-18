// Clock audio: voice on html5 audio at VOICE_RATE (pitch kept) with a callback per caption word, timed from the playback
// position; effects and calm music on Web Audio. Music ducks under every voice line. Missing files resolve at once (never stall).
import { Howler } from 'howler'
import { VOICE_RATE, getHowl, peekHowl, playOnce, unlockAudio } from '../../shared/audioCore'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS, VOICE_WORDS } from '../assets/audioFiles'
import type { ClockSfx } from '../logic/workday'
import { captionTimes, followPlayback } from './wordTiming'

const MUSIC_VOL = 0.3
const DUCK_VOL = 0.08
const LINE_TIMEOUT_MS = 12000
const SFX_TIMEOUT_MS = 4000
/** Word spacing assumed when a line has no timings yet (s). */
export const WORD_ESTIMATE_S = 0.45

let cfg = { sfx: true, music: true, volume: 0.8 }
export function configureClockAudio(o: { sfx: boolean; music: boolean; volume: number }) {
  cfg = o
  Howler.volume(o.volume)
  if (!o.music) stopMusic()
}
export const unlockClockAudio = unlockAudio
export const muteClockAudio = (on: boolean) => Howler.mute(on)

// Rule: switching apps pauses the game and silences it. All clock audio is muted while the page is hidden, and stays
// muted while the pause cover holds it, until he taps play.
let hidden = false
let held = false
const applyMute = () => Howler.mute(hidden || held)
/** The page was hidden (another app, the tablet locked) or shown again. */
export function setClockHidden(on: boolean) {
  hidden = on
  applyMute()
}
/** The pause cover keeps the audio silent after the page is shown again, until play is tapped. */
export function holdClockAudio(on: boolean) {
  held = on
  applyMute()
}

export function preloadVoices(ids: string[]) {
  for (const id of ids) if (VOICE_URLS[id]) getHowl(VOICE_URLS[id], false, true)
}

/**
 * The start time (s, media time) of each caption word of a voice line: the voice's word timings mapped onto the caption
 * words. When the line has no timings, or they cannot be mapped, the words are spread at an estimated pace.
 */
export function captionTimesFor(id: string, caption: string[]): number[] {
  const spoken = VOICE_WORDS[id]
  const mapped = spoken ? captionTimes(caption, spoken) : null
  if (mapped) return mapped
  if (spoken && spoken.t.length) {
    const last = spoken.t[spoken.t.length - 1] + WORD_ESTIMATE_S
    return caption.map((_, i) => (i * last) / caption.length)
  }
  return caption.map((_, i) => i * WORD_ESTIMATE_S)
}

/**
 * Plays a voice line; `onWord(i)` fires as caption word i is spoken. The highlight follows the audio's real playback
 * position (rule), so load latency and the speech rate cannot put it out of step. Every word fires by the end, even if
 * the file is missing.
 */
export function playVoice(id: string, caption: string[] = [], onWord?: (i: number) => void): Promise<void> {
  const times = captionTimesFor(id, caption)
  const report = (i: number) => onWord?.(i)
  const url = VOICE_URLS[id]
  if (!url) {
    // no file yet: walk the caption at the estimated pace so the child still sees it read
    return new Promise((resolve) => {
      let i = 0
      const step = () => {
        if (i < times.length) report(i++)
        if (i < times.length) window.setTimeout(step, ((times[i] - times[i - 1]) / VOICE_RATE) * 1000)
        else window.setTimeout(resolve, 300)
      }
      if (times.length) window.setTimeout(step, (times[0] / VOICE_RATE) * 1000)
      else resolve()
    })
  }
  duck(true)
  const h = getHowl(url, false, true)
  let follower: ReturnType<typeof followPlayback> | null = null
  return playOnce(h, VOICE_RATE, LINE_TIMEOUT_MS, (sound) => {
    follower = followPlayback(times, () => (h.playing(sound) ? (h.seek(sound) as number) : null), report)
  }).finally(() => {
    follower?.finish()
    duck(false)
  })
}

export function stopVoices() {
  Object.values(VOICE_URLS).forEach((u) => peekHowl(u)?.stop())
}

const lastSfx: Record<string, number> = {}
/** Plays an effect; approved takes rotate. */
export function playSfx(name: ClockSfx): Promise<void> {
  const takes = SFX_URLS[name]
  if (!cfg.sfx || !takes?.length) return Promise.resolve()
  const i = ((lastSfx[name] ?? -1) + 1) % takes.length
  lastSfx[name] = i
  const h = getHowl(takes[i])
  h.volume(0.8)
  return playOnce(h, 1, SFX_TIMEOUT_MS)
}

let music: ReturnType<typeof getHowl> | null = null
let ducks = 0
/**
 * Starts the calm music (the parent: no music while customers and questions are on; it plays only on the door, in the
 * bonus game and on the day summary). Each workday moves to the next track. Already playing that track: nothing changes.
 */
export function startMusic(day: number) {
  if (!cfg.music || MUSIC_URLS.length === 0) return
  const h = getHowl(MUSIC_URLS[day % MUSIC_URLS.length], true)
  if (music === h) return
  stopMusic()
  music = h
  // while the file loads, Howler queues every call and a stop can land behind the play; wait for the load instead
  if (h.state() !== 'loaded') h.once('load', () => { if (music === h) fadeIn(h) })
  else fadeIn(h)
}
function fadeIn(h: ReturnType<typeof getHowl>) {
  if (!h.playing()) {
    h.volume(0)
    h.play()
  }
  h.fade(h.volume(), ducks > 0 ? DUCK_VOL : MUSIC_VOL, 800)
}
/** Fades the music out. */
export function stopMusic() {
  if (!music) return
  const h = music
  music = null
  if (!h.playing()) return
  h.fade(h.volume(), 0, 300)
  window.setTimeout(() => { if (music !== h) h.stop() }, 320)
}
/** The music is on (for tests and checks). */
export const musicPlaying = () => music !== null
function duck(on: boolean) {
  ducks = Math.max(0, ducks + (on ? 1 : -1))
  if (music?.playing()) music.fade(music.volume(), ducks > 0 ? DUCK_VOL : MUSIC_VOL, 200)
}
