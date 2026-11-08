// The drawing check (spec: Checking). Plain geometry, no model, no network. All points are in the slot's normalized
// units (data/strokes.ts: y 0 on the top line, 1 on the baseline). Forgiving on purpose: wobble, size and the place in the
// slot do not matter; only the start, the direction, the order and the rough shape do (anti-goal: never reject a correct
// letter because it is wobbly, small, big or has a gap).
import type { LetterDef, Pt, StrokeDef } from '../data/strokes'

export type Why = 'start' | 'direction' | 'shape' | 'order'
export interface Box { left: number; right: number; top: number; bottom: number }

/** points per resampled stroke */
export const N = 32
/** mean point distance (own-normalized: the stroke's longer side = 1) that still counts as the same shape */
export const SHAPE_TOL = 0.17
/** how far (in letter units, times the letter's scale) a later stroke may start from where it should */
export const START_TOL = 0.33
/** how far the middle of a later stroke may be from where it should be */
export const PLACE_TOL = 0.36

// ---- geometry
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
export function pathLength(p: Pt[]): number {
  let l = 0
  for (let i = 1; i < p.length; i++) l += dist(p[i - 1], p[i])
  return l
}
/** n points evenly along the path */
export function resample(p: Pt[], n = N): Pt[] {
  if (p.length === 0) return []
  const total = pathLength(p)
  if (p.length === 1 || total === 0) return Array.from({ length: n }, () => [p[0][0], p[0][1]] as Pt)
  const step = total / (n - 1)
  const out: Pt[] = [[p[0][0], p[0][1]]]
  let acc = 0
  let i = 1
  let prev: Pt = p[0]
  while (out.length < n - 1 && i < p.length) {
    const d = dist(prev, p[i])
    if (acc + d >= step && d > 0) {
      const k = (step - acc) / d
      const q: Pt = [prev[0] + k * (p[i][0] - prev[0]), prev[1] + k * (p[i][1] - prev[1])]
      out.push(q)
      prev = q
      acc = 0
    } else {
      acc += d
      prev = p[i]
      i++
    }
  }
  while (out.length < n) out.push([p[p.length - 1][0], p[p.length - 1][1]])
  return out
}
/** the first `f` (0–1) of the path by its length */
export function subpath(p: Pt[], f: number): Pt[] {
  const want = pathLength(p) * f
  const out: Pt[] = [p[0]]
  let acc = 0
  for (let i = 1; i < p.length; i++) {
    const d = dist(p[i - 1], p[i])
    if (acc + d >= want) {
      const k = d ? (want - acc) / d : 0
      out.push([p[i - 1][0] + k * (p[i][0] - p[i - 1][0]), p[i - 1][1] + k * (p[i][1] - p[i - 1][1])])
      return out
    }
    acc += d
    out.push(p[i])
  }
  return out
}
export function bbox(p: Pt[]): Box {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity
  for (const [x, y] of p) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
  return { left, right, top, bottom }
}
const diag = (b: Box) => Math.hypot(b.right - b.left, b.bottom - b.top)
const centroid = (p: Pt[]): Pt => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length]
/** centred on its box, its longer side scaled to 1 (keeps the aspect: a vertical line stays vertical) */
function ownNorm(p: Pt[]): Pt[] {
  const b = bbox(p)
  const k = Math.max(b.right - b.left, b.bottom - b.top, 1e-6)
  const cx = (b.left + b.right) / 2
  const cy = (b.top + b.bottom) / 2
  return p.map(([x, y]) => [(x - cx) / k, (y - cy) / k])
}
const meanDist = (a: Pt[], b: Pt[]) => a.reduce((s, q, i) => s + dist(q, b[i]), 0) / a.length

/** where the letter he draws sits: expected point → his point = s·p + t */
export interface Frame { s: number; tx: number; ty: number }
const ID: Frame = { s: 1, tx: 0, ty: 0 }
const apply = (f: Frame, [x, y]: Pt): Pt => [f.s * x + f.tx, f.s * y + f.ty]

