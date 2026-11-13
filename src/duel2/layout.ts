// The play screen's layout constants (rule: floating buttons in the top bar, not over the content area). The top bar is a
// band at the top of the screen; the stage (the game area, 1600×900, fixed) is fitted into the space below the band, so
// no button, count or heart in the bar can cover the game at any screen size. The background still fills the screen.
import type { CSSProperties } from 'react'

/** the band's distance from the screen's top edge (more under a notch: env(safe-area-inset-top)) */
export const BAR_TOP_PX = 8
/** the band's height: every item in the bar fits in it */
export const BAR_H_PX = 64
/** free space between the band and the stage (the go-on button's pulse grows into it) */
export const BAR_GAP_PX = 6
/** the items in the bar (duel2.css): the round buttons, a heart, the go-on button (as tall as the band) */
export const BAR_ITEMS_PX = { button: 60, heart: 40, next: BAR_H_PX }
/** the go-on button's pulse (d2-pulse) */
export const NEXT_PULSE = 1.08

/** the bar's distance from the screen's left and right edges (.d2-topbar) and the gap between its items */
export const BAR_SIDE_PX = 24
export const BAR_ITEM_GAP_PX = 12
/** the bar's left side at its widest: the speaker and the wand (CSS px from the screen's left edge) */
export const BAR_LEFT_END_PX = BAR_SIDE_PX + 2 * BAR_ITEMS_PX.button + BAR_ITEM_GAP_PX
/**
 * The counts on the bar's right side at their widest (measured 437 px): coins up to 999, stars up to 99, the ×2/×3 badge, three
 * hearts. CSS px from the screen's right edge's margin (BAR_SIDE_PX).
 */
export const BAR_COUNTS_PX = 438
/** the go-on button's half width in the middle of the bar, with its pulse */
export const BAR_NEXT_HALF_PX = (BAR_ITEMS_PX.next * NEXT_PULSE) / 2
/** air between a bar item and content that goes up into the band */
export const BAND_AIR_PX = 8
/** content that goes up into the band starts at least this far below the screen's top */
export const INTO_BAND_TOP_PX = 14
/** the content goes up into the band only where that makes it noticeably larger (a phone on its side, not a wide desktop) */
export const INTO_BAND_MIN_GAIN = 1.05

/** where the stage starts on a screen without a notch (CSS px from the top) */
export const CONTENT_TOP_PX = BAR_TOP_PX + BAR_H_PX + BAR_GAP_PX

/**
 * The topmost stage y (of 900) of what he sees and taps on each screen while he answers (measured: the highest pick, ghost, drawing board,
 * plate, glyph, orb or button, with its hover, plus a margin). The stage's sky above it is empty, so on a short wide
 * screen (a phone on its side) that sky may go under the top bar's band, and the game gets larger: the content still
 * starts below the band, so nothing in the bar covers it. Not named (0): the stage is fitted below the band (as
 * before). The drawing in handwriting is not named: its tall words reach the stage's top.
 */
export const STAGE_CONTENT_TOP: Record<string, number> = {
  broom: 78, cauldron: 66, ladder: 48, ghosts: 176, doors: 42, draw: 160, crystal: 170, merchant: 104,
}

/**
 * The stage's box on a w×h screen (no notch). Fitted below the band, centred, 16:9; with `top` (the topmost content's
 * stage y) the stage may grow until its content fills the room below the band (its empty sky then goes up into the band
 * or past the screen's top), never wider than the screen.
 */
export function stageBox(w: number, h: number, top = 0): { x: number; y: number; w: number; h: number; scale: number } {
  const availH = h - CONTENT_TOP_PX
  const fit = Math.min(w / 1600, availH / 900)
  const scale = Math.max(fit, Math.min(w / 1600, availH / (900 - top)))
  const sw = 1600 * scale
  const sh = 900 * scale
  // the content (top..900) is centred in the room below the band
  const y = scale === fit ? CONTENT_TOP_PX + (availH - sh) / 2 : CONTENT_TOP_PX + (availH - (900 - top) * scale) / 2 - top * scale
  return { x: (w - sw) / 2, y, w: sw, h: sh, scale }
}

/**
 * The CSS variables that place the bar and the stage (set on the play screen's root). With the screen's size and its
 * content's top (STAGE_CONTENT_TOP), the stage's own box (--d2-stage-top, --d2-stage-h; relative to the band, so a notch
 * moves both); without them the stage fills the room below the band. `full`: the screen's own view fills the whole screen
 * (intoBandView).
 */
