// Ported from Space Cat Math by Igor (Ray's dad), used by permission. See asset-sources/spacecat/README.md.
// The original's tune: a 16-bar chord loop at 116 beats a minute with bass, chords, hi-hat and a melody, scheduled a
// little ahead on the WebAudio clock. It plays into the output it is given (never ctx.destination).
import { noiseBuffer, type WebAudioOut } from './synth'

export const TEMPO = 116
/** one beat, in s */
export const BEAT = 60 / TEMPO
export const BEATS_PER_BAR = 4
/** the tune's level, and its level under a voice line (rule: the music gets quieter under every line) */
export const TUNE_GAIN = 0.22, TUNE_DUCK = 0.08
/** the scheduler looks this often (ms) and schedules this many beats ahead */
export const LOOK_MS = 100, AHEAD_BEATS = 2

interface Chord { bass: number; third: number; notes: number[] }
const C: Chord = { bass: 36, third: 4, notes: [64, 67, 71] }
const Am: Chord = { bass: 45, third: 3, notes: [60, 64, 67] }
const Dm: Chord = { bass: 38, third: 3, notes: [65, 69, 72] }
const G7: Chord = { bass: 43, third: 4, notes: [65, 71, 74] }
const F: Chord = { bass: 41, third: 4, notes: [64, 69, 72] }
const Em: Chord = { bass: 40, third: 3, notes: [62, 67, 71] }
/** one chord per bar */
export const CHORDS: Chord[] = [C, Am, Dm, G7, F, Em, Dm, G7, C, Am, Dm, G7, F, Em, G7, C]

const N = { G4: 67, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83, C6: 84 }
/** [bar, beat, length in beats, MIDI note] */
type Note = [number, number, number, number]
const PHRASE: Note[] = [
  [0, 0, 1.5, N.E5], [0, 1.5, 0.5, N.G5], [0, 2, 1, N.B5], [0, 3, 1, N.A5], [1, 0, 2, N.G5], [1, 2, 1, N.E5], [1, 3, 1, N.C5],
  [2, 0, 1, N.D5], [2, 1, 0.5, N.F5], [2, 1.5, 1.5, N.A5], [2, 3, 1, N.G5], [3, 0, 1, N.F5], [3, 1, 1, N.E5], [3, 2, 2, N.D5],
  [4, 0, 1, N.A5], [4, 1, 1, N.C6], [4, 2, 0.5, N.B5], [4, 2.5, 1.5, N.A5], [5, 0, 1.5, N.G5], [5, 1.5, 0.5, N.E5], [5, 2, 1, N.D5],
  [5, 3, 1, N.E5], [6, 0, 1, N.F5], [6, 1, 1, N.A5], [6, 2, 1, N.G5], [6, 3, 1, N.F5],
]
export const MELODY: Note[] = [
  ...PHRASE, [7, 0, 1, N.E5], [7, 1, 1, N.D5], [7, 2, 1, N.B4], [7, 3, 1, N.G4],
  ...PHRASE.slice(0, 18).map(([b, t, l, n]): Note => [b + 8, t, l, n]),
  [13, 0, 1, N.B5], [13, 1, 1, N.A5], [13, 2, 1, N.G5], [13, 3, 1, N.E5], [14, 0, 1, N.F5], [14, 1, 0.5, N.E5], [14, 1.5, 1.5, N.D5],
  [14, 3, 1, N.B4], [15, 0, 1, N.E5], [15, 1, 1, N.D5], [15, 2, 2, N.C5],
]
const LOOP_BEATS = CHORDS.length * BEATS_PER_BAR

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)
/** the off-beat swing: an eighth note on the half beat comes a little late */
const swing = (b: number) => { const i = Math.floor(b); return Math.abs(b - i - 0.5) < 0.01 ? i + 0.66 : b }

export interface Tune { start(): void; stop(): void; duck(on: boolean): void; playing(): boolean }

