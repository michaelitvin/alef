import { describe, expect, it, vi } from 'vitest'
// a fake music Howl that is still loading: start and stop must not queue work that plays after the load
const { fake } = vi.hoisted(() => {
  const handlers: Record<string, (() => void)[]> = {}
  const fake = {
    loaded: false, isPlaying: false, vol: 1,
    state: () => (fake.loaded ? 'loaded' : 'loading'),
    once: (ev: string, fn: () => void) => { (handlers[ev] ||= []).push(fn) },
    play: vi.fn(() => { fake.isPlaying = true; return 1 }),
    stop: vi.fn(() => { fake.isPlaying = false }),
    fade: vi.fn(), playing: () => fake.isPlaying,
    volume: (v?: number) => { if (v !== undefined) fake.vol = v; return fake.vol },
    finishLoad: () => { fake.loaded = true; for (const fn of handlers.load ?? []) fn(); handlers.load = [] },
  }
  return { fake }
})
vi.mock('../../shared/audioCore', async (orig) => ({ ...(await orig<object>()), getHowl: () => fake }))
vi.mock('../assets/audioFiles', async (orig) => ({ ...(await orig<object>()), MUSIC_URLS: ['m.mp3'] }))
import { startMusic, stopMusic } from './clockAudio'

describe('clock music', () => {
  it('a stop while the music is still loading: it never plays', () => {
    startMusic(0)
    stopMusic()
    fake.finishLoad()
    expect(fake.play).not.toHaveBeenCalled()
    expect(fake.playing()).toBe(false)
  })
  it('a start while loading plays once the file is loaded', () => {
    fake.loaded = false
    fake.play.mockClear()
    startMusic(0)
    expect(fake.play).not.toHaveBeenCalled()
    fake.finishLoad()
    expect(fake.play).toHaveBeenCalledTimes(1)
    stopMusic()
  })
})
