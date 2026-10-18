import { describe, expect, it } from 'vitest'
import { CUSTOMERS, bonusGears, kindsUpTo, langForRound, pickCustomer, pickKind, realTimeFor } from './workday'

describe('workday', () => {
  it('langForRound gives a block of rounds per language, Hebrew first; with one language always uses it', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((r) => langForRound(r, ['he', 'en']))).toEqual(['he', 'he', 'he', 'he', 'en', 'en', 'en', 'en'])
    expect(langForRound(9, ['he', 'en'])).toBe('en')
    expect([0, 1, 2].map((r) => langForRound(r, ['en']))).toEqual(['en', 'en', 'en'])
  })
  it('customers speak the round language and do not repeat back to back', () => {
    for (let i = 0; i < 50; i++) {
      const c = pickCustomer(Math.random, 'en', 'owl')
      expect(c.lang).toBe('en')
      expect(c.id).not.toBe('owl')
    }
    expect(CUSTOMERS.filter((c) => c.lang === 'he')).toHaveLength(4)
  })
  it('kinds unlock by level and a forced kind wins', () => {
    expect(kindsUpTo(1).map((k) => k.id)).toEqual(['wall', 'alarm'])
    expect(pickKind(Math.random, 1, 'cuckoo')).toBe('cuckoo')
    for (let i = 0; i < 30; i++) expect(['wall', 'alarm']).toContain(pickKind(Math.random, 1))
  })
  it('bonus gears by closeness to 12', () => {
    expect(bonusGears(3)).toBe(3)
    expect(bonusGears(350)).toBe(3)
    expect(bonusGears(25)).toBe(2)
    expect(bonusGears(50)).toBe(1)
    expect(bonusGears(180)).toBe(0)
  })
  it('real time rounds to five minutes and only when covered', () => {
    expect(realTimeFor(new Date(2026, 9, 15, 15, 28, 40), [0, 30])).toEqual({ h: 3, m: 30 })
    expect(realTimeFor(new Date(2026, 9, 15, 0, 1, 0), [0])).toEqual({ h: 12, m: 0 })
    expect(realTimeFor(new Date(2026, 9, 15, 15, 20, 0), [0, 30])).toBeNull()
    expect(realTimeFor(new Date(2026, 9, 15, 23, 58, 0), [0])).toEqual({ h: 12, m: 0 })
  })
})