export function layoutVars(size?: { w: number; h: number }, top = 0, full = false): CSSProperties {
  const v: Record<string, string> = {
    '--d2-bar-top': `max(${BAR_TOP_PX}px, env(safe-area-inset-top))`,
    '--d2-bar-h': `${BAR_H_PX}px`,
    '--d2-content-top': `calc(var(--d2-bar-top) + ${BAR_H_PX + BAR_GAP_PX}px)`,
  }
  // a full view (intoBandView): the stage's SVG covers the whole screen, its viewBox places the game
  if (full) {
    v['--d2-stage-top'] = '0px'
    v['--d2-stage-h'] = '100%'
  } else if (size && top > 0) {
    const b = stageBox(size.w, size.h, top)
    const fit = stageBox(size.w, size.h)
    if (b.scale > fit.scale + 1e-6) {
      v['--d2-stage-top'] = `calc(var(--d2-content-top) + ${(b.y - CONTENT_TOP_PX).toFixed(1)}px)`
      v['--d2-stage-h'] = `${b.h.toFixed(1)}px`
    }
  }
  return v as CSSProperties
}


/** the flight's left edge (stage x): the wizard flies near the screen's left edge (the parent's pick: the flight fills the width) */
export const FLIGHT_LEFT = -60

/**
 * The broom flight's view on a w×h screen: as wide as the screen at the stage's scale (stageBox with its content top),
 * from FLIGHT_LEFT. At least 1600 wide (the boss on the right stays whole); a wide phone sees more sky on the right.
 * Without a size: a 16:9 screen.
 */
export function flightView(w?: number, h?: number): { left: number; width: number; scale: number } {
  if (!w || !h) return { left: FLIGHT_LEFT, width: 1600, scale: 1 }
  const { scale } = stageBox(w, h, STAGE_CONTENT_TOP.broom)
  return { left: FLIGHT_LEFT, width: Math.max(1600, w / scale), scale }
}

/**
 * The band's free middle on a w-wide screen, left of the centre (CSS px): right of the speaker and the wand, left of both the
 * go-on button (in the middle) and the counts at their widest, with air on each side.
 */
export function bandGap(w: number): { left: number; right: number } {
  return { left: BAR_LEFT_END_PX + BAND_AIR_PX, right: Math.min(w / 2 - BAR_NEXT_HALF_PX, w - BAR_SIDE_PX - BAR_COUNTS_PX) - BAND_AIR_PX }
}

/** a stage view that fills the whole screen: the viewBox (stage units) and the scale (CSS px per stage unit) */
export interface FullView { x: number; y: number; w: number; h: number; scale: number }

/**
 * The ladder "rises into the band" (the parent's pick for a phone on its side): on a screen where the stage fitted below the
 * band is narrower than the screen, the stage's 0..900 fills the screen from INTO_BAND_TOP_PX to the bottom, and the
 * ladder (stage x `cx`, `width` wide) goes up into the band's free middle (bandGap), so the whole screen is larger. The view
 * is as wide as the screen (the backdrop fills the sides). Only where it is noticeably larger than the stage below the band
 * (stageBox with the content's top); else (a tablet: the stage is as wide as the screen already) null, and the stage stays
 * as before.
 */
export function intoBandView(w: number, h: number, cx: number, width: number, top: number): FullView | null {
  if ((h - CONTENT_TOP_PX) / 900 >= w / 1600) return null
  const gap = bandGap(w)
  const scale = Math.min((h - INTO_BAND_TOP_PX) / 900, (gap.right - gap.left) / width)
  if (!(scale > stageBox(w, h, top).scale * INTO_BAND_MIN_GAIN)) return null
  const vw = w / scale
  const vh = h / scale
  return { x: cx - (gap.left + gap.right) / 2 / scale, y: 900 - vh, w: vw, h: vh, scale }
}

/** a full view's viewBox attribute */
export const viewBoxOf = (v: FullView) => `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`

/** a stage point → screen point (CSS px) in a full view */
export const toScreen = (v: FullView, x: number, y: number) => ({ x: (x - v.x) * v.scale, y: (y - v.y) * v.scale })

/** the stage y of the band's bottom (with air) in a full view: what must stay below the band starts there */
export const belowBand = (v: FullView) => v.y + (BAR_TOP_PX + BAR_H_PX + BAND_AIR_PX) / v.scale
