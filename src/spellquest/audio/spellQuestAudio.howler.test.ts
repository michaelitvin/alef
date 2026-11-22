// Spell Quest's audio as it drives Howler: which files play, at which rate and volume, how music fades and ducks, what a stop
// stops. Howler itself is faked (its Howl class and the global Howler), so this pins the behaviour through any refactor
// of the layers above it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { howls, Howler, endAfter } = vi.hoisted(() => {
  type Fn = () => void
  const howls: FakeHowl[] = []
  const endAfter = { ms: 100 }
  class FakeHowl {
    src: string
    loop: boolean
    html5: boolean
    vol = 1
    isPlaying = false
    calls: string[] = []
    handlers: Record<string, Fn[]> = {}
    nextId = 1
    constructor(o: { src: string[]; loop?: boolean; html5?: boolean }) {
      this.src = o.src[0]
      this.loop = !!o.loop
      this.html5 = !!o.html5
      howls.push(this)
    }
    state() { return 'loaded' }
    play() {
      const id = this.nextId++
      this.isPlaying = true
      this.calls.push('play')
      if (!this.loop) setTimeout(() => this.end(), endAfter.ms)
      return id
    }
    end() {
      if (!this.isPlaying) return
      this.isPlaying = false
      this.emit('end')
    }
    emit(ev: string) {
      const fns = this.handlers[ev] ?? []
      this.handlers[ev] = []
      fns.forEach((f) => f())
    }
    rate(r: number) { this.calls.push(`rate ${r}`) }
    once(ev: string, fn: Fn) { (this.handlers[ev] ||= []).push(fn) }
    volume(v?: number) {
      if (v !== undefined) { this.vol = v; this.calls.push(`volume ${v}`) }
      return this.vol
    }
    fade(_from: number, to: number, ms: number) { this.vol = to; this.calls.push(`fade ${to} ${ms}`) }
    playing() { return this.isPlaying }
    stop() {
      this.calls.push('stop')
      if (this.isPlaying) { this.isPlaying = false; this.emit('stop') }
    }
    seek() { return 0 }
    unload() {}
  }
  const Howler = { mute: vi.fn((_on: boolean) => {}), volume: vi.fn((_v: number) => {}) }
  return { howls, Howler: Object.assign(Howler, { FakeHowl }), endAfter }
})
vi.mock('howler', () => ({ Howl: Howler.FakeHowl, Howler }))

import { applySound as configureAudio, holdAudio, setHidden } from '../../shared/gameAudio/output'
import { cancelVoice, playSfx, say, sayParts, startMusic, stopMusic, stopVoice, voiceSignal } from './spellQuestAudio'
import { VOICE_URLS } from '../assets/audioFiles'

const howlOf = (url: string) => howls.find((h) => h.src === url)!
const base = (url: string) => url.split('/').pop()!.replace(/\.mp3.*$/, '').replace(/-[A-Za-z0-9_]{8}$/, '')
const voiceIds = Object.keys(VOICE_URLS).filter((id) => !id.endsWith('-f')).slice(0, 3)

