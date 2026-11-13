// The ladder rises into the top bar's empty middle on a phone on its side (the parent's pick): its content never goes under
// an item of the bar, in every state, and the wizard starts on the screen.
import { describe, expect, it } from 'vitest'
import {
  BAR_ITEMS_PX, BAR_NEXT_HALF_PX, BAR_SIDE_PX, BAR_TOP_PX, BAR_H_PX, BAR_ITEM_GAP_PX, CONTENT_TOP_PX, barItems as barModel,
  INTO_BAND_TOP_PX, STAGE_CONTENT_TOP, layoutVars, stageBox, toScreen,
} from '../../layout'
import { ladderBoxes, ladderView, type Box } from './Ladder'

const SIZES = [[780, 360], [740, 360], [915, 412], [844, 390], [1024, 768], [1280, 800], [1920, 1080]] as const
const PHONES = [[780, 360], [740, 360], [915, 412], [844, 390]] as const
const RUNGS = 5

interface Rect { l: number; t: number; r: number; b: number }
/** the bar's items at their widest (CSS px; layout.ts barItems): the speaker and the hint button, the go-on button with its pulse, the counts with ×3 */
function barItems(w: number, leftSide: boolean): Record<string, Rect> {
  const bt = BAR_TOP_PX + (BAR_H_PX - BAR_ITEMS_PX.button) / 2
  const bar = barModel(w)
  const nt = bar.nextSide ? bt : BAR_TOP_PX + BAR_H_PX / 2 - BAR_NEXT_HALF_PX
  const items: Record<string, Rect> = {
    next: { l: bar.next[0], r: bar.next[1], t: nt, b: bar.nextSide ? bt + BAR_ITEMS_PX.button : BAR_TOP_PX + BAR_H_PX / 2 + BAR_NEXT_HALF_PX },
    counts: { l: bar.counts[0], r: bar.counts[1], t: BAR_TOP_PX, b: BAR_TOP_PX + BAR_H_PX },
  }
  // the finished ladder is a celebration: no go-on button then (it shows only while he must go on); on a phone it would be in the hint's place
  if (!leftSide && bar.nextSide) delete items.next
  if (leftSide) {
    items.speaker = { l: bar.speaker![0], r: bar.speaker![1], t: bt, b: bt + BAR_ITEMS_PX.button }
    items.hint = { l: bar.hint[0], r: bar.hint[1], t: bt, b: bt + BAR_ITEMS_PX.button }
  }
  return items
}
/** a stage box on the screen (CSS px): in the ladder's view, else in the stage's box below the band */
function onScreen(w: number, h: number, box: Box): Rect {
  const view = ladderView({ w, h })
  if (view) {
    const a = toScreen(view, box.x, box.y)
    const z = toScreen(view, box.x + box.w, box.y + box.h)
    return { l: a.x, t: a.y, r: z.x, b: z.y }
  }
  const s = stageBox(w, h, STAGE_CONTENT_TOP.ladder)
  return { l: s.x + box.x * s.scale, t: s.y + box.y * s.scale, r: s.x + (box.x + box.w) * s.scale, b: s.y + (box.y + box.h) * s.scale }
}
const overlap = (a: Rect, b: Rect) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0

