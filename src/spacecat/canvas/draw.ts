// The play screen's geometry and its drawing parts. The sizes of the ship, the star and the points are the ones the
// parent approved in the plan mock; the planets' linear growth is the original's. Every string drawn on the canvas goes
// through drawText(), so that the no-text scan sees it.
import { HEART_EMPTY, HEART_FULL, HEART_GLOW, HEART_PATH } from '../../shared/heart'
import { LOGICAL, layoutFor } from '../layout'
import { TEST_HOOKS } from '../testHooks'
import { HAND_CUFF, HAND_PATH } from './handPath'
import { drawSign, isSign, type SignStyle } from './signs'

declare global {
  interface Window { __scText?: string[] }
}

export const FONT = (px: number) => `700 ${Math.round(px)}px system-ui, sans-serif`

/**
 * The verify build records each distinct string once (the canvas draws the same digits every frame, so a list of every
 * draw grows without end). Past this many distinct strings it records `OVERFLOW` and stops: the scan then fails, as it
 * must, since a real screen draws far fewer.
 */
export const TEXT_LOG_MAX = 500
export const TEXT_LOG_OVERFLOW = '(too many strings)'

/** Draws a string (centred unless the context says otherwise) and, in tests and the verify build, records it once. */
export function drawText(g: CanvasRenderingContext2D, s: string, x: number, y: number): void {
  if (TEST_HOOKS) {
    const log = (window.__scText ??= [])
    if (log.length < TEXT_LOG_MAX && !log.includes(s)) log.push(log.length === TEXT_LOG_MAX - 1 ? TEXT_LOG_OVERFLOW : s)
  }
  g.fillText(s, x, y)
}

export interface Geom {
  W: number; H: number
  /** the x of each lane's centre */
  lanes: number[]
  /** the ship's row (its centre) and its size */
  shipY: number; shipS: number
  /** a planet's full radius (at the ship's row) */
  R: number
  /** where the planets start (under the box) and where they arrive */
  y0: number; yArr: number
  /** a planet starts at this share of its full size, and grows linearly to full size at the ship's row */
  start: number
  /**
   * the top bar: its row; the progress dots (their own row when dotY is not topY); the hearts (right); the space kept
   * free for the held house (left)
   */
  topY: number; dotY: number; dotX: number; dotStep: number; dotR: number; heartS: number; heartX: number; heartStep: number; pointsSize: number; starGap: number
  houseW: number
  box: { cy: number; h: number; font: number; gap: number }
  /** the layout's scale of strokes and speeds (wide = 1) */
  k: number
}

/** the largest vertical offset of a planet from its neighbours, in logical px */
export const MAX_OFFSET = 12

const wideShipY = 790, wideShipS = 176, wideR = 92
const portShipS = 128, portR = 66

/** the wide layout: a tablet in landscape and a phone on its side */
export const WIDE: Geom = {
  W: LOGICAL.wide.w, H: LOGICAL.wide.h, lanes: [0, 1, 2, 3].map((i) => 800 + (i - 1.5) * 240), shipY: wideShipY, shipS: wideShipS, R: wideR,
  start: 0.4, y0: 285, yArr: wideShipY - wideShipS * 0.5 - wideR, topY: 62, dotY: 62, dotX: 190, dotStep: 42, dotR: 13, heartS: 1.15,
  heartX: 1510, heartStep: 84, pointsSize: 64, starGap: 100, houseW: 150, box: { cy: 128, h: 124, font: 86, gap: 26 }, k: 1,
}

/** the portrait play area's height: the screen's own shape, from the still screens' 960 up to a tall phone's */
export const PORTRAIT_H = { min: LOGICAL.portrait.h, max: 1200 } as const

/**
 * The portrait layout (a phone or a tablet held upright), H logical px high. Four lanes fill the width, so a planet at
 * the ship's row is as wide as its lane; on a phone it starts at 0.6 of that size (not the original's 0.4), so that it
 * is large during the whole flight. The progress dots have their own row under the house and the hearts.
 */
