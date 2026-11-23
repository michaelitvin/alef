// @vitest-environment jsdom

// the tower's audio as it drives Howler: which files play, at which rate and volume, when the cues fire, what a stop
// stops, the mute and the unlock. Howler itself is faked (its Howl class and the global Howler), so this pins the
// behaviour through any refactor of the layers above it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
const HowlerG = vi.hoisted(() => ({ mute: vi.fn(), volume: vi.fn(), ctx: { state: 'running', resume: vi.fn() } }))
vi.mock('howler', () => ({ Howl: FakeHowl, Howler: HowlerG }))
vi.mock('../assets/lineCues', () => ({ LINE_CUES: { 'line-mega': [{ at: 1.15, cue: 'lightning' }], nope: [{ at: 0.5, cue: 'pad' }], 'line-intro': [{ at: 2, cue: 'tower' }], 'line-intro-f': [{ at: 3, cue: 'tower' }] } }))
vi.mock('../assets/audioFiles', () => ({
  SFX_URLS: { arrival1: 'a1', arrival2: 'a2', arrival3: 'a3', cast: 'c', boom1: 'b1', boom2: 'b2', ouch: 'o', mega: 'm', sparkle: 's' },
  VOICE_URLS: { 'wiz-kamatz': 'wk', 'line-mega': 'lm', 'line-intro': 'li', 'line-intro-f': 'lif', 'line-over': 'lo' },
}))

const byUrl = (u: string) => instances.find((i) => i.src[0] === u)!

