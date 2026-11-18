// The play screen's geometry and its drawing parts. The sizes of the ship, the star and the points are the ones the
// parent approved in the plan mock; the planets' linear growth is the original's. Every string drawn on the canvas goes
// through drawText(), so that the no-text scan sees it.
import { LOGICAL, layoutFor } from '../layout'
import { TEST_HOOKS } from '../testHooks'
import { HAND_CUFF, HAND_PATH } from './handPath'

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
  start: 0.4, y0: 285, yArr: wideShipY - wideShipS * 0.5 - wideR, topY: 62, dotY: 62, dotX: 190, dotStep: 42, dotR: 13, heartS: 1,
  heartX: 1515, heartStep: 68, pointsSize: 64, starGap: 100, houseW: 150, box: { cy: 128, h: 124, font: 86, gap: 26 }, k: 1,
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
    heartS: 0.62, heartX: 503, heartStep: 41, pointsSize: 50, starGap: 70, houseW: 96, box: { cy: 202, h: 104, font: 68, gap: 18 },
    k: 0.62,
  }
}

/** The play geometry for a screen of w × h CSS px: its layout, and in portrait an area as tall as the screen's shape. */
export function geomFor(w: number, h: number): Geom {
  if (layoutFor(w, h) === 'wide') return WIDE
  const H = Math.round((LOGICAL.portrait.w * h) / Math.max(1, w))
  return portraitGeom(Math.min(PORTRAIT_H.max, Math.max(PORTRAIT_H.min, H)))
}

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

export function heart(g: CanvasRenderingContext2D, x: number, y: number, s: number, on: boolean): void {
  g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 13)
  g.bezierCurveTo(-30, -6, -16, -30, 0, -13); g.bezierCurveTo(16, -30, 30, -6, 0, 13)
  g.fillStyle = on ? '#ff4d6d' : 'rgba(255,255,255,.12)'; g.fill()
  g.lineWidth = 2.5; g.strokeStyle = on ? '#ffb3c1' : 'rgba(255,255,255,.4)'; g.stroke()
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
    g.beginPath(); g.rect(side < 0 ? -40 * s : 0, -40 * s, 40 * s, 80 * s); g.clip(); heart(g, 0, 0, s, true); g.restore()
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

/** the number on a plain dark disc in the middle of a planet */
export function numDisc(g: CanvasRenderingContext2D, s: string, x: number, y: number, r: number, alpha = 1): void {
  g.save(); g.globalAlpha = alpha
  g.beginPath(); g.arc(x, y, r * 0.58, 0, Math.PI * 2); g.fillStyle = 'rgba(12,8,40,.88)'; g.fill()
  g.font = FONT(r * (s.length > 1 ? 0.58 : 0.72)); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'
  drawText(g, s, x, y + r * 0.04)
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

/** the x centre of each token of the sum box, and the box's width */
export function boxLayout(g: CanvasRenderingContext2D, G: Geom, box: (string | null)[]): { xs: number[]; total: number } {
  const B = G.box
  g.font = FONT(B.font)
  const ws = box.map((t) => (t === null ? B.font * 1.05 : g.measureText(t).width))
  const total = ws.reduce((a, b) => a + b, 0) + B.gap * (box.length - 1)
  let x = G.W / 2 - total / 2
  return { total, xs: ws.map((w) => { const c = x + w / 2; x += w + B.gap; return c }) }
}

/** The sum box, top centre: digits and signs, and a dashed ring for the hole (no "?"). Returns the ring's centre. */
export function drawBox(g: CanvasRenderingContext2D, G: Geom, box: (string | null)[], clock: number, pulse: boolean): { x: number; y: number } {
  const B = G.box, lay = boxLayout(g, G, box), pad = B.font * 0.5, w = lay.total + pad * 2, x = G.W / 2 - w / 2, y = B.cy - B.h / 2
  g.beginPath(); g.roundRect(x, y, w, B.h, B.h * 0.28); g.fillStyle = 'rgba(16,10,52,.9)'; g.fill()
  g.lineWidth = 5 * G.k + 1; g.strokeStyle = '#ffd84a'; g.stroke()
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FONT(B.font)
  let ring = { x: G.W / 2, y: B.cy }
  box.forEach((t, i) => {
    const cx = lay.xs[i]
    if (t !== null) { g.fillStyle = '#fff'; drawText(g, t, cx, B.cy + B.font * 0.04); return }
    const k = pulse ? 1 + 0.14 * Math.sin(clock * 7) : 1
    g.save(); g.setLineDash([10 * G.k + 2, 8 * G.k + 2]); g.lineWidth = 5 * G.k + 1; g.strokeStyle = pulse ? '#fff6a8' : '#ffd84a'
    if (pulse) { g.shadowColor = '#ffd84a'; g.shadowBlur = 24 + 14 * Math.sin(clock * 7) }
    g.beginPath(); g.arc(cx, B.cy, B.font * 0.5 * k, 0, Math.PI * 2); g.stroke(); g.restore()
    ring = { x: cx, y: B.cy }
  })
  return ring
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
