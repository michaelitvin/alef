// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Howler } from 'howler'
import { MAX_HTML5, getHowl, howlerPlayer, peekHowl } from './howlerPlayer'
import { registerCoded } from './coded'

describe('getHowl', () => {
  it('keeps at most MAX_HTML5 streamed sounds; the least recently used is unloaded first', () => {
    const url = (i: number) => `/v/${i}.mp3`
    for (let i = 0; i < MAX_HTML5; i++) getHowl(url(i), false, true)
    getHowl(url(0), false, true) // used again: now the most recent
    getHowl(url(MAX_HTML5), false, true)
    expect(peekHowl(url(1))).toBeUndefined()
    expect(peekHowl(url(0))).toBeDefined()
    expect(peekHowl(url(MAX_HTML5))).toBeDefined()
  })
  it('Web Audio sounds (effects, music) are not limited', () => {
    for (let i = 0; i < MAX_HTML5 + 5; i++) getHowl(`/s/${i}.mp3`)
    expect(peekHowl('/s/0.mp3')).toBeDefined()
  })
})

describe('coded sound through the Howler adapter', () => {
  // Howler's WebAudio parts, faked: jsdom has no AudioContext
  type Param = { value: number; ramps: [number, number][]; cancelScheduledValues(): void; setValueAtTime(v: number): void; linearRampToValueAtTime(v: number, t: number): void }
  const param = (value: number): Param => {
    const p: Param = {
      value, ramps: [],
      cancelScheduledValues() {}, setValueAtTime(v) { p.value = v }, linearRampToValueAtTime(v, t) { p.ramps.push([v, t]); p.value = v },
    }
    return p
  }
  const gains: { gain: Param; to: unknown[]; disconnected: boolean }[] = []
  const ctx = {
    currentTime: 1, state: 'running', resume: () => Promise.resolve(),
    createGain: () => {
      const g = { gain: param(1), to: [] as unknown[], disconnected: false, connect(x: unknown) { g.to.push(x); return x }, disconnect() { g.disconnected = true } }
      gains.push(g)
      return g
    },
  }
  const master = { master: true }
  const H = Howler as unknown as { ctx: unknown; masterGain: unknown; usingWebAudio: boolean; autoSuspend: boolean }
  const saved = { ctx: H.ctx, masterGain: H.masterGain, usingWebAudio: H.usingWebAudio, autoSuspend: H.autoSuspend }
  const outs: unknown[] = []
  let stops = 0
  registerCoded('coded:test/beep', (o) => { outs.push(o); return { lengthMs: 300, stop: () => { stops++ } } })
  registerCoded('coded:test/tune', (o) => { outs.push(o); return { lengthMs: null, stop: () => { stops++ } } })

  beforeEach(() => {
    vi.useFakeTimers()
    Object.assign(H, { ctx, masterGain: master, usingWebAudio: true, autoSuspend: true })
    gains.length = 0
    outs.length = 0
    stops = 0
  })
  afterEach(() => {
    vi.useRealTimers()
    Object.assign(H, saved)
  })

  it('a coded url plays its source on Howler\'s context into the master gain', () => {
    howlerPlayer.play('coded:test/beep', { kind: 'sfx', id: 'beep', volume: 0.5 })
    expect(gains).toHaveLength(1)
    expect(gains[0].to).toEqual([master])
    expect(gains[0].gain.value).toBe(0.5)
    expect(outs[0]).toEqual({ ctx, out: gains[0] })
  })
  it('its done ends after the source\'s length, or on stop', async () => {
    let ended = false
    void howlerPlayer.play('coded:test/beep', { kind: 'sfx', id: 'beep' }).done.then(() => { ended = true })
    await vi.advanceTimersByTimeAsync(299)
    expect(ended).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(ended).toBe(true)
    expect(stops).toBe(1)
    const tune = howlerPlayer.play('coded:test/tune', { kind: 'music', id: 'tune', loop: true, volume: 0 })
    let tuneEnded = false
    void tune.done.then(() => { tuneEnded = true })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(tune.playing()).toBe(true)
    tune.stop()
    await vi.advanceTimersByTimeAsync(0)
    expect(tuneEnded).toBe(true)
    expect(tune.playing()).toBe(false)
    expect(stops).toBe(2)
  })
  it('a one-shot also ends at its timeout', async () => {
    let ended = false
    void howlerPlayer.play('coded:test/tune', { kind: 'sfx', id: 'long', timeoutMs: 1000 }).done.then(() => { ended = true })
    await vi.advanceTimersByTimeAsync(1000)
    expect(ended).toBe(true)
  })
  it('fade ramps its own gain', () => {
    const s = howlerPlayer.play('coded:test/tune', { kind: 'music', id: 'tune', volume: 0 })
    s.fade(0.3, 600)
    expect(gains[0].gain.ramps).toEqual([[0.3, 1.6]])
    expect(s.position()).toBeNull()
  })
  it('the first coded play turns Howler\'s auto-suspend off', () => {
    expect(H.autoSuspend).toBe(true)
    howlerPlayer.play('coded:test/beep', { kind: 'sfx', id: 'beep' })
    expect(H.autoSuspend).toBe(false)
  })
  it('with no WebAudio a coded sound ends at once', async () => {
    Object.assign(H, { ctx: null, masterGain: null, usingWebAudio: false })
    const s = howlerPlayer.play('coded:test/beep', { kind: 'sfx', id: 'beep' })
    let ended = false
    void s.done.then(() => { ended = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(ended).toBe(true)
    expect(outs).toHaveLength(0)
  })
  it('preload of a coded url does nothing', () => {
    howlerPlayer.preload('coded:test/beep', false)
    expect(peekHowl('coded:test/beep')).toBeUndefined()
    expect(gains).toHaveLength(0)
  })
})