export function portraitGeom(H: number): Geom {
  const W = LOGICAL.portrait.w, shipY = H - 105, dotStep = 44
  return {
    W, H, lanes: [0.125, 0.375, 0.625, 0.875].map((f) => f * W), shipY, shipS: portShipS, R: portR, start: 0.6,
    y0: 330, yArr: shipY - portShipS * 0.5 - portR, topY: 50, dotY: 116, dotX: W / 2 - 3 * dotStep, dotStep, dotR: 15,
    heartS: 0.9, heartX: 497, heartStep: 60, pointsSize: 50, starGap: 62, houseW: 96, box: { cy: 202, h: 104, font: 68, gap: 18 },
    k: 0.62,
  }
}

/** The play geometry for a screen of w × h CSS px: its layout, and in portrait an area as tall as the screen's shape. */
export function geomFor(w: number, h: number): Geom {
  if (layoutFor(w, h) === 'wide') return WIDE
  const H = Math.round((LOGICAL.portrait.w * h) / Math.max(1, w))
  return portraitGeom(Math.min(PORTRAIT_H.max, Math.max(PORTRAIT_H.min, H)))
}

/** a planet at the ship's row is at least this many CSS px across, at every size (rule: large targets) */
export const PLANET_MIN_PX = 56

/** three lanes (a comparison): wider apart than four; in the wide layout this far apart, in portrait at these shares of the width */
export const LANES3 = { wideGap: 300, portrait: [1 / 6, 1 / 2, 5 / 6] } as const

/** the x of each lane's centre for a round of n lanes (3 or 4), in a layout's geometry (which has 4) */
export function lanesFor(G: Geom, n: number): number[] {
  if (n !== 3) return G.lanes
  return G.W > G.H ? [-1, 0, 1].map((i) => G.W / 2 + i * LANES3.wideGap) : LANES3.portrait.map((f) => f * G.W)
}

/**
 * The half-width the sum box may have and stay clear of the top bar, when the bar shares the box's rows (the wide
 * layout): between the progress dots and the points (with `digits` digits). Infinity when the bar has its own rows.
 */
export function barClearHalf(G: Geom, digits: number): number {
  if (G.box.cy - G.box.h / 2 > G.topY + G.pointsSize * 0.55) return Infinity
  const dotsRight = G.dotY === G.topY ? G.dotX + 6 * G.dotStep + G.dotR : -Infinity
  const pointsLeft = G.heartX - 2 * G.heartStep - G.starGap - G.pointsSize * 0.85 - digits * 0.62 * G.pointsSize
  return Math.min(G.W / 2 - dotsRight, pointsLeft - G.W / 2) - BAR_CLEAR
}
/** the space kept between the box and the top bar's dots or points (logical px) */
export const BAR_CLEAR = 12
/** the box's top when it is too wide to sit beside the top bar: under the bar's points */
export const boxTopUnderBar = (G: Geom): number => G.topY + G.pointsSize * 0.55 + 6

/** the held house's size and its inset from the screen's edge (CSS px; src/shared/HomeButton.tsx) */
export const HOUSE_PX = 56, HOUSE_INSET = 8

/**
 * Where the held house sits on a screen of w × h CSS px: on the top bar's row, in the corner the bar keeps free, and
 * always clear of the first progress dot (beside it, or above the dots' own row). A wide screen that letterboxes the
 * game area (a phone on its side) puts the house just left of the area when there is room.
 */
export function housePlace(w: number, h: number): { left: number; top: number } {
  const G = geomFor(w, h), f = fit(G, w, h)
  const centred = f.ox + (G.houseW / 2) * f.scale - HOUSE_PX / 2
  const beforeDots = G.dotY === G.topY ? f.ox + (G.dotX - G.dotR) * f.scale - HOUSE_PX - 4 : Infinity
  const top = Math.max(HOUSE_INSET, f.oy + G.topY * f.scale - HOUSE_PX / 2)
  // a letterboxed area with room beside it: the house just left of the area, clear of the bar and the sum box
  if (f.ox >= HOUSE_PX + 2 * HOUSE_INSET) return { left: f.ox - HOUSE_PX - HOUSE_INSET, top }
  return { left: Math.max(HOUSE_INSET, Math.min(centred, beforeDots)), top }
}

