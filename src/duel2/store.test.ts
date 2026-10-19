import { beforeEach, describe, expect, it } from 'vitest'
import { useDuel2Store } from './store'
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
})
