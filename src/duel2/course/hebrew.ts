// The Hebrew course: today's Book 2 modules, named as a Course.
import { cancelVoice, playSfx, say, sayInfo, sayParts, startMusic, stopMusic, stopVoice, voiceSignal } from '../audio/duel2Audio'
import { IMAGES } from '../assets/images'
import { preloadDuel2Assets } from '../assets/preload'
import { lineAudioId, lineById } from '../data/lines'
import { wordLinkFor } from '../data/words'
import { bossTarget, bossWave } from '../logic/boss'
import { item as itemOf, mark as markOf, syllable } from '../logic/content'
import { dotIntroFor } from '../logic/dotIntro'
import { heSpellRound } from '../logic/spell'
import { drawWords } from '../logic/draw'
import { features, type ScreenId } from '../logic/predict'
import {
  broomTarget, broomWave, cauldronRound, doorKeys, doorWords, ghostRound, isNewStageChoice, ladderPlan, letterChoice, syllableChoice, type Choice, type RoundCtx,
} from '../logic/rounds'
import { HEBREW_STAGES } from '../logic/run'
import { storeSavePort } from '../savePort'
import { useDuel2Store } from '../store'
import { duel2Telemetry } from '../telemetry'
import { BOOK2_LOG } from '../telemetryLog'
import { HEBREW_TOWER } from '../../utils/duel/content'
import { progressTallies } from '../../utils/duel/tallies'
import type { CauldronRound, Course, DoorRound, LadderPlan } from './types'

/** a Hebrew answer's features: its letter, and its vowel group and syllable when it has a mark */
const sylFeatures = (c: Choice, screen: ScreenId) => {
  const it = itemOf(c.itemId)
  return features(c.mark ? { item: it, mark: markOf(c.mark) } : { item: it }, screen)
}

/** today's cauldron round as the neutral one: the letter is the one box, its mark the gap; each vowel orb a syllable of it */
function hebrewCauldron(ctx: RoundCtx, avoid?: string): CauldronRound {
  const r = cauldronRound(ctx, avoid)
  return { target: syllableChoice(r.target), boxes: [letterChoice(r.letter)], gap: 0, orbs: r.orbs.map((m) => syllableChoice(syllable(r.letter.id, m.id))) }
}

/** today's ladder as the neutral one: the changed place is always marked (it has no boxes) */
const hebrewLadder = (ctx: RoundCtx, rungs: number, force?: 'letter' | 'vowel' | 'dot'): LadderPlan => ({ ...ladderPlan(ctx, rungs, force), marked: true })

/** today's door words as neutral doors: the word is the plate's one word, and its own key (its syllables light on the plate) */
const hebrewDoorRounds = (ctx: RoundCtx, n: number): DoorRound[] => doorWords(ctx, n).map((w) => ({
  id: w.id, plate: [{ kind: 'word', id: w.id, text: w.text, soundId: `w-${w.id}`, itemId: w.id, picture: w.picture }], key: w.id, word: w,
}))
/** today's keys of a door word (the keys are door words: a key's picture is its image name) */
const hebrewDoorKeys = (ctx: RoundCtx, r: DoorRound) => doorKeys(ctx, r.word!)

export const HEBREW: Course = {
  id: 'he',
  game: 'book2',
  dir: 'rtl',
  stages: HEBREW_STAGES,
  rounds: {
    broomTarget, broomWave, cauldronRound: hebrewCauldron, ghostRound, ladderPlan: hebrewLadder, isNewStageChoice, features: sylFeatures,
    doorRounds: hebrewDoorRounds, doorKeys: hebrewDoorKeys, wordLinkFor, dotIntroFor, drawWords, bossTarget, bossWave,
    // a door word to spell, its syllables in the boxes and its picture on the page
    spellRound: (ctx) => heSpellRound(ctx, (key) => IMAGES[key]),
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
  lineVariations: (id) => lineById(id)?.variations ?? 1,
  // the first duel's rounds, lines and save, as always
  tower: { content: HEBREW_TOWER, tallies: () => progressTallies },
}
