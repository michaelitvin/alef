// Book 2 audio: the shared game-audio kit (src/shared/gameAudio) with Book 2's voices, and Book 2's sound (./book2Sound.ts).
import { createGameAudio } from '../../shared/gameAudio/kit'
import { VOICE_URLS } from '../assets/audioFiles'
import { FEMININE_IDS } from '../data/lines'
import { duel2Telemetry } from '../telemetry'
import { BOOK2_SOUND, type Duel2Music, type Duel2Sfx } from './book2Sound'

export type { Duel2Sfx } from './book2Sound'

const audio = createGameAudio<Duel2Sfx, Duel2Music>({
  ...BOOK2_SOUND,
  game: 'book2',
  voices: VOICE_URLS,
  feminine: (id) => FEMININE_IDS.has(id),
  telemetry: duel2Telemetry,
})

export const { sayParts, say, sayInfo, voiceSignal, cancelVoice, stopVoice, playSfx, startMusic, stopMusic, preloadSfx } = audio
export type { VoiceSignal } from '../../shared/gameAudio/kit'
export { holdAudio } from '../../shared/gameAudio/output'