/** `prior`: the writing lines are a prior on the size, worth one stroke (a short first roof is not a small letter) */
function fit(pairs: { d: Pt[]; e: Pt[] }[], prior = false): Frame {
  const D = pairs.flatMap((p) => p.d)
  const E = pairs.flatMap((p) => p.e)
  const [dx, dy] = centroid(D)
  const [ex, ey] = centroid(E)
  let num = 0
  let den = 0
  for (let i = 0; i < D.length; i++) {
    num += (E[i][0] - ex) * (D[i][0] - dx) + (E[i][1] - ey) * (D[i][1] - dy)
    den += (E[i][0] - ex) ** 2 + (E[i][1] - ey) ** 2
  }
  const w = prior ? den / pairs.length : 0
  const s = Math.min(4, Math.max(0.25, den > 1e-9 ? (num + w) / (den + w) : 1))
  return { s, tx: dx - s * ex, ty: dy - s * ey }
}

/** letters told apart mostly by their height against the lines (ו י ן, ר ך): their one stroke is checked for it */
const BY_HEIGHT = 'וירךן'
/** a first stroke shorter than this share of its expected length (letter units, from the lines) is only a piece */
export const SHORT = 0.55
const LOOSE = 1.15

/**
 * One drawn stroke against one expected stroke. `first`: the letter's place is not known yet (only shape, direction and
 * its length against the lines). `loose`: a piece settled after a pause (no length rule, a wider shape tolerance).
 * `byHeight`: check the stroke's height against the lines (ו is not י).
 */
export function judgeStroke(drawn: Pt[], exp: StrokeDef, f: Frame, first: boolean, o: { loose?: boolean; byHeight?: boolean } = {}):
  { ok: boolean; why?: Why; score: number; reversed?: boolean; short?: boolean } {
  let d = resample(drawn)
  const e = resample(exp.pts).map((p) => apply(f, p))
  const sd = diag(bbox(d))
  const se = diag(bbox(e))
  if (sd < 0.12 * Math.min(1, f.s) || sd > 3.5 * se + 0.3 * f.s) return { ok: false, why: 'shape', score: 9 }
  const ne = ownNorm(e)
  // a small stroke wobbles more for its size (a finger is not thinner on a short line)
  const tol = SHAPE_TOL * (o.loose ? LOOSE : 1) * Math.min(1.8, Math.max(1, 0.6 / (se / f.s)))
  const fwd = meanDist(ownNorm(d), ne)
  let reversed = false
  let score = fwd
  if (fwd > tol) {
    const rev = meanDist(ownNorm([...d].reverse()), ne)
    if (rev > tol) return { ok: false, why: 'shape', score: Math.min(fwd, rev) }
    if (!exp.either) return { ok: false, why: 'direction', score: rev }
    reversed = true
    score = rev
    d = [...d].reverse()
  }
  if (exp.end) {
    // the last bit of the stroke must go the way the data says (ף ends going down, ץ going up: the parent; ב down from its
    // peak, כ flat to the left)
    const [ex, ey] = d[d.length - 1]
    const [px, py] = subpath(d, 0.88).slice(-1)[0]
    const dx = ex - px
    const dy = ey - py
    const goes = exp.end === 'left' ? -dx >= 0.06 * f.s && -dx > Math.abs(dy) : (exp.end === 'down' ? dy : -dy) >= 0.06 * f.s
    if (!goes) return { ok: false, why: 'shape', score }
  }
  // a stroke marked `height` is checked the same way (ה's short leg is not ח's)
  if (o.byHeight || exp.height) {
    const hd = bbox(d).bottom - bbox(d).top
    const he = bbox(e).bottom - bbox(e).top
    if (hd > 1.4 * he) return { ok: false, why: 'shape', score }
    if (hd < 0.68 * he) return o.loose ? { ok: false, why: 'shape', score } : { ok: false, why: 'shape', score, short: true }
  }
  // a stroke well short of its length (from the lines, or from his letter so far) is only a piece of it: it waits
  if (!o.loose && pathLength(d) < SHORT * pathLength(e)) return { ok: false, why: 'shape', score, short: true }
  if (!first) {
    // the tolerance never shrinks below the letter's size on the lines (a short first roof is typical for a child)
    const k = Math.max(f.s, 1)
    if (dist(d[0], e[0]) > START_TOL * k) return { ok: false, why: dist(d[d.length - 1], e[0]) < START_TOL * k ? 'direction' : 'start', score }
    if (dist(centroid(d), centroid(e)) > PLACE_TOL * k) return { ok: false, why: 'start', score }
  }
  return { ok: true, score, reversed }
}