/** A planet's centre and radius at progress p (0 = start, 1 = at the ship's row), with its vertical offset. */
export function planetPos(G: Geom, lane: number, p: number, off: number): { x: number; y: number; r: number } {
  return { x: G.lanes[lane], y: G.y0 + (G.yArr - G.y0) * p + off * (0.4 + 0.6 * Math.min(1, p)), r: G.R * (G.start + (1 - G.start) * p) }
}

/** the logical game area centred in a screen of cw × ch (CSS or device px): its scale and offset */
export function fit(G: Geom, cw: number, ch: number): { scale: number; ox: number; oy: number } {
  const scale = Math.min(cw / G.W, ch / G.H)
  return { scale, ox: (cw - G.W * scale) / 2, oy: (ch - G.H * scale) / 2 }
}

/** x in lane units (0 = the first lane's centre) */
export const laneUnits = (G: Geom, x: number) => (x - G.lanes[0]) / (G.lanes[1] - G.lanes[0])

// ---------- drawn icons (no emoji), from the plan mock

let heartPath: Path2D | null | undefined
/** the shared life heart (src/shared/heart.tsx) in a box 68 s units wide, centred at (x, y); a lost one is its ghost */
export function heart(g: CanvasRenderingContext2D, x: number, y: number, s: number, on: boolean): void {
  if (heartPath === undefined) heartPath = typeof Path2D === 'undefined' ? null : new Path2D(HEART_PATH)
  const k = (68 * s) / 24
  g.save(); g.translate(x - 12 * k, y - 12.4 * k); g.scale(k, k)
  if (on) { g.shadowColor = HEART_GLOW; g.shadowBlur = 6 * k }
  g.fillStyle = on ? HEART_FULL : HEART_EMPTY.fill
  if (heartPath) g.fill(heartPath)
  if (!on && heartPath) { g.lineWidth = 1.2; g.strokeStyle = HEART_EMPTY.stroke; g.stroke(heartPath) }
  g.restore()
}

export function star(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r
    g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q)
  }
  g.closePath(); g.fillStyle = '#ffd84a'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff3b0'; g.stroke()
}

/** a heart breaking in two, t from 0 to 1 */
export function brokenHeart(g: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  heart(g, x, y, s, false)
  for (const side of [-1, 1]) {
    g.save(); g.translate(x + side * t * 22 * s, y + t * t * 60 * s); g.rotate(side * t * 0.8); g.globalAlpha = 1 - t
    g.beginPath(); g.rect(side < 0 ? -34 * s : 0, -34 * s, 34 * s, 68 * s); g.clip(); heart(g, 0, 0, s, true); g.restore()
  }
}

let handPath: Path2D | null | undefined
/** the pointing hand, its fingertip at (x, y) */
export function drawHand(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  if (handPath === undefined) handPath = typeof Path2D === 'undefined' ? null : new Path2D(HAND_PATH)
  if (!handPath) return
  const c = HAND_CUFF
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#ffe0bd'; g.strokeStyle = '#6b3e1f'; g.lineWidth = 4; g.lineJoin = 'round'
  g.fill(handPath); g.stroke(handPath)
  g.translate(c.cx, c.cy); g.rotate((c.deg * Math.PI) / 180); g.beginPath(); g.roundRect(c.x - c.cx, c.y - c.cy, c.w, c.h, c.r)
  g.fillStyle = '#7a3fd0'; g.fill(); g.strokeStyle = '#3a1a6a'; g.stroke(); g.restore()
}

