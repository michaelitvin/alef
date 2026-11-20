// Ported from Space Cat Math by Igor (Ray's dad), used by permission. See asset-sources/spacecat/README.md.
// Space Cat's coded sound effects (WebAudio: oscillators, a noise buffer, envelopes). Right, wrong and the level fanfare
// are the original's; new sum, right with zoom, time-out, heart lost, new ship and end of run are new, in its style.
// Each is a coded source (src/shared/gameAudio/coded.ts): the kit plays it behind the player port as a `coded:` url
// (coded.ts here). No Howler import: every node is made on the output it is given and ends in its `out` node (never
// ctx.destination), so the device's volume, the mute on hide and the pause hold reach it.
import type { CodedPlay, CodedSource, WebAudioOut } from '../../shared/gameAudio/coded'
import type { SfxName } from './sfx'

export type { SfxName } from './sfx'
export { SFX_NAMES } from './sfx'

/** the effects' own level (the original's effects bus): the kit's sfxVolume */
export const SFX_GAIN = 0.5
/** a sound starts this long after it is asked for (s), so that its first envelope point is in the future */
const LEAD = 0.01

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>()
/** 0.3 s of white noise, made once per context */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseBuffers.get(ctx)
  if (!b) {
    b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    noiseBuffers.set(ctx, b)
  }
  return b
}

/** one effect being built: its nodes go to `bus`; `end` is the time its last envelope ends */
class Voice {
  end: number
  /** what it started: a stop ends them all */
  readonly started: AudioScheduledSourceNode[] = []
  constructor(readonly ctx: AudioContext, readonly bus: AudioNode, readonly t0: number) { this.end = t0 }

  stop(): void {
    for (const n of this.started) { try { n.stop() } catch { /* already ended */ } }
  }

  /** an exponential envelope: up to `peak` in `attack` s, down by `until` s after `t` (the original's N) */
  env(t: number, attack: number, until: number, peak: number): GainNode {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(1e-4, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(1e-4, t + until)
    g.connect(this.bus)
    this.end = Math.max(this.end, t + until)
    return g
  }

  osc(type: OscillatorType, t: number, stop: number, to: AudioNode, freq?: number): OscillatorNode {
    const o = this.ctx.createOscillator()
    o.type = type
    if (freq !== undefined) o.frequency.value = freq
    o.connect(to)
    o.start(t)
    o.stop(t + stop)
    this.started.push(o)
    return o
  }

  /** a tone from f to f2 (if given) with its own envelope */
  tone(f: number, at: number, d: number, type: OscillatorType, peak: number, f2?: number): void {
    const t = this.t0 + at
    const o = this.osc(type, t, d + 0.05, this.env(t, 0.015, d, peak))
    o.frequency.setValueAtTime(f, t)
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d)
  }

  /** looped noise through a filter (the original's it) */
  noise(t: number, d: number, type: BiquadFilterType, freq: number, to: AudioNode): BiquadFilterNode {
    const s = this.ctx.createBufferSource()
    s.buffer = noiseBuffer(this.ctx)
    s.loop = true
    const f = this.ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    s.connect(f).connect(to)
    s.start(t)
    s.stop(t + d)
    this.started.push(s)
    return f
  }

  /** a noise sweep from f0 to f1 through a band-pass */
  sweep(at: number, d: number, f0: number, f1: number, peak: number): void {
    const t = this.t0 + at
    const f = this.noise(t, d, 'bandpass', f0, this.env(t, 0.005, d, peak))
    f.Q.value = 1.2
    f.frequency.setValueAtTime(f0, t)
    f.frequency.exponentialRampToValueAtTime(f1, t + d)
  }
}

// ---------- the original's three (ported with readable names)

/** right: a rising blip, a sparkle and a two-note chime */
function right(v: Voice, t: number) {
  const blip = v.osc('sine', t, 0.13, v.env(t, 5e-3, 0.12, 0.6))
  blip.frequency.setValueAtTime(300, t)
  blip.frequency.exponentialRampToValueAtTime(1200, t + 0.08)
  v.noise(t, 0.18, 'highpass', 3500, v.env(t, 3e-3, 0.18, 0.5))
  for (let i = 0; i < 14; i++) {
    const s = t + Math.random() * 0.45
    v.osc('sine', s, 0.2, v.env(s, 2e-3, 0.06 + Math.random() * 0.12, 0.12 + Math.random() * 0.12), 2500 + Math.random() * 4500)
  }
  ;[1047, 1568].forEach((f, i) => { const s = t + 0.08 + i * 0.09; v.osc('triangle', s, 0.42, v.env(s, 5e-3, 0.4, 0.25), f) })
}

