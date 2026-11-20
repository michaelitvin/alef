// The equal groups of a product or a quotient, drawn in code (the design's *The equal-groups dots*): a row of soft
// rounded pods under the sum box (two rows when one does not fit), each with its dots in a pattern he can see at a
// glance: dice faces up to 6, two rows of five for 7 to 10. The dots are round, filled and big, in the planets'
// colours; they are not stars (the star means points) and no digit is written on a pod.
import type { Pods } from '../content'
import { MAX_OFFSET, type Geom } from './draw'

/** a dot's diameter is at least this share of the box's digit height (rule: no small dot clusters, nikkud look-alikes) */
export const DOT_MIN = 1 / 3
/** a dot's diameter is at most this share of the digit height (the digits stay the strongest element) */
export const DOT_MAX = 0.55
/** a digit's height per px of the font (the system sans digits) */
export const DIGIT_H = 0.72
/** the pods' rows may be at most this high (logical px), so that the planets keep a long path */
export const PODS_MAX_H = { wide: 150, portrait: 200 } as const
/** the pods keep this share of the width free at each side */
export const PODS_SIDE = 0.03
/** the space between the box and the pods, and between the pods and a planet's start (logical px) */
export const PODS_GAP = 10
/** the grid step between dot centres, per dot diameter; a pod's padding and the gap between pods, per dot radius */
const STEP = 1.3, PAD = 0.75, POD_GAP = 1.3

/** the pods appear one after another, each in this long */
export const POD_POP_MS = 220
/** share: the dots of one group fall in this long; the groups start at most this far apart, and all within SHARE_SPAN_MS */
export const SHARE_FALL_MS = 320, SHARE_GROUP_MS = 300, SHARE_SPAN_MS = 900
/** share: the empty pods are shown this long before the first group falls */
export const SHARE_DELAY_MS = 250

/** the digit height of the box's font (logical px) */
export const digitHeight = (G: Geom): number => G.box.font * DIGIT_H
/** the smallest dot radius of a layout */
export const dotMinR = (G: Geom): number => (digitHeight(G) * DOT_MIN) / 2
/** one row of pods while its dots are at least this many times the smallest radius */
const ONE_ROW_MARGIN = 1.15

/** the dots of a pod of n (1 to 10) as cells of its grid, and the grid's size: dice faces up to 6, two rows of five above */
export function dotCells(n: number): { cols: number; rows: number; cells: [number, number][] } {
  if (n > 6) {
    const cells: [number, number][] = []
    for (let i = 0; i < n; i++) cells.push([i % 5, Math.floor(i / 5)])
    return { cols: 5, rows: Math.ceil(n / 5), cells }
  }
  const DICE: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[2, 0], [0, 2]],
    3: [[2, 0], [1, 1], [0, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
  }
  return { cols: 3, rows: 3, cells: DICE[Math.max(1, n)] }
}

export interface PodBox { x: number; y: number; w: number; h: number }
export interface PodLayout {
  /** the dots' radius */
  r: number
  pods: PodBox[]
  /** the centre of each pod's dots */
  dots: { x: number; y: number }[][]
  top: number; bottom: number
}

const isWide = (G: Geom) => G.W > G.H

/** where the pods and their dots are: one row, or two when that gives bigger dots */
export function podLayout(G: Geom, groups: number, each: number): PodLayout {
  const { cols, rows: gr, cells } = dotCells(each)
  // in units of the dot radius r
  const pw = cols * 2 * STEP + 2 * PAD, ph = gr * 2 * STEP + 2 * PAD
  const availW = G.W * (1 - 2 * PODS_SIDE), maxH = isWide(G) ? PODS_MAX_H.wide : PODS_MAX_H.portrait
  const rMax = (digitHeight(G) * DOT_MAX) / 2
  const fit = (rows: number) => {
    const per = Math.ceil(groups / rows)
    return Math.min(rMax, availW / (per * pw + (per - 1) * POD_GAP), maxH / (rows * ph + (rows - 1) * POD_GAP))
  }
  // one row unless its dots would be near the smallest allowed (then two rows, when they give bigger dots)
  const r1 = fit(1), r2 = fit(2)
  const rows = groups > 1 && r1 < dotMinR(G) * ONE_ROW_MARGIN && r2 > r1 ? 2 : 1
  const r = rows === 1 ? r1 : r2
  const per = Math.ceil(groups / rows)
  const top = G.box.cy + G.box.h / 2 + PODS_GAP
  const pods: PodBox[] = [], dots: { x: number; y: number }[][] = []
  for (let row = 0; row < rows; row++) {
    const n = Math.min(per, groups - row * per)
    const w = n * pw * r + (n - 1) * POD_GAP * r
    let x = G.W / 2 - w / 2
    const y = top + row * (ph + POD_GAP) * r
    for (let i = 0; i < n; i++) {
      pods.push({ x, y, w: pw * r, h: ph * r })
      const ox = x + (pw * r - cols * 2 * STEP * r) / 2, oy = y + PAD * r
      dots.push(cells.map(([c, rr]) => ({ x: ox + (c + 0.5) * 2 * STEP * r, y: oy + (rr + 0.5) * 2 * STEP * r })))
      x += (pw + POD_GAP) * r
    }
  }
  return { r, pods, dots, top, bottom: top + (rows * ph + (rows - 1) * POD_GAP) * r }
}

