import { describe, expect, it } from 'vitest'
import type { Rng } from '../../../shared/adaptive'
import type { Mark } from '../predict'
import { afterAnswer, chooseRound, type Ladder, type Part } from './index'
import { ALL_ON, lcg, ladderWith } from './testkit'

/** a seeded child: right with chance p(rung) */
function play(l: Ladder, n: number, p: (rung: string) => number, rng: Rng) {
  let ladder = l
  const log: { part: Part; mark: Mark }[] = []
  let last: { fact?: string; sinceZero: number } = { sinceZero: 0 }
  for (let i = 0; i < n; i++) {
    const c = chooseRound(ladder, { rng, set: ALL_ON, stats: {}, last })
    const mark: Mark = rng() < p(c.item.rung) ? 'o' : rng() < 0.3 ? 't' : 'x'
    ladder = afterAnswer(c.ladder, { item: c.item, part: c.part, mark, fast: mark === 'o' && rng() < 0.5, now: i * 5000, set: ALL_ON }).ladder
    log.push({ part: c.part, mark })
    last = { fact: c.item.fact, sinceZero: last.sinceZero + 1 }
  }
  return { ladder, log }
}
function longestFrontierMistakes(log: { part: Part; mark: Mark }[]): number {
  let run = 0, worst = 0
  for (const r of log) {
    run = r.part === 'frontier' && r.mark !== 'o' ? run + 1 : 0
    worst = Math.max(worst, run)
  }
  return worst
}

describe('the ladder in practice', () => {
  it('never 3 mistakes in a row on the frontier part of a run of 1000 answers of a child who knows nothing', () => {
    const { log } = play(ladderWith({}), 1000, () => 0, lcg(11))
    expect(longestFrontierMistakes(log)).toBeLessThanOrEqual(2)
  })
  it('nor of a child who is right 70% of the time', () => {
    for (const seed of [12, 13, 14]) {
      const { log } = play(ladderWith({}), 1000, () => 0.7, lcg(seed))
      expect(longestFrontierMistakes(log)).toBeLessThanOrEqual(2)
      expect(log.filter((r) => r.part === 'frontier').length).toBeGreaterThan(20)
    }
  })
  it('afterAnswer keeps the time of his last answer and his last two marks', () => {
    const l = ladderWith({})
    const c = chooseRound(l, { rng: lcg(1), set: ALL_ON, stats: {}, last: { sinceZero: 0 } })
    const out = afterAnswer(c.ladder, { item: c.item, part: c.part, mark: 'x', fast: false, now: 1234, set: ALL_ON }).ladder
    expect(out.lastAt).toBe(1234)
    expect(out.lastMarks).toBe('x')
  })
})
