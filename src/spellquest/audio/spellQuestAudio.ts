// Spell Quest audio: the shared game-audio kit (src/shared/gameAudio) with Spell Quest's voices, and Spell Quest's sound (./spellQuestSound.ts).
import { createGameAudio } from '../../shared/gameAudio/kit'
import { VOICE_URLS } from '../assets/audioFiles'
import { FEMININE_IDS } from '../data/lines'
import { spellQuestTelemetry } from '../telemetry'
import { SPELLQUEST_SOUND, type SpellQuestMusic, type SpellQuestSfx } from './spellQuestSound'

export type { SpellQuestSfx } from './spellQuestSound'

const audio = createGameAudio<SpellQuestSfx, SpellQuestMusic>({
  ...SPELLQUEST_SOUND,
  game: 'spellquest',
  voices: VOICE_URLS,
  feminine: (id) => FEMININE_IDS.has(id),
  telemetry: spellQuestTelemetry,
})

export const { sayParts, say, sayInfo, voiceSignal, cancelVoice, stopVoice, playSfx, startMusic, stopMusic, preloadSfx } = audio
export type { VoiceSignal } from '../../shared/gameAudio/kit'
export { holdAudio } from '../../shared/gameAudio/output'
