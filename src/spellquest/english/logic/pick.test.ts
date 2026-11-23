import { describe, expect, it } from 'vitest'
import type { Rng } from '../../../shared/adaptive'
import type { RoundCtx } from '../../logic/rounds'
import { unit, unitsOfStage } from '../content/units'
import { predict } from '../../logic/predict'
import { enAnswerOnly, enFeatures, enPrior, pickUnit, unitChoice } from './pick'

const seeded = (seed: number): Rng => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)

const ctxWith = (tallies: RoundCtx['tallies'], recent: RoundCtx['recent'] = {}, stage = 1): RoundCtx => ({
  rng: seeded(7), stage, tallies, recent, confusions: { letters: {}, syllables: {} },
})
const POOL = ['a', 'm', 's'].map(unit)
const CALM = { a: { seen: 20, wrong: 0 }, m: { seen: 20, wrong: 0 }, s: { seen: 20, wrong: 0 } }
const share = (ctx: RoundCtx, id: string) => {
  let n = 0
  for (let i = 0; i < 1000; i++) if (pickUnit(ctx, POOL).id === id) n++
  return n
}

describe('enFeatures', () => {
  it('a unit: its id and the screen', () => expect(enFeatures(unitChoice(unit('sh')), 'broom')).toEqual(['sh', 'sc:broom']))
  it('a word: its units and blend patterns', () => {
    const f = enFeatures({ kind: 'word', id: 'stop', text: 'stop', soundId: '', itemId: 'stop' }, 'doors')
    expect(f).toEqual(expect.arrayContaining(['s', 't', 'o', 'p', 'sc:doors']))
    expect(f).toEqual(expect.arrayContaining(['st-']))
  })
  it('a heart word: heart:<word>', () => {
    expect(enFeatures({ kind: 'word', id: 'the', text: 'the', soundId: '', itemId: 'the', heart: true }, 'doors')).toEqual(['heart:the', 'sc:doors'])
  })
})

describe('the English prior', () => {
  it('with no tallies, w and m predict the same', () => {
    const rate = (id: string) => predict(enFeatures(unitChoice(unit(id)), 'broom'), {}, {}, enPrior)
    expect(rate('w')).toBe(rate('m'))
    expect(rate('l')).toBe(rate('m'))
  })
})

describe('pickUnit', () => {
  it('a known unit he starts to miss is picked more', () => {
    const calm = ctxWith(CALM)
    const missing = ctxWith({ ...CALM, a: { seen: 20, wrong: 3 } }, { a: 'ooxo' })
    expect(share(missing, 'a')).toBeGreaterThan(share(calm, 'a'))
  })
  it('the stage\'s new units are picked on more than their share of the pool', () => {
    const pool = [...unitsOfStage(1), ...unitsOfStage(2)]
    const ctx = ctxWith({}, {}, 2)
    let fresh = 0
    for (let i = 0; i < 1000; i++) if (pickUnit(ctx, pool).stage === 2) fresh++
    expect(fresh).toBeGreaterThan(600)
  })
})

describe('enAnswerOnly', () => {
  const word = { kind: 'word' as const, id: 'map', text: 'map', soundId: '', itemId: 'map' }
  it('a word is also tallied as w:<id>; a unit is not', () => {
    expect(enAnswerOnly(word)).toEqual(['w:map'])
    expect(enAnswerOnly(unitChoice(unit('m')))).toEqual([])
    expect(enFeatures(word, 'broom')).not.toContain('w:map')
  })
  it('a w: tally changes no pick and no rng draw', () => {
    const picks = (tallies: RoundCtx['tallies']) => { const ctx = ctxWith(tallies); return Array.from({ length: 50 }, () => pickUnit(ctx, POOL).id) }
    expect(picks({ ...CALM, 'w:map': { seen: 9, wrong: 9 }, 'w:sat': { seen: 4, wrong: 4 } })).toEqual(picks(CALM))
  })
})
