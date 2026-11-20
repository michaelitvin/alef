// The comparison signs `<`, `=` and `>`, drawn as canvas paths and never as text: a `<` drawn as text in a right-to-left
// context can be mirrored by the browser, which would swap its meaning (rule: give each symbol only one meaning). `<`
// and `>` are the same two open strokes, mirrored; `=` is two bars. All three are only stroked, never filled (a filled
// `>` would look like the play triangle), in the same colour and stroke.
import type { Sign } from '../logic/facts'

/** half the width and half the height of `<` and `>`, and the half-length and half-gap of `=`'s bars, per unit of size */
export const SIGN_HALF_W = 0.3, SIGN_HALF_H = 0.34, EQUAL_HALF_W = 0.32, EQUAL_HALF_GAP = 0.15
/** the stroke width per unit of size, the same for all three signs */
export const SIGN_STROKE = 0.13

export const isSign = (s: string): s is Sign => s === '<' || s === '=' || s === '>'

/** the sign's open polylines, centred at (0, 0), for a sign `size` high (no closed path: a sign is never filled) */
export function signPath(sign: Sign, size: number): [number, number][][] {
  if (sign === '=') {
    const w = EQUAL_HALF_W * size, d = EQUAL_HALF_GAP * size
    return [[[-w, -d], [w, -d]], [[-w, d], [w, d]]]
  }
  // `<`: the point on the left, the open side on the right; `>` is the same path with x mirrored
  const m = sign === '<' ? 1 : -1, w = SIGN_HALF_W * size, h = SIGN_HALF_H * size
  return [[[m * w, -h], [-m * w, 0], [m * w, h]]]
}

/** the centre of the open side of `<` or `>` (where the bigger number is), relative to the sign's centre */
export function openSide(sign: '<' | '>', size: number): { x: number; y: number } {
  return { x: (sign === '<' ? 1 : -1) * SIGN_HALF_W * size, y: 0 }
}

export interface SignStyle {
  color?: string
  /** a glow of this colour around the strokes */
  glow?: string
  /** 0 to 1: a soft light on the open side of `<` and `>` (the `open` cue) */
  openGlow?: number
}

export const SIGN_COLOR = '#ffffff'

/** draws the sign centred at (x, y), `size` high */
export function drawSign(g: CanvasRenderingContext2D, sign: Sign, x: number, y: number, size: number, style: SignStyle = {}): void {
  g.save()
  if (style.openGlow && sign !== '=') {
    const o = openSide(sign, size), cx = x + o.x, r = size * 0.6
    const gr = g.createRadialGradient(cx, y, 0, cx, y, r)
    gr.addColorStop(0, `rgba(255,232,120,${0.95 * style.openGlow})`); gr.addColorStop(1, 'rgba(255,232,120,0)')
    g.fillStyle = gr; g.beginPath(); g.arc(cx, y, r, 0, Math.PI * 2); g.fill()
  }
  g.strokeStyle = style.color ?? SIGN_COLOR
  g.lineWidth = SIGN_STROKE * size
  g.lineCap = 'round'; g.lineJoin = 'round'
  if (style.glow) { g.shadowColor = style.glow; g.shadowBlur = size * 0.35 }
  for (const line of signPath(sign, size)) {
    g.beginPath()
    line.forEach(([px, py], i) => (i === 0 ? g.moveTo(x + px, y + py) : g.lineTo(x + px, y + py)))
    g.stroke()
  }
  g.restore()
}
