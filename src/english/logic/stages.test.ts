import { describe, expect, it } from 'vitest'
import { EN_MAX_STAGE, EN_ORDER, EN_SESSION_LENGTH, EN_VISIT, enRecordStageAnswer, enScreensOfStage } from './stages'
import { SESSION_LENGTH, cycleOf } from '../../spellquest/logic/run'
import { memoryEnglishSavePort } from '../savePort'
import { ENGLISH } from '../course'
import { runPass, visitLength, type PassFacts } from '../../spellquest/policies/pass'

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** the answers `seq` ('o' right, 'x' wrong) on the new items of `stage`: did one of them pass it? */
function passAfter(seq: string, stage: number, ready: number[] = ALL): boolean {
  let p = { stage, newAnswers: '' }
  for (const c of seq) {
    const r = enRecordStageAnswer(p, c === 'o', ready)
    if (r.passed) return true
    p = r.progress
  }
  return false
}

describe('the English stages', () => {
  it('the cycle: the tower, the minigames, the spell book, then drawing', () => {
    expect(EN_ORDER).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell', 'draw'])
    expect(EN_MAX_STAGE).toBe(9)
  })
  it('stage 1 has every screen but the ghosts', () => {
    expect(enScreensOfStage(1)).not.toContain('ghosts')
    expect(enScreensOfStage(1)).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'doors', 'spell', 'draw'])
  })
  it('the ghosts open at stage 2', () => {
    expect(enScreensOfStage(2)).toContain('ghosts')
    for (const s of ALL.slice(1)) expect(enScreensOfStage(s)).toEqual(EN_ORDER)
  })
  it('handwriting is never in the English cycle', () => {
    expect(EN_VISIT['draw-hand']).toBe(0)
    for (const s of ALL) expect(cycleOf(s, true, true, ENGLISH.stages)).not.toContain('draw-hand')
    expect(cycleOf(4, true, true, ENGLISH.stages)).toEqual(EN_ORDER)
    expect(cycleOf(4, false, true, ENGLISH.stages)).not.toContain('draw')
  })
  it('a visit is 5 answers on a screen; the doors 6; the tower 1 wave; a session is Spell Quest\'s', () => {
    expect(EN_VISIT).toEqual({ tower: 1, broom: 5, cauldron: 5, ladder: 5, ghosts: 5, doors: 6, spell: 5, draw: 5, 'draw-hand': 0 })
    expect(EN_SESSION_LENGTH).toEqual(SESSION_LENGTH)
  })
  it('5 right first, or 8 of the last 10, pass stages 1–8', () => {
    expect(passAfter('ooooo', 3)).toBe(true); expect(passAfter('oxoooooooo', 3)).toBe(true); expect(passAfter('xxoooooooo', 3)).toBe(true)
    expect(passAfter('ooooo', 8)).toBe(true)
    expect(passAfter('xxxooooooo', 3)).toBe(false)
    expect(passAfter('ooooo', 9)).toBe(false)
  })
  it('a pass opens the next stage with no answers', () => {
    expect(enRecordStageAnswer({ stage: 5, newAnswers: 'oooo' }, true, ALL)).toEqual({ progress: { stage: 6, newAnswers: '' }, passed: true })
  })
  it('never passes into a stage that is not ready', () => {
    expect(enRecordStageAnswer({ stage: 3, newAnswers: 'oooo' }, true, [1, 2, 3]).passed).toBe(false)
    expect(passAfter('oooooooooooo', 3, [1, 2, 3])).toBe(false)
  })
  it('the course\'s stages are these, with the ready stages', () => {
    expect(ENGLISH.stages).toMatchObject({ maxStage: 9, order: EN_ORDER, drawing: ['draw'], visit: EN_VISIT, sessionLength: EN_SESSION_LENGTH })
    expect(ENGLISH.stages.screensOfStage(1)).toEqual(enScreensOfStage(1))
    expect(ENGLISH.stages.screensOfStage(2)).toEqual(enScreensOfStage(2))
    // tests are not strict: every stage is ready
    expect(ENGLISH.stages.recordStageAnswer({ stage: 8, newAnswers: 'oooo' }, true)).toEqual({ progress: { stage: 9, newAnswers: '' }, passed: true })
  })
  it('the English store passes stage 4 (the Hebrew rule never does)', () => {
    const p = memoryEnglishSavePort({ stage: { stage: 4, newAnswers: 'oooo' } })
    expect(p.recordAnswer({ features: ['u:sh'], miss: false, newStage: true }).passed).toBe(true)
    expect(p.read().stage.stage).toBe(5)
  })
  it('the run\'s pass plays the course\'s cycle and visits (the Hebrew ones by default)', () => {
    const he: PassFacts = { stage: 4, draw: false, screensOpen: true, recent: {}, towerRecent: {}, cycleNo: 0, towerTail: '' }
    const en: PassFacts = { ...he, stages: ENGLISH.stages }
    expect(runPass({ mode: 'run', lastEnded: 'doors', facts: en }).screen).toBe('spell')
    // (the Hebrew run has the spell book after the doors too, from stage 4: Task 26)
    expect(runPass({ mode: 'run', lastEnded: 'doors', facts: he }).screen).toBe('spell')
    expect(runPass({ mode: 'run', lastEnded: 'spell', facts: he }).screen).toBe('tower')
    expect(visitLength('gallery', 'doors', en)).toBe(6)
    expect(visitLength('gallery', 'doors', he)).toBe(3)
    expect(visitLength('session', 'cauldron', en)).toBe(EN_SESSION_LENGTH.cauldron)
  })
})