export type Verdict =
  | { kind: 'ok'; index: number; done: boolean; pieces: number; joined?: boolean; settled?: number }
  | { kind: 'partial'; index: number; done: false; pieces: number; settled?: number }
  | { kind: 'wrong'; index: number; why: Why; done: false; pieces: number; settled?: number }

interface Track {
  v: StrokeDef[]; vi: number; idx: number; frame: Frame; pairs: { d: Pt[]; e: Pt[] }[]; pending: Pt[][]
  /** his accepted strokes, and the frame before each was accepted (a later piece may continue one) */
  paths: Pt[][]; frames: Frame[]
}
type Step = { kind: 'ok' | 'partial' | 'wrong'; why?: Why; score: number; path: Pt[]; e?: StrokeDef }

/**
 * Checks a letter stroke by stroke as he lifts his finger. Every variant of the letter that agrees so far stays alive.
 * A piece that is only the first part of the next stroke waits for the rest (a pen lift; not in `strict` letters), and
 * is settled after a pause (settle). A piece that continues the stroke before it is joined to it (a lift inside a line).
 */
export class LetterChecker {
  private alive: Track[]
  constructor(readonly def: LetterDef) {
    this.alive = def.variants.map((v, vi) => ({ v, vi, idx: 0, frame: ID, pairs: [], pending: [], paths: [], frames: [] }))
  }
  get index() { return this.lead().idx }
  get total() { return this.lead().v.length }
  get done() { return this.alive.some((t) => t.idx >= t.v.length) }
  /** a piece waits for the rest of its stroke */
  get hasPending() { return this.lead().pending.length > 0 }
  private lead() { return this.alive[0] }
  private byHeight(t: Track) { return t.v.length === 1 && BY_HEIGHT.includes(this.def.letter) }

  private step(t: Track, piece: Pt[]): Step {
    const exp = t.v[t.idx]
    const first = t.idx === 0
    const pend = t.pending.flat()
    if (t.pending.length && dist(pend[pend.length - 1], piece[0]) > 0.25 * Math.max(1, t.frame.s)) return { kind: 'wrong', why: 'shape', score: 9, path: piece }
    const path = t.pending.length ? [...pend, ...piece] : piece
    let j = judgeStroke(path, exp, t.frame, first, { byHeight: this.byHeight(t) })
    // his letter's size so far came from few strokes: try it nearer the size of the lines too
    if (!j.ok && (j.why === 'start' || j.why === 'direction' || (j.why === 'shape' && exp.height)) && t.pairs.length) {
      const j2 = judgeStroke(path, exp, fit(t.pairs, true), first, { byHeight: this.byHeight(t) })
      if (j2.ok) j = j2
    }
    if (j.ok) return { kind: 'ok', score: j.score, path: j.reversed ? [...path].reverse() : path, e: exp }
    if (j.short) return { kind: 'partial', score: j.score, path }
    // a stroke that belongs later is wrong order, also when it looks like the start of this one (checked first)
    if (!t.pending.length) {
      for (let k = t.idx + 1; k < t.v.length; k++) {
        const later = t.v[k]
        if (!judgeStroke(piece, later, t.frame, first).ok) continue
        // before his letter has a place, a later stroke must at least sit at its height on the lines
        if (first && Math.abs(piece[0][1] - later.pts[0][1]) > 0.35) continue
        return { kind: 'wrong', why: 'order', score: j.score, path }
      }
    }
    if (!this.def.strict && j.why !== 'direction') {
      for (let f = 0.85; f >= 0.15; f -= 0.05) {
        const pre = { pts: subpath(exp.pts, f) }
        if (judgeStroke(path, pre, t.frame, first).ok) return { kind: 'partial', score: j.score, path }
      }
    }
    return { kind: 'wrong', why: j.why ?? 'shape', score: j.score, path }
  }

  private acceptOne(t: Track, path: Pt[], e: StrokeDef) {
    t.frames.push(t.frame)
    t.paths.push(path)
    t.pairs.push({ d: resample(path), e: resample(e.pts) })
    t.frame = fit(t.pairs)
    t.idx++
    t.pending = []
  }