describe('the ladder in the band (the parent: bigger on the phone, never under the bar, the wizard on the screen)', () => {
  it('on a phone on its side the ladder fills the height from just below the screen top, larger than before; a tablet is unchanged', () => {
    for (const [w, h] of PHONES) {
      const v = ladderView({ w, h })!
      expect(v, `${w}x${h}`).not.toBeNull()
      expect(v.scale).toBeGreaterThan(stageBox(w, h, STAGE_CONTENT_TOP.ladder).scale)
      expect(v.w / v.h).toBeCloseTo(w / h)
      // the stage's bottom is the screen's bottom; its top at most INTO_BAND_TOP_PX below the screen's top
      expect(toScreen(v, 0, 900).y).toBeCloseTo(h)
      expect(toScreen(v, 0, 0).y).toBeGreaterThanOrEqual(INTO_BAND_TOP_PX - 0.01)
    }
    // the parent's phone: everything about 16% bigger
    expect(ladderView({ w: 780, h: 360 })!.scale / stageBox(780, 360, STAGE_CONTENT_TOP.ladder).scale).toBeGreaterThan(1.15)
    for (const [w, h] of [[1024, 768], [1280, 800], [1920, 1080], [360, 780]]) expect(ladderView({ w, h }), `${w}x${h}`).toBeNull()
  })

  it("no box of the ladder's content is under an item of the bar, on every rung (×3 and the go-on button shown)", () => {
    for (const [w, h] of SIZES) {
      for (let built = 0; built <= RUNGS; built++) {
        const b = ladderBoxes(built, RUNGS, ladderView({ w, h }))
        // the finished ladder (ladder-top) is a celebration: the speaker and the hint button are not in the bar then
        const items = barItems(w, built < RUNGS)
        const boxes: [string, Box][] = [['ladder', b.ladder], ['wizard', b.wizard], ...b.rungs.map((r, k): [string, Box] => [`rung ${k}`, r]), ...b.plates.map((p, i): [string, Box] => [`plate ${i}`, p])]
        for (const [name, box] of boxes) {
          const r = onScreen(w, h, box)
          for (const [item, ir] of Object.entries(items)) expect(overlap(r, ir), `${w}x${h} built ${built}: ${name} under ${item}`).toBe(false)
          // and on the screen sideways
          if (name !== 'ladder') expect(r.l, `${w}x${h} ${name}`).toBeGreaterThanOrEqual(0)
          expect(r.r, `${w}x${h} ${name}`).toBeLessThanOrEqual(w)
        }
      }
    }
  })

  it("the bar's sizes here are the stylesheet's", async () => {
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/duel2/duel2.css', 'utf8').replace(/\s+/g, ' ')
    expect(css).toMatch(new RegExp(`\\.d2-topbar \\{[^}]*left: ${BAR_SIDE_PX}px; right: ${BAR_SIDE_PX}px`))
    expect(css).toMatch(new RegExp(`\\.d2-topbar-side, \\.d2-topbar-mid \\{[^}]*gap: ${BAR_ITEM_GAP_PX}px`))
  })
  it("the play screen gives the ladder's full view the whole screen", () => {
    const v = layoutVars({ w: 780, h: 360 }, STAGE_CONTENT_TOP.ladder, 'full') as Record<string, string>
    expect(v['--d2-stage-top']).toBe('0px')
    expect(v['--d2-stage-h']).toBe('100%')
  })

  it('the plates never go up into the band, and they stay on the stage', () => {
    for (const [w, h] of SIZES) for (let built = 0; built < RUNGS; built++) {
      const b = ladderBoxes(built, RUNGS, ladderView({ w, h }))
      for (const p of b.plates) {
        const r = onScreen(w, h, p)
        expect(r.t, `${w}x${h} built ${built}`).toBeGreaterThanOrEqual(BAR_TOP_PX + BAR_H_PX)
        expect(r.b, `${w}x${h} built ${built}`).toBeLessThanOrEqual(h + 0.01)
      }
      const ys = [...b.plateYs].sort((x, y) => x - y)
      expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(160)
      expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(160)
    }
  })

  it('the wizard starts with his feet on the stage, so he is whole on the screen', () => {
    for (const [w, h] of SIZES) {
      const wz = ladderBoxes(0, RUNGS, ladderView({ w, h })).wizard
      expect(wz.y + wz.h).toBeLessThanOrEqual(900)
      const r = onScreen(w, h, wz)
      expect(r.b, `${w}x${h}`).toBeLessThanOrEqual(h + 0.01)
      expect(r.t, `${w}x${h}`).toBeGreaterThanOrEqual(CONTENT_TOP_PX)
    }
  })
})
