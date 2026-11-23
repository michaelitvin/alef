import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEnglishStore } from './store'
import { englishSavePort, memoryEnglishSavePort } from './savePort'
import { readEnglishSave } from './saveFormat'
import { createRunStore, useSpellQuestStore } from '../spellquest/store'

const HEBREW_SAVE_RAW = JSON.stringify({ state: { coins: 42, totalStars: 300, stage: { stage: 3, newAnswers: 'oo' } }, version: 7 })

describe('the English save', () => {
  beforeEach(() => { useEnglishStore.getState().resetProgress(); localStorage.clear() })

  it('English coins never reach the Hebrew purse', () => {
    localStorage.setItem('alef-spellquest', HEBREW_SAVE_RAW)
    useEnglishStore.getState().addCoins(5)
    expect(localStorage.getItem('alef-spellquest')).toBe(HEBREW_SAVE_RAW)
    expect(readEnglishSave()!.coins).toBe(5)
  })

  it('a fresh English save starts at 0 coins, stage 1, no placement', () => {
    expect(memoryEnglishSavePort().read()).toMatchObject({ coins: 0, screensOpen: true, stage: { stage: 1 }, placement: { done: null, requested: false } })
  })

  it('the English store is its own save, at version 2, with the path on', () => {
    expect(useEnglishStore.persist.getOptions().name).toBe('alef-english')
    expect(useEnglishStore.persist.getOptions().version).toBe(2)
    expect(useEnglishStore.getState().settings.path).toBe(true)
  })

  it('the Hebrew store is unchanged', () => {
    expect(useSpellQuestStore.persist.getOptions().name).toBe('alef-spellquest')
    expect(useSpellQuestStore.persist.getOptions().version).toBe(8)
  })

  it('the store asks its own stage rule', () => {
    const rule = vi.fn(() => ({ progress: { stage: 5, newAnswers: '' }, passed: true }))
    const s = createRunStore({ key: 'test-run', version: 1, migrate: (x) => x, recordStageAnswer: rule })
    expect(s.getState().recordAnswer({ features: ['a'], miss: false, newStage: true })).toEqual({ passed: true })
    expect(rule).toHaveBeenCalledWith({ stage: 1, newAnswers: '' }, true)
    expect(s.getState().stage.stage).toBe(5)
  })

  it('the English store keeps a new-stage answer, and passes a stage by the English rule', () => {
    const p = memoryEnglishSavePort()
    for (let i = 0; i < 4; i++) expect(p.recordAnswer({ features: ['a'], miss: false, newStage: true }).passed).toBe(false)
    expect(p.read().stage).toEqual({ stage: 1, newAnswers: 'oooo' })
    expect(p.recordAnswer({ features: ['a'], miss: false, newStage: true }).passed).toBe(true)
    expect(p.read().stage).toEqual({ stage: 2, newAnswers: '' })
  })

  it('opened stations only grow; seeded tallies never lower a count', () => {
    const p = memoryEnglishSavePort(); p.openStations(['tower', 'broom']); p.openStations(['tower'])
    expect(p.read().openedStations).toEqual(['tower', 'broom'])
    p.seedTallies({ a: { seen: 3 } }); p.seedTallies({ a: { seen: 1 } })
    expect(p.read().tallies.a.seen).toBe(3)
  })

  it('the English writes land in the English save', () => {
    const p = memoryEnglishSavePort()
    p.setStage(4)
    p.setPlacement({ state: null, requested: true, done: null, runs: 1 })
    p.setIntro('sh', { asked: 1, skipped: false, after: '', known: false })
    p.setLastRunWords(['cat', 'dog'])
    expect(p.read()).toMatchObject({
      stage: { stage: 4, newAnswers: '' }, placement: { requested: true, runs: 1 },
      introSeen: { sh: { asked: 1 } }, lastRunWords: ['cat', 'dog'],
    })
  })

  it('the tower keeps its answers in the English save, never in the lessons\' save', () => {
    const p = memoryEnglishSavePort()
    p.towerTallies().recordTowerRound('a', 'A', 'correct', 500)
    p.towerTallies().setTowerPace(1.2)
    expect(p.read().tower).toMatchObject({ byMark: { a: { seen: 1, correct: 1 } }, recent: { a: 'o' }, pace: 1.2 })
    expect(p.towerTallies().read().byMark.a.seen).toBe(1)
  })

  it('the real port writes the English save and leaves the Hebrew one as it is', () => {
    localStorage.setItem('alef-spellquest', HEBREW_SAVE_RAW)
    englishSavePort().openStations(['tower'])
    englishSavePort().addCoins(2)
    expect(readEnglishSave()).toMatchObject({ openedStations: ['tower'], coins: 2 })
    expect(localStorage.getItem('alef-spellquest')).toBe(HEBREW_SAVE_RAW)
  })

  it('a missing or broken save reads as null', () => {
    expect(readEnglishSave()).toBeNull()
    localStorage.setItem('alef-english', '{not json')
    expect(readEnglishSave()).toBeNull()
  })
})
