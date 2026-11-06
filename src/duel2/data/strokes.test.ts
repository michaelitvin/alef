import { describe, expect, it } from 'vitest'
import { LETTERS, STROKES, strokesOf } from './strokes.ts'

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
    for (const l of 'סעשץ') expect(strokesOf(l, 'hand').variants[0].some((x) => x.either), l).toBe(true)
  })
})
