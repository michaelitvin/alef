// The feedback of a round's end: particles, the flash, the shake, a heart that breaks, the right number flying into the
// ring and the "+2" of an early zoom. Sizes and timings are the builder's (spec), taken from the plan mock.
import type { RoundContent } from '../content'
import type { Geom } from './draw'
import { FONT, drawText } from './draw'
import { drawSign, isSign } from './signs'

/** the mark of a round's result holds this long, then the screen clears */
export const MARK_MS = 800
/** the planets and the flown number fade out in this time after the mark; the round ends when it is over */
export const CLEAR_MS = 200
/** the flown number reaches the ring after this long */
export const FLY_MS = 450
/** after a wrong answer or a time-out on a round with pods, the mark holds this long, so that the groups can be seen */
export const MARK_POD_MS = 1500
/** a comparison: when the flown sign reaches the ring, the bigger number swells to this size and back in SWELL_MS */
export const SWELL = 1.15, SWELL_MS = 400
/** the `bigger` cue swells the bigger number in this period, while it is on */
export const SWELL_CUE_PERIOD_MS = 800

/**
 * The scale of each token of the box. A comparison's bigger number (both for =) swells once when the flown sign reaches
 * the ring (`markMs`, after the result; null in flight), and keeps swelling while the `bigger` cue is on (`cueMs`).
 */
export function swellScale(c: Pick<RoundContent, 'box' | 'bigger'>, markMs: number | null, cueMs: number | null): number[] {
  const out = c.box.map(() => 1)
  if (c.bigger === undefined) return out
  let k = 0
  if (markMs !== null && markMs >= FLY_MS && markMs <= FLY_MS + SWELL_MS) k = Math.sin((Math.PI * (markMs - FLY_MS)) / SWELL_MS)
  if (cueMs !== null) k = Math.max(k, 0.5 - 0.5 * Math.cos((2 * Math.PI * cueMs) / SWELL_CUE_PERIOD_MS))
  for (const i of c.bigger === 'both' ? [0, 2] : [c.bigger]) out[i] = 1 + (SWELL - 1) * k
  return out
}
/** a heart breaks in this long */
export const HEART_BREAK_MS = 900

interface Part { x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; kind: 'shard' | 'streak'; s: number; c: string }

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

export class Effects {
  private parts: Part[] = []
  flash = 0
  flashCol: 'red' | 'gold' = 'gold'
  shake = 0
  heartBreak: { i: number; t: number } | null = null
  plus: { v: number; t: number } | null = null

  clear(): void {
    this.parts = []; this.flash = 0; this.shake = 0; this.heartBreak = null; this.plus = null
  }

