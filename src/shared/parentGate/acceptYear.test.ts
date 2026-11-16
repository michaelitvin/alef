import { describe, expect, it } from 'vitest'
import { acceptYear } from './acceptYear'

describe('acceptYear', () => {
  const now = new Date(2026, 10, 16)
  it('takes any year 18 to 100 years before now', () => {
    expect(acceptYear(2008, now)).toBe(true)
    expect(acceptYear(1926, now)).toBe(true)
    expect(acceptYear(1985, now)).toBe(true)
  })
  it('refuses a child\'s year, a year too long ago, the future and a non-integer', () => {
    expect(acceptYear(2009, now)).toBe(false)
    expect(acceptYear(1925, now)).toBe(false)
    expect(acceptYear(2030, now)).toBe(false)
    expect(acceptYear(1985.5, now)).toBe(false)
    expect(acceptYear(NaN, now)).toBe(false)
  })
})
