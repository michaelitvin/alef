// Audio core shared by the minigames: one Howl per file, play-once with a safety timeout, speech rate.
import { Howl, Howler } from 'howler'

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

/** Play once; resolve on end, stop or error, or after `timeout`. `onPlay` gets the sound id at once (to follow its position). */
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
    window.setTimeout(finish, timeout)
  })
}

/** Call inside a user tap: resumes the AudioContext (autoplay policies). */
export function unlockAudio() {
  const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}
