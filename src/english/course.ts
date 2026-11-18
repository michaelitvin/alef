// The English course: what Book 2's game plays on the English page (`?course=en`, where English is available:
// ./available.ts). `loadCourse('en')` reaches it by dynamic import, so the Hebrew page never loads it. Its audio, log,
// save and pictures are its own; its stages are logic/stages.ts. The first run's tower is the placement check
// (logic/tower.ts); after it, the tower plays the English tower's letter and word rounds (logic/tower.ts). The broom plays
// logic/rounds/broom.ts. The other screens' rounds are built by the later English tasks, and until then calling one throws.
import type { Course, CourseRounds } from '../duel2/course/types'
import type { SavePort } from '../duel2/savePort'
import type { TowerContent } from '../utils/duel/content'
import { englishAudio, englishDuelAudio } from './audio'
import { EN_DRAWING, EN_MAX_STAGE, EN_ORDER, EN_SESSION_LENGTH, EN_VISIT, enScreensOfStage } from './logic/stages'
import { PLACEMENT_WALK_MS, englishTower, placementAnswer, placementDue, placementTower, towerFacts } from './logic/tower'
import { enLine } from './data/lines'
import { enBroomTarget, enBroomWave } from './logic/rounds/broom'
import { enFeatures, enIsNewStageChoice, itemOfChoice } from './logic/pick'
import { introAfter } from './logic/intro'
import { READY_STAGES, englishStageRule } from './readyStages'
import { ENGLISH_IMAGES, wordPicture } from './assets/images'
import { preloadEnglishAssets } from './assets/preload'
import { ENGLISH_VOICE_URLS } from './assets/audioFiles'
import { englishSavePort, type EnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'
import { useEnglishStore } from './store'
import { englishTelemetry } from './telemetry'
import { ENGLISH_LOG } from './telemetryLog'

const notBuilt = (what: string): never => { throw new Error(`the English ${what} is not built yet`) }

const a = englishAudio

/** the English tower's letter and word rounds, over the real save (looked up on each call) */
const EN_TOWER: TowerContent = englishTower({ save: () => englishSavePort(), picture: wordPicture, voice: (id) => id in ENGLISH_VOICE_URLS })

const hasVoice = (id: string) => id in ENGLISH_VOICE_URLS

/** the English screens' rounds: the broom's so far (the other screens come with the later English tasks) */
const EN_ROUNDS: CourseRounds = {
  broomTarget: (ctx, kind, avoid, screen) => enBroomTarget(ctx, kind, avoid, screen, hasVoice),
  broomWave: enBroomWave,
  features: enFeatures,
  isNewStageChoice: enIsNewStageChoice,
  // a new unit or heart word, asked once before its introduction (the gallery's read-only save: none, nothing written)
  introAfter: (save, c, right) => ('setIntro' in save ? introAfter(en(save), itemOfChoice(c), right).map((id) => (enLine(id) ? { line: id } : { id })) : []),
  dotIntroFor: () => null,
  cauldronRound: () => notBuilt('cauldron'),
  ghostRound: () => notBuilt('ghosts'),
  ladderPlan: () => notBuilt('ladder'),
  letterChoice: () => notBuilt('letter choice'),
  doorWords: () => notBuilt('doors'),
  doorKeys: () => notBuilt('doors'),
  wordLinkFor: () => notBuilt('word link'),
  drawWords: () => notBuilt('drawing'),
  bossTarget: () => notBuilt('flight boss'),
  bossWave: () => notBuilt('flight boss'),
}

/** the run's save on the English course is the English port (the course gives it, or a test's save in memory) */
function en(save: SavePort): EnglishSavePort {
  if (!('setPlacement' in save)) throw new Error('not an English save')
  return save as EnglishSavePort
}

export const ENGLISH: Course = {
  id: 'en',
  game: 'english',
  dir: 'ltr',
  stages: {
    maxStage: EN_MAX_STAGE, order: EN_ORDER, drawing: EN_DRAWING, screensOfStage: enScreensOfStage,
    // enRecordStageAnswer over READY_STAGES: the same rule as the English save's
    recordStageAnswer: englishStageRule, visit: EN_VISIT, sessionLength: EN_SESSION_LENGTH,
  },
  rounds: EN_ROUNDS,
  // its answers are kept in the English save (its `tower`), and it speaks English (never the Hebrew duel's lines)
  tower: { content: EN_TOWER, tallies: () => englishSavePort().towerTallies(), audio: englishDuelAudio, facts: towerFacts },
  placement: {
    // (only reads: also on the gallery's read-only save)
    due: (save) => { const p = (save.read() as Partial<EnglishSave>).placement; return !!p && placementDue(p) },
    tower: (save) => placementTower(en(save), READY_STAGES, wordPicture),
    walkMs: PLACEMENT_WALK_MS,
    answer: (save, right, target, at) => placementAnswer(en(save), right, target, at, READY_STAGES, enScreensOfStage),
  },
  // the kit's effects and music are Book 2's (Duel2Sfx, its music kinds); the course's audio takes any name
  audio: {
    sayParts: a.sayParts, say: a.say, sayInfo: a.sayInfo, stopVoice: a.stopVoice, stopMusic: a.stopMusic, voiceSignal: a.voiceSignal,
    cancelVoice: a.cancelVoice, playSfx: a.playSfx as Course['audio']['playSfx'], startMusic: a.startMusic as Course['audio']['startMusic'],
  },
  telemetry: englishTelemetry,
  log: ENGLISH_LOG,
  save: englishSavePort,
  store: () => useEnglishStore,
  images: ENGLISH_IMAGES,
  preload: preloadEnglishAssets,
  genderPictures: { boy: ENGLISH_IMAGES['s-wizard-idle'], girl: ENGLISH_IMAGES['s-wizard-idle-girl'] ?? ENGLISH_IMAGES['s-wizard-idle'], askLine: 'ask-gender-1' },
  lineAudioId: (id, n = 1) => `${id}-${n}`,
  lineVariations: (id) => enLine(id)?.variations ?? 1,
}
