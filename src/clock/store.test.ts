import { beforeEach, describe, expect, it } from 'vitest'
import { useClockStore } from './store'
import type { RoundPlan } from './logic/types'

const plan = (over: Partial<RoundPlan> = {}): RoundPlan => ({
  exercise: 'what', time: { h: 3, m: 0 }, isNew: true, lang: 'he', level: 1, kind: 'wall',
  scaffolds: { numbers: 'all', slice: false, hint: null, hintAuto: false, seconds: false }, options: [], correctIndex: 0,
  families: ['hour1'], linked: false, features: ['m:0', 'ex:what', 'tr:hour1'], predicted: 0.1, ...over,
})
const right = { correct: true, nearMiss: false, tag: null, chosen: { h: 3, m: 0 } }
const wrong = { correct: false, nearMiss: false, tag: 'hour1' as const, chosen: { h: 4, m: 0 } }

describe('clock store', () => {
  beforeEach(() => useClockStore.getState().resetProgress())
  it('records tallies, recent answers and the round number', () => {
    useClockStore.getState().recordRound(plan(), wrong, false)
    const s = useClockStore.getState()
    expect(s.tallies['tr:hour1']).toEqual({ seen: 1, wrong: 1 })
    expect(s.recent['m:0']).toBe('x')
    expect(s.confusions['3-00']['4-00']).toBe(1)
    expect(s.mistakes).toEqual([{ round: 0, tag: 'hour1' }])
    expect(s.roundNo).toBe(1)
  })
  it('five right on new times level up', () => {
    let up = false
    for (let i = 0; i < 5; i++) up = useClockStore.getState().recordRound(plan(), right, false).levelUp
    expect(up).toBe(true)
    expect(useClockStore.getState().progress.level).toBe(2)
  })
  it('a forgiven round does not count toward the level', () => {
    useClockStore.getState().recordRound(plan(), right, true)
    expect(useClockStore.getState().progress.newAnswers).toBe('')
    expect(useClockStore.getState().recent['m:0']).toBe('x')
  })
  it('reset keeps the settings', () => {
    useClockStore.getState().setSettings({ langs: ['en'] })
    useClockStore.getState().addGears(5)
    useClockStore.getState().resetProgress()
    expect(useClockStore.getState().gears).toBe(0)
    expect(useClockStore.getState().settings.langs).toEqual(['en'])
  })
  it('a version 1 save passes the migrate step unchanged', () => {
    const migrate = useClockStore.persist.getOptions().migrate!
    const saved = { gears: 5, progress: { level: 3, newAnswers: 'oo' } }
    expect(migrate(saved, 1)).toBe(saved)
  })
})
