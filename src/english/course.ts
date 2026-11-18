// The English course: what Book 2's game plays on the English page (`?course=en`, where English is available:
// ./available.ts). `loadCourse('en')` reaches it by dynamic import, so the Hebrew page never loads it. Its audio, log,
// save and pictures are its own; its content (stages, rounds, the tower) is built by the later English tasks, and until
// then reading one throws.
import type { Course, CourseRounds, CourseStages } from '../duel2/course/types'
import { englishAudio } from './audio'
import { ENGLISH_IMAGES } from './assets/images'
import { preloadEnglishAssets } from './assets/preload'
import { englishSavePort } from './savePort'
import { useEnglishStore } from './store'
import { englishTelemetry } from './telemetry'
import { ENGLISH_LOG } from './telemetryLog'

const notBuilt = (what: string): never => { throw new Error(`the English ${what} is not built yet`) }

const a = englishAudio

export const ENGLISH: Course = {
  id: 'en',
  game: 'english',
  dir: 'ltr',
  get stages(): CourseStages { return notBuilt('stages') },
  get rounds(): CourseRounds { return notBuilt('rounds') },
  get tower(): Course['tower'] { return notBuilt('tower') },
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
}
