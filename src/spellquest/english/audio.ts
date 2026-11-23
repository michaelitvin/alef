// The English path's audio: the shared game-audio kit with the English voices and Spell Quest's sound (its effects, music and
// numbers: src/spellquest/audio/spellQuestSound.ts). It logs to the English log. The tower plays through `englishTowerAudio`.
import { createGameAudio } from '../../shared/gameAudio/kit'
import { holdAudio, unlockAudioOutput } from '../../shared/gameAudio/output'
import { SPELLQUEST_SOUND, type SpellQuestMusic, type SpellQuestSfx } from '../audio/spellQuestSound'
import type { TowerAudio } from '../tower/logic/controller'
import { playSfx as towerSfx } from '../tower/logic/towerAudio'
import type { LineCue } from '../tower/assets/lineCues'
import { ENGLISH_VOICE_URLS } from './assets/audioFiles'
import { enLine, enLineAudioId } from './data/lines'
import { englishTelemetry } from './telemetry'

export const englishAudio = createGameAudio<SpellQuestSfx, SpellQuestMusic>({
  ...SPELLQUEST_SOUND,
  game: 'english',
  voices: ENGLISH_VOICE_URLS,
  telemetry: englishTelemetry,
})

/**
 * The cues the tower waits for (the tower shows after the intro names it, the מגה button after "mega spell ready"). The
 * English takes have no cue timings: each fires as its line ends (or at once, when the line has no file).
 */
const LINE_CUES: Record<string, LineCue[]> = { 'line-intro': ['tower'], 'line-mega': ['lightning'] }

/** a line's file: one of its variations (`<id>-<n>`); any other id is a voice file itself (snd-ks, w-fox, nw-vap) */
const fileOf = (id: string) => {
  const l = enLine(id)
  return l ? enLineAudioId(id, 1 + Math.floor(Math.random() * l.variations)) : id
}
/** the file lineAsset chose for an id, played by the playLine that follows it (the tower logs, then plays) */
const chosen = new Map<string, string>()

/**
 * The tower's line player on the English kit: the English lines and voices (never the Hebrew tower's), the tower's own
 * effects (the board is the tower's). A missing file plays nothing and the flow goes on.
 */
export const englishTowerAudio: TowerAudio = {
  playLine(id, onCue, onHeard) {
    const file = chosen.get(id) ?? fileOf(id)
    chosen.delete(id)
    return englishAudio.playLine(file, onHeard ? { onHeard } : {}).then(() => { for (const c of LINE_CUES[id] ?? []) onCue?.(c) })
  },
  playSfx: (name, power) => towerSfx(name, power),
  lineAsset(id) {
    const file = fileOf(id)
    chosen.set(id, file)
    return { id, file, url: ENGLISH_VOICE_URLS[file] ?? null }
  },
  stopAllLines: () => englishAudio.stopVoice(),
  mute: (on) => holdAudio(on),
  unlock: () => unlockAudioOutput(),
  // the English kit logs to the English log itself (it has no girl takes to fall back from)
  setLog: () => {},
}