  /** a planet bursts into shards and streaks (not hearts, not round dots); power 2 for the early zoom */
  burst(G: Geom, x: number, y: number, col: string, power: 1 | 2): void {
    const n = 26 * power
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (220 + Math.random() * 520) * G.k * (power > 1 ? 1.3 : 1)
      this.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        life: 0.9 + Math.random() * 0.3, kind: Math.random() < 0.35 ? 'streak' : 'shard', s: (10 + Math.random() * 18) * G.k,
        c: Math.random() < 0.3 ? '#ffffff' : col,
      })
    }
  }

  breakHeart(i: number): void { this.heartBreak = { i, t: 0 } }

  /** dt in s */
  update(G: Geom, dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 2.2)
    this.shake = Math.max(0, this.shake - dt)
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt * G.k; p.rot += p.vr * dt; p.life -= dt * 1.2 }
    this.parts = this.parts.filter((p) => p.life > 0)
    if (this.heartBreak) { this.heartBreak.t += (dt * 1000) / HEART_BREAK_MS; if (this.heartBreak.t >= 1) this.heartBreak = null }
    if (this.plus) { this.plus.t += dt; if (this.plus.t > 0.9) this.plus = null }
  }

  drawParts(g: CanvasRenderingContext2D): void {
    for (const p of this.parts) {
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, p.life)); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.strokeStyle = p.c
      if (p.kind === 'shard') { g.beginPath(); g.moveTo(0, -p.s * 0.7); g.lineTo(p.s * 0.35, p.s * 0.5); g.lineTo(-p.s * 0.3, p.s * 0.3); g.closePath(); g.fill() }
      else { g.lineWidth = Math.max(2, p.s * 0.18); g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -p.s); g.lineTo(0, p.s); g.stroke() }
      g.restore()
    }
  }

  /** the "+2" over the points */
  drawPlus(g: CanvasRenderingContext2D, G: Geom, at: { x: number; y: number }): void {
    if (!this.plus) return
    const t = this.plus.t
    g.save(); g.globalAlpha = Math.max(0, 1 - t / 0.9); g.font = FONT(56 * G.k); g.fillStyle = '#ffe36b'; g.textAlign = 'center'
    g.textBaseline = 'middle'; g.shadowColor = '#ffb000'; g.shadowBlur = 20
    drawText(g, '+' + this.plus.v, at.x, at.y + 70 * G.k - t * 30 * G.k)
    g.restore()
  }

  /** the flash over the whole screen (device px) */
  drawFlash(g: CanvasRenderingContext2D, cw: number, ch: number): void {
    if (this.flash <= 0) return
    g.fillStyle = this.flashCol === 'red' ? `rgba(255,40,40,${this.flash * 0.55})` : `rgba(255,230,140,${this.flash * 0.35})`
    g.fillRect(0, 0, cw, ch)
  }
}

/**
 * The right number (or a comparison's sign, drawn as a path) flying from its planet into the ring; after ms since the
 * result. `hold` is the mark's length, `font` the box's (it shrinks for a long row).
 */
export function drawFlyNumber(
  g: CanvasRenderingContext2D, G: Geom, s: string, from: { x: number; y: number }, ring: { x: number; y: number }, ms: number,
  o: { hold?: number; font?: number } = {},
): void {
  const hold = o.hold ?? MARK_MS, font = o.font ?? G.box.font
  const k = ease(Math.min(1, ms / FLY_MS)), x = from.x + (ring.x - from.x) * k, y = from.y + (ring.y - from.y) * k
  const size = font * (0.7 + 0.3 * k), fade = ms > hold ? Math.max(0, 1 - (ms - hold) / CLEAR_MS) : 1
  const col = k >= 1 ? '#7dffa8' : '#fff'
  g.save(); g.globalAlpha = fade
  if (isSign(s)) {
    drawSign(g, s, x, y, size * 0.9, { color: col, glow: '#4cff8a' })
  } else {
    g.font = FONT(size); g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillStyle = col; g.shadowColor = '#4cff8a'; g.shadowBlur = k >= 1 ? 22 : 8
    drawText(g, s, x, y + size * 0.04)
  }
  g.restore()
}

/** a cue's gold ring around a planet (the `signs` and `equal` cues), pulsing with the clock (s) */
export function drawCueRing(g: CanvasRenderingContext2D, G: Geom, p: { x: number; y: number; r: number }, alpha: number, clock: number): void {
  const k = 0.6 + 0.4 * Math.sin(clock * 6)
  g.save(); g.globalAlpha = alpha * k; g.beginPath(); g.arc(p.x, p.y, p.r + 12 * G.k, 0, Math.PI * 2)
  g.strokeStyle = '#ffd84a'; g.lineWidth = 8 * G.k; g.shadowColor = '#ffd84a'; g.shadowBlur = 22; g.stroke(); g.restore()
}

/** the green ring on the right planet after a wrong answer or a time-out (and on a right one, briefly) */
export function drawRightRing(g: CanvasRenderingContext2D, G: Geom, p: { x: number; y: number; r: number }, alpha: number): void {
  g.save(); g.globalAlpha = alpha; g.beginPath(); g.arc(p.x, p.y, p.r + 14 * G.k, 0, Math.PI * 2)
  g.strokeStyle = '#4cff8a'; g.lineWidth = 9 * G.k; g.shadowColor = '#4cff8a'; g.shadowBlur = 18; g.stroke(); g.restore()
}
