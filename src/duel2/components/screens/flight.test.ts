// The broom flight's geometry at the parent's screen sizes (the parent's picks: the flight fills the width, orbs 1.3×,
// the wizard 1.5×, "pay attention so orbs don't overlap each other"): the view, where the orbs start, and that no two
// orbs ever overlap — not in one wave (the lanes) and not between waves (their spacing), at every pace, bosses too.
import { describe, expect, it } from 'vitest'
import { BOSS_BOX, BROOM_ORB, BROOM_WIZARD_H, HP, LANE_Y, ORB_FRONT, flightPath, orbX, wizardBox } from './Broom'
import { CATCH_AT, ORB_JITTER, PASS_AT, PACE_MAX, PACE_MIN, POPCORN, WAVE_EVERY, travelMs, wavePos } from '../../logic/run'
import { BOSS_SLOW } from '../../logic/boss'
import { STAGE_CONTENT_TOP, stageBox } from '../../layout'

/** the parent's phone, other phones, the tablets; then a wider phone, an iPhone and a desktop */
const SIZES = [[780, 360], [740, 360], [915, 412], [1024, 768], [1280, 800], [800, 360], [844, 390], [1920, 1080]] as const
const PICKS = SIZES.slice(0, 5)
const at = (w: number, h: number) => flightPath({ w, h })
const right = (p: ReturnType<typeof flightPath>) => p.view.left + p.view.width

describe('the broom flight fills the screen and its orbs never overlap', () => {
  it('the view is as wide as the screen, with the wizard near its left edge and the boss whole', () => {
    for (const [w, h] of SIZES) {
      const p = at(w, h)
      const scale = stageBox(w, h, STAGE_CONTENT_TOP.broom).scale
      expect(p.view.width * scale).toBeCloseTo(w, 0)
      expect(wizardBox().left).toBeGreaterThan(p.view.left)
      expect(wizardBox().left - p.view.left).toBeLessThan(120)
      expect(BOSS_BOX.x + BOSS_BOX.w).toBeLessThanOrEqual(right(p))
      expect(HP.x + 8 * HP.seg + 7 * HP.gap + 24).toBeLessThanOrEqual(right(p))
    }
    // the parent's phone: the flight is wider than the old 16:9 stage (no empty sides)
    expect(at(780, 360).view.width).toBeGreaterThan(2000)
  })
  it('every orb starts beyond the right edge, so it flies in (a marked orb with its ring too)', () => {
    for (const [w, h] of SIZES) expect(orbX(1, at(w, h)) - BROOM_ORB * 0.54).toBeGreaterThanOrEqual(right(at(w, h)))
  })
  it('the orbs are the parent’s 1.3 times and the wizard 1.5 times', () => {
    expect(BROOM_ORB).toBe(Math.round(170 * 1.3))
    expect(BROOM_WIZARD_H).toBe(150 * 1.5)
  })
  it('in one wave: neighbouring lanes are at least an orb apart, with the height jitter', () => {
    for (let i = 1; i < LANE_Y.length; i++) expect(LANE_Y[i] - LANE_Y[i - 1] - 2 * ORB_JITTER).toBeGreaterThanOrEqual(BROOM_ORB)
    // and the wizard can still dodge: a lane is higher than he is
    expect(BROOM_WIZARD_H).toBeLessThan(LANE_Y[1] - LANE_Y[0])
  })
  it('everything stays in the stage, below its content top', () => {
    const top = STAGE_CONTENT_TOP.broom
    expect(LANE_Y[0] - ORB_JITTER - BROOM_ORB / 2).toBeGreaterThanOrEqual(top)
    // the dizzy wizard (the tallest sprite) with his bob
    expect(LANE_Y[0] - BROOM_WIZARD_H * 0.75 - 12).toBeGreaterThanOrEqual(top)
    expect(HP.y - 10).toBeGreaterThanOrEqual(top)
    expect(LANE_Y[2] + ORB_JITTER + BROOM_ORB / 2).toBeLessThanOrEqual(900)
  })
  it('between waves: two orbs in one lane are at least an orb apart while either is on the screen, at every pace, bosses too', () => {
    for (const [w, h] of PICKS) {
      const p = at(w, h)
      for (const pace of [PACE_MIN, 1, PACE_MAX]) for (const slow of [1, BOSS_SLOW]) {
        const travel = travelMs(pace) * slow
        // the worst case: the earlier wave's orb starts as late as it can, the next wave's (spawned WAVE_EVERY later) at once
        const orbs = [{ spawn: 0, offset: POPCORN }, { spawn: WAVE_EVERY * travel, offset: 0 }]
        const seen = (o: { x: number }) => o.x - BROOM_ORB / 2 < right(p) && o.x + BROOM_ORB / 2 > p.view.left
        let closest = Infinity
        for (let t = 0; t < 3 * travel; t += 10) {
          const xs = orbs.filter((o) => t >= o.spawn).map((o) => ({ x: orbX(wavePos(o.spawn + o.offset * travel, t, travel), p) }))
          if (xs.length === 2 && seen(xs[0]) && seen(xs[1])) closest = Math.min(closest, Math.abs(xs[0].x - xs[1].x))
        }
        expect(Number.isFinite(closest)).toBe(true)
        expect(closest, `${w}x${h} pace ${pace} slow ${slow}`).toBeGreaterThanOrEqual(BROOM_ORB)
      }
      // a new sound's first wave sets off at once, but only after the last target is done (k ≤ CATCH_AT): its wave's
      // other orbs are at most POPCORN behind it
      expect((1 - CATCH_AT - POPCORN) * p.span).toBeGreaterThanOrEqual(BROOM_ORB)
    }
  })
  it('a wave resolves when its orbs touch the wizard, and the target is missed only once its centre is past his back', () => {
    for (const [w, h] of SIZES) {
      const p = at(w, h)
      const wb = wizardBox()
      expect(orbX(0, p)).toBe(ORB_FRONT)
      expect(orbX(CATCH_AT, p) - BROOM_ORB / 2, `${w}x${h}`).toBeLessThanOrEqual(wb.right)
      expect(orbX(CATCH_AT, p)).toBeGreaterThan(wb.left + wb.width / 2)
      expect(orbX(PASS_AT, p), `${w}x${h}`).toBeLessThanOrEqual(wb.left)
      expect(orbX(PASS_AT, p), `${w}x${h}`).toBeGreaterThan(wb.left - BROOM_ORB / 2)
    }
  })
})
