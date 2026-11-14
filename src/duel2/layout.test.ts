import { describe, expect, it } from 'vitest'
import { BAND_CONTENT_W, BAND_TOP_PX, BAND_AIR_PX, BAR_GAP_PX, BAR_H_PX, BAR_HOME_SLOT_PX, BAR_ITEM_GAP_PX, BAR_ITEMS_PX, BAR_SIDE_PX, BAR_TOP_PX, CONTENT_TOP_PX, NEXT_PULSE, STAGE_CONTENT_TOP, bandStageBox, barItems, homeInBar, intoBandView, layoutVars, nextInMiddle, stageBox } from './layout'
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

describe('no item of the bar covers another (the go-on button never over the counts)', () => {
  const BAR_SIZES = [[780, 360], [740, 360], [915, 412], [1024, 768], [1280, 800]] as const
  it('at every size, with the counts at their widest (999 coins, 99 stars, ×3, three hearts), with or without the speaker', () => {
    for (const [w] of BAR_SIZES) for (const speaker of [true, false]) {
      const bar = barItems(w, speaker)
      // what shows at once: the go-on button in the left group takes the hint's place (the hint button is not shown then)
      const shown: [string, [number, number]][] = [['next', bar.next], ['counts', bar.counts]]
      if (bar.speaker) shown.push(['speaker', bar.speaker])
      if (!bar.nextSide) shown.push(['hint', bar.hint])
      shown.push(['off the screen', [-Infinity, 0]], ['off the screen', [w, Infinity]])
      for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
        const [a, [a0, a1]] = shown[i], [b, [b0, b1]] = shown[j]
        if (a === b) continue
        const apart = a1 <= b0 + 0.01 || b1 <= a0 + 0.01
        expect(apart, `${w}: ${a} [${a0.toFixed(1)}, ${a1.toFixed(1)}] x ${b} [${b0.toFixed(1)}, ${b1.toFixed(1)}] (speaker ${speaker})`).toBe(true)
      }
    }
  })
  it('the go-on button stays in the middle where it clears the counts (a tablet), else it takes the hint button\'s place on the left (a phone)', () => {
    expect(nextInMiddle(1024)).toBe(true)
    expect(nextInMiddle(1280)).toBe(true)
    for (const w of [740, 780, 915]) expect(nextInMiddle(w)).toBe(false)
    expect(barItems(1280).next[0] + BAR_ITEMS_PX.next * NEXT_PULSE / 2).toBeCloseTo(640)
    expect(barItems(780).nextSide).toBe(true)
  })
  it('in the hint button\'s place the go-on button is its size and does not grow (the stylesheet)', async () => {
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/duel2/duel2.css', 'utf8').replace(/\s+/g, ' ')
    expect(css).toMatch(new RegExp(`\\.d2-topbar \\.d2-topbar-side \\.d2-btn-next \\{ width: ${BAR_ITEMS_PX.button}px; height: ${BAR_ITEMS_PX.button}px; animation-name: d2-glow; \\}`))
    expect(css).not.toMatch(/@keyframes d2-glow \{[^}]*transform/)
    expect(barItems(780).next).toEqual(barItems(780).hint)
  })
  it('the play screen tells the bar where the go-on button goes', async () => {
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const play = fs.readFileSync('src/duel2/screens/Play.tsx', 'utf8')
    expect(play).toMatch(/nextSide=\{!nextInMiddle\(size\.w, homeBar\)\}/)
  })
})