  private accept(oks: { t: Track; r: Step }[], pieces: number, extra: { joined?: boolean; settled?: number } = {}): Verdict {
    const best = oks.reduce((a, b) => (b.r.score < a.r.score ? b : a))
    for (const { t, r } of oks) this.acceptOne(t, r.path, r.e!)
    // the variant that fits best leads (the hand shows its next stroke)
    this.alive = oks.map((x) => x.t).sort((a, b) => (a === best.t ? -1 : b === best.t ? 1 : a.vi - b.vi))
    return { kind: 'ok', index: best.t.idx - 1, done: best.t.idx >= best.t.v.length, pieces, ...extra }
  }

  /** a piece that starts where his last accepted stroke ended and, joined to it, makes that stroke right (a lift inside it) */
  private continuation(piece: Pt[]): Verdict | null {
    for (const t of this.alive) {
      if (t.idx === 0 || t.pending.length) continue
      const k = t.idx - 1
      const last = t.paths[k]
      if (dist(last[last.length - 1], piece[0]) > 0.3 * Math.max(1, t.frame.s)) continue
      const joined = [...last, ...piece]
      const j = judgeStroke(joined, t.v[k], t.frames[k], k === 0, { byHeight: this.byHeight(t) })
      if (!j.ok) continue
      t.paths[k] = j.reversed ? [...joined].reverse() : joined
      t.pairs[k] = { d: resample(t.paths[k]), e: resample(t.v[k].pts) }
      t.frame = fit(t.pairs)
      this.alive = [t, ...this.alive.filter((x) => x !== t && x.idx === t.idx)]
      return { kind: 'ok', index: k, done: t.idx >= t.v.length, pieces: 1, joined: true }
    }
    return null
  }

  /** the waiting piece of a track, judged as its whole stroke after a pause (looser) */
  private looseOf(t: Track) {
    const path = t.pending.flat()
    const exp = t.v[t.idx]
    const j = judgeStroke(path, exp, t.frame, t.idx === 0, { loose: true, byHeight: this.byHeight(t) })
    return { j, path: j.reversed ? [...path].reverse() : path, exp }
  }

  /**
   * Judge one stroke (stage units already mapped to the slot's normalized units). `pieces`: how many of his last
   * strokes (this one and the waiting ones it joined) the verdict covers; `settled`: waiting pieces that this stroke
   * showed were a whole stroke (they count as right); other waiting pieces it did not join are wrong.
   */
  add(piece: Pt[]): Verdict {
    if (this.done) return { kind: 'wrong', index: this.index, why: 'shape', done: false, pieces: 1 }
    // a waiting piece that this stroke does not continue was a whole (small) stroke, or wrong: settle it first
    const settled = new Map<Track, number>()
    let failed = 0
    const goesOn = this.alive.some((t) => this.step(t, piece).kind !== 'wrong')
    for (const t of this.alive) {
      if (!t.pending.length || this.step(t, piece).kind !== 'wrong') continue
      const n = t.pending.length
      const l = this.looseOf(t)
      if (l.j.ok) { this.acceptOne(t, l.path, l.exp); settled.set(t, n) } else { failed = Math.max(failed, n); t.pending = [] }
    }
    if (failed && !settled.size && !goesOn) {
      // what waited was not a stroke of the letter: it and this piece are wrong (the hand shows the stroke)
      for (const t of this.alive) t.pending = []
      return { kind: 'wrong', index: this.lead().idx, why: 'shape', done: false, pieces: failed + 1 }
    }
    if (this.done) {
      const t = this.alive.find((x) => x.idx >= x.v.length)!
      this.alive = [t, ...this.alive.filter((x) => x !== t)]
      return { kind: 'wrong', index: t.idx - 1, why: 'shape', done: false, pieces: 1, settled: settled.get(t) ?? 0 }
    }
    const res = this.alive.map((t) => ({ t, r: this.step(t, piece) }))
    const oks = res.filter((x) => x.r.kind === 'ok').sort((a, b) => a.t.vi - b.t.vi)
    const leadStep = res.find((x) => x.t === this.lead())!.r
    if (oks.length && leadStep.kind === 'partial' && oks.every((x) => x.t.pending.length > 0)) {
      // his visible strokes follow the leading variant: it waits for the rest, so the others wait with it
      for (const { t, r } of res) if (r.kind !== 'wrong') t.pending.push(piece); else t.pending = []
      return { kind: 'partial', index: this.lead().idx, done: false, pieces: this.lead().pending.length, settled: settled.get(this.lead()) ?? 0 }
    }
    if (oks.length) {
      const best = oks.reduce((a, b) => (b.r.score < a.r.score ? b : a))
      // a variant for which this was only the first part of a longer stroke stays alive behind (ם: one loop or two)
      const waiting = res.filter((x) => x.r.kind === 'partial').map((x) => x.t)
      for (const t of waiting) t.pending.push(piece)
      const v = this.accept(oks, 1 + best.t.pending.length, { settled: settled.get(best.t) ?? 0 })
      this.alive.push(...waiting)
      return v
    }
    // a piece that continues his last stroke (a lift inside it) joins it, before it can be the start of the next one
    if (!this.hasPending) {
      const cont = this.continuation(piece)
      if (cont) return { ...cont, settled: Math.max(0, ...settled.values()) } as Verdict
    }
    const partial = res.filter((x) => x.r.kind === 'partial')
    if (partial.length) {
      for (const { t } of partial) t.pending.push(piece)
      for (const { t } of res.filter((x) => x.r.kind !== 'partial')) t.pending = []
      const lead = partial.find((x) => settled.has(x.t)) ?? partial[0]
      return { kind: 'partial', index: lead.t.idx, done: false, pieces: Math.max(...partial.map((x) => x.t.pending.length)), settled: settled.get(lead.t) ?? 0 }
    }
    const pieces = 1 + Math.max(0, ...this.alive.map((t) => t.pending.length))
    for (const t of this.alive) t.pending = []
    // the variant that settled leads (its waiting pieces were right)
    const lead = res.find((x) => settled.has(x.t)) ?? res.find((x) => x.t === this.lead())!
    this.alive = [lead.t, ...this.alive.filter((x) => x !== lead.t)]
    return { kind: 'wrong', index: lead.t.idx, why: lead.r.why ?? 'shape', done: false, pieces, settled: settled.get(lead.t) ?? 0 }
  }

