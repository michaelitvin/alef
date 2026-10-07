import { describe, it, expect } from 'vitest'
import { feedbackPlan, nextBossStart, BOSS_KNOCKBACK } from './flow'
import type { Outcome, Round } from '../../types/duel'
import { markById } from './marks'
import { wordsFor } from './words'

const round = (boss: boolean): Round => ({
  id: 1, type: 'A', target: markById('segol'), runes: [], word: wordsFor('e')[0], padWords: [], monster: boss ? 'dragon' : 'fuzzy', boss, walkMs: 8000,
})
const out = (kind: 'hit' | 'miss', final: boolean): Outcome => ({ kind, choiceKey: kind === 'hit' ? 'segol' : 'kamatz', mega: false, final, points: 10, effect: 'boom' })

describe('feedback plan: bosses flow, regular rounds teach', () => {
  it('a boss hit that does not finish it: just the sound, no banner, a short pause', () => {
    const p = feedbackPlan(round(true), out('hit', false))
    expect(p).toMatchObject({ say: 'sound', banner: false })
    expect(p.waitMs + p.tailMs).toBeLessThan(feedbackPlan(round(false), out('hit', true)).waitMs + 500)
  })
  it('the final boss hit, a boss miss and every regular round keep the full sound → name → word', () => {
    expect(feedbackPlan(round(true), out('hit', true))).toMatchObject({ say: 'full', banner: true })
    expect(feedbackPlan(round(true), out('miss', false))).toMatchObject({ say: 'full', banner: true })
    expect(feedbackPlan(round(false), out('hit', true))).toMatchObject({ say: 'full', banner: true })
  })
})

describe('a boss keeps coming from where it was', () => {
  it('a hit knocks it back a step from where it stood', () => {
    // started at 0.2 of the way, walked half its remaining time → stood at 0.6
    expect(nextBossStart(0.2, 4000, 8000, 'correct')).toBeCloseTo(0.6 - BOSS_KNOCKBACK, 5)
  })
  it('never behind the starting edge; a monster that reached the tower starts over', () => {
    expect(nextBossStart(0, 500, 8000, 'correct')).toBe(0)
    expect(nextBossStart(0.5, 8000, 8000, 'timeout')).toBe(0)
  })
  it('a wrong tap: it bonks the tower and recoils further', () => {
    expect(nextBossStart(0, 4000, 8000, 'wrong')).toBeLessThan(nextBossStart(0, 4000, 8000, 'correct'))
  })
})
