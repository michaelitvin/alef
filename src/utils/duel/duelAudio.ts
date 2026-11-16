// Duel audio (the tower in Book 2's run): effects on Web Audio; speech on html5 audio, whose playbackRate keeps the
// pitch, so lines can play faster without sounding like chipmunks. The tower has no music of its own (Book 2's run
// plays its own). Anything missing, failing or silent resolves via a safety timeout so the game can never stall
// waiting for audio.
import { Howler } from 'howler'
import { VOICE_RATE, getHowl, peekHowl, playOnce, unlockAudio } from '../../shared/audioCore'

export { VOICE_RATE } from '../../shared/audioCore'
import { SFX_URLS, VOICE_URLS } from '../../assets/duel/audioFiles'
import { LINE_CUES, type LineCue } from '../../assets/duel/lineCues'
import { getGender, voiceFor } from '../../shared/player'
import { track } from './telemetry'

export type SfxName = 'arrival' | 'cast' | 'boom' | 'ouch' | 'mega' | 'sparkle'

const LINE_TIMEOUT_MS = 9000 // > longest line (~4.2 s) plus a slow first load
const SFX_TIMEOUT_MS = 3000
let cfg = { sfx: true, volume: 0.8 }

export function configureDuelAudio(o: { sfx: boolean; volume: number }) {
  cfg = o
  Howler.volume(o.volume)
}

/** Call inside the ▶ tap: resumes the AudioContext (autoplay policies). */
export function unlockDuelAudio() {
  unlockAudio()
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
  const h = getHowl(vs[Math.floor(Math.random() * vs.length)])
  h.volume(name === 'boom' ? Math.min(1, 0.6 + 0.3 * power) : 0.8)
  return playOnce(h, 1, SFX_TIMEOUT_MS)
}

/** The lines that speak to the child: each has a feminine take `<id>-f` for a girl (spec 2026-11-07 girls). The rest
 * (the learning sounds, the narrator's announcements) stay single. */
export const DUEL_FEMININE: ReadonlySet<string> = new Set([
  'line-intro', 'line-how-A', 'line-how-B', 'line-how-C', 'line-new-monster', 'line-combo', 'line-over', 'line-boss-win',
])
const fellBack = new Set<string>()
/** The file to play for `id`: the feminine take when a girl plays; a missing one falls back to the masculine take
 * (never silence) and is logged once. */
export function duelVoiceId(id: string): string {
  const r = voiceFor(id, getGender(), (x) => x in VOICE_URLS, (x) => DUEL_FEMININE.has(x))
  if (r.fallback && !fellBack.has(id)) { fellBack.add(id); track('voice-fallback', { id }) }
  return r.id
}

/** What telemetry records for a line: the id asked for, and the file that really plays (the -f take for a girl). */
export function lineAsset(id: string): { id: string; file: string; url: string | null } {
  const file = duelVoiceId(id)
  return { id, file, url: VOICE_URLS[file] ?? null }
}

/**
 * Plays a voice line at VOICE_RATE.
 * `onCue` hears each LINE_CUES word as it is spoken; any not yet heard fire when the line ends
 * (early, failed or missing), so what a line promises — "tap the lightning" — always shows up.
 */
export function playLine(lineId: string, onCue?: (cue: LineCue) => void): Promise<void> {
  const id = duelVoiceId(lineId)
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
  const timers = cues.map((c, i) => window.setTimeout(() => fire(i), (c.at / VOICE_RATE) * 1000))
  return playOnce(getHowl(url, false, true), VOICE_RATE, LINE_TIMEOUT_MS).finally(() => {
    timers.forEach((t) => window.clearTimeout(t))
    fireRest()
  })
}

export function stopAllLines() {
  Object.values(VOICE_URLS).forEach((u) => peekHowl(u)?.stop())
}

export function muteDuelAudio(on: boolean) {
  Howler.mute(on)
}
