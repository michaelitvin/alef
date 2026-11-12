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

/** the CSS variables that place the bar and the stage (set on the play screen's root) */
export function layoutVars(): CSSProperties {
  return {
    '--d2-bar-top': `max(${BAR_TOP_PX}px, env(safe-area-inset-top))`,
    '--d2-bar-h': `${BAR_H_PX}px`,
    '--d2-content-top': `calc(var(--d2-bar-top) + ${BAR_H_PX + BAR_GAP_PX}px)`,
  } as CSSProperties
}

/** where the stage starts on a screen without a notch (CSS px from the top) */
export const CONTENT_TOP_PX = BAR_TOP_PX + BAR_H_PX + BAR_GAP_PX

/** the stage's box on a w×h screen (no notch): fitted below the band, centred, 16:9 */
export function stageBox(w: number, h: number): { x: number; y: number; w: number; h: number; scale: number } {
  const availH = h - CONTENT_TOP_PX
  const scale = Math.min(w / 1600, availH / 900)
  const sw = 1600 * scale
  const sh = 900 * scale
  return { x: (w - sw) / 2, y: CONTENT_TOP_PX + (availH - sh) / 2, w: sw, h: sh, scale }
}
