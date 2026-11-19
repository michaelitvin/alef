import { describe, expect, it } from 'vitest'
import type { TelemetryEvent } from '../shared/telemetry'
import { GOLDEN_ENGLISH } from '../shared/__fixtures__/telemetry/generate'
import { englishTelemetry } from './telemetry'
import { englishFacts } from './telemetryLog'

const ev = (t: number, e: string, data: Record<string, unknown>): TelemetryEvent => ({ t, s: 'x', run: 1, e, g: 'english', ...data })

describe('the English log\'s roll-up', () => {
  it('helped is not right in the roll-up', () => {
    const facts = englishFacts([
      ev(1, 'answer', { screen: 'cauldron', target: 'a', word: 'cat', result: 'helped', ms: 900, tapped: 'a' }),
      ev(2, 'answer', { screen: 'tower', target: 'cat', result: 'helped', clock: 2 }),
      ev(3, 'answer', { screen: 'ghosts', target: 'map', result: 'right', ms: 800, tapped: 'map' }),
    ])
    expect(facts).toEqual([
      { item: 'cauldron:cat', hint: true, t: 1 },
      { item: 'tower:cat', hint: true, t: 2 },
      { item: 'ghosts:map', ok: true, near: false, t: 3, ms: 800 },
    ])
    expect(facts.slice(0, 2).every((f) => f.ok === undefined)).toBe(true)
  })

  it('a missed unit is told apart by its word; placement answers go by stage', () => {
    const facts = englishFacts([
      ev(1, 'answer', { screen: 'cauldron', target: 'a', word: 'cat', result: 'wrong', ms: 1200, tapped: 'o' }),
      ev(2, 'answer', { screen: 'cauldron', target: 'a', word: 'map', result: 'wrong', ms: 1300, tapped: 'i' }),
      ev(3, 'placement-answer', { stage: 4, target: 'frog', result: 'right', clock: 3 }),
      ev(4, 'placement-answer', { stage: 4, target: 'sluk', result: 'wrong', clock: 4 }),
      ev(5, 'blend-hint', { via: 'tower', round: 3 }),
      ev(6, 'blend-hint', { screen: 'cauldron', by: 'idle', words: 1 }),
    ])
    expect(facts.map((f) => f.item)).toEqual(['cauldron:cat', 'cauldron:map', 'placement:4', 'placement:4'])
    expect(facts[0]).toMatchObject({ ok: false, chosen: 'o' })
    expect(facts[2]).toMatchObject({ ok: true })
  })

  it('the tower\'s answer takes its latency and pick from the tower\'s choice', () => {
    const tw = (t: number, e: string, data: Record<string, unknown>) => ev(t, e, { ...data, via: 'tower', visit: 1 })
    expect(englishFacts([
      tw(1, 'round', { round: 4, target: 'ship' }),
      tw(2, 'choice', { round: 4, key: 'shop', twin: true, msShown: 2300 }),
      ev(3, 'answer', { screen: 'tower', target: 'ship', result: 'wrong', clock: 3 }),
    ])).toEqual([{ item: 'tower:ship', ok: false, near: true, t: 3, ms: 2300, chosen: 'shop' }])
  })

  it('every English event carries g: english', () => {
    localStorage.clear()
    englishTelemetry.track('answer', { screen: 'cauldron', target: 'a', word: 'cat', result: 'right' })
    englishTelemetry.track('blend-hint', { via: 'tower', round: 1 })
    const evs = englishTelemetry.events()
    expect(evs.length).toBe(2)
    expect(evs.every((e) => e.g === 'english')).toBe(true)
    localStorage.clear()
    // the fixtures: every event from the day `g` existed on has it, the tower's too
    const fx = GOLDEN_ENGLISH().filter((e) => e.g !== undefined)
    expect(fx.length).toBeGreaterThan(50)
    expect(fx.every((e) => e.g === 'english')).toBe(true)
    expect(fx.some((e) => e.e === 'blend-hint' && e.via === 'tower' && 'round' in e)).toBe(true)
    expect(fx.some((e) => e.e === 'blend-hint' && e.via === undefined && 'screen' in e)).toBe(true)
    expect(fx.some((e) => e.result === 'helped')).toBe(true)
  })
})
