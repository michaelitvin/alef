import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, renderHook } from '@testing-library/react'
import { STAGING_PREFIX, prefixedStorage } from './stagingStorage'

// Old saves as the old builds wrote them (zustand persist: { state, version }).
const SPELLQUEST_SAVE = '{"state":{"stage":2,"totalStars":120,"coins":12,"settings":{"sfx":false,"music":false,"volume":0.35,"drawing":true,"range":100}},"version":7}'
const CLOCK_SAVE = '{"state":{"progress":{"level":3,"newAnswers":""},"gears":40,"settings":{"langs":["he"],"heCursiveMix":true,"enCapsMix":false,"sfx":true,"music":false,"volume":0.5}},"version":1}'
const load = async () => { vi.resetModules(); return import('./deviceSettings') }
const stored = () => JSON.parse(localStorage.getItem('alef-device')!)

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('device settings: one sound setting for every game', () => {
  it('seeds once from an old Spell Quest save, and writes the key at once', async () => {
    localStorage.setItem('alef-spellquest', SPELLQUEST_SAVE)
    localStorage.setItem('alef-clock', CLOCK_SAVE)
    const d = await load()
    expect(d.getDeviceSettings()).toEqual({ v: 1, sfx: false, music: false, volume: 0.35 })
    expect(stored()).toEqual({ v: 1, sfx: false, music: false, volume: 0.35 })
    // the old saves are not changed
    expect(localStorage.getItem('alef-spellquest')).toBe(SPELLQUEST_SAVE)
    expect(localStorage.getItem('alef-clock')).toBe(CLOCK_SAVE)
  })

  it('seeds from the clock save when there is no Spell Quest save', async () => {
    localStorage.setItem('alef-clock', CLOCK_SAVE)
    const d = await load()
    expect(d.getDeviceSettings()).toEqual({ v: 1, sfx: true, music: false, volume: 0.5 })
  })

  it('a Spell Quest save from before it had sound fields falls through to the clock, then the defaults', async () => {
    localStorage.setItem('alef-spellquest', '{"state":{"totalStars":5},"version":1}')
    localStorage.setItem('alef-clock', '{"state":{"settings":{"music":false}},"version":1}')
    const d = await load()
    expect(d.getDeviceSettings()).toEqual({ v: 1, sfx: true, music: false, volume: 0.8 })
  })

  it('defaults with no old save, and with broken ones', async () => {
    let d = await load()
    expect(d.getDeviceSettings()).toEqual({ v: 1, sfx: true, music: true, volume: 0.8 })
    localStorage.clear()
    localStorage.setItem('alef-spellquest', '{not json')
    localStorage.setItem('alef-clock', 'null')
    d = await load()
    expect(d.getDeviceSettings()).toEqual({ v: 1, sfx: true, music: true, volume: 0.8 })
  })

  it('a later change in the Spell Quest save does not seed again', async () => {
    localStorage.setItem('alef-spellquest', SPELLQUEST_SAVE)
    let d = await load()
    d.getDeviceSettings()
    localStorage.setItem('alef-spellquest', SPELLQUEST_SAVE.replace('"sfx":false', '"sfx":true').replace('0.35', '1'))
    expect(d.getDeviceSettings()).toEqual({ v: 1, sfx: false, music: false, volume: 0.35 })
    d = await load() // a new page load
    expect(d.getDeviceSettings()).toEqual({ v: 1, sfx: false, music: false, volume: 0.35 })
  })

  it('the parent\'s change is kept, clamped, and read by every page', async () => {
    const d = await load()
    d.setDeviceSettings({ music: false })
    d.setDeviceSettings({ volume: 3 })
    expect(stored()).toEqual({ v: 1, sfx: true, music: false, volume: 1 })
    const again = await load()
    expect(again.getDeviceSettings()).toEqual({ v: 1, sfx: true, music: false, volume: 1 })
  })

  it('staging reads and writes its own prefixed copy, seeded from its own copy of the saves', async () => {
    localStorage.setItem('alef-spellquest', SPELLQUEST_SAVE)
    localStorage.setItem(STAGING_PREFIX + 'alef-spellquest', SPELLQUEST_SAVE.replace('0.35', '0.6'))
    const real = window.localStorage
    Object.defineProperty(window, 'localStorage', { value: prefixedStorage(real, STAGING_PREFIX), configurable: true })
    try {
      const d = await load()
      expect(d.getDeviceSettings().volume).toBe(0.6)
      d.setDeviceSettings({ sfx: true })
    } finally {
      Object.defineProperty(window, 'localStorage', { value: real, configurable: true })
    }
    expect(JSON.parse(real.getItem(STAGING_PREFIX + 'alef-device')!)).toEqual({ v: 1, sfx: true, music: false, volume: 0.6 })
    expect(real.getItem('alef-device')).toBeNull() // production's seed waits for production
  })

  it('a staging copy-prod carries the production setting over', async () => {
    localStorage.setItem('alef-device', '{"v":1,"sfx":false,"music":true,"volume":0.4}')
    const { copyUnprefixedOver } = await import('./stagingStorage')
    copyUnprefixedOver(localStorage, STAGING_PREFIX)
    expect(localStorage.getItem(STAGING_PREFIX + 'alef-device')).toBe('{"v":1,"sfx":false,"music":true,"volume":0.4}')
  })

  it('a full storage never throws: the setting holds for this page', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    const d = await load()
    const a = d.getDeviceSettings()
    expect(d.getDeviceSettings()).toBe(a) // a stable snapshot (useSyncExternalStore loops on a new object)
    expect(() => d.setDeviceSettings({ music: false })).not.toThrow()
    expect(d.getDeviceSettings().music).toBe(false)
  })

  it('the hook follows a change on this page, a storage event from another page, and a page restored from the cache', async () => {
    const d = await load()
    const { result } = renderHook(() => d.useDeviceSettings())
    expect(result.current.music).toBe(true)
    act(() => d.setDeviceSettings({ music: false }))
    expect(result.current.music).toBe(false)
    act(() => {
      localStorage.setItem('alef-device', '{"v":1,"sfx":true,"music":true,"volume":0.2}')
      window.dispatchEvent(new StorageEvent('storage', { key: 'alef-device' }))
    })
    expect(result.current.volume).toBe(0.2)
    act(() => {
      localStorage.setItem('alef-device', '{"v":1,"sfx":false,"music":true,"volume":0.2}')
      window.dispatchEvent(new Event('pageshow'))
    })
    expect(result.current.sfx).toBe(false)
  })
})

