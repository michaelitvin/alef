import { describe, it, expect, vi, beforeEach } from 'vitest'

type Handler = (...a: unknown[]) => void
const instances: FakeHowl[] = []
class FakeHowl {
  src: string[]
  handlers: Record<string, Handler[]> = {}
  _vol = 1
  _rate = 1
  playing_ = false
  html5: boolean
  constructor(o: { src: string[]; html5?: boolean }) {
    this.src = o.src
    this.html5 = !!o.html5
    instances.push(this)
  }
  on(ev: string, fn: Handler) { (this.handlers[ev] ||= []).push(fn); return this }
  once(ev: string, fn: Handler) { return this.on(ev, fn) }
  emit(ev: string) { const hs = this.handlers[ev] || []; this.handlers[ev] = []; hs.forEach((f) => f(1)) }
  plays = 0
  play() { this.playing_ = true; this.plays++; return 1 }
  pause() { this.playing_ = false; return this }
  stop() { this.playing_ = false; this.emit('stop'); return this }
  rate(r?: number) { if (r !== undefined) this._rate = r; return this._rate }
  volume(v?: number) { if (v !== undefined) this._vol = v; return this._vol }
  fade(_a: number, b: number) { this._vol = b; return this }
  playing() { return this.playing_ }
  state() { return 'loaded' }
  load() { return this }
}
vi.mock('howler', () => ({ Howl: FakeHowl, Howler: { mute: vi.fn(), volume: vi.fn(), ctx: { state: 'running', resume: vi.fn() } } }))
vi.mock('../../assets/duel/lineCues', () => ({ LINE_CUES: { 'line-mega': [{ at: 1.15, cue: 'lightning' }], nope: [{ at: 0.5, cue: 'pad' }] } }))
vi.mock('../../assets/duel/audioFiles', () => ({
  SFX_URLS: { arrival1: 'a1', arrival2: 'a2', arrival3: 'a3', cast: 'c', boom1: 'b1', boom2: 'b2', ouch: 'o', mega: 'm', sparkle: 's' },
  MUSIC_URLS: { calm: 'mc', mid: 'mm', fast: 'mf', boss1: 'mb1', boss2: 'mb2', victory: 'mv' },
  MUSIC_SETS: { calm: ['mc', 'mc2', 'mc3'], mid: ['mm', 'mm2'], fast: ['mf'], boss: ['mb1', 'mb2', 'mb3'], victory: ['mv'] },
  VOICE_URLS: { 'wiz-kamatz': 'wk', 'line-mega': 'lm' },
}))

const byUrl = (u: string) => instances.find((i) => i.src[0] === u)!

beforeEach(() => {
  vi.useFakeTimers()
  instances.length = 0
  vi.resetModules()
})

