import { describe, expect, it } from 'vitest'
import { HAND_DANA, LETTERS, STROKES, strokesOf } from './strokes.ts'

describe('stroke data', () => {
  it('has every letter (22 + 5 finals) in print and in handwriting', () => {
    expect(LETTERS.length).toBe(27)
    for (const l of LETTERS) for (const sc of ['print', 'hand'] as const) expect(strokesOf(l, sc).variants.length, l + sc).toBeGreaterThan(0)
    expect(STROKES.length).toBe(54)
  })
  it('every stroke has a start and an end inside a sane box', () => {
    for (const d of STROKES) for (const v of d.variants) for (const st of v) {
      expect(st.pts.length, d.letter).toBeGreaterThanOrEqual(2)
      for (const [x, y] of st.pts) {
        expect(x).toBeGreaterThanOrEqual(-0.1)
        expect(x).toBeLessThanOrEqual(d.w + 0.1)
        expect(y).toBeGreaterThanOrEqual(-1.1)
        expect(y).toBeLessThanOrEqual(2.3)
      }
    }
  })
  it('print ד is two strokes and ר one; both strict (a pen lift must not turn one into the other: the parent)', () => {
    expect(strokesOf('ד', 'print').variants.map((v) => v.length)).toEqual([2])
    expect(strokesOf('ר', 'print').variants.map((v) => v.length)).toEqual([1])
    expect(strokesOf('ד', 'print').strict && strokesOf('ר', 'print').strict).toBe(true)
  })
  it('print roofs go left to right and start at the top-left ("like resh")', () => {
    for (const l of 'בדהוחכנפרת') {
      const [a, b] = strokesOf(l, 'print').variants[0][0].pts
      expect(b[0], l).toBeGreaterThan(a[0])
      expect(a[1], l).toBeLessThan(0.2)
    }
    // the exceptions: מ starts bottom-left, ש top-right
    expect(strokesOf('מ', 'print').variants[0][0].pts[0][1]).toBeGreaterThan(0.9)
    expect(strokesOf('ש', 'print').variants[0][0].pts[0][0]).toBeGreaterThan(1)
  })
  it('both variants where the sources disagree', () => {
    expect(strokesOf('ם', 'print').variants.length).toBe(2)
    expect(strokesOf('ע', 'print').variants.length).toBe(2)
    expect(strokesOf('א', 'hand').variants.length).toBe(2)
    for (const l of 'סעש') expect(strokesOf(l, 'hand').variants[0].some((x) => x.either), l).toBe(true)
  })
  describe("the parent's review (2026-11-07)", () => {
    const P = (l: string) => strokesOf(l, 'print')
    const Hd = (l: string) => strokesOf(l, 'hand')
    const all = (l: string, sc: 'print' | 'hand') => strokesOf(l, sc).variants[0].flatMap((st) => st.pts)
    const top = (l: string, sc: 'print' | 'hand') => Math.min(...all(l, sc).map((q) => q[1]))
    const bottom = (l: string, sc: 'print' | 'hand') => Math.max(...all(l, sc).map((q) => q[1]))
    it('print ה: the roof (almost) does not overhang its leg (the parent, third review)', () => {
      const [roof, leg] = P('ה').variants[0]
      expect(Math.abs(leg.pts[0][0] - roof.pts[0][0])).toBeLessThanOrEqual(0.03)
    })
    it('print ז: the zigzag stem breaks once, at the middle line: down to the left, then down to the right', () => {
      const v = P('ז').variants
      expect(v.length).toBe(2)
      expect(v[1][0]).toEqual(v[0][0])
      const zig = v[1][1].pts
      expect(zig.length).toBe(3)
      const [a, b, c] = zig
      expect(b[0]).toBeLessThan(a[0])
      expect(c[0]).toBeGreaterThan(b[0])
      expect(b[1]).toBeGreaterThan(0.4)
      expect(b[1]).toBeLessThan(0.6)
      expect(c[1]).toBeGreaterThan(0.95)
    })
    it('print מ: the 2-stroke alternative is the small piece, then the first stroke backwards; the 3-stroke one is split as Rubik builds it', () => {
      const v = P('מ').variants
      expect(v.map((x) => x.length)).toEqual([2, 3, 2])
      expect(v[2][0].pts).toEqual(v[0][1].pts)
      expect(v[2][1].pts).toEqual([...v[0][0].pts].reverse())
      // Rubik: the roof and the right side (like ר), the slanted left leg, then the base back from the right
      const [roof, leg, base] = v[1].map((st) => st.pts)
      expect(roof[0][1]).toBeLessThan(0.2)
      expect(roof[roof.length - 1][1]).toBeGreaterThan(0.9)
      expect(roof[roof.length - 1][0]).toBeGreaterThan(1)
      expect(leg[0][1]).toBeLessThan(0.2)
      expect(leg[1][0]).toBeLessThan(leg[0][0])
      expect(leg[1][1]).toBeGreaterThan(0.9)
      expect(base[0][0]).toBeGreaterThan(base[1][0])
      expect(Math.abs(base[0][1] - base[1][1])).toBeLessThan(0.05)
    })
    it('print נ: a short head, a long base (not כ)', () => {
      const p = P('נ').variants[0][0].pts
      const head = p[1][0] - p[0][0]
      const base = p[p.length - 2][0] - p[p.length - 1][0]
      expect(head).toBeLessThan(0.45 * base)
    })
    it('print ק: a clear gap between the roof and the leg', () => {
      const [roof, leg] = P('ק').variants[0]
      expect(leg.pts[0][1] - roof.pts[0][1]).toBeGreaterThanOrEqual(0.3)
    })
    it('print ץ: the left line is one straight line, the wing meets it', () => {
      const [line] = P('ץ').variants[0]
      expect(line.pts.length).toBe(2)
    })
    it('handwriting ו י ל ן stand nearly upright', () => {
      const slant = (a: [number, number], b: [number, number]) => Math.abs(b[0] - a[0]) / Math.abs(b[1] - a[1])
      for (const l of 'וין') { const p = Hd(l).variants[0][0].pts; expect(slant(p[0], p[p.length - 1]), l).toBeLessThan(0.12) }
      // ל: its stem, from the bottom of the loop up to the top line
      const lp = Hd('ל').variants[0][0].pts
      const lo = lp.reduce((a, q) => (q[1] > a[1] ? q : a))
      const up = lp.filter((q) => q[1] < 0.6 && q[1] > -0.05)
      expect(slant(up[0], up[up.length - 1])).toBeLessThan(0.15)
      expect(lo[1]).toBeGreaterThan(0.9)
    })
    it('handwriting א: a C and an upright line on the left between the lines', () => {
      for (const v of Hd('א').variants) {
        const line = v.find((st) => st.pts.length === 2)!.pts
        expect(Math.min(line[0][1], line[1][1])).toBeGreaterThan(-0.15)
        // upright: the parent found the font's slanted line too tilted
        expect(Math.abs(line[1][0] - line[0][0])).toBeLessThan(0.05)
      }
    })
    it('handwriting ג: the foot goes on past the stem', () => {
      const p = Hd('ג').variants[0][0].pts
      expect(p[p.length - 1][0]).toBeGreaterThan(p[0][0] + 0.25)
    })
    it('handwriting ב ד ח ט כ מ ם צ ק ר follow the upright font Dana Yad (the parent, second review)', () => {
      expect([...HAND_DANA].sort().join('')).toBe([...'בדחטכמםצקר'].sort().join(''))
      // its forms: ט from the top of its short right arm, round the bottom, up its tall left side
      const tet = Hd('ט').variants[0][0].pts
      expect(tet[0][0]).toBeGreaterThan(0.9)
      expect(tet[tet.length - 1][1]).toBeLessThan(-0.5)
      // מ from the top-right, down, up the diagonal, down the left stroke
      const mem = Hd('מ').variants[0][0].pts
      expect(mem[0][0]).toBeGreaterThan(1)
      expect(mem[mem.length - 1][0]).toBeLessThan(0.2)
      // ם: a loop, then its stem on the left goes down to the baseline
      expect(bottom('ם', 'hand')).toBeGreaterThan(0.95)
      // ק: its stem goes well below the baseline; ב ends with a line down from a peak at the bottom-left
      expect(bottom('ק', 'hand')).toBeGreaterThan(1.5)
      const bet = Hd('ב').variants[0][0].pts
      expect(bet[bet.length - 1][1] - Math.min(...bet.slice(-6).map((q) => q[1]))).toBeGreaterThan(0.25)
    })
    it('handwriting ם ר כ ד ח sit within the lines, and מ starts on the top line (the parent, third review)', () => {
      for (const l of 'םרכדח') {
        expect(top(l, 'hand'), l).toBeGreaterThanOrEqual(-0.05)
        expect(bottom(l, 'hand'), l).toBeLessThanOrEqual(1.03)
      }
      expect(Hd('מ').variants[0][0].pts[0][1]).toBeGreaterThanOrEqual(-0.05)
    })
    it('handwriting ג ז ו stand between the top line and the baseline (ETZE, JMU)', () => {
      for (const l of 'גזו') {
        expect(top(l, 'hand'), l).toBeGreaterThanOrEqual(-0.06)
        expect(bottom(l, 'hand'), l).toBeLessThanOrEqual(1.03)
      }
    })
    it('handwriting ף and ץ: the top loop curls back toward the letter (the parent, second review)', () => {
      for (const l of 'ףץ') {
        const p = Hd(l).variants[0][0].pts
        const stem = p.find((q) => q[1] < 0.3 && q[1] > 0)![0]
        const upper = p.filter((q) => q[1] < 0.3 && p.indexOf(q) > 6)
        expect(Math.max(...upper.map((q) => q[0])) - stem, l).toBeLessThan(0.36)
        expect(stem - Math.min(...upper.map((q) => q[0])), l).toBeLessThan(0.36)
        const end = p[p.length - 1]
        expect(stem - end[0], l).toBeLessThan(0.33)
      }
    })
    it('handwriting ף and ץ begin like ל, rise above the top line, sit on the baseline; ף ends going down, ץ going up', () => {
      const lam = Hd('ל').variants[0][0].pts.slice(0, 5)
      for (const l of 'ףץ') {
        const d = Hd(l)
        expect(d.variants.length, l).toBe(1)
        const p = d.variants[0][0].pts
        lam.forEach((q, i) => expect(Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), `${l} point ${i}`).toBeLessThan(0.12))
        expect(top(l, 'hand'), l).toBeLessThan(-0.3)
        expect(bottom(l, 'hand'), l).toBeLessThan(1.1)
        expect(d.variants[0][0].either, l).toBeFalsy()
      }
      const end = (l: string) => { const p = Hd(l).variants[0][0].pts; return p[p.length - 1][1] - p[p.length - 3][1] }
      expect(end('ף')).toBeGreaterThan(0.08)
      expect(end('ץ')).toBeLessThan(-0.08)
    })
  })
})
