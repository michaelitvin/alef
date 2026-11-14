import { describe, expect, it, beforeEach } from 'vitest'
import { STAGING_PREFIX, copyUnprefixedOver, isStaging, prefixedStorage } from './stagingStorage'

describe('staging storage (keeps staging saves apart from production saves)', () => {
  beforeEach(() => localStorage.clear())

  it('is off in a production build', () => {
    expect(isStaging).toBe(false)
  })

  it('writes and reads under the prefix only', () => {
    const s = prefixedStorage(localStorage, STAGING_PREFIX)
    s.setItem('alef-progress', 'staging')
    expect(localStorage.getItem('staging:alef-progress')).toBe('staging')
    expect(localStorage.getItem('alef-progress')).toBeNull()
    expect(s.getItem('alef-progress')).toBe('staging')
  })

  it('does not see or touch production keys', () => {
    localStorage.setItem('alef-progress', 'real')
    const s = prefixedStorage(localStorage, STAGING_PREFIX)
    expect(s.getItem('alef-progress')).toBeNull()
    s.setItem('alef-clock', 'x')
    expect(s.length).toBe(1)
    expect(s.key(0)).toBe('alef-clock')
    s.removeItem('alef-progress')
    s.clear()
    expect(localStorage.getItem('alef-progress')).toBe('real')
    expect(localStorage.length).toBe(1)
  })

  it('copies production over staging: old staging saves go, production saves stay', () => {
    localStorage.setItem('alef-progress', 'real')
    localStorage.setItem('alef-clock', 'clock')
    localStorage.setItem('staging:alef-progress', 'old')
    localStorage.setItem('staging:alef-duel2', 'only-in-staging')
    copyUnprefixedOver(localStorage, STAGING_PREFIX)
    expect(localStorage.getItem('staging:alef-progress')).toBe('real')
    expect(localStorage.getItem('staging:alef-clock')).toBe('clock')
    expect(localStorage.getItem('staging:alef-duel2')).toBeNull()
    expect(localStorage.getItem('alef-progress')).toBe('real')
    expect(localStorage.length).toBe(4)
  })
})
