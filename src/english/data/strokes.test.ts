import { describe, expect, it } from 'vitest'
import { BASE, DESC, LATIN_STROKES, MID, TOP, isMark, latinStrokesOf } from './strokes.ts'

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = LOWER.toUpperCase()
const pts = (l: string) => latinStrokesOf(l).variants.flatMap((v) => v.flatMap((st) => st.pts))
const top = (l: string) => Math.min(...pts(l).map((q) => q[1]))
const bottom = (l: string) => Math.max(...pts(l).map((q) => q[1]))
/** a stroke's centre line sits up to half a pen width inside the ink, so "on a line" is this close to it */
const NEAR = 0.07

describe('Latin stroke data', () => {
  it('52 letters', () => {
    expect(LATIN_STROKES.length).toBe(52)
    for (const l of LOWER + UPPER) {
      const d = latinStrokesOf(l)
      expect(d.script, l).toBe('print')
      expect(d.variants.length, l).toBeGreaterThan(0)
      for (const v of d.variants) for (const st of v) expect(st.pts.length, l).toBeGreaterThanOrEqual(2)
    }
  })

  it('the four lines go down the box in order', () => {
    expect(TOP).toBe(0)
    expect(BASE).toBe(1)
    expect(MID).toBeGreaterThan(TOP)
    expect(MID).toBeLessThan(BASE)
    expect(DESC).toBeGreaterThan(BASE)
  })

  it('every stroke stays in its box, descenders reach DESC (g j p q y)', () => {
    for (const d of LATIN_STROKES) for (const [x, y] of d.variants.flatMap((v) => v.flatMap((st) => st.pts))) {
      expect(x, d.letter).toBeGreaterThanOrEqual(0)
      expect(x, d.letter).toBeLessThanOrEqual(d.w)
      expect(y, d.letter).toBeGreaterThanOrEqual(TOP)
      expect(y, d.letter).toBeLessThanOrEqual(DESC)
    }
    for (const l of 'gjpqy') expect(bottom(l), l).toBeGreaterThan(DESC - 2 * NEAR)
    for (const l of LOWER.replace(/[gjpqy]/g, '') + UPPER.replace('Q', '')) expect(bottom(l), l).toBeLessThanOrEqual(BASE)
  })

  it('tall letters reach the top line, short ones the middle line', () => {
    for (const l of 'bdfhkl') expect(top(l), l).toBeLessThan(TOP + NEAR)
    for (const l of 'acegmnopqrsuvwxyz') {
      expect(top(l), l).toBeGreaterThan(MID - NEAR)
      expect(top(l), l).toBeLessThan(MID + NEAR)
    }
    // t stands between them, and the dots of i and j above the middle line
    expect(top('t')).toBeGreaterThan(TOP + NEAR)
    expect(top('t')).toBeLessThan(MID)
    for (const l of 'ij') expect(top(l), l).toBeLessThan(MID - NEAR)
  })

  it('i, j, t, f have their marks', () => {
    for (const l of 'ijtf') {
      for (const v of latinStrokesOf(l).variants) {
        expect(v.length, l).toBe(2)
        expect(isMark(l, 0), l).toBe(false)
        expect(isMark(l, 1), l).toBe(true)
      }
    }
    // the dot is a tap above the stem; the bar crosses it left to right, hanging from the middle line (Andika)
    for (const l of 'ij') {
      const [stem, dot] = latinStrokesOf(l).variants[0].map((st) => st.pts)
      const len = Math.hypot(dot[dot.length - 1][0] - dot[0][0], dot[dot.length - 1][1] - dot[0][1])
      expect(len, l).toBeLessThan(0.05)
      expect(dot[0][1], l).toBeLessThan(stem[0][1])
    }
    for (const l of 'tf') {
      const [stem, bar] = latinStrokesOf(l).variants[0].map((st) => st.pts)
      expect(bar.length, l).toBe(2)
      expect(bar[1][0], l).toBeGreaterThan(bar[0][0])
      expect(bar[0][1], l).toBeGreaterThan(MID)
      expect(bar[0][1], l).toBeLessThan(MID + NEAR + 0.02)
      expect(Math.min(...stem.map((q) => q[0])), l).toBeLessThan(bar[1][0])
    }
    // nothing else is a mark: capital I and J, the stem of l, the crossing strokes of x
    for (const l of 'IJlxkEA') for (let k = 0; k < 4; k++) expect(isMark(l, k), l).toBe(false)
  })

  it('single-storey a and g', () => {
    for (const l of 'ag') {
      for (const v of latinStrokesOf(l).variants) {
        const bowl = v[0].pts
        // the first stroke is the bowl: it starts at the top right and circles back (left first, counter-clockwise on screen)
        const [x0, y0] = bowl[0]
        expect(y0, l).toBeLessThan(MID + 0.12)
        expect(bowl[1][0], l).toBeLessThan(x0)
        const xs = bowl.map((q) => q[0])
        expect(Math.min(...xs), l).toBeLessThan(x0 - 0.35)
        // one bowl, no second storey above it: nothing above the middle line
        expect(top(l), l).toBeGreaterThan(MID - NEAR)
      }
    }
  })

  it('a d g q: the bowl and the stem as two strokes first, as one stroke (up the stem and down) as the other variant', () => {
    for (const l of 'adgq') expect(latinStrokesOf(l).variants.map((v) => v.length), l).toEqual([2, 1])
  })

  it('the lowercase l has no tail: one straight stroke down', () => {
    const v = latinStrokesOf('l').variants
    expect(v.length).toBe(1)
    const [a, b] = [v[0][0].pts[0], v[0][0].pts[v[0][0].pts.length - 1]]
    expect(v[0][0].pts.length).toBe(2)
    expect(Math.abs(b[0] - a[0])).toBeLessThan(0.02)
  })

  it('stems are pulled down: the first stroke of b h k l and the capitals with a stem goes from the top line down', () => {
    for (const l of 'bhklBDEFHKLNPR') {
      const p = latinStrokesOf(l).variants[0][0].pts
      expect(p[0][1], l).toBeLessThan(0.15)
      expect(p[1][1], l).toBeGreaterThan(0.9)
    }
  })
})
