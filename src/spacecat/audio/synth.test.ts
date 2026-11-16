import { describe, expect, it } from 'vitest'
import { SFX_NAMES, createSynth, type WebAudioOut } from './synth'
import { TUNE_DUCK, TUNE_GAIN, createTune } from './tune'

// a minimal recording AudioContext: every node records where it connects; envelopes record their ramps
function fakeAudio(now = 2) {
  const nodes = new Set<object>()
  const edges: [object, object][] = []
  const ramps: number[] = []
  const param = (value = 0) => {
    const p = {
      value, events: [] as [string, number, number][],
      setValueAtTime(v: number, t: number) { p.events.push(['set', v, t]); p.value = v; return p },
      linearRampToValueAtTime(v: number, t: number) { p.events.push(['lin', v, t]); p.value = v; return p },
      exponentialRampToValueAtTime(v: number, t: number) { p.events.push(['exp', v, t]); ramps.push(t); p.value = v; return p },
      setTargetAtTime(v: number, t: number) { p.events.push(['target', v, t]); p.value = v; return p },
      cancelScheduledValues() { return p },
    }
    return p
  }
  const node = <T extends object>(extra: T) => {
    const n = {
      ...extra,
      connect(to: object) { edges.push([n, to]); return to },
      disconnect() {},
      start() {}, stop() {},
    }
    nodes.add(n)
    return n
  }
  const destination = { destination: true }
  const ctx = {
    currentTime: now, sampleRate: 8000, destination,
    createGain: () => node({ gain: param(1) }),
    createOscillator: () => node({ type: 'sine', frequency: param(440) }),
    createBiquadFilter: () => node({ type: 'lowpass', frequency: param(350), Q: param(1) }),
    createBufferSource: () => node({ buffer: null as unknown, loop: false }),
    createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }),
  }
  const out = { out: true }
  return { o: { ctx: ctx as unknown as AudioContext, out: out as unknown as AudioNode } as WebAudioOut, nodes, edges, ramps, out, destination, ctx }
}

describe('the coded effects', () => {
  it('each effect connects only to the given output', () => {
    for (const name of SFX_NAMES) {
      const a = fakeAudio()
      createSynth(() => a.o).play(name)
      expect(a.edges.length).toBeGreaterThan(0)
      for (const [, to] of a.edges) {
        expect(to).not.toBe(a.destination)
        // a node of this context, an audio param of one (the vibrato), or the given output
        const ok = to === a.out || a.nodes.has(to) || [...a.nodes].some((n) => Object.values(n).includes(to))
        expect(ok).toBe(true)
      }
      expect(a.edges.filter(([, to]) => to === a.out)).toHaveLength(1)
    }
  })
  it('no output plays nothing and returns 0', () => {
    const s = createSynth(() => null)
    for (const name of SFX_NAMES) expect(s.play(name)).toBe(0)
  })
  it('each effect\'s length is its last envelope\'s end', () => {
    for (const name of SFX_NAMES) {
      const a = fakeAudio(2)
      const ms = createSynth(() => a.o).play(name)
      expect(ms).toBeGreaterThan(50)
      expect(ms).toBe(Math.round((Math.max(...a.ramps) - 2) * 1000))
    }
  })
})

describe('the tune', () => {
  const manualEvery = () => {
    const fns = new Set<() => void>()
    return { every: (_ms: number, fn: () => void) => { fns.add(fn); return () => fns.delete(fn) }, run: () => fns.forEach((f) => f()), count: () => fns.size }
  }
  it('plays into the given output only', () => {
    const a = fakeAudio()
    const ev = manualEvery()
    const t = createTune(() => a.o, ev.every)
    t.start()
    expect(t.playing()).toBe(true)
    expect(a.edges.some(([, to]) => to === a.out)).toBe(true)
    expect(a.edges.some(([, to]) => to === a.destination)).toBe(false)
    t.stop()
  })
  it('duck lowers and restores its gain', () => {
    const a = fakeAudio()
    const t = createTune(() => a.o, manualEvery().every)
    t.start()
    const [bus] = a.edges.find(([, to]) => to === a.out)! as [{ gain: { value: number } }, object]
    expect(bus.gain.value).toBe(TUNE_GAIN)
    t.duck(true)
    expect(bus.gain.value).toBe(TUNE_DUCK)
    t.duck(false)
    expect(bus.gain.value).toBe(TUNE_GAIN)
    t.stop()
  })
  it('stop ends its scheduler', () => {
    const a = fakeAudio()
    const ev = manualEvery()
    const t = createTune(() => a.o, ev.every)
    t.start()
    expect(ev.count()).toBe(1)
    a.ctx.currentTime += 3
    const before = a.nodes.size
    ev.run()
    expect(a.nodes.size).toBeGreaterThan(before)
    t.stop()
    expect(ev.count()).toBe(0)
    expect(t.playing()).toBe(false)
    const after = a.nodes.size
    a.ctx.currentTime += 3
    ev.run()
    expect(a.nodes.size).toBe(after)
  })
  it('no output: the tune does not start', () => {
    const t = createTune(() => null, manualEvery().every)
    t.start()
    expect(t.playing()).toBe(false)
  })
})
