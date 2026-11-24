// @vitest-environment jsdom

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { STAGING_PREFIX, copyPrefixedBack, copyToProdBlocker, copyUnprefixedOver, installStagingStorage, isStaging, prefixedStorage } from './stagingStorage'

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
    localStorage.setItem('staging:alef-spellquest-he', 'only-in-staging')
    copyUnprefixedOver(localStorage, STAGING_PREFIX)
    expect(localStorage.getItem('staging:alef-progress')).toBe('real')
    expect(localStorage.getItem('staging:alef-clock')).toBe('clock')
    expect(localStorage.getItem('staging:alef-spellquest-he')).toBeNull()
    expect(localStorage.getItem('alef-progress')).toBe('real')
    expect(localStorage.length).toBe(4)
  })

  it('copies no telemetry log: a copy could fill the origin, and the child\'s next save write would fail', () => {
    const big = JSON.stringify({ v: 1, events: [{ t: 1, s: 'a', run: 1, e: 'round' }] })
    localStorage.setItem('alef-spellquest-he', '{"state":{},"version":1}')
    localStorage.setItem('alef-tower-history-telemetry', big)
    localStorage.setItem('alef-spellquest-he-telemetry', big)
    localStorage.setItem('alef-clock-telemetry', big)
    localStorage.setItem('staging:alef-spellquest-he-telemetry', 'staging log')
    copyUnprefixedOver(localStorage, STAGING_PREFIX)
    expect(localStorage.getItem('staging:alef-spellquest-he')).toBe('{"state":{},"version":1}')
    expect(localStorage.getItem('staging:alef-tower-history-telemetry')).toBeNull()
    expect(localStorage.getItem('staging:alef-spellquest-he-telemetry')).toBeNull()
    expect(localStorage.getItem('staging:alef-clock-telemetry')).toBeNull()
    // production's logs are untouched
    expect(localStorage.getItem('alef-tower-history-telemetry')).toBe(big)
    expect(localStorage.getItem('alef-spellquest-he-telemetry')).toBe(big)
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

  describe('?export-prod', () => {
    const setup = (href: string, ok = true) => {
      const download = vi.fn()
      const win = {
        location: { href }, localStorage, confirm: () => ok, navigator: { userAgent: 'UA' },
        history: { replaceState: vi.fn() },
      } as unknown as Window
      return { win, download }
    }
    const seed = () => {
      localStorage.setItem('alef-progress', '{"a":1}')
      localStorage.setItem('alef-spellquest-telemetry', 'H4sI\u00e9 raw')
      localStorage.setItem('staging:alef-progress', 'staging')
    }

    it('downloads exactly the unprefixed keys, byte-equal, and changes no key', () => {
      seed()
      const real = () => Object.fromEntries(Object.entries({ ...localStorage }).filter(([k]) => !k.startsWith('staging:'))) // staging's own key migration may write its marker
      const before = real()
      const { win, download } = setup('https://example.test/alef/staging/?export-prod')
      installStagingStorage(win, () => {}, download)
      expect(download).toHaveBeenCalledOnce()
      const [json, name] = download.mock.calls[0]
      const o = JSON.parse(json)
      expect(o).toMatchObject({ v: 1, kind: 'alef-prod-storage', userAgent: 'UA' })
      expect(Object.keys(o).sort()).toEqual(['exportedAt', 'keys', 'kind', 'userAgent', 'v'])
      expect(o.keys).toEqual({ 'alef-progress': '{"a":1}', 'alef-spellquest-telemetry': 'H4sI\u00e9 raw' })
      expect(name).toMatch(/^alef-prod-storage-\d{4}-\d{2}-\d{2}\.json$/)
      expect(real()).toEqual(before)
      expect((win.history.replaceState as ReturnType<typeof vi.fn>).mock.calls[0][2].toString()).not.toContain('export-prod')
    })

    it('downloads nothing when the parent cancels', () => {
      seed()
      const { win, download } = setup('https://example.test/alef/staging/?export-prod', false)
      installStagingStorage(win, () => {}, download)
      expect(download).not.toHaveBeenCalled()
    })

    it('does nothing in a production build (the install is never called there)', () => {
      expect(isStaging).toBe(false)
    })
  })

  describe('?copy-to-prod', () => {
    const marker = (done: string[]) => JSON.stringify({ v: 1, done })
    const seed = () => {
      localStorage.setItem('alef-progress', 'real')
      localStorage.setItem('alef-clock', 'real clock')
      localStorage.setItem('alef-spellquest-he-telemetry', 'real log')
      localStorage.setItem('alef-migrations', marker(['spellquest-two-names', 'tower-history']))
      localStorage.setItem('staging:alef-progress', 'staged')
      localStorage.setItem('staging:alef-spacecat', 'staged cat')
      localStorage.setItem('staging:alef-spellquest-he-telemetry', 'staging log')
      localStorage.setItem('staging:alef-migrations', marker(['spellquest-two-names', 'tower-history']))
    }
    const setup = (ok = true) => {
      const download = vi.fn()
      const alert = vi.fn()
      const win = {
        location: { href: 'https://example.test/alef/staging/?copy-to-prod' }, localStorage, confirm: () => ok, alert,
        navigator: { userAgent: 'UA' }, history: { replaceState: vi.fn() },
      } as unknown as Window
      return { win, download, alert }
    }

    it('copies staging over production: production\'s extra saves go, both logs stay', () => {
      seed()
      copyPrefixedBack(localStorage, STAGING_PREFIX)
      expect(localStorage.getItem('alef-progress')).toBe('staged')
      expect(localStorage.getItem('alef-spacecat')).toBe('staged cat')
      expect(localStorage.getItem('alef-clock')).toBeNull()
      expect(localStorage.getItem('alef-spellquest-he-telemetry')).toBe('real log')
      expect(localStorage.getItem('staging:alef-spellquest-he-telemetry')).toBe('staging log')
      expect(localStorage.getItem('staging:alef-progress')).toBe('staged')
    })

    it('downloads the real data first, then copies', () => {
      seed()
      const { win, download } = setup()
      installStagingStorage(win, () => {}, download)
      expect(download).toHaveBeenCalledOnce()
      const [json, name] = download.mock.calls[0]
      expect(JSON.parse(json).keys['alef-progress']).toBe('real')
      expect(name).toMatch(/^alef-prod-storage-before-copy-to-prod-\d{4}-\d{2}-\d{2}\.json$/)
      expect(localStorage.getItem('alef-progress')).toBe('staged')
      expect((win.history.replaceState as ReturnType<typeof vi.fn>).mock.calls[0][2].toString()).not.toContain('copy-to-prod')
    })

    it('changes nothing when the parent cancels', () => {
      seed()
      const { win, download } = setup(false)
      installStagingStorage(win, () => {}, download)
      expect(download).not.toHaveBeenCalled()
      expect(localStorage.getItem('alef-progress')).toBe('real')
    })

    it('refuses when the real game has not run a migration that staging ran (an older build reads other keys)', () => {
      seed()
      localStorage.removeItem('alef-migrations')
      expect(copyToProdBlocker(localStorage, STAGING_PREFIX)).toContain('spellquest-two-names')
      const { win, download, alert } = setup()
      installStagingStorage(win, () => {}, download)
      expect(alert).toHaveBeenCalledOnce()
      expect(download).not.toHaveBeenCalled()
      expect(localStorage.getItem('alef-progress')).toBe('real')
    })

    it('refuses when staging has no saves (the copy would only delete the child\'s)', () => {
      localStorage.setItem('alef-progress', 'real')
      localStorage.setItem('staging:alef-migrations', marker([]))
      localStorage.setItem('staging:alef-x-telemetry', 'log')
      expect(copyToProdBlocker(localStorage, STAGING_PREFIX)).toContain('no saves')
    })

    it('allows the copy when both sides ran the same migrations', () => {
      seed()
      expect(copyToProdBlocker(localStorage, STAGING_PREFIX)).toBeNull()
    })
  })
})