describe('the lessons follow the device setting', () => {
  const howls: { src: string }[] = []
  beforeEach(() => {
    howls.length = 0
    vi.doMock('howler', () => {
      class Howl {
        src: string
        constructor(o: { src: string[] }) { this.src = o.src[0]; howls.push(this) }
        state() { return 'loaded' }
        volume() { return 1 }
        off() { return this }
        on() { return this }
        once() { return this }
        play() { return 1 }
        stop() { return this }
      }
      return { Howl, Howler: { volume: vi.fn(), ctx: null } }
    })
  })
  afterEach(() => vi.doUnmock('howler'))

  it('effects off silences the effects only: the voice still plays (the child cannot read)', async () => {
    localStorage.setItem('alef-device', '{"v":1,"sfx":false,"music":true,"volume":0.5}')
    vi.resetModules()
    const { useAudio, useSoundEffects } = await import('../hooks/useAudio')
    let voice: ReturnType<typeof useAudio> | null = null
    let fx: ReturnType<typeof useSoundEffects> | null = null
    const Probe = () => { voice = useAudio(); fx = useSoundEffects(); return null }
    render(<Probe />)
    void fx!.playSuccess()
    void fx!.playPageTurn()
    expect(howls).toHaveLength(0)
    void voice!.play('/voice/aleph.mp3')
    await Promise.resolve()
    expect(howls.map((h) => h.src)).toEqual(['/voice/aleph.mp3'])
  })

  it('effects on: the effects play at the device volume', async () => {
    localStorage.setItem('alef-device', '{"v":1,"sfx":true,"music":true,"volume":0.3}')
    vi.resetModules()
    const howler = await import('howler')
    const { useSoundEffects } = await import('../hooks/useAudio')
    let fx: ReturnType<typeof useSoundEffects> | null = null
    const Probe = () => { fx = useSoundEffects(); return null }
    render(<Probe />)
    void fx!.playSuccess()
    await Promise.resolve()
    expect(howls.map((h) => h.src)).toEqual([expect.stringMatching(/success\.mp3$/)])
    expect(howler.Howler.volume).toHaveBeenCalledWith(0.3)
  })
})
