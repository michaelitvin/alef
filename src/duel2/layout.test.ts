import { describe, expect, it } from 'vitest'
import { BAR_GAP_PX, BAR_H_PX, BAR_ITEMS_PX, BAR_TOP_PX, CONTENT_TOP_PX, NEXT_PULSE, layoutVars, stageBox } from './layout'

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
})
