// The clock's audio as it drives Howler: which files play, at which rate and volume, how the caption words follow the
// playback position, how music fades, ducks and waits for its file, what a stop stops. Howler itself is faked (its Howl
// class and the global Howler), so this pins the behaviour through any refactor of the layers above it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { howls, Howler, endAfter, pos } = vi.hoisted(() => {
  type Fn = () => void
  const howls: FakeHowl[] = []
  const endAfter = { ms: 100 }
  /** what the playing voice's seek() says (s, media time) */
  const pos = { s: 0 }
  class FakeHowl {
    src: string
    loop: boolean
    html5: boolean
    vol = 1
    loaded = true
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
    state() { return this.loaded ? 'loaded' : 'loading' }
    finishLoad() { this.loaded = true; this.emit('load') }
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
    seek() { return pos.s }
    unload() {}
  }
  const Howler = { mute: vi.fn((_on: boolean) => {}), volume: vi.fn((_v: number) => {}) }
  return { howls, Howler: Object.assign(Howler, { FakeHowl }), endAfter, pos }
})
vi.mock('howler', () => ({ Howl: Howler.FakeHowl, Howler }))

import { applySound } from '../../shared/gameAudio/output'
import { getHowl } from '../../shared/gameAudio/howlerPlayer'
import { playSfx, playVoice, startMusic, stopMusic, stopVoices } from './clockAudio'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS, VOICE_WORDS } from '../assets/audioFiles'

const howlOf = (url: string) => howls.find((h) => h.src === url)!
/** voice lines with word timings (masculine takes: no gender is set here) */
const timed = Object.keys(VOICE_URLS).filter((id) => VOICE_WORDS[id]?.t.length && !id.endsWith('-f'))
const plays = (h: { calls: string[] }) => h.calls.filter((c) => c === 'play').length