  /**
   * After a pause with a piece waiting: judge what he drew as the whole stroke, a little more loosely (a small letter,
   * a hook at an end). Right → it counts; wrong → feedback, as for any wrong stroke. Null when nothing waits.
   */
  settle(): Verdict | null {
    // only the leading variant's waiting piece is his visible stroke; others just stop waiting
    if (!this.hasPending) { for (const t of this.alive) t.pending = []; return null }
    const waiting = this.alive.filter((t) => t.pending.length)
    const pieces = Math.max(...waiting.map((t) => t.pending.length))
    const res = waiting.map((t) => {
      const l = this.looseOf(t)
      return { t, r: { kind: l.j.ok ? 'ok' : 'wrong', why: l.j.why, score: l.j.score, path: l.path, e: l.exp } as Step }
    })
    const oks = res.filter((x) => x.r.kind === 'ok')
    if (oks.length) return this.accept(oks, pieces)
    for (const t of this.alive) t.pending = []
    const lead = res.find((x) => x.t === this.lead()) ?? res[0]
    return { kind: 'wrong', index: lead.t.idx, why: lead.r.why ?? 'shape', done: false, pieces }
  }

  /** The hand drew the expected stroke for him: accept it. Returns its points (where his letter is). */
  force(): Pt[] {
    const t = this.lead()
    const pts = t.v[t.idx].pts.map((p) => apply(t.frame, p))
    t.frames.push(t.frame)
    t.paths.push(pts)
    t.pairs.push({ d: resample(pts), e: resample(t.v[t.idx].pts) })
    t.idx++
    t.pending = []
    this.alive = [t]
    return pts
  }
  /** the next stroke, where his letter is */
  expected(): Pt[] {
    const t = this.lead()
    return t.idx < t.v.length ? t.v[t.idx].pts.map((p) => apply(t.frame, p)) : []
  }
  /** the strokes still to draw, where his letter is */
  remaining(): Pt[][] {
    const t = this.lead()
    return t.v.slice(t.idx).map((st) => st.pts.map((p) => apply(t.frame, p)))
  }
  /** the letter's box as the data has it, where his letter is */
  expectedBox(): Box {
    const t = this.lead()
    const b = bbox(t.v.flatMap((st) => st.pts))
    const [l, tp] = apply(t.frame, [b.left, b.top])
    const [r, bt] = apply(t.frame, [b.right, b.bottom])
    return { left: l, top: tp, right: r, bottom: bt }
  }
}

