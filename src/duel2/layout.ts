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

/** the bar's distance from the screen's left and right edges (duel2.css .d2-topbar) */
export const BAR_SIDE_PX = 24
/**
 * The counts on the bar's right at their widest while he plays (measured: three digits of coins, a two-digit score,
 * the ×2/×3 badge (both as wide), three hearts; each more digit adds 21 px; without the badge they are 80 px narrower).
 */
export const BAR_COUNTS_MAX_PX = 436
/** the room kept between the game and an item of the bar */
export const BAR_AIR_PX = 8

/**
 * The bar's items on a w-wide screen, each at its widest (x from the screen's left; all of them in the band, y from
 * BAR_TOP_PX to BAR_TOP_PX + BAR_H_PX): on the left the speaker and the wand (the doors have no speaker), the go-on
 * button in the middle (with its pulse), the counts on the right.
 */
export function barItems(w: number, speaker = true): { left: [number, number]; next: [number, number]; counts: [number, number] } {
  const buttons = speaker ? 2 * BAR_ITEMS_PX.button + 12 : BAR_ITEMS_PX.button
  const half = (BAR_ITEMS_PX.next * NEXT_PULSE) / 2
  return { left: [BAR_SIDE_PX, BAR_SIDE_PX + buttons], next: [w / 2 - half, w / 2 + half], counts: [w - BAR_SIDE_PX - BAR_COUNTS_MAX_PX, w - BAR_SIDE_PX] }
}

/** the screens whose content rises into the top band on a phone (layout.ts bandStageBox): its width (stage units) */
export const BAND_CONTENT_W: Record<string, number> = { doors: 560 * (519 / 600) }
/** a screen at most this tall is a phone on its side: there the content rises into the band (a tablet keeps its layout) */
export const BAND_MAX_H = 500
/** the content's top on a phone, with the content in the band (CSS px from the screen's top) */
export const BAND_TOP_PX = 10

/**
 * The doors on a phone on its side (the parent's pick, "into the band"): the door's top rises into the empty middle of
 * the top band, so the door, its word plate and the keys are bigger. The content (STAGE_CONTENT_TOP..900) fills the
 * screen from BAND_TOP_PX to its bottom, and its middle (stage x 800, `width` wide) moves into the band's free gap:
 * right of the wand, left of the go-on button and of the counts at their widest, with BAR_AIR_PX on each side. The
 * door is then left of the screen's centre. Null where it does not help: on a tablet, or when the stage would not grow.
 */
export function bandStageBox(w: number, h: number, top: number, width: number): { x: number; y: number; w: number; h: number; scale: number } | null {
  if (h > BAND_MAX_H) return null
  const bar = barItems(w, false)
  const l = bar.left[1] + BAR_AIR_PX
  const r = Math.min(bar.next[0], bar.counts[0]) - BAR_AIR_PX
  const scale = Math.min((h - BAND_TOP_PX) / (900 - top), (r - l) / width)
  if (!(scale > stageBox(w, h, top).scale + 1e-6)) return null
  const cx = (l + r) / 2
  return { x: cx - 800 * scale, y: h - 900 * scale, w: 1600 * scale, h: 900 * scale, scale }
}

/**
 * The CSS variables that place the bar and the stage (set on the play screen's root). With the screen's size and its
 * content's top (STAGE_CONTENT_TOP), the stage's own box (--d2-stage-top, --d2-stage-h; relative to the band, so a notch
 * moves both); without them the stage fills the room below the band. With `band` (BAND_CONTENT_W) the content may rise
 * into the band on a phone (bandStageBox): the stage's box then also has its own left edge and width.
 */
export function layoutVars(size?: { w: number; h: number }, top = 0, band?: number): CSSProperties {
  const v: Record<string, string> = {
    '--d2-bar-top': `max(${BAR_TOP_PX}px, env(safe-area-inset-top))`,
    '--d2-bar-h': `${BAR_H_PX}px`,
    '--d2-content-top': `calc(var(--d2-bar-top) + ${BAR_H_PX + BAR_GAP_PX}px)`,
  }
  const inBand = size && top > 0 && band ? bandStageBox(size.w, size.h, top, band) : null
  if (inBand) {
    v['--d2-stage-top'] = `${inBand.y.toFixed(1)}px`
    v['--d2-stage-h'] = `${inBand.h.toFixed(1)}px`
    v['--d2-stage-left'] = `${inBand.x.toFixed(1)}px`
    v['--d2-stage-w'] = `${inBand.w.toFixed(1)}px`
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
