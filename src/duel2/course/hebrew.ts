// The Hebrew course: today's Book 2 modules, named as a Course.
import { cancelVoice, playSfx, say, sayInfo, sayParts, startMusic, stopMusic, stopVoice, voiceSignal } from '../audio/duel2Audio'
import { IMAGES } from '../assets/images'
import { preloadDuel2Assets } from '../assets/preload'
import { lineAudioId } from '../data/lines'
import { wordLinkFor } from '../data/words'
import { bossTarget, bossWave } from '../logic/boss'
import { item as itemOf, mark as markOf } from '../logic/content'
import { dotIntroFor } from '../logic/dotIntro'
import { drawWords } from '../logic/draw'
import { features, type ScreenId } from '../logic/predict'
import {
  broomTarget, broomWave, cauldronRound, doorKeys, doorWords, ghostRound, isNewStageChoice, ladderPlan, letterChoice, type Choice,
} from '../logic/rounds'
import { HEBREW_STAGES } from '../logic/run'
import { storeSavePort } from '../savePort'
import { useDuel2Store } from '../store'
import { duel2Telemetry } from '../telemetry'
import { BOOK2_LOG } from '../telemetryLog'
import { HEBREW_TOWER } from '../../utils/duel/content'
import { progressTallies } from '../../utils/duel/tallies'
import type { Course } from './types'

/** a Hebrew answer's features: its letter, and its vowel group and syllable when it has a mark */
const sylFeatures = (c: Choice, screen: ScreenId) => {
  const it = itemOf(c.itemId)
  return features(c.mark ? { item: it, mark: markOf(c.mark) } : { item: it }, screen)
}

export const HEBREW: Course = {
  id: 'he',
  game: 'book2',
  dir: 'rtl',
  stages: HEBREW_STAGES,
  rounds: {
    broomTarget, broomWave, cauldronRound, ghostRound, ladderPlan, isNewStageChoice, letterChoice, features: sylFeatures,
    doorWords, doorKeys, wordLinkFor, dotIntroFor, drawWords, bossTarget, bossWave,
  },
  // the kit's effects and music are Book 2's (Duel2Sfx, its music kinds); the course's audio takes any name
  audio: {
    sayParts, say, sayInfo, stopVoice, stopMusic, voiceSignal, cancelVoice,
    playSfx: playSfx as Course['audio']['playSfx'], startMusic: startMusic as Course['audio']['startMusic'],
  },
  telemetry: duel2Telemetry,
  log: BOOK2_LOG,
  save: () => storeSavePort,
  store: () => useDuel2Store,
  images: IMAGES,
  preload: preloadDuel2Assets,
  genderPictures: { boy: IMAGES['s-wizard-idle'], girl: IMAGES['s-wizard-idle-girl'] ?? IMAGES['s-wizard-idle'], askLine: 'ask-gender-1' },
  lineAudioId: (id, n = 1) => lineAudioId(id, n),
  // the first duel's rounds, lines and save, as always
  tower: { content: HEBREW_TOWER, tallies: () => progressTallies },
}