describe('duelAudio', () => {
  it('playLine resolves when the line ends', async () => {
    const audio = await import('./duelAudio')
    const p = audio.playLine('wiz-kamatz')
    byUrl('wk').emit('end')
    await expect(p).resolves.toBeUndefined()
  })
  it('speech plays faster with natural pitch: html5 audio (pitch-preserving) at VOICE_RATE', async () => {
    const audio = await import('./duelAudio')
    void audio.playLine('wiz-kamatz')
    expect(audio.VOICE_RATE).toBeGreaterThan(1.05)
    expect(byUrl('wk')._rate).toBe(audio.VOICE_RATE)
    expect(byUrl('wk').html5).toBe(true)
    audio.playSfx('cast')
    expect(byUrl('c').html5).toBe(false) // effects stay on Web Audio
  })
  it('dramatic lines pause the music outright and resume the same track after', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: true, volume: 1 })
    audio.playMusic('calm')
    const m = instances.find((i) => i.playing())!
    const p = audio.playLine('line-mega')
    await vi.advanceTimersByTimeAsync(400)
    expect(m.playing()).toBe(false)
    byUrl('lm').emit('end')
    await p
    expect(m.playing()).toBe(true)
    expect(m.plays).toBe(2) // resumed, not a second track layered on top
    expect(m._vol).toBeGreaterThan(0.2)
  })
  it('ordinary lines only duck the music (it keeps playing)', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: true, volume: 1 })
    audio.playMusic('calm')
    void audio.playLine('wiz-kamatz')
    await vi.advanceTimersByTimeAsync(400)
    expect(instances.find((i) => i.src[0].startsWith('mc'))!.playing()).toBe(true)
  })
  it('a cue fires when its word is spoken (file time ÷ VOICE_RATE)', async () => {
    const audio = await import('./duelAudio')
    const cues: string[] = []
    void audio.playLine('line-mega', (c) => cues.push(c))
    await vi.advanceTimersByTimeAsync((1.15 / audio.VOICE_RATE) * 1000 - 50)
    expect(cues).toEqual([])
    await vi.advanceTimersByTimeAsync(100)
    expect(cues).toEqual(['lightning'])
    byUrl('lm').emit('end')
    await vi.advanceTimersByTimeAsync(10)
    expect(cues).toEqual(['lightning']) // once
  })
  it('cues not yet fired fire when the line ends early, fails or is missing (the lightning always appears)', async () => {
    const audio = await import('./duelAudio')
    const cues: string[] = []
    const p = audio.playLine('line-mega', (c) => cues.push(c))
    byUrl('lm').emit('loaderror')
    await p
    expect(cues).toEqual(['lightning'])
    const missing: string[] = []
    await audio.playLine('nope', (c) => missing.push(c))
    expect(missing).toEqual(['pad'])
  })
  it('a missing line resolves immediately', async () => {
    const audio = await import('./duelAudio')
    await expect(audio.playLine('nope')).resolves.toBeUndefined()
  })
  it('a line that never ends resolves after the safety timeout', async () => {
    const audio = await import('./duelAudio')
    let done = false
    void audio.playLine('wiz-kamatz').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(8900)
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
    const m = instances.find((i) => i.src[0].startsWith('mc'))!
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
  it('music varies: each new wave switches to another variation of its tier; the same wave keeps it', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: true, volume: 1 })
    const playing = () => instances.filter((i) => i.playing()).map((i) => i.src[0])
    audio.playMusic('calm', 1)
    const first = playing()
    audio.playMusic('calm', 1)
    expect(playing()).toEqual(first) // same wave: keeps playing
    const seen = new Set(first)
    for (let w = 2; w <= 6; w++) {
      vi.advanceTimersByTime(400) // the previous track fades out
      const before = playing()[0]
      audio.playMusic('calm', w)
      vi.advanceTimersByTime(400)
      const now = playing()
      expect(now).toHaveLength(1)
      expect(now[0]).not.toBe(before)
      seen.add(now[0])
    }
    expect(seen.size).toBe(3) // every calm variation came up
  })
  it('boss tracks alternate', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: true, volume: 1 })
    audio.playMusic('boss', 5)
    const a = instances.find((i) => i.playing())!.src[0]
    audio.playMusic('calm', 6)
    vi.advanceTimersByTime(400)
    audio.playMusic('boss', 10)
    vi.advanceTimersByTime(400)
    const b = instances.filter((i) => i.playing()).map((i) => i.src[0]).find((u) => u.startsWith('mb'))
    expect(b).toBeTruthy()
    expect(b).not.toBe(a)
  })
  it('a boss fight keeps one boss track across its rounds', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: true, volume: 1 })
    audio.playMusic('boss', 5)
    const a = instances.find((i) => i.playing())!.src[0]
    audio.playMusic('boss', 5)
    audio.playMusic('boss', 5)
    expect(byUrl(a).playing()).toBe(true)
    expect(instances.filter((i) => i.src[0].startsWith('mb'))).toHaveLength(1)
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
