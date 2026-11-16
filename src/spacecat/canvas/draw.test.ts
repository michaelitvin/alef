import { describe, expect, it } from 'vitest'
import { layoutFor } from '../layout'
import { GEOM, MAX_OFFSET, drawText, fit, planetPos } from './draw'
import { recordingContext } from './testCanvas'

const SCREENS: [number, number][] = [[1280, 800], [412, 915], [915, 412]]

describe('drawing', () => {
  it('drawText records every string', () => {
    const { ctx, texts, restore } = recordingContext()
    window.__scText = []
    drawText(ctx, '3', 0, 0)
    drawText(ctx, '+', 0, 0)
    expect(window.__scText).toEqual(['3', '+'])
    expect(texts).toEqual(['3', '+'])
    restore()
  })
  it('neighbouring planets never overlap', () => {
    for (const [w, h] of SCREENS) {
      const G = GEOM[layoutFor(w, h)]
      for (let k = 0; k <= 100; k++) {
        const p = k / 100
        for (let i = 0; i < 3; i++) for (const [oa, ob] of [[MAX_OFFSET, -MAX_OFFSET], [-MAX_OFFSET, MAX_OFFSET], [0, 0]]) {
          const a = planetPos(G, i, p, oa), b = planetPos(G, i + 1, p, ob)
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r)
        }
      }
    }
  })
  it('each planet starts small under the sum box', () => {
    for (const G of [GEOM.wide, GEOM.portrait]) {
      const first = planetPos(G, 0, 0, -MAX_OFFSET)
      expect(first.r).toBeLessThan(G.R / 2)
      expect(first.y - first.r).toBeGreaterThan(G.box.cy + G.box.h / 2)
    }
  })
  it('a planet at the ship\'s row is at least 56 CSS px on a phone on its side', () => {
    const G = GEOM[layoutFor(915, 412)]
    const { scale } = fit(G, 915, 412)
    expect(2 * planetPos(G, 0, 1, 0).r * scale).toBeGreaterThanOrEqual(56)
  })
  it('the ship leaves the four planets in view and the top bar\'s left corner is free', () => {
    for (const G of [GEOM.wide, GEOM.portrait]) {
      expect(G.yArr + G.R).toBeLessThanOrEqual(G.shipY - G.shipS * 0.5)
      expect(G.dotX - G.dotR).toBeGreaterThanOrEqual(G.houseW)
    }
  })
})
