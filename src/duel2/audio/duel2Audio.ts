// Book 2 audio: the shared game-audio kit (src/shared/gameAudio) with Book 2's files and numbers. One voice queue (lines
// and learning sounds never overlap: rule), 0.8 s between parts (rule 0.7–0.9 s); effects rotate their takes, and a new
// effect plays an existing one until the sfx pipeline gives it its own; music ducks under every voice.
import { createGameAudio } from '../../shared/gameAudio/kit'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS } from '../assets/audioFiles'
import { TEST_HOOKS } from '../testHooks'
import { FEMININE_IDS } from '../data/lines'
import { duel2Telemetry } from '../telemetry'

export type Duel2Sfx = 'wave' | 'catch' | 'hit' | 'puff' | 'lock' | 'zap' | 'key' | 'door' | 'crystal' | 'streak' | 'spell' | 'potion' | 'boss-win' | 'stroke' | 'drawn' | 'coin' | 'count'
type Duel2Music = 'flight' | 'celebrate' | 'boss'

const audio = createGameAudio<Duel2Sfx, Duel2Music>({
  game: 'book2',
  voices: VOICE_URLS,
  sfx: SFX_URLS,
  // boss: spec 2026-11-07; drawing: a right stroke, a letter done
  sfxFallback: { spell: 'zap', potion: 'crystal', 'boss-win': 'streak', stroke: 'catch', drawn: 'zap', coin: 'lock', count: 'zap' },
  sfxPick: 'rotate',
  music: MUSIC_URLS,
  musicLoops: (kind) => kind !== 'celebrate',
  feminine: (id) => FEMININE_IDS.has(id),
  telemetry: duel2Telemetry,
  // test builds keep the order of everything said, for the QA audio log (rule)
  onSay: TEST_HOOKS ? (id) => (window as unknown as { __d2audio?: string[] }).__d2audio?.push(id) : undefined,
  lineTimeoutMs: 9000,
  sfxTimeoutMs: 4000,
  gapMs: 800,
  musicVol: 0.35,
  duckVol: 0.08,
  musicFadeInMs: 600,
})

export const { sayParts, say, sayInfo, voiceSignal, cancelVoice, stopVoice, playSfx, startMusic, stopMusic, preloadSfx } = audio
export type { VoiceSignal } from '../../shared/gameAudio/kit'
export { holdAudio } from '../../shared/gameAudio/output'
