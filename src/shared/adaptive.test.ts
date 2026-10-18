import { describe, expect, it } from 'vitest'
import { pickNearTarget, predictedMistakeRate, pushRecent, RECENT_KEEP } from './adaptive'

describe('predictedMistakeRate', () => {
  it('returns the prior with no data', () => {
    expect(predictedMistakeRate(undefined, '', 0.1)).toBeCloseTo(0.1)
    expect(predictedMistakeRate(undefined)).toBeCloseTo(0.25)
  })
  it('falls with correct answers and rises with misses', () => {
    expect(predictedMistakeRate({ seen: 10, wrong: 0 }, 'oooo', 0.2)).toBeLessThan(0.1)
    expect(predictedMistakeRate({ seen: 4, wrong: 3 }, 'xxo', 0.2)).toBeGreaterThan(0.4)
  })
})

describe('pickNearTarget', () => {
  it('prefers the candidate nearest 0.2', () => {
    let hits = 0
    for (let i = 0; i < 400; i++) if (pickNearTarget(Math.random, [0.01, 0.2, 0.9]) === 1) hits++
    expect(hits).toBeGreaterThan(300)
  })
  it('takes the hardest when none reaches the target', () => {
    let hits = 0
    for (let i = 0; i < 400; i++) if (pickNearTarget(Math.random, [0.01, 0.02, 0.08]) === 2) hits++
    expect(hits).toBeGreaterThan(250)
  })
})

describe('pushRecent', () => {
  it('keeps the newest answers', () => {
    expect(pushRecent('o'.repeat(RECENT_KEEP), true)).toBe('o'.repeat(RECENT_KEEP - 1) + 'x')
    expect(pushRecent(undefined, false)).toBe('o')
  })
})