// ---- the lines: told, never failed (the parent: "should let him know, but not invalidate the character")
export type LineKind = 'tall' | 'low' | 'small'
export function lineFeedback(ink: Box, def: LetterDef): { kind: LineKind; outside?: { from: number; to: number } } | null {
  const b = bbox(def.variants[0].flatMap((st) => st.pts))
  const defH = b.bottom - b.top
  if (ink.bottom - ink.top < 0.5 * defH) return { kind: 'small' }
  const top = Math.min(0, b.top)
  const bottom = Math.max(1, b.bottom)
  if (ink.top < top - 0.25) return { kind: 'tall', outside: { from: -Infinity, to: top } }
  if (ink.bottom > bottom + 0.25) return { kind: 'low', outside: { from: bottom, to: Infinity } }
  return null
}

// ---- marks: by place and count; the order inside a mark is not checked
export type MarkZone = 'under' | 'inside' | 'above-right' | 'above-left' | 'vav-left' | 'vav-above'
export type MarkShape = 'dot' | 'dots2' | 'dots3-tri' | 'dots3-diag' | 'bar' | 'T'
export interface MarkSpec { zone: MarkZone; shape: MarkShape }
export interface MarkBoxes { letter: Box; vav?: Box }
type Comp = { kind: 'dot' | 'bar' | 'tick' | 'T' | 'other'; c: Pt; box: Box }

function classify(p: Pt[], letterW = 1): Comp {
  const box = bbox(p)
  const w = box.right - box.left
  const h = box.bottom - box.top
  const ext = Math.max(w, h)
  const c: Pt = [(box.left + box.right) / 2, (box.top + box.bottom) / 2]
  if (ext < 0.13) return { kind: 'dot', c, box }
  // a mark is small, but a patach under a wide letter is long
  if (ext > Math.max(0.75, 0.85 * letterW)) return { kind: 'other', c, box }
  if (w >= 2.2 * h) return { kind: 'bar', c, box }
  if (h >= 1.8 * w) return { kind: ext < 0.4 ? 'tick' : 'other', c, box }
  return { kind: 'T', c, box }
}

function inZone(z: MarkZone, [x, y]: Pt, b: MarkBoxes): boolean {
  const L = b.letter
  const w = L.right - L.left
  const h = L.bottom - L.top
  const mid = (L.left + L.right) / 2
  if (z === 'under') { const base = Math.max(L.bottom, 1); return y > base - 0.05 && y < base + 0.9 && x > L.left - 0.3 && x < L.right + 0.3 }
  if (z === 'inside') return x > L.left + 0.12 * w && x < L.right - 0.12 * w && y > L.top + 0.12 * h && y < L.bottom - 0.08 * h
  if (z === 'above-right') return y < L.top + 0.15 && y > L.top - 0.9 && x >= mid && x <= L.right + 0.35
  if (z === 'above-left') return y < L.top + 0.15 && y > L.top - 0.9 && x < mid && x >= L.left - 0.4
  const V = b.vav
  if (!V) return false
  const vh = V.bottom - V.top
  if (z === 'vav-left') return x > V.left - 0.4 && x < V.left + 0.08 && y > V.top + 0.15 * vh && y < V.bottom - 0.1 * vh
  return y < V.top + 0.15 && y > V.top - 0.9 && x > V.left - 0.25 && x < V.right + 0.25
}