/** the planets' start (y0) for a round that may show these pods: lower than the layout's, so the pods cover nothing that moves */
export function podsY0(G: Geom, pods: Pick<Pods, 'groups' | 'each'>): number {
  const L = podLayout(G, pods.groups, pods.each)
  return Math.max(G.y0, L.bottom + PODS_GAP + G.R * G.start + MAX_OFFSET * 0.4)
}

/** share: when group i starts to fall (ms after the pods were shown) */
export function shareStart(groups: number, i: number): number {
  return SHARE_DELAY_MS + i * Math.min(SHARE_GROUP_MS, SHARE_SPAN_MS / Math.max(1, groups))
}

export interface PodsView {
  /** ms since the pods were shown */
  t: number
  /** the dots fall in from `from` (a divide's first number), one group at a time */
  share: boolean
  from: { x: number; y: number }
  /** 0 to 1: the `pods` or `share` cue's glow */
  glow: number
  alpha: number
  /** the dots' colour: one of the planets' (PLANET_AIR), the same in every pod, since the groups are equal */
  color: string
}

const easeOut = (u: number) => 1 - (1 - u) ** 3
const popScale = (u: number) => (u >= 1 ? 1 : u <= 0 ? 0 : 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2)

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill()
  g.lineWidth = Math.max(1.5, r * 0.16); g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke()
}

/** draws the pods and their dots */
export function drawPods(g: CanvasRenderingContext2D, L: PodLayout, v: PodsView): void {
  const n = L.pods.length, stagger = Math.min(70, 420 / Math.max(1, n))
  g.save(); g.globalAlpha = v.alpha
  L.pods.forEach((p, i) => {
    const s = popScale((v.t - (v.share ? 0 : i * stagger)) / POD_POP_MS)
    if (s <= 0) return
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, col = v.color
    g.save(); g.translate(cx, cy); g.scale(s, s)
    g.beginPath(); g.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, Math.min(p.w, p.h) * 0.42)
    g.fillStyle = 'rgba(20,14,64,.82)'; g.fill()
    g.lineWidth = Math.max(2, L.r * 0.22)
    g.strokeStyle = v.glow > 0 ? `rgba(255,216,74,${0.5 + 0.5 * v.glow})` : 'rgba(190,200,255,.45)'
    if (v.glow > 0) { g.shadowColor = '#ffd84a'; g.shadowBlur = 18 * v.glow }
    g.stroke(); g.shadowBlur = 0
    if (!v.share) for (const d of L.dots[i]) dot(g, d.x - cx, d.y - cy, L.r, col)
    g.restore()
  })
  if (v.share) {
    L.dots.forEach((ds, i) => {
      const col = v.color, t0 = shareStart(n, i)
      ds.forEach((d, j) => {
        const u = (v.t - t0 - j * 18) / SHARE_FALL_MS
        if (u <= 0) return
        const k = easeOut(Math.min(1, u))
        const x = v.from.x + (d.x - v.from.x) * k, y = v.from.y + (d.y - v.from.y) * k - Math.sin(Math.PI * k) * L.r * 2
        dot(g, x, y, L.r * (0.8 + 0.2 * k), col)
      })
    })
  }
  g.restore()
}