describe('Book 2 audio through Howler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    endAfter.ms = 100
    configureAudio({ sfx: true, music: true, volume: 0.8 })
  })
  afterEach(async () => {
    stopVoice()
    stopMusic()
    await vi.advanceTimersByTimeAsync(1000)
    vi.useRealTimers()
  })

  it('effects rotate through their takes at volume 0.8; a new effect plays its fallback; effects off plays nothing', async () => {
    const before = howls.length
    void playSfx('catch'); void playSfx('catch'); void playSfx('catch')
    const catches = howls.slice(before).filter((h) => base(h.src).startsWith('catch'))
    expect(catches.map((h) => base(h.src)).sort()).toEqual(['catch-1', 'catch-2'])
    expect(catches.map((h) => h.calls.filter((c) => c === 'play').length).sort()).toEqual([1, 2])
    expect(catches.every((h) => h.vol === 0.8)).toBe(true)
    // 'spell' has no take of its own: it plays zap's takes and moves zap's rotation
    const zapPlays = () => howls.filter((h) => base(h.src).startsWith('zap')).map((h) => h.calls.filter((c) => c === 'play').length)
    void playSfx('spell')
    void playSfx('zap')
    expect(zapPlays().sort()).toEqual([1, 1])
    configureAudio({ sfx: false, music: true, volume: 0.8 })
    const n = howls.reduce((s, h) => s + h.calls.filter((c) => c === 'play').length, 0)
    await expect(playSfx('catch')).resolves.toBeUndefined()
    expect(howls.reduce((s, h) => s + h.calls.filter((c) => c === 'play').length, 0)).toBe(n)
  })

  it('a missing effect resolves; an effect resolves when it ends', async () => {
    let done = false
    void playSfx('catch').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(50)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(60)
    expect(done).toBe(true)
  })

  it('music: each start moves to the next track; it fades in to 0.35, ducks to 0.08 under a voice, fades out and stops', async () => {
    startMusic('flight')
    const a = howls[howls.length - 1]
    expect(base(a.src)).toBe('flight-1')
    expect(a.loop).toBe(true)
    expect(a.calls).toEqual(['volume 0', 'play', 'fade 0.35 600'])
    startMusic('flight') // the next track: the first fades out
    const b = howls[howls.length - 1]
    expect(base(b.src)).toBe('flight-2')
    expect(a.calls.slice(3)).toEqual(['fade 0 300'])
    await vi.advanceTimersByTimeAsync(319)
    expect(a.calls).not.toContain('stop')
    await vi.advanceTimersByTimeAsync(1)
    expect(a.calls).toContain('stop')
    b.calls.length = 0
    void say([voiceIds[0]], 0)
    await vi.advanceTimersByTimeAsync(10)
    expect(b.calls).toEqual(['fade 0.08 200'])
    await vi.advanceTimersByTimeAsync(100)
    expect(b.calls).toEqual(['fade 0.08 200', 'fade 0.35 200'])
    b.calls.length = 0
    stopMusic()
    expect(b.calls).toEqual(['fade 0 300'])
    await vi.advanceTimersByTimeAsync(320)
    expect(b.calls).toEqual(['fade 0 300', 'stop'])
  })

  it('a celebration does not loop; music started while a voice plays comes in ducked; music off stops it', async () => {
    endAfter.ms = 5000
    void say([voiceIds[0]], 0)
    await vi.advanceTimersByTimeAsync(10)
    startMusic('celebrate')
    const c = howls[howls.length - 1]
    expect(base(c.src)).toBe('celebrate-1')
    expect(c.loop).toBe(false)
    expect(c.calls.slice(-1)).toEqual(['fade 0.08 600'])
    startMusic('celebrate') // its only track, still playing: nothing changes
    expect(c.calls.filter((x) => x === 'play')).toHaveLength(1)
    configureAudio({ sfx: true, music: false, volume: 0.5 })
    expect(c.calls.slice(-1)).toEqual(['fade 0 300'])
    startMusic('flight')
    expect(howls[howls.length - 1]).toBe(c) // music off: nothing new
  })

  it('a voice plays its file on html5 at the speech rate; a missing id makes no sound', async () => {
    const n = howls.length
    void say(['no-such-line'], 0)
    await vi.advanceTimersByTimeAsync(10)
    expect(howls.length).toBe(n)
    void say([voiceIds[0]], 0)
    await vi.advanceTimersByTimeAsync(10)
    const v = howlOf(VOICE_URLS[voiceIds[0]])
    expect(v.html5).toBe(true)
    expect(v.calls.slice(-2)).toEqual(['play', 'rate 1.15'])
  })

  it('cancelling one speaker stops its part; the next speaker in the queue still plays', async () => {
    endAfter.ms = 5000
    const sig = voiceSignal()
    const log: string[] = []
    void sayParts([{ id: voiceIds[0] }, { id: voiceIds[1] }], 0, sig).then((r) => log.push(`a ${r}`))
    void sayParts([{ id: voiceIds[2] }], 0).then((r) => log.push(`b ${r}`))
    await vi.advanceTimersByTimeAsync(10)
    const first = howlOf(VOICE_URLS[voiceIds[0]])
    expect(first.isPlaying).toBe(true)
    cancelVoice(sig)
    expect(first.calls).toContain('stop')
    await vi.advanceTimersByTimeAsync(10)
    expect(log).toEqual(['a false'])
    expect(howlOf(VOICE_URLS[voiceIds[2]]).isPlaying).toBe(true)
    expect(howls.find((h) => h.src === VOICE_URLS[voiceIds[1]])?.calls.includes('play') ?? false).toBe(false)
  })

  it('stopVoice stops the playing file and drops the queue', async () => {
    endAfter.ms = 5000
    void say([voiceIds[0], voiceIds[1]], 0)
    await vi.advanceTimersByTimeAsync(10)
    stopVoice()
    expect(howlOf(VOICE_URLS[voiceIds[0]]).calls).toContain('stop')
    await vi.advanceTimersByTimeAsync(6000)
    expect(howls.find((h) => h.src === VOICE_URLS[voiceIds[1]])?.calls.includes('play') ?? false).toBe(false)
  })

  it('a voice that never ends is given up after 9 s', async () => {
    endAfter.ms = 60_000
    let done = false
    void say([voiceIds[0]], 0).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(8990)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(20)
    expect(done).toBe(true)
  })

  it('test builds log every voice part in order, after the feminine choice, whether or not it has a file', async () => {
    const w = window as unknown as { __d2audio?: string[] }
    w.__d2audio = []
    void say(['q-ghosts-1', 'no-such-line'], 0)
    await vi.advanceTimersByTimeAsync(200)
    expect(w.__d2audio).toEqual(['q-ghosts-1', 'no-such-line'])
    delete w.__d2audio
  })

  it('the device volume sets Howler\'s; hidden mutes everything until the pause cover lets go', () => {
    configureAudio({ sfx: true, music: true, volume: 0.6 })
    expect(Howler.volume).toHaveBeenLastCalledWith(0.6)
    setHidden(true)
    expect(Howler.mute).toHaveBeenLastCalledWith(true)
    holdAudio(true)
    setHidden(false)
    expect(Howler.mute).toHaveBeenLastCalledWith(true)
    holdAudio(false)
    expect(Howler.mute).toHaveBeenLastCalledWith(false)
  })
})
