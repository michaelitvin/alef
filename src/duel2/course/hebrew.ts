// The Hebrew course: today's Book 2 modules, named as a Course.
import * as audio from '../audio/duel2Audio'
import { IMAGES } from '../assets/images'
import { preloadDuel2Assets } from '../assets/preload'
import { lineAudioId } from '../data/lines'
import { HEBREW_STAGES } from '../logic/run'
import { storeSavePort } from '../savePort'
import { duel2Telemetry } from '../telemetry'
import { BOOK2_LOG } from '../telemetryLog'
import type { Course } from './types'

export const HEBREW: Course = {
  id: 'he',
  game: 'book2',
  dir: 'rtl',
  stages: HEBREW_STAGES,
  rounds: {},
  audio: audio as unknown as Course['audio'],
  telemetry: duel2Telemetry,
  log: BOOK2_LOG,
  save: () => storeSavePort,
  images: IMAGES,
  preload: preloadDuel2Assets,
  genderPictures: { boy: IMAGES['s-wizard-idle'], girl: IMAGES['s-wizard-idle-girl'] ?? IMAGES['s-wizard-idle'], askLine: 'ask-gender-1' },
  lineAudioId: (id, n = 1) => lineAudioId(id, n),
}