beforeEach(() => {
  vi.useFakeTimers()
  instances.length = 0
  vi.resetModules()
  HowlerG.mute.mockClear()
  HowlerG.volume.mockClear()
  HowlerG.ctx.resume.mockClear()
  HowlerG.ctx.state = 'running'
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('towerAudio', () => {
  it('a girl hears the feminine take (with its own cues); a missing one falls back to the masculine take and is logged', async () => {
    const player = await import('../../../shared/player')
    const track = vi.fn()
    player.setGender('girl', 'child')
    const audio = await import('./towerAudio')
    audio.setTowerAudioLog({ track }) // the tower's visit sets its log (Spell Quest's)
    const cues: string[] = []
    void audio.playLine('line-intro', (c) => cues.push(c))
    expect(byUrl('lif')).toBeTruthy()
    expect(instances.find((i) => i.src[0] === 'li')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(2000 / audio.VOICE_RATE + 10)
    expect(cues).toEqual([])
    await vi.advanceTimersByTimeAsync(1000 / audio.VOICE_RATE)
    expect(cues).toEqual(['tower'])
    void audio.playLine('line-over')
    expect(byUrl('lo')).toBeTruthy()
    expect(track).toHaveBeenCalledWith('voice-fallback', { id: 'line-over' })
    void audio.playLine('wiz-kamatz')
    expect(byUrl('wk')).toBeTruthy()
    expect(audio.lineAsset('line-intro')).toEqual({ id: 'line-intro', file: 'line-intro-f', url: 'lif' })
    expect(track.mock.calls.filter((c) => c[0] === 'voice-fallback')).toHaveLength(1) // once, though line-over came twice
    void audio.playLine('line-over')
    expect(track.mock.calls.filter((c) => c[0] === 'voice-fallback')).toHaveLength(1)
    player.clearGender()
    expect(audio.lineAsset('line-intro')).toEqual({ id: 'line-intro', file: 'line-intro', url: 'li' })
    void audio.playLine('line-intro')
    expect(byUrl('li')).toBeTruthy()
    audio.setTowerAudioLog(null)
  })
  it('playLine resolves when the line ends', async () => {
    const audio = await import('./towerAudio')
    const p = audio.playLine('wiz-kamatz')
    byUrl('wk').emit('end')
    await expect(p).resolves.toBeUndefined()
  })
  it('speech plays faster with natural pitch: html5 audio (pitch-preserving) at VOICE_RATE', async () => {
    const audio = await import('./towerAudio')
    void audio.playLine('wiz-kamatz')
    expect(audio.VOICE_RATE).toBeGreaterThan(1.05)
    expect(byUrl('wk')._rate).toBe(audio.VOICE_RATE)
    expect(byUrl('wk').html5).toBe(true)
    audio.playSfx('cast')
    expect(byUrl('c').html5).toBe(false) // effects stay on Web Audio
  })
  it('a cue fires when its word is spoken (file time ÷ VOICE_RATE)', async () => {
    const audio = await import('./towerAudio')
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
    const audio = await import('./towerAudio')
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
    const audio = await import('./towerAudio')
    await expect(audio.playLine('nope')).resolves.toBeUndefined()
  })
  it('a line that never ends resolves after the safety timeout', async () => {
    const audio = await import('./towerAudio')
    let done = false
    void audio.playLine('wiz-kamatz').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(8900)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    expect(done).toBe(true)
  })
  it('a line given up after its timeout is stopped: a file that starts late never plays on, out of reach of stopAllLines', async () => {
    const audio = await import('./towerAudio')
    void audio.playLine('wiz-kamatz')
    await vi.advanceTimersByTimeAsync(9100)
    expect(byUrl('wk').playing()).toBe(false)
  })
  it('a line that fails to load resolves', async () => {
    const audio = await import('./towerAudio')
    const p = audio.playLine('wiz-kamatz')
    byUrl('wk').emit('loaderror')
    await expect(p).resolves.toBeUndefined()
  })
  it('sfx off (the device setting): playSfx resolves without playing', async () => {
    const audio = await import('./towerAudio')
    const out = await import('../../../shared/gameAudio/output')
    out.applySound({ sfx: false, music: true, volume: 1 })
    expect(HowlerG.volume).toHaveBeenLastCalledWith(1)
    await expect(audio.playSfx('arrival')).resolves.toBeUndefined()
    expect(instances.filter((i) => i.playing())).toHaveLength(0)
  })
  it('playSfx resolves when the effect ends', async () => {
    const audio = await import('./towerAudio')
    const p = audio.playSfx('cast')
    byUrl('c').emit('end')
    await expect(p).resolves.toBeUndefined()
  })
  it('an effect picks one of its takes at random (not in turn), and every take is a fresh play of its own Howl', async () => {
    const audio = await import('./towerAudio')
    const rnd = vi.spyOn(Math, 'random')
    rnd.mockReturnValue(0.99)
    void audio.playSfx('arrival')
    rnd.mockReturnValue(0.99)
    void audio.playSfx('arrival')
    rnd.mockReturnValue(0)
    void audio.playSfx('arrival')
    expect(byUrl('a3').plays).toBe(2)
    expect(byUrl('a1').plays).toBe(1)
    expect(instances.find((i) => i.src[0] === 'a2')).toBeUndefined()
  })
  it('the boom grows with the power (0.6 + 0.3 × power, at most 1); the other effects play at 0.8', async () => {
    const audio = await import('./towerAudio')
    vi.spyOn(Math, 'random').mockReturnValue(0)
    void audio.playSfx('boom', 0.5)
    expect(byUrl('b1')._vol).toBeCloseTo(0.75)
    void audio.playSfx('boom')
    expect(byUrl('b1')._vol).toBeCloseTo(0.9)
    void audio.playSfx('boom', 3)
    expect(byUrl('b1')._vol).toBe(1)
    void audio.playSfx('sparkle')
    expect(byUrl('s')._vol).toBe(0.8)
  })
  it('an effect that never ends resolves after its safety timeout (3 s)', async () => {
    const audio = await import('./towerAudio')
    let done = false
    void audio.playSfx('cast').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(2900)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    expect(done).toBe(true)
  })
  it('stopAllLines stops the line that plays: it resolves, and its cues not yet heard fire', async () => {
    const audio = await import('./towerAudio')
    const cues: string[] = []
    let done = false
    void audio.playLine('line-mega', (c) => cues.push(c)).then(() => { done = true })
    expect(byUrl('lm').playing()).toBe(true)
    audio.stopAllLines()
    await vi.advanceTimersByTimeAsync(0)
    expect(byUrl('lm').playing()).toBe(false)
    expect(done).toBe(true)
    expect(cues).toEqual(['lightning'])
  })
  it('the mute is Howler\'s global mute; the unlock resumes a suspended audio context', async () => {
    const audio = await import('./towerAudio')
    audio.muteTowerAudio(true)
    expect(HowlerG.mute).toHaveBeenLastCalledWith(true)
    audio.muteTowerAudio(false)
    expect(HowlerG.mute).toHaveBeenLastCalledWith(false)
    audio.unlockTowerAudio()
    expect(HowlerG.ctx.resume).not.toHaveBeenCalled()
    HowlerG.ctx.state = 'suspended'
    audio.unlockTowerAudio()
    expect(HowlerG.ctx.resume).toHaveBeenCalled()
  })
  it('a line plays at its own volume (none is set on it), with no duck of anything', async () => {
    const audio = await import('./towerAudio')
    void audio.playLine('wiz-kamatz')
    expect(byUrl('wk')._vol).toBe(1)
    expect(instances).toHaveLength(1)
  })
})