/** the number (or a comparison sign, drawn as a path) on a plain dark disc in the middle of a planet */
export function numDisc(g: CanvasRenderingContext2D, s: string, x: number, y: number, r: number, alpha = 1, sign: SignStyle = {}): void {
  g.save(); g.globalAlpha = alpha
  g.beginPath(); g.arc(x, y, r * 0.58, 0, Math.PI * 2); g.fillStyle = 'rgba(12,8,40,.88)'; g.fill()
  if (isSign(s)) drawSign(g, s, x, y, r * 0.86, sign)
  else {
    g.font = FONT(r * (s.length > 1 ? 0.58 : 0.72)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'
    drawText(g, s, x, y + r * 0.04)
  }
  g.restore()
}

/** the top bar: 7 progress dots after the held house (or on their own row under it), on the right the star with the points and 3 hearts */
export function drawTopBar(
  g: CanvasRenderingContext2D, G: Geom, hud: { dots: number; points: number; hearts: number },
  breaking: { i: number; t: number } | null,
): { pointsAt: { x: number; y: number } } {
  const y = G.topY
  for (let i = 0; i < 7; i++) {
    g.beginPath(); g.arc(G.dotX + i * G.dotStep, G.dotY, G.dotR, 0, Math.PI * 2)
    g.fillStyle = i < hud.dots ? '#ffd84a' : 'rgba(255,255,255,.22)'; g.fill()
    if (i < hud.dots) { g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.4)'; g.stroke() }
  }
  for (let i = 0; i < 3; i++) {
    const x = G.heartX - (2 - i) * G.heartStep
    if (breaking && breaking.i === i) brokenHeart(g, x, y, G.heartS, breaking.t)
    else heart(g, x, y, G.heartS, i < hud.hearts)
  }
  const sz = G.pointsSize, sx = G.heartX - 2 * G.heartStep - G.starGap
  star(g, sx, y - 2, sz * 0.62)
  g.font = FONT(sz); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#fff'
  drawText(g, String(Math.round(hud.points)), sx - sz * 0.85, y + 2)
  return { pointsAt: { x: sx - sz * 0.6, y } }
}

/** a jump row's gaps are this many times the sum box's gap */
export const JUMP_GAP = 2.6
/** the box keeps at least this share of the width free at each side; its font shrinks when a row does not fit */
export const BOX_SIDE = 0.025
/** a jump row's numbers hop in one by one, each in this long, from the left; then the ring is shown */
export const HOP_MS = 250
/** the ring pops in this long after the numbers */
const RING_POP_MS = 200
/** the `arcs` cue lights each arc in turn this long */
export const ARC_GLOW_MS = 450

/** ms from a jump row's start until its ring is shown (boxIn resolves then) */
export const boxInMs = (box: (string | null)[]): number => box.filter((t) => t !== null).length * HOP_MS

export interface BoxLayout { xs: number[]; ws: number[]; total: number; font: number; gap: number }

/**
 * The x centre of each token of the sum box, and the box's width. The font shrinks (with the gaps) so that the box
 * fits the width; it is measured with the font that is loaded now, so the next frame after the font loads is right.
 */
export function boxLayout(g: CanvasRenderingContext2D, G: Geom, box: (string | null)[], jumps = false): BoxLayout {
  const B = G.box, gap0 = B.gap * (jumps ? JUMP_GAP : 1)
  const measure = (font: number) => {
    g.font = FONT(font)
    const ws = box.map((t) => (t === null ? font * 1.05 : g.measureText(t).width))
    const gap = (gap0 * font) / B.font
    return { ws, gap, font, total: ws.reduce((a, b) => a + b, 0) + gap * (box.length - 1) }
  }
  let m = measure(B.font)
  const avail = G.W * (1 - 2 * BOX_SIDE), need = m.total + B.font
  if (need > avail) m = measure((B.font * avail) / need)
  let x = G.W / 2 - m.total / 2
  return { ...m, xs: m.ws.map((w) => { const c = x + w / 2; x += w + m.gap; return c }) }
}

export interface BoxOpts {
  /** a jump row: wide gaps and the arcs */
  jumps?: boolean
  /** a jump row: ms since it started to come in (the hop); omitted, all is in */
  hopMs?: number
  /** the `arcs` cue: the arc that glows now */
  arcGlow?: number | null
  /** the scale of each token (the bigger number's swell) */
  scale?: number[]
}

const easeHop = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2)

/**
 * The sum box, top centre: digits and signs, and a dashed ring for the hole (no "?"). A jump row has wide gaps, no
 * commas and a faint arc over each pair of neighbours; its numbers hop in one by one from the left, then the ring.
 * Returns the ring's centre and the box's font.
 */
