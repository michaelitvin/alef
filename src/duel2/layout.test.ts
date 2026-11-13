import { describe, expect, it } from 'vitest'
import { BAR_GAP_PX, BAR_H_PX, BAR_ITEMS_PX, BAR_TOP_PX, CONTENT_TOP_PX, NEXT_PULSE, STAGE_CONTENT_TOP, layoutVars, stageBox } from './layout'

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
