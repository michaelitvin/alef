import { describe, expect, it } from 'vitest'
import { BAND_CONTENT_W, BAND_TOP_PX, BAR_AIR_PX, BAR_GAP_PX, BAR_H_PX, BAR_ITEMS_PX, BAR_SIDE_PX, BAR_TOP_PX, CONTENT_TOP_PX, NEXT_PULSE, STAGE_CONTENT_TOP, bandStageBox, barItems, layoutVars, stageBox } from './layout'
import { DOOR_BOX, FULL_LIGHT, KEY_BOW, KEY_H, KEY_W, KEY_X, KEY_Y } from './components/screens/Doors'

const SIZES = [[780, 360], [740, 360], [915, 412], [1280, 800], [1024, 768], [1920, 1080]] as const

describe('the top bar never covers the game (rule: floating buttons in the top bar, not over the content area)', () => {
  it('every item of the bar fits in its band, the go-on button pulse included', () => {
    for (const px of Object.values(BAR_ITEMS_PX)) expect(px).toBeLessThanOrEqual(BAR_H_PX)
    expect((BAR_ITEMS_PX.next * NEXT_PULSE - BAR_ITEMS_PX.next) / 2).toBeLessThanOrEqual(BAR_GAP_PX)
  })
  it('the stage starts below the band at every size, and the game keeps its 16:9 shape', () => {
    expect(CONTENT_TOP_PX).toBe(BAR_TOP_PX + BAR_H_PX + BAR_GAP_PX)
    for (const [w, h] of SIZES) {
      const b = stageBox(w, h)
      expect(b.y).toBeGreaterThanOrEqual(BAR_TOP_PX + BAR_H_PX)
      expect(b.y + b.h).toBeLessThanOrEqual(h + 0.01)
      expect(b.w / b.h).toBeCloseTo(16 / 9)
    }
  })
  it('the play screen places the stage, the hint card and the bar by these variables', async () => {
    // the stylesheet's text: vitest gives a .css import no content, and node's types are not in the app's tsconfig
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/duel2/duel2.css', 'utf8').replace(/\s+/g, ' ')
    const v = layoutVars() as Record<string, string>
    expect(v['--d2-bar-h']).toBe(`${BAR_H_PX}px`)
    expect(v['--d2-content-top']).toContain(`${BAR_H_PX + BAR_GAP_PX}px`)
    expect(css).toMatch(/\.d2-root\[data-screen="play"\] \.d2-stage[^{]*\{[^}]*top: var\(--d2-content-top\)/)
    expect(css).toMatch(/\.d2-topbar \{[^}]*top: var\(--d2-bar-top\)[^}]*height: var\(--d2-bar-h\)/)
    expect(css).toMatch(/\.d2-topbar \.d2-btn-next \{ width: var\(--d2-bar-h\); height: var\(--d2-bar-h\)/)
    expect(css).toMatch(new RegExp(`\\.d2-btn \\{ width: ${BAR_ITEMS_PX.button}px; height: ${BAR_ITEMS_PX.button}px`))
    expect(css).toMatch(new RegExp(`\\.d2-heart \\{ width: ${BAR_ITEMS_PX.heart}px; height: ${BAR_ITEMS_PX.heart}px`))
  })

  it('on a short wide screen the stage grows: its content starts below the band, ends on the screen, and is never smaller', () => {
    for (const [w, h] of SIZES) for (const top of Object.values(STAGE_CONTENT_TOP)) {
      const fit = stageBox(w, h)
      const b = stageBox(w, h, top)
      expect(b.scale).toBeGreaterThanOrEqual(fit.scale)
      expect(b.w).toBeLessThanOrEqual(w + 0.01)
      expect(b.w / b.h).toBeCloseTo(16 / 9)
      expect(b.y + top * b.scale).toBeGreaterThanOrEqual(CONTENT_TOP_PX - 0.01)
      expect(b.y + b.h).toBeLessThanOrEqual(h + 0.01)
    }
    // the parent's phone on its side: the ghosts and the drawing board grow by a fifth or more
    expect(stageBox(780, 360, STAGE_CONTENT_TOP.ghosts).scale / stageBox(780, 360).scale).toBeGreaterThan(1.2)
    expect(stageBox(780, 360, STAGE_CONTENT_TOP.draw).scale / stageBox(780, 360).scale).toBeGreaterThan(1.2)
    // a tablet is unchanged (its stage is as wide as the screen already)
    for (const [w, h] of [[1024, 768], [1280, 800]]) expect(stageBox(w, h, STAGE_CONTENT_TOP.ghosts)).toEqual(stageBox(w, h))
  })
  it('the play screen sets the box of a grown stage only when it grows', () => {
    const v = layoutVars({ w: 780, h: 360 }, STAGE_CONTENT_TOP.ghosts) as Record<string, string>
    expect(v['--d2-stage-h']).toBe(`${stageBox(780, 360, STAGE_CONTENT_TOP.ghosts).h.toFixed(1)}px`)
    expect(v['--d2-stage-top']).toContain('var(--d2-content-top)')
    expect((layoutVars({ w: 1280, h: 800 }, STAGE_CONTENT_TOP.ghosts) as Record<string, string>)['--d2-stage-h']).toBeUndefined()
    expect((layoutVars({ w: 780, h: 360 }, 0) as Record<string, string>)['--d2-stage-h']).toBeUndefined()
  })
})

describe('the doors on a phone: the door rises into the band (the parent\'s pick)', () => {
  const PHONES = [[780, 360], [740, 360], [915, 412]] as const
  const top = STAGE_CONTENT_TOP.doors
  /** what he sees and taps on the doors' screen, as stage boxes: the door (from its content top), each key */
  const content = [
    { what: 'the door', x0: DOOR_BOX.x, x1: DOOR_BOX.x + DOOR_BOX.w, y0: top, y1: DOOR_BOX.top + DOOR_BOX.h },
    ...KEY_X.map((x, i) => ({ what: `key ${i}`, x0: x - 110, x1: x + 110, y0: KEY_Y - 110, y1: KEY_Y + KEY_H * (1 - KEY_BOW.cy) })),
    ...KEY_X.map((x, i) => ({ what: `key ${i}'s sprite`, x0: x - KEY_W * KEY_BOW.cx, x1: x + KEY_W * KEY_BOW.cx, y0: KEY_Y - KEY_H * KEY_BOW.cy, y1: KEY_Y + KEY_H * (1 - KEY_BOW.cy) })),
  ]

  it('the content width is the door\'s', () => expect(BAND_CONTENT_W.doors).toBeCloseTo(DOOR_BOX.w))

  it('on a phone the door, its plate and the keys are bigger, the door left of the centre, all on the screen', () => {
    for (const [w, h] of PHONES) {
      const b = bandStageBox(w, h, top, BAND_CONTENT_W.doors)!
      expect(b).not.toBeNull()
      expect(b.scale / stageBox(w, h, top).scale).toBeGreaterThan(1.1)
      expect(b.w / b.h).toBeCloseTo(16 / 9)
      expect(b.x + 800 * b.scale).toBeLessThan(w / 2)
      expect(b.y + top * b.scale).toBeGreaterThanOrEqual(BAND_TOP_PX - 0.01)
      expect(b.y + b.h).toBeCloseTo(h)
      for (const c of content) {
        expect(b.x + c.x0 * b.scale).toBeGreaterThanOrEqual(0)
        expect(b.x + c.x1 * b.scale).toBeLessThanOrEqual(w)
      }
    }
    // the parent's phone on its side: about a quarter bigger (the mock: +24%)
    expect(bandStageBox(780, 360, top, BAND_CONTENT_W.doors)!.scale / stageBox(780, 360, top).scale).toBeGreaterThan(1.2)
  })

  it('nothing he sees or taps is under an item of the bar: the wand, the go-on button (with its pulse), the counts with the ×2/×3 badge at their widest', () => {
    for (const [w, h] of PHONES) {
      const b = bandStageBox(w, h, top, BAND_CONTENT_W.doors)!
      const bar = barItems(w, false)
      // the wand and the go-on button are no wider than this; the counts are measured at their widest
      expect(bar.left[1] - bar.left[0]).toBe(BAR_ITEMS_PX.button)
      expect(bar.left[0]).toBe(BAR_SIDE_PX)
      for (const c of content) {
        const x0 = b.x + c.x0 * b.scale, x1 = b.x + c.x1 * b.scale, y0 = b.y + c.y0 * b.scale
        if (y0 >= BAR_TOP_PX + BAR_H_PX) continue
        for (const [name, [l, r]] of Object.entries(bar)) {
          const apart = x1 + BAR_AIR_PX <= l + 0.01 || x0 >= r + BAR_AIR_PX - 0.01
          expect(apart, `${w}x${h}: ${c.what} under ${name}`).toBe(true)
        }
      }
      // the door's top is in the band (that is what makes it bigger), and the keys are below the band
      expect(b.y + DOOR_BOX.top * b.scale).toBeLessThan(BAR_TOP_PX + BAR_H_PX)
      expect(b.y + (KEY_Y - KEY_H * KEY_BOW.cy) * b.scale).toBeGreaterThan(BAR_TOP_PX + BAR_H_PX)
    }
  })

  it('the doorway\'s light fills the whole screen when he goes through it', () => {
    for (const [w, h] of PHONES) {
      const b = bandStageBox(w, h, top, BAND_CONTENT_W.doors)!
      expect(b.x + FULL_LIGHT.x * b.scale).toBeLessThanOrEqual(0)
      expect(b.x + (FULL_LIGHT.x + FULL_LIGHT.width) * b.scale).toBeGreaterThanOrEqual(w)
      expect(b.y + FULL_LIGHT.y * b.scale).toBeLessThanOrEqual(0)
      expect(b.y + (FULL_LIGHT.y + FULL_LIGHT.height) * b.scale).toBeGreaterThanOrEqual(h)
    }
  })

  it('a tablet keeps its layout', () => {
    for (const [w, h] of [[1024, 768], [1280, 800], [1920, 1080]]) {
      expect(bandStageBox(w, h, top, BAND_CONTENT_W.doors)).toBeNull()
      expect(layoutVars({ w, h }, top, BAND_CONTENT_W.doors)).toEqual(layoutVars({ w, h }, top))
    }
  })

  it('the play screen places the stage by its own box (left edge and width too), and an explanation\'s frame still takes the whole screen', async () => {
    const v = layoutVars({ w: 780, h: 360 }, top, BAND_CONTENT_W.doors) as Record<string, string>
    const b = bandStageBox(780, 360, top, BAND_CONTENT_W.doors)!
    expect(v['--d2-stage-left']).toBe(`${b.x.toFixed(1)}px`)
    expect(v['--d2-stage-w']).toBe(`${b.w.toFixed(1)}px`)
    expect(v['--d2-stage-top']).toBe(`${b.y.toFixed(1)}px`)
    expect(v['--d2-stage-h']).toBe(`${b.h.toFixed(1)}px`)
    // another screen keeps its centred stage
    expect((layoutVars({ w: 780, h: 360 }, STAGE_CONTENT_TOP.ghosts) as Record<string, string>)['--d2-stage-left']).toBeUndefined()
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/duel2/duel2.css', 'utf8').replace(/\s+/g, ' ')
    expect(css).toMatch(/\.d2-root\[data-screen="play"\] \.d2-stage \{ left: var\(--d2-stage-left, 0\); width: var\(--d2-stage-w, 100%\); \}/)
    expect(css).toMatch(/\.d2-stage\.d2-frame \{ top: 0; height: 100%; left: 0; width: 100%; \}/)
  })
})