/** wrong: a falling boom and a short siren */
function wrong(v: Voice, t: number) {
  const boom = v.osc('sine', t, 0.42, v.env(t, 5e-3, 0.4, 0.9))
  boom.frequency.setValueAtTime(140, t)
  boom.frequency.exponentialRampToValueAtTime(40, t + 0.35)
  v.noise(t, 0.3, 'lowpass', 500, v.env(t, 5e-3, 0.3, 0.6))
  const s = t + 0.08
  const filter = v.ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 3
  filter.frequency.setValueAtTime(700, s)
  filter.frequency.exponentialRampToValueAtTime(2600, s + 0.15)
  filter.frequency.exponentialRampToValueAtTime(1000, s + 0.55)
  const g = v.ctx.createGain()
  g.gain.setValueAtTime(1e-4, s)
  g.gain.exponentialRampToValueAtTime(0.5, s + 0.06)
  g.gain.setValueAtTime(0.5, s + 0.3)
  g.gain.exponentialRampToValueAtTime(1e-4, s + 0.55)
  v.end = Math.max(v.end, s + 0.55)
  filter.connect(g).connect(v.bus)
  const siren = v.osc('sawtooth', s, 0.57, filter)
  siren.frequency.setValueAtTime(450, s)
  siren.frequency.exponentialRampToValueAtTime(1150, s + 0.12)
  siren.frequency.setValueAtTime(1150, s + 0.2)
  siren.frequency.exponentialRampToValueAtTime(600, s + 0.55)
  const lfoGain = v.ctx.createGain()
  lfoGain.gain.value = 40
  lfoGain.connect(siren.frequency)
  v.osc('sine', s, 0.57, lfoGain, 14)
}

/** the level fanfare: four rising notes, the last held */
function level(v: Voice, t: number) {
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => {
    const s = t + i * 0.13, len = i === notes.length - 1 ? 0.8 : 0.15
    for (const type of ['triangle', 'square'] as const) v.osc(type, s, len + 0.02, v.env(s, 0.01, len, type === 'square' ? 0.05 : 0.3), f)
  })
}

// ---------- the six new ones, in the same style

const PLAY: Record<SfxName, (v: Voice, t: number) => void> = {
  /** a short rising two-note arrival */
  'new-sum': (v) => { v.tone(520, 0, 0.12, 'triangle', 0.25); v.tone(780, 0.1, 0.16, 'triangle', 0.25) },
  right,
  /** the right sound and a rising whoosh */
  'right-zoom': (v, t) => { right(v, t); v.sweep(0, 0.35, 400, 4000, 0.35) },
  wrong,
  /** things flying past: a falling noise whoosh */
  timeout: (v) => v.sweep(0, 0.6, 3000, 200, 0.6),
  /** a short low crack */
  heart: (v) => { v.tone(180, 0, 0.12, 'square', 0.25, 90); v.sweep(0, 0.08, 2000, 800, 0.4) },
  level,
  /** a bright arpeggio with sparkle */
  ship: (v) => {
    ;[784, 988, 1175, 1568, 1976].forEach((f, i) => v.tone(f, i * 0.06, 0.22, 'triangle', 0.2))
    v.sweep(0.2, 0.4, 6000, 9000, 0.12)
  },
  /** a slow falling three-note phrase, warm and not sad */
  end: (v) => { ;[523, 440, 349].forEach((f, i) => v.tone(f, i * 0.28, 0.45, 'triangle', 0.26)) },
}

/** the coded source of one effect: it plays at once into the given output; its length is its last envelope's end */
export function sfxSource(name: SfxName): CodedSource {
  return (o: WebAudioOut): CodedPlay => {
    const t0 = o.ctx.currentTime + LEAD
    const v = new Voice(o.ctx, o.out, t0)
    PLAY[name](v, t0)
    return { lengthMs: Math.round((v.end - o.ctx.currentTime) * 1000), stop: () => v.stop() }
  }
}
