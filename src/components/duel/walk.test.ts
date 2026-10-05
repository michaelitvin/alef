import { describe, it, expect } from 'vitest'
import { remainingWalkMs } from './Monster'

describe('remainingWalkMs', () => {
  it('a re-measure mid-walk tweens only the time left on the clock', () => {
    expect(remainingWalkMs(9000, 1000, 1000)).toBe(9000)
    expect(remainingWalkMs(9000, 1000, 7300)).toBe(2700) // 70% walked → 30% left
    expect(remainingWalkMs(9000, 1000, 20000)).toBe(0)
  })
})
