import { describe, it, expect, vi, beforeEach } from 'vitest'

type Handler = (...a: unknown[]) => void
const instances: FakeHowl[] = []
class FakeHowl {
  src: string[]
  handlers: Record<string, Handler[]> = {}
  _vol = 1
  _rate = 1
  playing_ = false
  constructor(o: { src: string[] }) {
    this.src = o.src
    instances.push(this)
  }
  on(ev: string, fn: Handler) { (this.handlers[ev] ||= []).push(fn); return this }
  once(ev: string, fn: Handler) { return this.on(ev, fn) }
  emit(ev: string) { const hs = this.handlers[ev] || []; this.handlers[ev] = []; hs.forEach((f) => f(1)) }
  play() { this.playing_ = true; return 1 }
  stop() { this.playing_ = false; this.emit('stop'); return this }
  rate(r?: number) { if (r !== undefined) this._rate = r; return this._rate }
  volume(v?: number) { if (v !== undefined) this._vol = v; return this._vol }
  fade(_a: number, b: number) { this._vol = b; return this }
  playing() { return this.playing_ }
  state() { return 'loaded' }
  load() { return this }
}
vi.mock('howler', () => ({ Howl: FakeHowl, Howler: { mute: vi.fn(), volume: vi.fn(), ctx: { state: 'running', resume: vi.fn() } } }))
vi.mock('../../assets/duel/audioFiles', () => ({
  SFX_URLS: { arrival1: 'a1', arrival2: 'a2', arrival3: 'a3', cast: 'c', boom1: 'b1', boom2: 'b2', ouch: 'o', mega: 'm', sparkle: 's' },
  MUSIC_URLS: { calm: 'mc', mid: 'mm', fast: 'mf', boss1: 'mb1', boss2: 'mb2', victory: 'mv' },
  VOICE_URLS: { 'wiz-kamatz': 'wk', 'mon-vowel-a': 'mva' },
}))

const byUrl = (u: string) => instances.find((i) => i.src[0] === u)!

beforeEach(() => {
  vi.useFakeTimers()
  instances.length = 0
  vi.resetModules()
})

describe('duelAudio', () => {
  it('playLine resolves when the line ends and clamps the rate to 0.7–1.3', async () => {
    const audio = await import('./duelAudio')
    const p = audio.playLine('mon-vowel-a', 2)
    expect(byUrl('mva')._rate).toBe(1.3)
    byUrl('mva').emit('end')
    await expect(p).resolves.toBeUndefined()
    void audio.playLine('mon-vowel-a', 0.1)
    expect(byUrl('mva')._rate).toBe(0.7)
  })
  it('a missing line resolves immediately', async () => {
    const audio = await import('./duelAudio')
    await expect(audio.playLine('nope')).resolves.toBeUndefined()
  })
  it('a line that never ends resolves after the safety timeout', async () => {
    const audio = await import('./duelAudio')
    let done = false
    void audio.playLine('wiz-kamatz').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(4900)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    expect(done).toBe(true)
  })
  it('a line that fails to load resolves', async () => {
    const audio = await import('./duelAudio')
    const p = audio.playLine('wiz-kamatz')
    byUrl('wk').emit('loaderror')
    await expect(p).resolves.toBeUndefined()
  })
  it('ducks music while a line plays and restores it after', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: true, volume: 1 })
    audio.playMusic('calm')
    const m = byUrl('mc')
    expect(m._vol).toBeGreaterThan(0.2)
    const p = audio.playLine('wiz-kamatz')
    expect(m._vol).toBeLessThan(0.2)
    byUrl('wk').emit('end')
    await p
    expect(m._vol).toBeGreaterThan(0.2)
  })
  it('music off: playMusic does nothing; tracks by wave', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: false, volume: 1 })
    audio.playMusic('calm')
    expect(instances.some((i) => i.src[0] === 'mc' && i.playing())).toBe(false)
    expect(audio.trackForWave(2, false)).toBe('calm')
    expect(audio.trackForWave(4, false)).toBe('mid')
    expect(audio.trackForWave(7, false)).toBe('fast')
    expect(audio.trackForWave(5, true)).toBe('boss')
  })
  it('boss tracks alternate', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: true, volume: 1 })
    audio.playMusic('boss')
    expect(byUrl('mb1').playing()).toBe(true)
    audio.playMusic('calm')
    audio.playMusic('boss')
    expect(byUrl('mb2').playing()).toBe(true)
  })
  it('sfx off: playSfx resolves without playing', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: false, music: true, volume: 1 })
    await expect(audio.playSfx('arrival')).resolves.toBeUndefined()
    expect(instances.filter((i) => i.playing())).toHaveLength(0)
  })
  it('playSfx resolves when the effect ends', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: true, volume: 1 })
    const p = audio.playSfx('cast')
    byUrl('c').emit('end')
    await expect(p).resolves.toBeUndefined()
  })
})
