import { beforeEach, describe, expect, it } from 'vitest'
import { SAVE_VERSION, migrateSave, renameSpellQuestFieldsV8 } from './saveFormat'
import { useSpellQuestStore } from './store'
import { ENGLISH_SAVE_VERSION, migrateEnglishSave, readEnglishSave, renameEnglishFieldsV2 } from '../english/saveFormat'
import { useEnglishStore } from '../english/store'

const SETTINGS = { sfx: true, music: true, volume: 0.8, drawing: true, range: 100 }
const V7 = {
  stage: { stage: 2, newAnswers: 'oo' }, tallies: { a: { seen: 3 } }, coins: 12, totalStars: 130, settings: SETTINGS,
  towerWave: 4, towerVisits: 2, towerTail: 'ooxo', bookOpen: true, firstDuelImported: true, cycleNo: 3,
}
const V8 = {
  stage: { stage: 2, newAnswers: 'oo' }, tallies: { a: { seen: 3 } }, coins: 12, totalStars: 130, settings: SETTINGS,
  towerWave: 4, towerVisits: 2, towerTail: 'ooxo', screensOpen: true, towerImported: true, cycleNo: 3,
}

describe('Spell Quest save version 8: bookOpen and firstDuelImported get new names', () => {
  beforeEach(() => localStorage.clear())

  it('moves both fields, keeping the values (true and false)', () => {
    expect(renameSpellQuestFieldsV8(V7)).toEqual(V8)
    expect(renameSpellQuestFieldsV8({ bookOpen: false, firstDuelImported: false })).toEqual({ screensOpen: false, towerImported: false })
  })
  it('is a no-op when the old names are absent', () => {
    expect(renameSpellQuestFieldsV8(V8)).toEqual(V8)
    expect(renameSpellQuestFieldsV8({})).toEqual({})
  })
  it('migrateSave: a version-7 save reaches the new shape, a version-8 save is unchanged', () => {
    expect(migrateSave(V7, 7)).toEqual(V8)
    expect(migrateSave(V8, SAVE_VERSION)).toEqual(V8)
  })
  it('migrateSave: a version-6 save gets screensOpen from its stage', () => {
    const m = migrateSave({ stage: { stage: 0, newAnswers: '' }, settings: SETTINGS }, 6) as Record<string, unknown>
    expect(m.screensOpen).toBe(false)
    expect('bookOpen' in m).toBe(false)
  })
  it('the store loads a version-7 save and reads the values through the new names', async () => {
    localStorage.setItem('alef-spellquest', JSON.stringify({ state: V7, version: 7 }))
    await useSpellQuestStore.persist.rehydrate()
    const s = useSpellQuestStore.getState() as unknown as Record<string, unknown>
    expect(s).toMatchObject({ screensOpen: true, towerImported: true, towerTail: 'ooxo', coins: 12 })
    expect('bookOpen' in s).toBe(false)
    expect('firstDuelImported' in s).toBe(false)
  })
})

describe('English save version 2: the same two fields', () => {
  beforeEach(() => localStorage.clear())

  const EN_V1 = { ...V7, settings: { ...SETTINGS, path: true }, placement: { state: null, requested: false, done: null, runs: 1 }, tower: { byMark: {}, confusions: {}, recent: { a: 'oo' }, pace: 1 }, openedStations: ['spell'] }
  const EN_V2 = { ...V8, settings: { ...SETTINGS, path: true }, placement: EN_V1.placement, tower: EN_V1.tower, openedStations: ['spell'] }

  it('moves the fields, deep-equal to the hand-written shape', () => {
    expect(renameEnglishFieldsV2(EN_V1)).toEqual(EN_V2)
    expect(migrateEnglishSave(EN_V1, 1)).toEqual(EN_V2)
  })
  it('a version-2 save is unchanged, and a subset (no old fields) is a no-op', () => {
    expect(migrateEnglishSave(EN_V2, ENGLISH_SAVE_VERSION)).toEqual(EN_V2)
    expect(renameEnglishFieldsV2({ coins: 3 })).toEqual({ coins: 3 })
  })
  it('the store and the light reader read a version-1 save through the new names', async () => {
    localStorage.setItem('alef-english', JSON.stringify({ state: EN_V1, version: 1 }))
    expect(readEnglishSave()).toMatchObject({ screensOpen: true, towerImported: true })
    await useEnglishStore.persist.rehydrate()
    expect(useEnglishStore.getState()).toMatchObject({ screensOpen: true, towerImported: true, coins: 12 })
  })
})
