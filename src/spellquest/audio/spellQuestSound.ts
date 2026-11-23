// Spell Quest's sound: its effects, music kinds and numbers, the same for every course's kit (Hebrew: ./spellQuestAudio.ts, English:
// src/spellquest/english/audio.ts). One voice queue (lines and learning sounds never overlap: rule), 0.8 s between parts (rule
// 0.7–0.9 s); effects rotate their takes, and a new effect plays an existing one until the sfx pipeline gives it its own;
// music ducks under every voice.
import type { GameAudioOptions } from '../../shared/gameAudio/kit'
import { MUSIC_URLS, SFX_URLS } from '../assets/audioFiles'
import { TEST_HOOKS } from '../testHooks'

export type SpellQuestSfx = 'wave' | 'catch' | 'hit' | 'puff' | 'lock' | 'zap' | 'key' | 'door' | 'crystal' | 'streak' | 'spell' | 'potion' | 'boss-win' | 'stroke' | 'drawn' | 'coin' | 'count'
export type SpellQuestMusic = 'flight' | 'celebrate' | 'boss'

/** a kit's options without its game, voices, feminine takes and log */
export const SPELLQUEST_SOUND = {
  sfx: SFX_URLS,
  // boss: spec 2026-11-07; drawing: a right stroke, a letter done
  sfxFallback: { spell: 'zap', potion: 'crystal', 'boss-win': 'streak', stroke: 'catch', drawn: 'zap', coin: 'lock', count: 'zap' },
  sfxPick: 'rotate',
  music: MUSIC_URLS,
  musicLoops: (kind: SpellQuestMusic) => kind !== 'celebrate',
  // test builds keep the order of everything said, for the QA audio log (rule)
  onSay: TEST_HOOKS ? (id: string) => (window as unknown as { __d2audio?: string[] }).__d2audio?.push(id) : undefined,
  lineTimeoutMs: 9000,
  sfxTimeoutMs: 4000,
  gapMs: 800,
  musicVol: 0.35,
  duckVol: 0.08,
  musicFadeInMs: 600,
} satisfies Omit<GameAudioOptions<SpellQuestSfx, SpellQuestMusic>, 'game' | 'voices' | 'feminine' | 'telemetry'>
