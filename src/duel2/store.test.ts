import { beforeEach, describe, expect, it } from 'vitest'
import { coinsOf, useDuel2Store } from './store'
import type { Choice } from './logic/rounds'

const ch = (itemId: string, group: 'a' | 'i', mark: 'kamatz' | 'chirik'): Choice =>
  ({ kind: 'syllable', id: `${itemId}-${mark}`, text: '', soundId: '', itemId, group, mark })

describe('duel2 store', () => {
  beforeEach(() => useDuel2Store.getState().resetProgress())
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
  it('an old save without the boss fields gets their defaults (never drops his progress)', async () => {
    localStorage.setItem('alef-duel2', JSON.stringify({ state: { totalStars: 42, crystals: 3 }, version: 1 }))
    await useDuel2Store.persist.rehydrate()
    const s = useDuel2Store.getState()
    expect(s.totalStars).toBe(42)
    expect(s.bossesBeaten).toEqual([])
    expect(s.potionIntroSeen).toBe(false)
  })
})