function shapeState(shape: MarkShape, g: Comp[]): 'more' | 'ok' | 'wrong' {
  const dots = g.filter((c) => c.kind === 'dot')
  if (shape === 'dot' || shape === 'dots2' || shape === 'dots3-tri' || shape === 'dots3-diag') {
    const need = shape === 'dot' ? 1 : shape === 'dots2' ? 2 : 3
    if (dots.length !== g.length || g.length > need) return 'wrong'
    if (g.length < need) return 'more'
    const s = [...dots].sort((a, b) => a.c[0] - b.c[0]).map((d) => d.c)
    if (shape === 'dots2') return Math.abs(s[1][1] - s[0][1]) <= 0.5 * (s[1][0] - s[0][0]) + 0.04 && s[1][0] - s[0][0] > 0.08 ? 'ok' : 'wrong'
    if (shape === 'dots3-tri') {
      // two dots side by side and one below them, anywhere under the pair (not exactly in the middle)
      const byY = [...s].sort((a, b) => a[1] - b[1])
      const [p, q, low] = byY
      const [l, r] = p[0] < q[0] ? [p, q] : [q, p]
      const flat = Math.abs(p[1] - q[1]) < 0.6 * (r[0] - l[0]) && r[0] - l[0] > 0.08
      return flat && low[1] > Math.max(p[1], q[1]) + 0.04 && low[0] > l[0] - 0.12 && low[0] < r[0] + 0.12 ? 'ok' : 'wrong'
    }
    if (shape === 'dots3-diag') return s[0][1] < s[1][1] && s[1][1] < s[2][1] && s[2][1] - s[0][1] > 0.1 ? 'ok' : 'wrong'
    return 'ok'
  }
  if (shape === 'bar') {
    if (g.some((c) => c.kind !== 'bar') || g.length > 1) return 'wrong'
    return g.length ? 'ok' : 'more'
  }
  // kamatz: one T stroke, or a bar and a tick (or a short dot) below its middle
  if (g.length === 0) return 'more'
  // the order inside a mark is not graded: a bar, a tick or a dot alone waits for the other part
  if (g.length === 1) return g[0].kind === 'T' ? 'ok' : g[0].kind === 'other' ? 'wrong' : 'more'
  if (g.length > 2) return 'wrong'
  const bar = g.find((c) => c.kind === 'bar')
  const tick = g.find((c) => c !== bar && (c.kind === 'tick' || c.kind === 'dot'))
  if (!bar || !tick) return 'wrong'
  return tick.c[1] > bar.c[1] && tick.c[0] > bar.box.left - 0.1 && tick.c[0] < bar.box.right + 0.1 ? 'ok' : 'wrong'
}

/** His marks (strokes and taps) against the marks the word needs. 'more' = not all of them yet, nothing wrong so far. */
export function judgeMarks(strokes: Pt[][], specs: MarkSpec[], boxes: MarkBoxes): { state: 'more' | 'ok' | 'wrong' } {
  const groups = new Map<MarkZone, Comp[]>(specs.map((s) => [s.zone, []]))
  for (const st of strokes) {
    const c = classify(st, boxes.letter.right - boxes.letter.left)
    if (c.kind === 'other') return { state: 'wrong' }
    const sp = specs.find((s) => inZone(s.zone, c.c, boxes))
    if (!sp) return { state: 'wrong' }
    groups.get(sp.zone)!.push(c)
  }
  const states = specs.map((s) => shapeState(s.shape, groups.get(s.zone)!))
  if (states.includes('wrong')) return { state: 'wrong' }
  return { state: states.every((s) => s === 'ok') ? 'ok' : 'more' }
}

/** Where the hand puts each mark: a tap is a one-point stroke. */
export function markTargets(specs: MarkSpec[], boxes: MarkBoxes): Pt[][] {
  const L = boxes.letter
  const w = L.right - L.left
  const h = L.bottom - L.top
  const V = boxes.vav ?? L
  const out: Pt[][] = []
  for (const s of specs) {
    const c: Pt =
      s.zone === 'under' ? [(L.left + L.right) / 2, Math.max(L.bottom, 1) + 0.3]
        : s.zone === 'inside' ? [(L.left + L.right) / 2, L.top + 0.55 * h]
          : s.zone === 'above-right' ? [L.right - 0.12 * w, L.top - 0.2]
            : s.zone === 'above-left' ? [L.left + 0.12 * w, L.top - 0.2]
              : s.zone === 'vav-left' ? [V.left - 0.15, (V.top + V.bottom) / 2]
                : [(V.left + V.right) / 2, V.top - 0.2]
    const [x, y] = c
    if (s.shape === 'dot') out.push([c])
    else if (s.shape === 'dots2') out.push([[x + 0.14, y]], [[x - 0.14, y]])
    else if (s.shape === 'dots3-tri') out.push([[x + 0.14, y - 0.06]], [[x - 0.14, y - 0.06]], [[x, y + 0.1]])
    else if (s.shape === 'dots3-diag') out.push([[x - 0.15, y - 0.1]], [[x, y]], [[x + 0.15, y + 0.1]])
    else if (s.shape === 'bar') out.push([[x - 0.2, y], [x + 0.2, y]])
    else out.push([[x - 0.2, y - 0.05], [x + 0.2, y - 0.05]], [[x, y - 0.03], [x, y + 0.15]])
  }
  return out
}
