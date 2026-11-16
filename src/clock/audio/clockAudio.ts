// Clock audio: the shared game-audio kit (src/shared/gameAudio) with the clock's files and numbers. Each voice line plays
// on its own (`playLine`, no queue: the round script awaits each one) on html5 at VOICE_RATE (pitch kept), with a callback
// per caption word timed from the playback position; effects and calm music on Web Audio. Music ducks under every voice
// line. Missing files never stall: a line with no file walks its caption at a reading pace.
import { createGameAudio } from '../../shared/gameAudio/kit'
import { VOICE_RATE } from '../../shared/gameAudio/howlerPlayer'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS, VOICE_WORDS } from '../assets/audioFiles'
import type { ClockSfx } from '../logic/workday'
import { captionTimes, followPlayback } from './wordTiming'
import { hasFeminine, lineAudioId, type LineDef } from '../data/lines'
import type { Lang } from '../logic/phrases'
import { CUSTOMERS } from '../logic/workday'
import { clockTelemetry } from '../telemetry'

const HE_CUSTOMERS = new Set(CUSTOMERS.filter((c) => c.lang === 'he').map((c) => c.id))
/** Word spacing assumed when a line has no timings yet (s). */
const WORD_ESTIMATE_S = 0.45

const audio = createGameAudio<ClockSfx, 'calm'>({
  game: 'clock',
  voices: VOICE_URLS,
  sfx: SFX_URLS,
  sfxPick: 'rotate',
  // the parent: no music while customers and questions are on; it plays only on the door, in the bonus game and on
  // the day summary
  music: { calm: MUSIC_URLS },
  // the feminine Hebrew take (`-f`) for a girl, for a line or a Hebrew customer's request that speaks to the child
  // (spec 2026-11-07 girls)
  feminine: (x) => hasFeminine(x) && (!x.startsWith('cust-') || HE_CUSTOMERS.has(x.split('-')[1])),
  telemetry: clockTelemetry,
  lineTimeoutMs: 12000,
  sfxTimeoutMs: 4000,
  // the clock has no voice queue: the round script plays one line at a time
  gapMs: 0,
  musicVol: 0.3,
  duckVol: 0.08,
  musicFadeInMs: 800,
})

/** The file to play: the feminine take for a girl when the line has one; a missing one falls back to the masculine take
 * (never silence), logged once. */
export const clockVoiceId = audio.voiceFile

/**
 * The start time (s, media time) of each caption word of a voice line: the voice's word timings mapped onto the caption
 * words. When the line has no timings, or they cannot be mapped, the words are spread at an estimated pace.
 */
function captionTimesFor(id: string, caption: string[]): number[] {
  const spoken = VOICE_WORDS[id]
  const mapped = spoken ? captionTimes(caption, spoken) : null
  if (mapped) return mapped
  if (spoken && spoken.t.length) {
    const last = spoken.t[spoken.t.length - 1] + WORD_ESTIMATE_S
    return caption.map((_, i) => (i * last) / caption.length)
  }
  return caption.map((_, i) => i * WORD_ESTIMATE_S)
}

/** No file yet: walks the caption at the estimated pace so the child still sees it read. */
function walkCaption(times: number[], report: (i: number) => void): Promise<void> {
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

/** The caption of a line: the feminine text only when the feminine file is the one that plays (a missing file falls back
 * to the masculine take, and the caption must say what the voice says). */
export function spokenLineText(l: LineDef, lang: Lang): string {
  return lang === 'he' && l.heF && clockVoiceId(lineAudioId(l.id, lang)).endsWith('-f') ? l.heF : l[lang]
}

/**
 * Plays a voice line; `onWord(i)` fires as caption word i is spoken. The highlight follows the audio's real playback
 * position (rule), so load latency and the speech rate cannot put it out of step. Every word fires by the end, even if
 * the file is missing or the line is stopped.
 */
export function playVoice(lineId: string, caption: string[] = [], onWord?: (i: number) => void): Promise<void> {
  const report = (i: number) => onWord?.(i)
  return audio
    .playLine(lineId, {
      caption,
      follow: (position, file) => followPlayback(captionTimesFor(file, caption), position, report),
      missing: (file) => walkCaption(captionTimesFor(file, caption), report),
    })
    .then(() => {})
}

/** Stops the voice line that plays now. */
export const stopVoices = audio.stopVoice

/** Plays an effect; approved takes rotate. */
export const playSfx = (name: ClockSfx): Promise<void> => audio.playSfx(name)

/** Starts the calm music; each workday moves to the next track. Already playing that track: nothing changes. */
export const startMusic = (day: number) => audio.startMusic('calm', { track: day })
/** Fades the music out. */
export const stopMusic = audio.stopMusic
export const preloadVoices = audio.preloadVoices
/** Starts loading every effect take (Web Audio). */
export const preloadSfx = audio.preloadSfx
export { holdAudio } from '../../shared/gameAudio/output'
