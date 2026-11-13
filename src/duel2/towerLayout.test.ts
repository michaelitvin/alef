// The first duel's tower in Book 2's run (the parent's pick): the cue bubble below the top bar, the marks bigger in
// their runes (a vav mark stays in its glyph), and no time line.
import { describe, expect, it } from 'vitest'
import { BAR_H_PX, BAR_ITEMS_PX, BAR_TOP_PX, DUEL_GLYPH_PX, TOWER_LAYOUT, towerCueTop } from './layout'

const SIZES = [[780, 360], [740, 360], [915, 412], [1024, 768], [1280, 800]] as const
const css = async () => {
  // the stylesheet's text: vitest gives a .css import no content, and node's types are not in the app's tsconfig
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
  return fs.readFileSync('src/components/duel/duel.css', 'utf8').replace(/\s+/g, ' ')
}
/** the text of the stylesheet's `@media (<q>) { … }` block that holds `.nd-embedded` rules */
const block = (s: string, q: string) => {
  const i = s.indexOf(`@media (${q}) { .nd-embedded`)
  expect(i).toBeGreaterThan(-1)
  let d = 0
  for (let j = s.indexOf('{', i); j < s.length; j++) {
    if (s[j] === '{') d++
    else if (s[j] === '}' && --d === 0) return s.slice(i, j + 1)
  }
  return ''
}

describe('the tower in Book 2’s run', () => {
  it('the cue bubble (a monster’s and a boss’s) is below every item of the top bar at every size', () => {
    const barBottom = BAR_TOP_PX + Math.max(...Object.values(BAR_ITEMS_PX))
    expect(barBottom).toBeLessThanOrEqual(BAR_TOP_PX + BAR_H_PX)
    for (const [, h] of SIZES) for (const boss of [false, true]) expect(towerCueTop(h, boss)).toBeGreaterThan(barBottom + 8)
  })

  it('the marks are bigger in their runes: about 1.5 times on a phone, 1.7 times on a tablet', () => {
    const grow = (t: { glyph: number; mark: number }) => (t.glyph * t.mark) / DUEL_GLYPH_PX
    expect(grow(TOWER_LAYOUT.phone)).toBeCloseTo(1.5, 1)
    expect(grow(TOWER_LAYOUT.tablet)).toBeCloseTo(1.72, 1)
  })

  it('a vav mark (holam male, shuruk) stays inside its rune, its holam dot clear of the rune’s edge', () => {
    // RuneGlyph's vav marks in glyph units (viewBox 64×64): the holam dot (5, 4, r 3.4) to the vav's foot (y 40), x 1.6..18;
    // each scales about its own box's centre (transform-box: fill-box). The glyph is centred in its rune.
    const boxes = [{ x0: 1.6, x1: 18, y0: 0.6, y1: 40 }, { x0: 3.6, x1: 18, y0: 11, y1: 40 }]
    for (const t of Object.values(TOWER_LAYOUT)) for (const b of boxes) {
      const k = t.glyph / 64, off = (t.rune - t.glyph) / 2
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2
      expect(cx - ((b.x1 - b.x0) / 2) * t.vav).toBeGreaterThanOrEqual(0)
      expect((cy - ((b.y1 - b.y0) / 2) * t.vav + t.vavDrop) * k + off).toBeGreaterThanOrEqual(4)
      expect((cy + ((b.y1 - b.y0) / 2) * t.vav + t.vavDrop) * k + off).toBeLessThanOrEqual(t.rune - 4)
    }
  })

  it('the stylesheet uses these sizes, only for the embedded tower', async () => {
    const s = await css()
    for (const [q, t] of [['max-height: 500px', TOWER_LAYOUT.phone], ['min-height: 501px', TOWER_LAYOUT.tablet]] as const) {
      const b = block(s, q)
      expect(b).toContain(`.nd-embedded.nd-landscape .nd-rune { height: ${t.rune}px; }`)
      expect(b).toContain(`.nd-embedded .nd-rune svg { width: ${t.glyph}px; height: ${t.glyph}px; }`)
      expect(b).toContain(`.nd-embedded .nd-rune .nd-rune-mark { transform: scale(${t.mark}); }`)
      expect(b).toContain(`.nd-embedded .nd-rune svg[viewBox="0 0 64 64"] .nd-rune-mark { transform: translateY(${t.vavDrop}px) scale(${t.vav}); }`)
      expect(b).toContain(`.nd-embedded.nd-landscape .nd-sprite { height: ${t.sprite}px; }`)
      expect(b).toContain(`.nd-embedded.nd-landscape .nd-boss .nd-sprite { height: ${t.boss}px; }`)
    }
    // the standalone duel keeps its own glyphs and marks
    expect(s).not.toMatch(/(^|[}] )\.nd-rune svg \{/)
    expect(s).not.toMatch(/(^|[}] )\.nd-rune \.nd-rune-mark \{/)
  })
})
