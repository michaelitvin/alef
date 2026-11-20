import { describe, expect, it } from 'vitest'
import { LOGICAL } from '../layout'
import { HOUSE_INSET, HOUSE_PX, MAX_OFFSET, TEXT_LOG_MAX, TEXT_LOG_OVERFLOW, WIDE, drawText, fit, geomFor, housePlace, planetPos } from './draw'
import { recordingContext } from './testCanvas'

/** phones held upright, phones on their side, tablets either way up, an old short phone upright */
const UPRIGHT: [number, number][] = [[412, 915], [390, 844], [360, 800]]
const SIDE: [number, number][] = [[915, 412], [844, 390], [740, 360]]
const SCREENS: [number, number][] = [...UPRIGHT, ...SIDE, [1280, 800], [800, 1280], [360, 640]]
/** logical px in the play area of a w × h screen, in CSS px */
const cssPx = (w: number, h: number, logical: number) => logical * fit(geomFor(w, h), w, h).scale

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
  it('the text log keeps each string once and stays bounded', () => {
    const { ctx, restore } = recordingContext()
    window.__scText = []
    for (let f = 0; f < 100; f++) drawText(ctx, '7', 0, 0)
    expect(window.__scText).toEqual(['7'])
    for (let i = 0; i < 2 * TEXT_LOG_MAX; i++) drawText(ctx, String(i), 0, 0)
    expect(window.__scText).toHaveLength(TEXT_LOG_MAX)
    expect(window.__scText[TEXT_LOG_MAX - 1]).toBe(TEXT_LOG_OVERFLOW)
    restore()
  })
  it('neighbouring planets never overlap', () => {
    for (const [w, h] of SCREENS) {
      const G = geomFor(w, h)
      for (let k = 0; k <= 100; k++) {
        const p = k / 100
        for (let i = 0; i < 3; i++) for (const [oa, ob] of [[MAX_OFFSET, -MAX_OFFSET], [-MAX_OFFSET, MAX_OFFSET], [0, 0]]) {
          const a = planetPos(G, i, p, oa), b = planetPos(G, i + 1, p, ob)
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r)
        }
      }
    }
  })
  it('each planet starts smaller under the sum box', () => {
    for (const [w, h] of SCREENS) {
      const G = geomFor(w, h), first = planetPos(G, 0, 0, -MAX_OFFSET)
      expect(first.r).toBeLessThanOrEqual(G.R * 0.6)
      expect(first.y - first.r).toBeGreaterThan(G.box.cy + G.box.h / 2)
    }
  })
  it('the screen\'s shape picks the layout: a phone on its side is wide, a phone held upright is portrait', () => {
    for (const [w, h] of SIDE) expect(geomFor(w, h)).toBe(WIDE)
    for (const [w, h] of UPRIGHT) expect(geomFor(w, h).W).toBe(LOGICAL.portrait.w)
  })
  it('a planet at the ship\'s row is at least 56 CSS px on a phone on its side', () => {
    for (const [w, h] of SIDE) expect(cssPx(w, h, 2 * planetPos(geomFor(w, h), 0, 1, 0).r)).toBeGreaterThanOrEqual(56)
  })
  it('on a phone held upright the game area fills the screen and the planets are large during the flight', () => {
    for (const [w, h] of UPRIGHT) {
      const G = geomFor(w, h), f = fit(G, w, h)
      expect(f.oy).toBeLessThanOrEqual(16)
      expect(cssPx(w, h, 2 * planetPos(G, 0, 1, 0).r)).toBeGreaterThanOrEqual(0.95 * (w / 4))
      expect(cssPx(w, h, 2 * planetPos(G, 0, 0.5, 0).r)).toBeGreaterThanOrEqual(0.75 * (w / 4))
    }
  })
  it('on a phone held upright the progress dots are large, on their own row between the top bar and the sum box', () => {
    for (const [w, h] of UPRIGHT) {
      const G = geomFor(w, h)
      expect(cssPx(w, h, 2 * G.dotR)).toBeGreaterThanOrEqual(20)
      expect(G.dotY - G.dotR).toBeGreaterThan(G.topY + 30)
      expect(G.dotY + G.dotR).toBeLessThan(G.box.cy - G.box.h / 2)
      expect(G.dotX - G.dotR).toBeGreaterThanOrEqual(0)
      expect(G.dotX + 6 * G.dotStep + G.dotR).toBeLessThanOrEqual(G.W)
    }
  })
  it('the ship leaves the four planets in view and the top bar\'s left corner is free', () => {
    for (const [w, h] of SCREENS) {
      const G = geomFor(w, h)
      expect(G.yArr + G.R).toBeLessThanOrEqual(G.shipY - G.shipS * 0.5)
      if (G.dotY === G.topY) expect(G.dotX - G.dotR).toBeGreaterThanOrEqual(G.houseW)
    }
  })
  it('the held house sits clear of the progress dots and the sum box on phones and tablets, either way up', () => {
    for (const [w, h] of [...SCREENS, [360, 780], [780, 360], [1024, 600], [375, 667]] as [number, number][]) {
      const G = geomFor(w, h), f = fit(G, w, h), at = housePlace(w, h)
      expect(at.left).toBeGreaterThanOrEqual(HOUSE_INSET)
      expect(at.top).toBeGreaterThanOrEqual(HOUSE_INSET)
      const besideDots = at.left + HOUSE_PX <= f.ox + (G.dotX - G.dotR) * f.scale
      const aboveDots = at.top + HOUSE_PX <= f.oy + (G.dotY - G.dotR) * f.scale
      expect(besideDots || aboveDots).toBe(true)
      expect(at.top + HOUSE_PX <= f.oy + (G.box.cy - G.box.h / 2) * f.scale || at.left + HOUSE_PX <= f.ox + (G.W / 2 - 200) * f.scale).toBe(true)
    }
  })
})
