import { describe, expect, it } from 'vitest'
import { LOGICAL } from '../layout'
import {
  BOX_SIDE, HOP_MS, HOUSE_INSET, HOUSE_PX, JUMP_GAP, LANES3, MAX_OFFSET, PLANET_MIN_PX, TEXT_LOG_MAX, TEXT_LOG_OVERFLOW, WIDE, boxInMs,
  barClearHalf, boxLayout, drawText, fit, geomFor, housePlace, lanesFor, planetPos, portraitGeom,
} from './draw'
import { roundGeom } from './engine'
import { recordingContext } from './testCanvas'

/** phones held upright, phones on their side, tablets either way up, an old short phone upright */
const UPRIGHT: [number, number][] = [[412, 915], [390, 844], [360, 800]]
const SIDE: [number, number][] = [[915, 412], [844, 390], [740, 360]]
const SCREENS: [number, number][] = [...UPRIGHT, ...SIDE, [1280, 800], [800, 1280], [360, 640]]
/** the verify driver's sizes: a phone upright, a phone on its side, a tablet */
const VERIFY: [number, number][] = [[390, 844], [844, 390], [1180, 820]]
const labels = (n: number) => Array.from({ length: n }, (_, i) => String(i))
/** a context whose text widths follow its font (a digit or a sign is 0.56 of the font's px) */
function sizedContext(): CanvasRenderingContext2D {
  const c = { font: '', measureText: (s: string) => ({ width: s.length * 0.56 * Number(/(\d+)px/.exec(c.font)![1]) }) }
  return c as unknown as CanvasRenderingContext2D
}
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
  it('pins the lane and box numbers', () => {
    expect(PLANET_MIN_PX).toBe(56)
    expect(LANES3).toEqual({ wideGap: 300, portrait: [1 / 6, 1 / 2, 5 / 6] })
    expect(JUMP_GAP).toBe(2.6)
    expect(HOP_MS).toBe(250)
    expect(boxInMs(['5', '10', '15', null])).toBe(3 * HOP_MS)
    expect(boxInMs(['5', '10', null, '20'])).toBe(3 * HOP_MS)
  })
  it('three lanes: centred and wider apart than four, at each layout', () => {
    expect(lanesFor(WIDE, 3)).toEqual([500, 800, 1100])
    expect(lanesFor(WIDE, 4)).toEqual(WIDE.lanes)
    for (const H of [960, 1080, 1200]) {
      const G = portraitGeom(H)
      expect(lanesFor(G, 3)).toEqual([90, 270, 450])
      expect(lanesFor(G, 3)[1] - lanesFor(G, 3)[0]).toBeGreaterThan(G.lanes[1] - G.lanes[0])
    }
    for (const [w, h] of [...SCREENS, ...VERIFY]) {
      const G = roundGeom(geomFor(w, h), { labels: labels(3) })
      expect(G.lanes).toHaveLength(3)
      expect((G.lanes[0] + G.lanes[2]) / 2).toBeCloseTo(G.W / 2)
      for (let k = 0; k <= 100; k++) for (let i = 0; i < 2; i++) for (const [oa, ob] of [[MAX_OFFSET, -MAX_OFFSET], [-MAX_OFFSET, MAX_OFFSET]]) {
        const a = planetPos(G, i, k / 100, oa), b = planetPos(G, i + 1, k / 100, ob)
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r)
      }
      expect(G.lanes[0] - G.R).toBeGreaterThanOrEqual(0)
      expect(G.lanes[2] + G.R).toBeLessThanOrEqual(G.W)
    }
  })
  it('a planet at the ship\'s row is at least PLANET_MIN_PX CSS px at each verify size, with 3 or 4 lanes', () => {
    for (const [w, h] of [...VERIFY, ...SCREENS]) for (const n of [3, 4]) {
      const G = roundGeom(geomFor(w, h), { labels: labels(n) })
      expect(cssPx(w, h, 2 * planetPos(G, 0, 1, 0).r)).toBeGreaterThanOrEqual(PLANET_MIN_PX)
    }
  })
  it('the jump row and the longest sum fit the portrait width; the font shrinks only when needed', () => {
    const g = sizedContext()
    for (const H of [960, 1200]) {
      const G = portraitGeom(H)
      for (const [box, jumps] of [[['85', '90', '95', null], true], [['240', '+', '35', '=', null], false], [['100', '200', '300', null], true]] as const) {
        const lay = boxLayout(g, G, [...box], jumps)
        expect(lay.total + lay.font).toBeLessThanOrEqual(G.W * (1 - 2 * BOX_SIDE) + 1e-6)
        expect(lay.xs[0] - lay.font * 0.5 - (lay.ws[0] / 2)).toBeGreaterThanOrEqual(0)
      }
      expect(boxLayout(g, G, ['5', '10', '15', null], true).font).toBe(G.box.font)
      expect(boxLayout(g, G, ['2', '+', '3', '=', null]).font).toBe(G.box.font)
    }
    // a jump row's gaps are JUMP_GAP times the box's
    const j = boxLayout(g, WIDE, ['5', '10', '15', null], true)
    expect(j.gap).toBeCloseTo(WIDE.box.gap * JUMP_GAP)
  })
  it('a box too wide to sit beside the top bar moves under it, and the planets start under the box', () => {
    for (const [w, h] of [...SCREENS, ...VERIFY]) {
      const base = geomFor(w, h)
      for (const boxW of [300, 900, 1400]) {
        const G = roundGeom(base, { labels: labels(4) }, { boxW, digits: 3 })
        const half = barClearHalf(base, 3)
        if (boxW / 2 > half) expect(G.box.cy - G.box.h / 2).toBeGreaterThanOrEqual(base.topY + base.pointsSize * 0.55)
        else expect(G.box).toEqual(base.box)
        const first = planetPos(G, 0, 0, -MAX_OFFSET)
        expect(first.y - first.r).toBeGreaterThan(G.box.cy + G.box.h / 2)
        expect(G.yArr - G.y0).toBeGreaterThan(0.25 * G.H)
      }
    }
    // the portrait bar has its own rows: the box never moves there
    expect(barClearHalf(portraitGeom(960), 3)).toBe(Infinity)
  })
})
