// Book 2 audio: one voice queue (lines and learning sounds never overlap: rule), 0.8 s between parts (rule 0.7–0.9 s),
// voice on html5 at VOICE_RATE (pitch kept); effects and music on Web Audio; music ducks under every voice. Missing files
// resolve at once (never stall).
import { Howler } from 'howler'
import { VOICE_RATE, getHowl, peekHowl, playOnce, unlockAudio } from '../../shared/audioCore'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS } from '../assets/audioFiles'
import { TEST_HOOKS } from '../testHooks'

export type Duel2Sfx = 'wave' | 'catch' | 'hit' | 'puff' | 'lock' | 'zap' | 'key' | 'door' | 'crystal' | 'streak'
export const GAP_MS = 800
const MUSIC_VOL = 0.35
const DUCK_VOL = 0.08
const LINE_TIMEOUT_MS = 9000
const SFX_TIMEOUT_MS = 4000

let cfg = { sfx: true, music: true, volume: 0.8 }
export function configureAudio(o: { sfx: boolean; music: boolean; volume: number }) {
  cfg = o
  Howler.volume(o.volume)
  if (!o.music) stopMusic()
}
export const unlockDuel2Audio = unlockAudio

let hidden = false
let held = false
const applyMute = () => Howler.mute(hidden || held)
export function setHidden(on: boolean) { hidden = on; applyMute() }
/** The pause cover keeps the audio silent after the page shows again, until play is tapped. */
export function holdAudio(on: boolean) { held = on; applyMute() }

let current: string | null = null
let currentSignal: VoiceSignal | null = null
/** A speaker's own handle: cancelling it stops only that speaker's parts (an explanation closing must not silence the game). */
export interface VoiceSignal { cancelled: boolean }
export const voiceSignal = (): VoiceSignal => ({ cancelled: false })
function playFile(id: string): Promise<void> {
  const url = VOICE_URLS[id]
  if (!url) return Promise.resolve()
  current = url
  duck(true)
  return playOnce(getHowl(url, false, true), VOICE_RATE, LINE_TIMEOUT_MS).finally(() => {
    if (current === url) current = null
    duck(false)
  })
}
type Player = (id: string) => Promise<void>
let player: Player = playFile
/** Test seam: replace how one voice id is played (null restores the real player). */
export function setVoicePlayer(p: Player | null) { player = p ?? playFile }

let queue: Promise<void> = Promise.resolve()
let epoch = 0
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

/** Plays the parts in order with `gapMs` between them, after anything already queued. A stopVoice drops what is left. */
export function sayParts(parts: { id: string; onStart?: () => void }[], gapMs = GAP_MS, signal?: VoiceSignal): Promise<void> {
  const mine = epoch
  const run = async () => {
    for (let i = 0; i < parts.length; i++) {
      if (epoch !== mine || signal?.cancelled) return
      if (i > 0 && gapMs > 0) await wait(gapMs)
      if (epoch !== mine || signal?.cancelled) return
      currentSignal = signal ?? null
      parts[i].onStart?.()
      // test builds keep the order of everything said, for the QA audio log (rule)
      if (TEST_HOOKS) (window as unknown as { __d2audio?: string[] }).__d2audio?.push(parts[i].id)
      await player(parts[i].id)
    }
  }
  const p = queue.then(run, run)
  queue = p.catch(() => {})
  return p
}
export const say = (ids: string[], gapMs = GAP_MS) => sayParts(ids.map((id) => ({ id })), gapMs)

/** Stops one speaker's parts (playing or queued); everything else in the queue goes on. */
export function cancelVoice(signal: VoiceSignal) {
  signal.cancelled = true
  if (currentSignal === signal && current) peekHowl(current)?.stop()
}

/** Stops the voice now and drops the queued parts (a tap on the cue, leaving the screen). */
export function stopVoice() {
  epoch++
  queue = Promise.resolve()
  if (current) peekHowl(current)?.stop()
}

const lastSfx: Record<string, number> = {}
export function playSfx(name: Duel2Sfx): Promise<void> {
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
const lastTrack: Record<string, number> = {}
/** Music for the broom flight and the celebrations; each start moves to the next track of that kind. */
export function startMusic(kind: 'flight' | 'celebrate') {
  const tracks = MUSIC_URLS[kind]
  if (!cfg.music || !tracks?.length) return
  const i = ((lastTrack[kind] ?? -1) + 1) % tracks.length
  lastTrack[kind] = i
  const h = getHowl(tracks[i], kind === 'flight')
  if (music === h) return
  stopMusic()
  music = h
  const go = () => {
    if (music !== h) return
    if (!h.playing()) { h.volume(0); h.play() }
    h.fade(h.volume(), ducks > 0 ? DUCK_VOL : MUSIC_VOL, 600)
  }
  if (h.state() !== 'loaded') h.once('load', go)
  else go()
}
export function stopMusic() {
  if (!music) return
  const h = music
  music = null
  if (!h.playing()) return
  h.fade(h.volume(), 0, 300)
  window.setTimeout(() => { if (music !== h) h.stop() }, 320)
}
function duck(on: boolean) {
  ducks = Math.max(0, ducks + (on ? 1 : -1))
  if (music?.playing()) music.fade(music.volume(), ducks > 0 ? DUCK_VOL : MUSIC_VOL, 200)
}
