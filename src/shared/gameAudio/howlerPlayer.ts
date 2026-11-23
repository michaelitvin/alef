// The Howler adapter of the player port (port.ts): one Howl per file, play-once with a safety timeout, the speech rate.
// The only module of the games' audio that imports Howler. It also plays coded sound (`coded:` urls, coded.ts) on
// Howler's context into its master gain.
import { Howl, Howler } from 'howler'
import { codedSource, isCoded } from './coded'
import type { AudioPlayer, PlayOptions, Sound } from './port'

/** Playtest (the tower): the recorded speech felt slow and made the whole game feel slow. */
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
    if (isCoded(url)) return codedSound(url, o)
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
      duration: () => (h.state() === 'loaded' ? h.duration() / (o.rate ?? 1) : null),
    }
    sound.done = playOnce(h, o.rate ?? 1, o.timeoutMs ?? 10_000, (x) => {
      id = x
      o.onPlay?.(sound)
      // (only when asked: Howler's own 'play' event, once the file really plays)
      if (o.onStart) {
        const start = o.onStart
        if (h.playing(x)) start(sound)
        else h.once('play', () => start(sound), x)
      }
    })
    return sound
  },
  preload: (url, html5) => { if (!isCoded(url)) getHowl(url, false, html5) },
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

/** Howler's WebAudio parts (not in its types) */
interface HowlerWebAudio { ctx: AudioContext | null; masterGain: GainNode | null; usingWebAudio: boolean; autoSuspend: boolean }
const howlerAudio = () => Howler as unknown as HowlerWebAudio

/**
 * A coded sound: its source plays into one GainNode of its own (gain = the volume) that ends in Howler's master gain.
 * It ends after the source's length (a one-shot also at its timeout) or on stop; the fade ramps its gain. Howler
 * suspends its context 30 s after its own last WebAudio sound and coded nodes do not count for it, so the first coded
 * play turns that off. With no WebAudio it ends at once.
 */
function codedSound(url: string, o: PlayOptions): Sound {
  const H = howlerAudio()
  if (!H.ctx && H.usingWebAudio) Howler.volume() // Howler sets its context up on first use
  const source = codedSource(url)
  const ctx = H.ctx, master = H.masterGain
  if (!H.usingWebAudio || !ctx || !master || !source) {
    const none: Sound = { done: Promise.resolve(), stop() {}, pause() {}, resume() {}, fade() {}, position: () => null, playing: () => false }
    o.onPlay?.(none)
    return none
  }
  H.autoSuspend = false
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  const gain = ctx.createGain()
  gain.gain.value = o.volume ?? 1
  gain.connect(master)
  const play = source({ ctx, out: gain })
  let ended = false
  let finish: () => void = () => {}
  let timer: number | undefined
  const end = () => {
    if (ended) return
    ended = true
    if (timer !== undefined) window.clearTimeout(timer)
    play.stop()
    window.setTimeout(() => gain.disconnect(), 100)
    finish()
  }
  const sound: Sound = {
    done: new Promise<void>((r) => { finish = r }),
    stop: end,
    pause() {},
    resume() {},
    fade(to, ms) {
      const t = ctx.currentTime
      gain.gain.cancelScheduledValues(t)
      gain.gain.setValueAtTime(gain.gain.value, t)
      gain.gain.linearRampToValueAtTime(to, t + ms / 1000)
    },
    position: () => null,
    playing: () => !ended,
  }
  const oneShot = o.kind !== 'music'
  const ms = play.lengthMs === null ? (oneShot ? o.timeoutMs : undefined) : Math.min(play.lengthMs, oneShot ? (o.timeoutMs ?? Infinity) : Infinity)
  if (ms !== undefined) timer = window.setTimeout(end, ms)
  o.onPlay?.(sound)
  return sound
}
