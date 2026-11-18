// The English path's audio: the shared game-audio kit with the English voices and Book 2's sound (its effects, music and
// numbers: src/duel2/audio/book2Sound.ts). It logs to the English log.
import { createGameAudio } from '../shared/gameAudio/kit'
import { BOOK2_SOUND, type Duel2Music, type Duel2Sfx } from '../duel2/audio/book2Sound'
import { ENGLISH_VOICE_URLS } from './assets/audioFiles'
import { englishTelemetry } from './telemetry'

export const englishAudio = createGameAudio<Duel2Sfx, Duel2Music>({
  ...BOOK2_SOUND,
  game: 'english',
  voices: ENGLISH_VOICE_URLS,
  telemetry: englishTelemetry,
})
