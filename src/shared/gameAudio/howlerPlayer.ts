// The Howler adapter of the player port (port.ts): one Howl per file, play-once with a safety timeout, the speech rate.
// The only module of the games' audio that imports Howler.
import { Howl, Howler } from 'howler'
import type { AudioPlayer, PlayOptions, Sound } from './port'

/** Playtest (duel): the recorded speech felt slow and made the whole game feel slow. */
export const VOICE_RATE = 1.15
const howls = new Map<string, Howl>()
/**
 * At most this many html5 (streamed) sounds stay loaded; the least recently used one is unloaded. Each holds a media
 * player, phones cap the players a page may have, and a long session used hundreds of voice files (clock QA 2026-10-15).
 */
export const MAX_HTML5 = 24
const recentHtml5: string[] = []

export function getHowl(src: string, loop = false, html5 = false): Howl {
  let h = howls.get(src)
  if (!h) {
    h = new Howl({ src: [src], loop, preload: true, html5 })
    howls.set(src, h)
  }
  if (html5) {
    const i = recentHtml5.indexOf(src)
    if (i >= 0) recentHtml5.splice(i, 1)
    recentHtml5.push(src)
    for (let j = 0; recentHtml5.length > MAX_HTML5 && j < recentHtml5.length - 1; ) {
      const old = howls.get(recentHtml5[j])
      if (old?.playing()) { j++; continue }
      old?.unload()
      howls.delete(recentHtml5[j])
      recentHtml5.splice(j, 1)
    }
  }
  return h
}
export const peekHowl = (src: string) => howls.get(src)

/** Play once; resolve on end, stop or error, or after `timeout`, which also stops the sound: a file that loads late
 * would otherwise start after the game has moved on, where no stop reaches it. `onPlay` gets the sound id at once (to follow its position). */
export function playOnce(h: Howl, rate: number, timeout: number, onPlay?: (id: number) => void): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    const id = h.play()
    h.rate(rate, id)
    onPlay?.(id)
    h.once('end', finish, id)
    h.once('stop', finish, id)
    h.once('playerror', finish, id)
    h.once('loaderror', finish)
    window.setTimeout(() => {
      if (done) return
      h.stop(id) // Howler queues the stop behind a play that still waits for its file
      finish()
    }, timeout)
  })
}

/** Call inside a user tap: resumes the AudioContext (autoplay policies). */
export function unlockAudio() {
  const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

/** The real player: Howler, with the Howl cache above. Voice and effects play once (`playOnce`); music waits for its
 * file to load before it starts (while a file loads, Howler queues every call and a stop can land behind the play). */
export const howlerPlayer: AudioPlayer = {
  play(url, o) {
    const h = getHowl(url, !!o.loop, !!o.html5)
    if (o.kind === 'music') return musicSound(h, o)
    if (o.volume !== undefined) h.volume(o.volume)
    let id: number | undefined
    const sound: Sound = {
      done: Promise.resolve(),
      stop: () => { h.stop() },
      pause: () => { if (id !== undefined) h.pause(id) },
      resume: () => { if (id !== undefined) h.play(id) },
      fade: (to, ms) => { h.fade(h.volume(), to, ms) },
      position: () => (id !== undefined && h.playing(id) ? (h.seek(id) as number) : null),
      playing: () => h.playing(),
    }
    sound.done = playOnce(h, o.rate ?? 1, o.timeoutMs ?? 10_000, (x) => {
      id = x
      o.onPlay?.(sound)
    })
    return sound
  },
  preload: (url, html5) => { getHowl(url, false, html5) },
  setMute: (on) => { Howler.mute(on) },
  setVolume: (v) => { Howler.volume(v) },
  unlock: unlockAudio,
}

function musicSound(h: Howl, o: PlayOptions): Sound {
  let cancelled = false
  let finish: () => void = () => {}
  const sound: Sound = {
    done: new Promise<void>((r) => { finish = r }),
    // a start still waiting for the load never happens; a sound that is not playing is left alone
    stop: () => {
      cancelled = true
      if (h.playing()) h.stop()
      finish()
    },
    pause: () => { h.pause() },
    resume: () => { h.play() },
    fade: (to, ms) => { h.fade(h.volume(), to, ms) },
    position: () => (h.playing() ? (h.seek() as number) : null),
    playing: () => h.playing(),
  }
  const start = () => {
    if (cancelled) return
    if (!h.playing()) {
      h.volume(o.volume ?? 0)
      h.play()
    }
    o.onPlay?.(sound)
  }
  if (h.state() !== 'loaded') h.once('load', start)
  else start()
  return sound
}