export function createTune(
  output: () => WebAudioOut | null,
  every: (ms: number, fn: () => void) => () => void = (ms, fn) => { const id = setInterval(fn, ms); return () => clearInterval(id) },
): Tune {
  let run: { o: WebAudioOut; gain: GainNode; t0: number; next: number; cancel: () => void } | null = null

  const env = (r: NonNullable<typeof run>, t: number, len: number, peak: number) => {
    const g = r.o.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.02)
    g.gain.exponentialRampToValueAtTime(1e-3, t + len)
    g.connect(r.gain)
    return g
  }
  const osc = (r: NonNullable<typeof run>, type: OscillatorType, midi: number, t: number, len: number, to: AudioNode) => {
    const o = r.o.ctx.createOscillator()
    o.type = type
    o.frequency.value = hz(midi)
    o.connect(to)
    o.start(t)
    o.stop(t + len + 0.05)
    return o
  }
  const lead = (r: NonNullable<typeof run>, midi: number, t: number, len: number) => {
    const main = osc(r, 'sine', midi, t, len + 0.4, env(r, t, len + 0.4, 0.35))
    osc(r, 'sine', midi + 12, t, len * 0.5, env(r, t, len * 0.5, 0.05))
    const vib = r.o.ctx.createOscillator(), depth = r.o.ctx.createGain()
    vib.frequency.value = 5
    depth.gain.value = 3
    vib.connect(depth).connect(main.frequency)
    vib.start(t)
    vib.stop(t + len + 0.45)
  }
  const bass = (r: NonNullable<typeof run>, midi: number, t: number) => {
    const f = r.o.ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 600
    f.connect(env(r, t, BEAT * 0.9, 0.5))
    osc(r, 'triangle', midi, t, BEAT * 0.9, f)
  }
  const pad = (r: NonNullable<typeof run>, midi: number, t: number, len: number) => { osc(r, 'triangle', midi, t, len, env(r, t, len, 0.08)) }
  const hat = (r: NonNullable<typeof run>, t: number, level: number) => {
    const s = r.o.ctx.createBufferSource()
    s.buffer = noiseBuffer(r.o.ctx)
    const f = r.o.ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 6000
    s.connect(f).connect(env(r, t, 0.12, level * 0.25))
    s.start(t)
    s.stop(t + 0.15)
  }

  /** one beat of the loop (the original's _t) */
  const beat = (r: NonNullable<typeof run>, n: number) => {
    const b = n % LOOP_BEATS, bar = Math.floor(b / BEATS_PER_BAR), k = b % BEATS_PER_BAR
    const at = (x: number) => r.t0 + (n - b + bar * BEATS_PER_BAR + swing(x)) * BEAT
    const ch = CHORDS[bar], nx = CHORDS[(bar + 1) % CHORDS.length]
    const line = [ch.bass, ch.bass + ch.third, ch.bass + 7, nx.bass + (k % 2 ? 1 : -1)]
    bass(r, line[k], at(k))
    if (k === 1 || k === 3) for (const m of ch.notes) pad(r, m, at(k), BEAT * 0.6)
    if (k === 2 && bar % 2 === 1) for (const m of ch.notes) pad(r, m, at(2.5), BEAT * 0.3)
    hat(r, at(k), k === 1 || k === 3 ? 0.5 : 0.3)
    if (k === 1 || k === 3) hat(r, at(k + 0.5), 0.2)
    for (const [nb, nt, len, m] of MELODY) if (nb === bar && Math.floor(nt) === k) lead(r, m, at(nt), len * BEAT)
  }

  const schedule = () => {
    if (!run) return
    const now = (run.o.ctx.currentTime - run.t0) / BEAT
    if (run.next < now) run.next = Math.ceil(now)
    while (run.next < now + AHEAD_BEATS) beat(run, run.next++)
  }

  return {
    start() {
      if (run) return
      const o = output()
      if (!o) return
      const gain = o.ctx.createGain()
      gain.gain.value = TUNE_GAIN
      gain.connect(o.out)
      run = { o, gain, t0: o.ctx.currentTime + 0.1, next: 0, cancel: () => {} }
      schedule()
      run.cancel = every(LOOK_MS, schedule)
    },
    stop() {
      if (!run) return
      const r = run
      run = null
      r.cancel()
      // the notes scheduled ahead fall silent with their gain
      const t = r.o.ctx.currentTime
      r.gain.gain.cancelScheduledValues(t)
      r.gain.gain.setValueAtTime(r.gain.gain.value, t)
      r.gain.gain.linearRampToValueAtTime(0, t + 0.05)
      setTimeout(() => r.gain.disconnect(), 100)
    },
    duck(on) {
      if (!run) return
      const t = run.o.ctx.currentTime
      run.gain.gain.cancelScheduledValues(t)
      run.gain.gain.setTargetAtTime(on ? TUNE_DUCK : TUNE_GAIN, t, 0.08)
    },
    playing: () => run !== null,
  }
}
