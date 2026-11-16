// Duel audio (the tower in Book 2's run): the shared game-audio kit (src/shared/gameAudio) with the first duel's files
// and numbers. Each line plays on its own (`playLine`, no queue: the hook awaits each one) on html5 at VOICE_RATE (pitch
// kept), with its LINE_CUES timed from the call; effects on Web Audio pick a take at random. The tower has no music of
// its own (Book 2's run plays its own), so nothing ducks. Missing files never stall. The device's sound setting
// (effects, volume) reaches the kit through the device output, which Book 2's root follows.
import { createGameAudio } from '../../shared/gameAudio/kit'
import { holdAudio, unlockAudioOutput } from '../../shared/gameAudio/output'
import { SFX_URLS, VOICE_URLS } from '../../assets/duel/audioFiles'
import { LINE_CUES, type LineCue } from '../../assets/duel/lineCues'
import { track } from './telemetry'

export { VOICE_RATE } from '../../shared/gameAudio/kit'

type SfxName = 'arrival' | 'cast' | 'boom' | 'ouch' | 'mega' | 'sparkle'

/** The lines that speak to the child: each has a feminine take `<id>-f` for a girl (spec 2026-11-07 girls). The rest
 * (the learning sounds, the narrator's announcements) stay single. */
export const DUEL_FEMININE: ReadonlySet<string> = new Set([
  'line-intro', 'line-how-A', 'line-how-B', 'line-how-C', 'line-new-monster', 'line-combo', 'line-over', 'line-boss-win',
])

const audio = createGameAudio<SfxName, never>({
  game: 'duel',
  voices: VOICE_URLS,
  sfx: {
    arrival: [SFX_URLS.arrival1, SFX_URLS.arrival2, SFX_URLS.arrival3],
    cast: [SFX_URLS.cast],
    boom: [SFX_URLS.boom1, SFX_URLS.boom2],
    ouch: [SFX_URLS.ouch],
    mega: [SFX_URLS.mega],
    sparkle: [SFX_URLS.sparkle],
  },
  sfxPick: 'random',
  sfxVolume: 0.8,
  feminine: (id) => DUEL_FEMININE.has(id),
  telemetry: { track },
  lineTimeoutMs: 9000, // > longest line (~4.2 s) plus a slow first load
  sfxTimeoutMs: 3000,
  // no voice queue (the hook keeps its own gap between lines) and no music
  gapMs: 0,
  musicVol: 0,
  duckVol: 0,
  musicFadeInMs: 0,
})

/** Call inside the ▶ tap: resumes the AudioContext (autoplay policies). */
export const unlockDuelAudio = unlockAudioOutput

/** Plays a sound effect (one of its takes at random; the boom grows with `power`); resolves when it ends. */
export function playSfx(name: SfxName, power = 1): Promise<void> {
  return audio.playSfx(name, name === 'boom' ? { volume: Math.min(1, 0.6 + 0.3 * power) } : {})
}

/** What telemetry records for a line: the id asked for, and the file that really plays (the -f take for a girl). */
export function lineAsset(id: string): { id: string; file: string; url: string | null } {
  const file = audio.voiceFile(id)
  return { id, file, url: VOICE_URLS[file] ?? null }
}

/**
 * Plays a voice line at VOICE_RATE.
 * `onCue` hears each LINE_CUES word as it is spoken; any not yet heard fire when the line ends
 * (early, failed, stopped or missing), so what a line promises — "tap the lightning" — always shows up.
 */
export function playLine(lineId: string, onCue?: (cue: LineCue) => void): Promise<void> {
  let cues: { cue: LineCue }[] = []
  return audio
    .playLine(lineId, {
      cues: (file) => (cues = LINE_CUES[file] ?? []).map((c) => c.at),
      onCue: onCue && ((i) => onCue(cues[i].cue)),
    })
    .then(() => {})
}

/** Stops the line that plays now. */
export const stopAllLines = audio.stopVoice

/** The pause: everything stays silent until the play (the device output's hold, shared with Book 2's cover). */
export const muteDuelAudio = holdAudio
