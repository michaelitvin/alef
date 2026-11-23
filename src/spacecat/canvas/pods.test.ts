// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { MAX_OFFSET, WIDE, geomFor, planetPos, portraitGeom, type Geom } from './draw'
import { roundGeom } from './engine'
import { DIGIT_H, DOT_MIN, PODS_MAX_H, digitHeight, dotCells, drawPods, podLayout } from './pods'
import { recordingContext } from './testCanvas'

/** the layouts: wide, the shortest and the tallest portrait, and the three verify sizes */
const LAYOUTS: [string, Geom][] = [
  ['wide', WIDE], ['portrait 960', portraitGeom(960)], ['portrait 1200', portraitGeom(1200)],
  ['390×844', geomFor(390, 844)], ['844×390', geomFor(844, 390)], ['1180×820', geomFor(1180, 820)],
]
/** every pod picture of the rungs T1 to T4b: groups × each with a product up to 36 (each factor at most 10) */
const ALL: [number, number][] = []
for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) if (a * b <= 36) ALL.push([a, b])

describe('the equal-groups pods', () => {
  it('pins the design numbers', () => {
    expect(DOT_MIN).toBe(1 / 3)
    expect(DIGIT_H).toBe(0.72)
    expect(PODS_MAX_H).toEqual({ wide: 150, portrait: 200 })
  })
  it('dice faces up to 6, two rows of five for 7 to 10', () => {
    for (let n = 1; n <= 10; n++) {
      const d = dotCells(n)
      expect(d.cells).toHaveLength(n)
      expect(new Set(d.cells.map((c) => c.join()))).toHaveProperty('size', n)
      expect([d.cols, d.rows]).toEqual(n <= 6 ? [3, 3] : [5, 2])
    }
    expect(dotCells(7).cells.filter(([, r]) => r === 0)).toHaveLength(5)
  })
  it('pod dots are at least a third of the digit height across, at the worst case of each layout', () => {
    for (const [name, G] of LAYOUTS) {
      for (const [groups, each] of [[10, 3], [3, 10], [6, 6], ...ALL]) {
        const L = podLayout(G, groups, each)
        expect(2 * L.r, `${name} ${groups}×${each}`).toBeGreaterThanOrEqual(digitHeight(G) * DOT_MIN - 1e-9)
      }
    }
  })
  it('the pods fit the width, do not overlap, and hold their dots', () => {
    for (const [, G] of LAYOUTS) for (const [groups, each] of ALL) {
      const L = podLayout(G, groups, each)
      expect(L.pods).toHaveLength(groups)
      L.pods.forEach((p, i) => {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x + p.w).toBeLessThanOrEqual(G.W)
        expect(L.dots[i]).toHaveLength(each)
        for (const d of L.dots[i]) {
          expect(d.x - L.r).toBeGreaterThan(p.x); expect(d.x + L.r).toBeLessThan(p.x + p.w)
          expect(d.y - L.r).toBeGreaterThan(p.y); expect(d.y + L.r).toBeLessThan(p.y + p.h)
        }
        for (const q of L.pods.slice(i + 1)) {
          const apart = q.x >= p.x + p.w || p.x >= q.x + q.w || q.y >= p.y + p.h || p.y >= q.y + q.h
          expect(apart).toBe(true)
        }
      })
      // under the box
      expect(L.top).toBeGreaterThan(G.box.cy + G.box.h / 2)
    }
  })
  it('the pods\' area does not meet the planets\' start, and the planets keep a path', () => {
    for (const [name, G] of LAYOUTS) for (const [groups, each] of ALL) {
      const L = podLayout(G, groups, each)
      const RG = roundGeom(G, { labels: ['1', '2', '3', '4'], pods: { groups, each, share: false } })
      for (let lane = 0; lane < 4; lane++) {
        const at = planetPos(RG, lane, 0, -MAX_OFFSET)
        expect(at.y - at.r, `${name} ${groups}×${each}`).toBeGreaterThan(L.bottom)
      }
      expect(RG.yArr - RG.y0).toBeGreaterThan(0.2 * G.H)
    }
  })
  it('a round without pods keeps the layout\'s start', () => {
    expect(roundGeom(WIDE, { labels: ['1', '2', '3', '4'] }).y0).toBe(WIDE.y0)
  })
  it('no digit on a pod: the pods draw no text', () => {
    const rec = recordingContext()
    const L = podLayout(WIDE, 3, 4)
    for (const t of [0, 300, 2000]) for (const share of [false, true]) drawPods(rec.ctx, L, { t, share, from: { x: 0, y: 0 }, glow: 1, alpha: 1, color: '#ff9a3c' })
    expect(rec.texts).toEqual([])
    rec.restore()
  })
})