describe('the held home button in the bar\'s right corner (the parent, 2026-11-14: no way out of the game)', () => {
  const SIZES_HOME = [[780, 360], [740, 360], [915, 412], [1024, 768], [1180, 820], [1280, 800]] as const
  it('it covers no other item at any size (the counts at their widest, the go-on button where it goes, the speaker and the hint)', () => {
    for (const [w] of SIZES_HOME) for (const speaker of [true, false]) {
      const bar = barItems(w, speaker, true)
      const home = bar.home!
      const shown: [string, [number, number]][] = [['home', home], ['next', bar.next], ['counts', bar.counts]]
      if (bar.speaker) shown.push(['speaker', bar.speaker])
      if (!bar.nextSide) shown.push(['hint', bar.hint])
      for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
        const [a, [a0, a1]] = shown[i], [b, [b0, b1]] = shown[j]
        const apart = a1 + BAR_ITEM_GAP_PX <= b0 + 0.01 || b1 + BAR_ITEM_GAP_PX <= a0 + 0.01
        expect(apart, `${w}: ${a} [${a0.toFixed(1)}, ${a1.toFixed(1)}] x ${b} [${b0.toFixed(1)}, ${b1.toFixed(1)}] (speaker ${speaker})`).toBe(true)
      }
    }
  })
  it('it is large enough to tap and away from the rounded screen corner', () => {
    expect(BAR_ITEMS_PX.home).toBeGreaterThanOrEqual(56)
    expect(BAR_ITEMS_PX.home).toBeLessThanOrEqual(BAR_H_PX)
    expect(BAR_HOME_SLOT_PX).toBe(BAR_ITEMS_PX.home + BAR_ITEM_GAP_PX)
    for (const [w] of SIZES_HOME) {
      const home = barItems(w, true, true).home!
      expect(home[1]).toBe(w - BAR_SIDE_PX)
      expect(home[1] - home[0]).toBe(BAR_ITEMS_PX.home)
      // its centre is at least 24 px + its radius from the side and 8 px + 4 px + its radius from the top
      expect(BAR_SIDE_PX).toBeGreaterThanOrEqual(24)
    }
  })
  it('the go-on button stays in the middle on the tablet (1180×820); on a phone it is in the hint\'s place', () => {
    expect(nextInMiddle(1180, true)).toBe(true)
    expect(nextInMiddle(1280, true)).toBe(true)
    expect(nextInMiddle(780, true)).toBe(false)
  })
  it('the stylesheet: the button\'s size and the gap before it', async () => {
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/duel2/duel2.css', 'utf8').replace(/\s+/g, ' ')
    expect(css).toMatch(new RegExp(`\\.d2-topbar-right \\{ display: flex; gap: ${BAR_ITEM_GAP_PX}px;`))
    expect(css).toMatch(new RegExp(`\\.d2-home-btn \\{ width: ${BAR_ITEMS_PX.home}px; height: ${BAR_ITEMS_PX.home}px;`))
    // the bar lets taps through (pointer-events: none) except on its items: the button takes them (QA: a hold did nothing)
    expect(css).toMatch(/\.d2-home-btn \{[^}]*pointer-events: auto;/)
  })
  it('not in the bar where the content rises into the band (a phone on its side: the doors, the ladder), in it everywhere else', () => {
    for (const [w, h] of [[780, 360], [740, 360], [915, 412]] as const) {
      expect(homeInBar({ w, h }, STAGE_CONTENT_TOP.doors, BAND_CONTENT_W.doors), `${w}x${h}`).toBe(false)
      expect(homeInBar({ w, h }, STAGE_CONTENT_TOP.ladder, 'full')).toBe(false)
      for (const k of ['broom', 'ghosts', 'merchant', 'cauldron', 'draw'] as const) expect(homeInBar({ w, h }, STAGE_CONTENT_TOP[k])).toBe(true)
      expect(homeInBar({ w, h }, 0)).toBe(true)
    }
    for (const [w, h] of [[1180, 820], [1024, 768], [1280, 800]] as const) {
      expect(homeInBar({ w, h }, STAGE_CONTENT_TOP.doors, BAND_CONTENT_W.doors)).toBe(true)
      expect(intoBandView(w, h, 800, 300, STAGE_CONTENT_TOP.ladder)).toBeNull()
    }
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

  it('nothing he sees or taps is under an item of the bar: the hint button, the go-on button (with its pulse), the counts with the ×2/×3 badge at their widest', () => {
    for (const [w, h] of PHONES) {
      const b = bandStageBox(w, h, top, BAND_CONTENT_W.doors)!
      const bar = barItems(w, false)
      // the hint button and the go-on button are no wider than this; the counts are measured at their widest
      expect(bar.hint[1] - bar.hint[0]).toBe(BAR_ITEMS_PX.button)
      expect(bar.hint[0]).toBe(BAR_SIDE_PX)
      for (const c of content) {
        const x0 = b.x + c.x0 * b.scale, x1 = b.x + c.x1 * b.scale, y0 = b.y + c.y0 * b.scale
        if (y0 >= BAR_TOP_PX + BAR_H_PX) continue
        for (const [name, [l, r]] of [['hint', bar.hint], ['next', bar.next], ['counts', bar.counts]] as const) {
          const apart = x1 + BAND_AIR_PX <= l + 0.01 || x0 >= r + BAND_AIR_PX - 0.01
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