export function drawBox(
  g: CanvasRenderingContext2D, G: Geom, box: (string | null)[], clock: number, pulse: boolean, o: BoxOpts = {},
): { x: number; y: number; font: number; xs: number[] } {
  const B = G.box, lay = boxLayout(g, G, box, o.jumps), f = lay.font
  const pad = f * 0.5, w = lay.total + pad * 2, x = G.W / 2 - w / 2, y = B.cy - B.h / 2
  g.beginPath(); g.roundRect(x, y, w, B.h, B.h * 0.28); g.fillStyle = 'rgba(16,10,52,.9)'; g.fill()
  g.lineWidth = 5 * G.k + 1; g.strokeStyle = '#ffd84a'; g.stroke()
  g.textAlign = 'center'; g.textBaseline = 'middle'
  // the hop: the k-th number (from the left) comes in at k × HOP_MS, from its left neighbour's place; then the ring
  const order: number[] = []
  box.forEach((t, i) => { if (t !== null) order.push(i) })
  const hop = o.hopMs ?? Infinity, ringAt = order.length * HOP_MS
  const shown = (i: number) => (box[i] === null ? hop >= ringAt : hop >= order.indexOf(i) * HOP_MS)
  if (o.jumps) {
    for (let i = 0; i + 1 < box.length; i++) {
      if (!shown(i) || !shown(i + 1)) continue
      const x0 = lay.xs[i] + lay.ws[i] * 0.2, x1 = lay.xs[i + 1] - lay.ws[i + 1] * 0.2, yA = B.cy - f * 0.44
      const lit = o.arcGlow === i
      g.save(); g.lineWidth = (lit ? 5 : 3) * G.k + 1; g.lineCap = 'round'
      g.strokeStyle = lit ? 'rgba(255,232,120,.95)' : 'rgba(255,216,74,.38)'
      if (lit) { g.shadowColor = '#ffd84a'; g.shadowBlur = 16 }
      g.beginPath(); g.moveTo(x0, yA); g.quadraticCurveTo((x0 + x1) / 2, B.cy - f * 0.84, x1, yA); g.stroke(); g.restore()
    }
  }
  let ring = { x: G.W / 2, y: B.cy }
  box.forEach((t, i) => {
    const cx = lay.xs[i]
    if (t !== null) {
      const k = order.indexOf(i), u = (hop - k * HOP_MS) / HOP_MS
      if (u < 0) return
      let tx = cx, ty = B.cy
      if (u < 1) {
        const from = i > 0 ? lay.xs[i - 1] : cx, e = easeHop(u)
        tx = from + (cx - from) * e; ty = B.cy - Math.sin(Math.PI * u) * f * 0.45
      }
      g.font = FONT(f * (o.scale?.[i] ?? 1)); g.fillStyle = '#fff'; drawText(g, t, tx, ty + f * 0.04)
      return
    }
    ring = { x: cx, y: B.cy }
    if (hop < ringAt) return
    const pop = Math.min(1, (hop - ringAt) / RING_POP_MS), pk = 0.5 + 0.5 * pop
    const k = (pulse ? 1 + 0.14 * Math.sin(clock * 7) : 1) * pk
    g.save(); g.setLineDash([10 * G.k + 2, 8 * G.k + 2]); g.lineWidth = 5 * G.k + 1; g.strokeStyle = pulse ? '#fff6a8' : '#ffd84a'
    if (pulse) { g.shadowColor = '#ffd84a'; g.shadowBlur = 24 + 14 * Math.sin(clock * 7) }
    g.beginPath(); g.arc(cx, B.cy, f * 0.5 * k, 0, Math.PI * 2); g.stroke(); g.restore()
  })
  return { ...ring, font: f, xs: lay.xs }
}

/** the space picture covering the whole screen (device px), dimmed a little; plain dark before it loads */
export function drawBackground(g: CanvasRenderingContext2D, img: HTMLImageElement | null, cw: number, ch: number): void {
  if (img && img.complete && img.naturalWidth > 0) {
    const sc = Math.max(cw / img.naturalWidth, ch / img.naturalHeight), w = img.naturalWidth * sc, h = img.naturalHeight * sc
    g.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h)
    g.fillStyle = 'rgba(0,0,20,.28)'; g.fillRect(0, 0, cw, ch)
  } else {
    g.fillStyle = '#070b1f'; g.fillRect(0, 0, cw, ch)
  }
}
