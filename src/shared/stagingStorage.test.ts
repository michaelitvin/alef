import { describe, expect, it, beforeEach } from 'vitest'
import { STAGING_PREFIX, copyUnprefixedOver, installStagingStorage, isStaging, prefixedStorage } from './stagingStorage'

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
    localStorage.setItem('staging:alef-spellquest', 'only-in-staging')
    copyUnprefixedOver(localStorage, STAGING_PREFIX)
    expect(localStorage.getItem('staging:alef-progress')).toBe('real')
    expect(localStorage.getItem('staging:alef-clock')).toBe('clock')
    expect(localStorage.getItem('staging:alef-spellquest')).toBeNull()
    expect(localStorage.getItem('alef-progress')).toBe('real')
    expect(localStorage.length).toBe(4)
  })

  it('copies no telemetry log: a copy could fill the origin, and the child\'s next save write would fail', () => {
    const big = JSON.stringify({ v: 1, events: [{ t: 1, s: 'a', run: 1, e: 'round' }] })
    localStorage.setItem('alef-spellquest', '{"state":{},"version":1}')
    localStorage.setItem('alef-tower-history-telemetry', big)
    localStorage.setItem('alef-spellquest-telemetry', big)
    localStorage.setItem('alef-clock-telemetry', big)
    localStorage.setItem('staging:alef-spellquest-telemetry', 'staging log')
    copyUnprefixedOver(localStorage, STAGING_PREFIX)
    expect(localStorage.getItem('staging:alef-spellquest')).toBe('{"state":{},"version":1}')
    expect(localStorage.getItem('staging:alef-tower-history-telemetry')).toBeNull()
    expect(localStorage.getItem('staging:alef-spellquest-telemetry')).toBeNull()
    expect(localStorage.getItem('staging:alef-clock-telemetry')).toBeNull()
    // production's logs are untouched
    expect(localStorage.getItem('alef-tower-history-telemetry')).toBe(big)
    expect(localStorage.getItem('alef-spellquest-telemetry')).toBe(big)
    expect(localStorage.getItem('alef-clock-telemetry')).toBe(big)
  })

  it('installs the prefixed storage even when the copy fails (a full storage): staging never writes a real save', () => {
    localStorage.setItem('alef-progress', 'real')
    const real = localStorage
    const failing: Storage = {
      get length() { return real.length },
      key: (i) => real.key(i),
      getItem: (k) => real.getItem(k),
      setItem: () => { throw new DOMException('full', 'QuotaExceededError') },
      removeItem: (k) => real.removeItem(k),
      clear: () => real.clear(),
    }
    const win = {
      location: { href: 'https://example.test/alef/staging/?copy-prod' },
      localStorage: failing,
      confirm: () => true,
      history: { replaceState: () => {} },
    } as unknown as Window
    installStagingStorage(win)
    expect(win.localStorage).not.toBe(failing)
    expect(win.localStorage.getItem('alef-progress')).toBeNull()
    expect(real.getItem('alef-progress')).toBe('real')
  })
})