describe('clock audio through Howler', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    endAfter.ms = 100
    pos.s = 0
    applySound({ sfx: true, music: true, volume: 0.8 })
  })
  afterEach(async () => {
    stopVoices()
    stopMusic()
    await vi.advanceTimersByTimeAsync(1000)
    vi.useRealTimers()
  })

  it('a voice line plays its file on html5 at the speech rate and resolves when it ends', async () => {
    const id = timed[0]
    let done = false
    void playVoice(id).then(() => { done = true })
    const v = howlOf(VOICE_URLS[id])
    expect(v.html5).toBe(true)
    expect(v.loop).toBe(false)
    expect(v.calls.slice(-2)).toEqual(['play', 'rate 1.15'])
    await vi.advanceTimersByTimeAsync(50)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(60)
    expect(done).toBe(true)
  })

  it('the caption words follow the playback position; nothing glows before it moves; every word fires by the end', async () => {
    endAfter.ms = 5000
    const id = timed[1]
    // a caption the voice's words do not map onto: its words are spread over the line's spoken length
    const last = VOICE_WORDS[id].t[VOICE_WORDS[id].t.length - 1] + 0.45
    const words: number[] = []
    void playVoice(id, ['a', 'b', 'c', 'd'], (i) => words.push(i))
    await vi.advanceTimersByTimeAsync(100)
    expect(words).toEqual([]) // the position is still 0
    pos.s = 0.001
    await vi.advanceTimersByTimeAsync(50)
    expect(words).toEqual([0])
    pos.s = last / 2 + 0.001
    await vi.advanceTimersByTimeAsync(50)
    expect(words).toEqual([0, 1, 2])
    await vi.advanceTimersByTimeAsync(5000)
    expect(words).toEqual([0, 1, 2, 3])
  })

  it('a line with no file walks its caption at 0.45 s a word (at the speech rate) and resolves 0.3 s after the last', async () => {
    const at: number[] = []
    const t0 = Date.now()
    let doneAt = -1
    const n = howls.length
    void playVoice('ph-he-99-99', ['a', 'b', 'c'], () => at.push(Date.now() - t0)).then(() => { doneAt = Date.now() - t0 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(howls.length).toBe(n) // nothing to play
    expect(at).toEqual([0, 391, 782])
    expect(doneAt).toBe(1082)
  })

  it('a line with no file and no caption resolves at once', async () => {
    let done = false
    void playVoice('ph-he-99-98').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(done).toBe(true)
  })

  it('stopVoices stops the playing line, which resolves and fires its last words', async () => {
    endAfter.ms = 5000
    const id = timed[2]
    const words: number[] = []
    let done = false
    void playVoice(id, ['a', 'b'], (i) => words.push(i)).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(10)
    stopVoices()
    expect(howlOf(VOICE_URLS[id]).calls).toContain('stop')
    await vi.advanceTimersByTimeAsync(0)
    expect(done).toBe(true)
    expect(words).toEqual([0, 1])
  })

  it('a line that never ends is given up after 12 s', async () => {
    endAfter.ms = 60_000
    let done = false
    void playVoice(timed[3]).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(11_990)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(20)
    expect(done).toBe(true)
  })

  it('effects play at volume 0.8 and resolve when they end; effects off or a missing effect resolve at once', async () => {
    let done = false
    void playSfx('ding').then(() => { done = true })
    const d = howlOf(SFX_URLS.ding[0])
    expect(d.html5).toBe(false)
    expect(d.vol).toBe(0.8)
    expect(plays(d)).toBe(1)
    await vi.advanceTimersByTimeAsync(50)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(60)
    expect(done).toBe(true)
    void playSfx('ding') // one take: it plays again
    expect(plays(d)).toBe(2)
    applySound({ sfx: false, music: true, volume: 0.8 })
    await expect(playSfx('ding')).resolves.toBeUndefined()
    expect(plays(d)).toBe(2)
    await expect(playSfx('nonexistent' as 'ding')).resolves.toBeUndefined()
  })

  it('music: the workday picks the track; it fades in to 0.3 over 0.8 s, ducks to 0.08 under a voice, fades out and stops', async () => {
    startMusic(1)
    const a = howls[howls.length - 1]
    expect(a.src).toBe(MUSIC_URLS[1])
    expect(a.loop).toBe(true)
    expect(a.calls).toEqual(['volume 0', 'play', 'fade 0.3 800'])
    startMusic(1) // that track already plays: nothing changes
    expect(a.calls).toEqual(['volume 0', 'play', 'fade 0.3 800'])
    startMusic(2 + MUSIC_URLS.length) // the next workday, wrapped: the first fades out
    const b = howls[howls.length - 1]
    expect(b.src).toBe(MUSIC_URLS[2])
    expect(a.calls.slice(3)).toEqual(['fade 0 300'])
    await vi.advanceTimersByTimeAsync(319)
    expect(a.calls).not.toContain('stop')
    await vi.advanceTimersByTimeAsync(1)
    expect(a.calls).toContain('stop')
    b.calls.length = 0
    void playVoice(timed[0])
    await vi.advanceTimersByTimeAsync(10)
    expect(b.calls).toEqual(['fade 0.08 200'])
    await vi.advanceTimersByTimeAsync(100)
    expect(b.calls).toEqual(['fade 0.08 200', 'fade 0.3 200'])
    b.calls.length = 0
    stopMusic()
    expect(b.calls).toEqual(['fade 0 300'])
    await vi.advanceTimersByTimeAsync(320)
    expect(b.calls).toEqual(['fade 0 300', 'stop'])
  })

  it('music started while a voice plays comes in ducked; music off stops it and starts nothing', async () => {
    endAfter.ms = 5000
    void playVoice(timed[0])
    await vi.advanceTimersByTimeAsync(10)
    startMusic(0)
    const c = howls[howls.length - 1]
    expect(c.src).toBe(MUSIC_URLS[0])
    expect(c.calls.slice(-1)).toEqual(['fade 0.08 800'])
    applySound({ sfx: true, music: false, volume: 0.5 })
    expect(c.calls.slice(-1)).toEqual(['fade 0 300'])
    const n = howls.length
    startMusic(3)
    expect(howls.length).toBe(n)
  })

  it('music waits for its file: a stop while it loads means it never plays; a start while it loads plays once loaded', async () => {
    const h = getHowl(MUSIC_URLS[3], true) as unknown as InstanceType<typeof Howler.FakeHowl>
    h.loaded = false
    startMusic(3)
    stopMusic()
    h.finishLoad()
    expect(plays(h)).toBe(0)
    expect(h.playing()).toBe(false)
    h.loaded = false
    startMusic(3)
    expect(plays(h)).toBe(0)
    h.finishLoad()
    expect(plays(h)).toBe(1)
  })

  it('the device volume sets Howler\'s', () => {
    applySound({ sfx: true, music: true, volume: 0.6 })
    expect(Howler.volume).toHaveBeenLastCalledWith(0.6)
  })
})
