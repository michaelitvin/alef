import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, coinsOf, migrateSave, useDuel2Store } from './store'
import type { Choice } from './logic/rounds'

const ch = (itemId: string, group: 'a' | 'i', mark: 'kamatz' | 'chirik'): Choice =>
  ({ kind: 'syllable', id: `${itemId}-${mark}`, text: '', soundId: '', itemId, group, mark })

describe('duel2 store', () => {
  beforeEach(() => useDuel2Store.getState().resetProgress())
  it('drawing is on for a new player', () => { expect(DEFAULT_SETTINGS.drawing).toBe(true) })
  it('the parent can still turn drawing off', () => {
    useDuel2Store.getState().setSettings({ drawing: false })
    expect(useDuel2Store.getState().settings.drawing).toBe(false)
    useDuel2Store.getState().setSettings({ drawing: true })
  })
  it('a version-4 save keeps everything, gets his old coins as a balance, and drawing turns on by itself', () => {
    const v4 = { stage: { stage: 3, newAnswers: '' }, totalStars: 137, crystals: 2, bossesBeaten: ['bat'],
      settings: { sfx: true, music: false, volume: 0.5, drawing: false }, strokeMarks: { 'ד-print': 'ok' } }
    const out = migrateSave(v4, 4)
    expect(out.coins).toBe(13)
    expect(out.settings.drawing).toBe(true)
    expect(out.settings.music).toBe(false)
    expect(out.totalStars).toBe(137)
    expect(out.crystals).toBe(2)
    expect(out.stage).toEqual({ stage: 3, newAnswers: '' })
    expect(out.bossesBeaten).toEqual(['bat'])
    expect(out.strokeMarks).toEqual({ 'ד-print': 'ok' })
  })
  it('a version-4 save opened by the new build: rehydrated, his coins and drawing on', async () => {
    localStorage.setItem('alef-duel2', JSON.stringify({ state: { totalStars: 42, crystals: 3, settings: { sfx: true, music: true, volume: 0.8, drawing: false } }, version: 4 }))
    await useDuel2Store.persist.rehydrate()
    const s = useDuel2Store.getState()
    expect(s.coins).toBe(4)
    expect(s.totalStars).toBe(42)
    expect(s.settings.drawing).toBe(true)
  })
  it('an older save runs every step: the stroke marks are cleared and the coins moved over', () => {
    const out = migrateSave({ totalStars: 25, strokeMarks: { 'ה-print': 'ok', 'ש-hand': 'ok' } }, 3)
    expect(out.strokeMarks).toEqual({ 'ש-hand': 'ok' })
    expect(out.coins).toBe(2)
    expect(out.settings.drawing).toBe(true)
  })
  it('coins go up and down; he cannot spend more than he has', () => {
    const s = useDuel2Store.getState()
    s.addCoins(5)
    expect(s.spendCoins(7)).toBe(false)
    expect(useDuel2Store.getState().coins).toBe(5)
    expect(useDuel2Store.getState().spendCoins(3)).toBe(true)
    expect(useDuel2Store.getState().coins).toBe(2)
    useDuel2Store.getState().resetProgress()
    expect(useDuel2Store.getState().coins).toBe(0)
  })
  it('the stroke review marks are kept, and a reset of his progress keeps them (they are the parent’s)', () => {
    useDuel2Store.getState().markStrokes('ד-print', 'ok')
    useDuel2Store.getState().markStrokes('ר-hand', 'wrong')
    useDuel2Store.getState().markStrokes('ר-hand', null)
    useDuel2Store.getState().resetProgress()
    expect(useDuel2Store.getState().strokeMarks).toEqual({ 'ד-print': 'ok' })
  })
  it('recordAnswer updates each feature and recent', () => {
    useDuel2Store.getState().recordAnswer({ features: ['l:bet', 'v:a'], miss: true, newStage: false })
    const s = useDuel2Store.getState()
    expect(s.tallies['l:bet']).toEqual({ seen: 1, wrong: 1 })
    expect(s.recent['v:a']).toBe('x')
  })
  it('confusions are kept by direction, letters and vowels apart', () => {
    useDuel2Store.getState().recordAnswer({ features: [], miss: true, newStage: false, asked: ch('bet', 'a', 'kamatz'), tapped: ch('khaf', 'a', 'kamatz') })
    let s = useDuel2Store.getState()
    expect(s.confusions.letters.bet.khaf).toBe(1)
    expect(s.confusions.vowels).toEqual({})
    expect(s.confusions.syllables['bet-a']['khaf-a']).toBe(1)
    useDuel2Store.getState().recordAnswer({ features: [], miss: true, newStage: false, asked: ch('bet', 'a', 'kamatz'), tapped: ch('bet', 'i', 'chirik') })
    s = useDuel2Store.getState()
    expect(s.confusions.vowels.a.i).toBe(1)
  })
  it('newStage answers drive the stage', () => {
    let passed = false
    for (let i = 0; i < 5; i++) ({ passed } = useDuel2Store.getState().recordAnswer({ features: [], miss: false, newStage: true }))
    expect(passed).toBe(true)
    expect(useDuel2Store.getState().stage.stage).toBe(2)
  })
  it('endRun keeps lastEnded and best', () => {
    useDuel2Store.getState().endRun('ladder', 30)
    useDuel2Store.getState().endRun('broom', 12)
    const s = useDuel2Store.getState()
    expect(s.lastEnded).toBe('broom')
    expect(s.bestRun).toBe(30)
    expect(s.runs).toBe(2)
  })
  it('reset keeps settings', () => {
    useDuel2Store.getState().setSettings({ music: false })
    useDuel2Store.getState().markDemo('broom')
    useDuel2Store.getState().resetProgress()
    expect(useDuel2Store.getState().settings.music).toBe(false)
    expect(useDuel2Store.getState().demosSeen).toEqual([])
  })
  it('every star is kept at once, across plays; a coin for every 10 (the parent: points that only grow from time to time)', () => {
    useDuel2Store.getState().resetProgress()
    for (let i = 0; i < 23; i++) useDuel2Store.getState().addStar()
    useDuel2Store.getState().endRun('broom', 23)
    expect(useDuel2Store.getState().totalStars).toBe(23)
    expect(coinsOf(useDuel2Store.getState().totalStars)).toBe(2)
  })
  it('keeps the bosses he beat, the last boss, the potion introduction and bonus stars; reset clears them', () => {
    const st = useDuel2Store.getState()
    st.markBossBeaten('dot')
    st.markBossBeaten('dot')
    st.markBossBeaten('bat')
    st.setLastBoss('bat')
    st.markPotionIntro()
    st.addStars(10)
    let s = useDuel2Store.getState()
    expect(s.bossesBeaten).toEqual(['dot', 'bat'])
    expect(s.lastBoss).toBe('bat')
    expect(s.potionIntroSeen).toBe(true)
    expect(coinsOf(s.totalStars)).toBe(1)
    s.resetProgress()
    s = useDuel2Store.getState()
    expect(s.bossesBeaten).toEqual([])
    expect(s.lastBoss).toBeNull()
    expect(s.potionIntroSeen).toBe(false)
  })
  it('the stroke marks of the letters changed after the review (2026-11-07) are cleared; the other marks stay', async () => {
    const marks = { 'ד-hand': 'ok', 'ד-print': 'ok', 'ה-print': 'wrong', 'ש-hand': 'wrong', 'ף-hand': 'wrong' }
    localStorage.setItem('alef-duel2', JSON.stringify({ state: { totalStars: 5, strokeMarks: marks }, version: 1 }))
    await useDuel2Store.persist.rehydrate()
    const s = useDuel2Store.getState()
    expect(s.strokeMarks).toEqual({ 'ד-print': 'ok', 'ש-hand': 'wrong' })
    expect(s.totalStars).toBe(5)
    // a save already past that point keeps every mark
    localStorage.setItem('alef-duel2', JSON.stringify({ state: { strokeMarks: marks }, version: 4 }))
    await useDuel2Store.persist.rehydrate()
    expect(useDuel2Store.getState().strokeMarks).toEqual(marks)
  })
  it('version 3: the marks of the letters changed after the second review are cleared too; the other marks stay', async () => {
    const marks = { 'ב-hand': 'ok', 'ג-hand': 'ok', 'ש-hand': 'ok', 'ב-print': 'ok', 'ף-hand': 'wrong' }
    localStorage.setItem('alef-duel2', JSON.stringify({ state: { strokeMarks: marks }, version: 2 }))
    await useDuel2Store.persist.rehydrate()
    expect(useDuel2Store.getState().strokeMarks).toEqual({ 'ש-hand': 'ok', 'ב-print': 'ok' })
    localStorage.setItem('alef-duel2', JSON.stringify({ state: { strokeMarks: marks }, version: 4 }))
    await useDuel2Store.persist.rehydrate()
    expect(useDuel2Store.getState().strokeMarks).toEqual(marks)
  })
  it('version 4: the marks of the letters changed after the third review are cleared; the other marks stay', async () => {
    const marks = { 'ה-print': 'ok', 'מ-print': 'ok', 'מ-hand': 'ok', 'ר-hand': 'wrong', 'ש-hand': 'ok', 'ב-hand': 'ok' }
    localStorage.setItem('alef-duel2', JSON.stringify({ state: { strokeMarks: marks }, version: 3 }))
    await useDuel2Store.persist.rehydrate()
    expect(useDuel2Store.getState().strokeMarks).toEqual({ 'ש-hand': 'ok', 'ב-hand': 'ok' })
  })
  it('an old save without the boss fields gets their defaults (never drops his progress)', async () => {
    localStorage.setItem('alef-duel2', JSON.stringify({ state: { totalStars: 42, crystals: 3 }, version: 1 }))
    await useDuel2Store.persist.rehydrate()
    const s = useDuel2Store.getState()
    expect(s.totalStars).toBe(42)
    expect(s.bossesBeaten).toEqual([])
    expect(s.potionIntroSeen).toBe(false)
  })
})
