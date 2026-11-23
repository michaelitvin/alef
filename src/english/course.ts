// The English course: what Spell Quest's game plays on the English page (`?course=en`, where English is available:
// ./available.ts). `loadCourse('en')` reaches it by dynamic import, so the Hebrew page never loads it. Its audio, log,
// save and pictures are its own; its stages are logic/stages.ts. The first run's tower is the placement check
// (logic/tower.ts); after it, the tower plays the English tower's letter and word rounds (logic/tower.ts). The broom plays
// logic/rounds/broom.ts, the cauldron logic/rounds/cauldron.ts, the ladder logic/rounds/ladder.ts, the ghosts
// logic/rounds/ghosts.ts, the doors logic/rounds/doors.ts, the spell book logic/spell.ts, the drawing logic/draw.ts (on the Latin board: EN_WRITING).
import type { BlendPlan, Course, CourseHint, CourseRounds, CourseWriting } from '../spellquest/course/types'
import type { Choice } from '../spellquest/logic/rounds'
import type { SavePort } from '../spellquest/savePort'
import type { TowerContent } from '../spellquest/tower/logic/content'
import { englishAudio, englishTowerAudio } from './audio'
import { EN_DRAWING, EN_MAX_STAGE, EN_ORDER, EN_SESSION_LENGTH, EN_VISIT, enScreensOfStage } from './logic/stages'
import { PLACEMENT_WALK_MS, englishTower, placementAnswer, placementDue, placementTower, towerFacts } from './logic/tower'
import { enLine } from './data/lines'
import { enBroomTarget, enBroomWave } from './logic/rounds/broom'
import { enBossKinds, enBossTarget, enBossWave } from './logic/rounds/boss'
import { enCauldronRound } from './logic/rounds/cauldron'
import { enLadderPlan } from './logic/rounds/ladder'
import { enGhostExplanation, enGhostRound, enGhostVisitKind } from './logic/rounds/ghosts'
import { englishDoorsPlayable, englishStationsUpTo } from './doorsPlayable'
import { enDoorKeys, enDoorRounds } from './logic/rounds/doors'
import { enSpellRound } from './logic/spell'
import { enDrawWords } from './logic/draw'
import { BASE, DESC, LATIN_STROKES, MID, TOP, isMark, latinStrokesOf } from './data/strokes'
import { measureText } from '../shared/latinMeasure'
import { enAnswerOnly, enFeatures, enIsNewStageChoice, itemOfChoice } from './logic/pick'
import { introAfter } from './logic/intro'
import { blendOf } from './logic/blend'
import { word } from './content/words'
import { ENGLISH_TOWER_ART } from './assets/towerArt'
import { unit, UNITS } from './content/units'
import { READY_STAGES, englishStageRule } from './readyStages'
import { ENGLISH_IMAGES, wordPicture } from './assets/images'
import { preloadEnglishAssets } from './assets/preload'
import { ENGLISH_VOICE_URLS } from './assets/audioFiles'
import { englishSavePort, type EnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'
import { useEnglishStore } from './store'
import { englishTelemetry } from './telemetry'
import { ENGLISH_LOG } from './telemetryLog'

const a = englishAudio

/** the English tower's letter and word rounds, over the real save (looked up on each call) */
const EN_TOWER: TowerContent = englishTower({ save: () => englishSavePort(), picture: wordPicture, voice: (id) => id in ENGLISH_VOICE_URLS, blend: blendOf })

const hasVoice = (id: string) => id in ENGLISH_VOICE_URLS

/** the English screens' rounds: the broom's, the cauldron's, the ladder's, the ghosts', the doors', the spell book's and the drawing's */
const EN_ROUNDS: CourseRounds = {
  broomTarget: (ctx, kind, avoid, screen) => enBroomTarget(ctx, kind, avoid, screen, hasVoice),
  broomWave: enBroomWave,
  features: enFeatures,
  recordOnly: enAnswerOnly,
  isNewStageChoice: enIsNewStageChoice,
  // a new unit or heart word, asked once before its introduction (the gallery's read-only save: none, nothing written)
  introAfter: (save, c, right) => ('setIntro' in save ? introAfter(en(save), itemOfChoice(c), right).map((id) => (enLine(id) ? { line: id } : { id })) : []),
  dotIntroFor: () => null,
  cauldronRound: (ctx, avoid) => enCauldronRound(ctx, avoid, { picture: wordPicture, voice: hasVoice }),
  ghostRound: (ctx, kind, avoid, prevSigns) => enGhostRound(ctx, kind, avoid, prevSigns, hasVoice),
  // letters or words on a ghosts visit, by the stage (the other screens: the run's own choice)
  visitKind: enGhostVisitKind,
  // the look-alike letters' explanation ("This is the letter: b.", then its sound)
  explanation: enGhostExplanation,
  // (the gallery's forced part is Hebrew's: the English ladder has none)
  ladderPlan: (ctx, rungs) => enLadderPlan(ctx, rungs),
  // the first ladder visit: "This word is:" and the foot word, then "Find the letter that makes:" and the new word
  ladderDemo: { look: 'demo-ladder-look', ask: 'q-ladder' },
  // a word on the door, from stage 4 a phrase on about half of them; the keys are pictures (files only)
  doorRounds: (ctx, n) => enDoorRounds(ctx, n, { picture: wordPicture }),
  doorKeys: (ctx, round) => enDoorKeys(ctx, round, { picture: wordPicture }),
  // (never asked on English: `maybeWordLink` returns early for non-syllables)
  wordLinkFor: () => undefined,
  // the first letter of a heard word, sometimes a whole word or a capital (pictures: files only)
  drawWords: (ctx, n) => enDrawWords(ctx, n, { picture: wordPicture, voice: hasVoice }),
  // a real word to spell; its picture at stages 1–3 (files only)
  spellRound: (ctx) => enSpellRound(ctx, { picture: wordPicture, voice: hasVoice }),
  bossKinds: enBossKinds,
  bossTarget: enBossTarget,
  bossWave: enBossWave,
}

/** the capitals' top: they stop short of the ascender (TOP); the Latin board draws its top line there for a capital */
const CAP = Math.min(...latinStrokesOf('H').variants[0].flatMap((st) => st.pts.map((p) => p[1])))

/** the drawing's letters: Latin, in Andika's shapes, on four lines (one letter unit is Andika's ascender, 0.79 em) */
const EN_WRITING: CourseWriting = {
  letters: LATIN_STROKES, strokesOf: latinStrokesOf, isMark,
  lines: { top: TOP, mid: MID, base: BASE, desc: DESC, cap: CAP },
  font: "'Andika'", unitEm: 0.79, em: (text) => measureText(text, 1),
}

/** the blend of a word choice (a unit, a sound: none) */
const blendOfChoice = (c: Choice): BlendPlan | null => (c.kind === 'word' ? blendOf(word(c.id)) : null)
const plans = (cs: Choice[]) => cs.map(blendOfChoice).filter((p): p is BlendPlan => !!p)

/**
 * The hint that blends a word (Task 21; the method is units then word, logic/blend.ts). Where he hears the word (the broom,
 * the cauldron, the ladder): its blend. Where he reads to choose (the doors, the ghosts' words): each word on the
 * screen, left to right. The tower's words have their own `?` (EN_TOWER.hint); the placement has none.
 */
const EN_HINT: CourseHint = {
  plan: (s) => {
    switch (s.screen) {
      case 'broom': case 'ladder': return plans([s.target])
      case 'cauldron': return s.tiles ? plans([s.target]) : []
      case 'ghosts': return plans(s.signs)
      case 'doors': return s.plate ? plans(s.plate) : []
      default: return []
    }
  },
  of: blendOfChoice,
}

/** the run's Hebrew demo and question keys (by its letters and syllables) and the English lines that say them */
const DEMO_ALIAS: Record<string, string> = {
  'demo-broom-letter': 'demo-broom-sound', 'demo-ghosts-letter': 'demo-ghosts-sound', 'demo-ghosts-syllable': 'demo-ghosts-word',
  'q-ghosts-letter': 'q-ghosts-sound',
}
const enLineId = (id: string) => DEMO_ALIAS[id] ?? id

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
    maxStage: EN_MAX_STAGE, order: EN_ORDER, drawing: EN_DRAWING,
    // the doors only where a door can be made (stage 1's pictures, map and fan, have no file yet): they come back by
    // themselves when one lands
    screensOfStage: (s) => enScreensOfStage(s).filter((x) => x !== 'doors' || englishDoorsPlayable(s)),
    // enRecordStageAnswer over READY_STAGES: the same rule as the English save's
    recordStageAnswer: englishStageRule, visit: EN_VISIT, sessionLength: EN_SESSION_LENGTH,
  },
  rounds: EN_ROUNDS,
  // its answers are kept in the English save (its `tower`), and it speaks English (never the Hebrew tower's lines)
  tower: { content: EN_TOWER, tallies: () => englishSavePort().towerTallies(), audio: englishTowerAudio, facts: towerFacts, art: ENGLISH_TOWER_ART },
  hint: EN_HINT,
  writing: EN_WRITING,
  placement: {
    // (only reads: also on the gallery's read-only save)
    due: (save) => { const p = (save.read() as Partial<EnglishSave>).placement; return !!p && placementDue(p) },
    tower: (save) => placementTower(en(save), READY_STAGES, wordPicture),
    walkMs: PLACEMENT_WALK_MS,
    answer: (save, right, target, at) => placementAnswer(en(save), right, target, at, READY_STAGES, (level) => englishStationsUpTo(level, (save.read() as Partial<EnglishSave>).settings?.drawing ?? true)),
  },
  // the kit's effects and music are Spell Quest's (SpellQuestSfx, its music kinds); the course's audio takes any name
  audio: {
    sayParts: a.sayParts, say: a.say, sayInfo: a.sayInfo, stopVoice: a.stopVoice, stopMusic: a.stopMusic, voiceSignal: a.voiceSignal,
    cancelVoice: a.cancelVoice, playSfx: a.playSfx as Course['audio']['playSfx'], startMusic: a.startMusic as Course['audio']['startMusic'],
  },
  telemetry: englishTelemetry,
  onRunEnd: (w) => englishSavePort().setLastRunWords(w),
  log: ENGLISH_LOG,
  save: englishSavePort,
  store: () => useEnglishStore,
  images: ENGLISH_IMAGES,
  preload: preloadEnglishAssets,
  sheetTexts: [...new Set([...UNITS.map((x) => x.text), ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'I l 1', 'O 0', 'b d p q'])],
  coverSample: { texts: ['a', 'm', 's'].map((id) => unit(id).text), alphabet: 'latin' },
  genderPictures: { boy: ENGLISH_IMAGES['s-wizard-idle'], girl: ENGLISH_IMAGES['s-wizard-idle-girl'] ?? ENGLISH_IMAGES['s-wizard-idle'], askLine: 'ask-gender-1' },
  lineAudioId: (id, n = 1) => `${enLineId(id)}-${n}`,
  lineVariations: (id) => enLine(enLineId(id))?.variations ?? 1,
}
