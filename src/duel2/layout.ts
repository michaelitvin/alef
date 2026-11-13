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

/**
 * The CSS variables that place the bar and the stage (set on the play screen's root). With the screen's size and its
 * content's top (STAGE_CONTENT_TOP), the stage's own box (--d2-stage-top, --d2-stage-h; relative to the band, so a notch
 * moves both); without them the stage fills the room below the band.
 */
export function layoutVars(size?: { w: number; h: number }, top = 0): CSSProperties {
  const v: Record<string, string> = {
    '--d2-bar-top': `max(${BAR_TOP_PX}px, env(safe-area-inset-top))`,
    '--d2-bar-h': `${BAR_H_PX}px`,
    '--d2-content-top': `calc(var(--d2-bar-top) + ${BAR_H_PX + BAR_GAP_PX}px)`,
  }
  if (size && top > 0) {
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
 * The first duel's tower in Book 2's run (duel.css, `.nd-embedded`; the parent's pick): the sizes on a phone on its side
 * (height ≤ 500) and on a tablet. `glyph`: a rune's glyph box (the duel's own: 60); `mark`: the mark's scale in it;
 * `vav`: a vav mark's scale and its drop (glyph units; its holam dot is near the glyph's top). `sprite`/`boss`: the
 * monster's height. `pad`: the rune row's band (rune, padding, border). No time line at the field's top.
 */
export const TOWER_LAYOUT = {
  phone: { rune: 62, glyph: 72, mark: 1.25, vav: 1.05, vavDrop: 9, sprite: 72, boss: 76, pad: 62 + 4 + 8 + 2 },
  tablet: { rune: 108, glyph: 86, mark: 1.2, vav: 1.1, vavDrop: 5, sprite: 150, boss: 240, pad: 108 + 6 + 40 + 2 },
} as const
/** the duel's glyph box (SpellPad) */
export const DUEL_GLYPH_PX = 60
/** the monster's feet: 14% of the field above its bottom (duel.css .nd-monster) */
export const MONSTER_BOTTOM = 0.14
/** the cue bubble's height, its arrow and its gap included (a picture, a sign or a speaker; measured ≤ 62), and a boss's hearts row */
export const CUE_PX = { bubble: 64, gap: 12, bossGap: 4, bossBubble: 56, hearts: 26 }

/** The top of the monster's cue bubble (CSS px from the screen's top) on a w×h screen in Book 2's run, the boss's or a monster's. */
export function towerCueTop(h: number, boss: boolean): number {
  const t = h > 500 ? TOWER_LAYOUT.tablet : TOWER_LAYOUT.phone
  const fieldBottom = h - t.pad
  const feet = fieldBottom - (fieldBottom - CONTENT_TOP_PX) * MONSTER_BOTTOM
  return boss ? feet - t.boss - CUE_PX.hearts - CUE_PX.bossGap - CUE_PX.bossBubble : feet - t.sprite - CUE_PX.gap - CUE_PX.bubble
}
