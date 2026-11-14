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
/** the items in the bar (duel2.css): the round buttons, a heart, the go-on button (as tall as the band), the held home button */
export const BAR_ITEMS_PX = { button: 60, heart: 40, next: BAR_H_PX, home: 56 }
/** the go-on button's pulse (d2-pulse) */
export const NEXT_PULSE = 1.08

/** the bar's distance from the screen's left and right edges (.d2-topbar) and the gap between its items */
export const BAR_SIDE_PX = 24
export const BAR_ITEM_GAP_PX = 12
/** the bar's left side at its widest without the home button: the speaker and the hint button (CSS px from the screen's left edge) */
export const BAR_LEFT_END_PX = BAR_SIDE_PX + 2 * BAR_ITEMS_PX.button + BAR_ITEM_GAP_PX
/**
 * The counts on the bar's right side at their widest (measured 436–437 px): coins up to 999, stars up to 99, the ×2/×3
 * badge (both as wide), three hearts; each more digit adds 21 px, without the badge they are 80 px narrower. CSS px from
 * the screen's right edge's margin (BAR_SIDE_PX). One value for every screen that goes up into the band.
 */
export const BAR_COUNTS_PX = 438
/**
 * The home button (a 2 s hold; rule: a way out on a child screen needs a hold) is the bar's first item on the left, in
 * the corner before the speaker (the parent: the home button belongs on the left): its slot (the button and a gap) moves
 * the speaker and the hint button to the right. A full run only; it is not there in a path session (that goes home by
 * itself) or where the content rises into the band (homeInBar).
 */
export const BAR_HOME_SLOT_PX = BAR_ITEMS_PX.home + BAR_ITEM_GAP_PX
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

type Span = [number, number]
/** the bar's items on a w-wide screen (x from the screen's left, CSS px; all of them in the band) */
export interface BarItems {
  /** the speaker (none on a screen without it, the doors) */
  speaker?: Span
  /** the hint button (?): after the speaker */
  hint: Span
  /** the go-on button with its pulse: in the middle, or (nextSide) in the hint's place and size, the hint button not shown then */
  next: Span
  nextSide: boolean
  /** the counts at their widest */
  counts: Span
  /** the held home button, in the left corner before the speaker (a full run only) */
  home?: Span
  /** the left group: the home button (if shown) to the hint button (the go-on button in the hint's place is no wider) */
  left: Span
}

/**
 * The go-on button stays in the bar's middle only where it clears both sides with a gap: the left buttons and the counts at
 * their widest (a tablet). On a narrower screen (a phone) the centre is over the counts, so there it goes in the left group.
 */
export function nextInMiddle(w: number, home = false): boolean {
  return w / 2 - BAR_NEXT_HALF_PX >= BAR_LEFT_END_PX + (home ? BAR_HOME_SLOT_PX : 0) + BAR_ITEM_GAP_PX
    && w / 2 + BAR_NEXT_HALF_PX + BAR_ITEM_GAP_PX <= w - BAR_SIDE_PX - BAR_COUNTS_PX
}

/**
 * The bar's items on a w-wide screen, each at its widest: on the left the home button (a full run), the speaker and the hint
 * button (the doors have no speaker),
 * the go-on button in the middle where it fits (nextInMiddle), else in the hint's place after the speaker (TopBar: the
 * hint button is not shown with it), the counts on the right. No two of them overlap at any size.
 */
export function barItems(w: number, speaker = true, home = false): BarItems {
  const B = BAR_ITEMS_PX.button
  const homeSpan: Span | undefined = home ? [BAR_SIDE_PX, BAR_SIDE_PX + BAR_ITEMS_PX.home] : undefined
  const start = BAR_SIDE_PX + (home ? BAR_HOME_SLOT_PX : 0)
  const sp: Span | undefined = speaker ? [start, start + B] : undefined
  const slot = sp ? sp[1] + BAR_ITEM_GAP_PX : start
  const hint: Span = [slot, slot + B]
  const nextSide = !nextInMiddle(w, home)
  // in the hint's place the go-on button is the hint button's size and glows instead of growing (duel2.css), so it takes no more room
  const next: Span = nextSide ? hint : [w / 2 - BAR_NEXT_HALF_PX, w / 2 + BAR_NEXT_HALF_PX]
  const left: Span = [BAR_SIDE_PX, hint[1]]
  const right = w - BAR_SIDE_PX
  return { speaker: sp, hint, next, nextSide, counts: [right - BAR_COUNTS_PX, right], left, ...(homeSpan ? { home: homeSpan } : {}) }
}

/**
 * The band's free middle on a w-wide screen (CSS px), where content may rise into the band: right of the left group (the
 * home button when it shows, the speaker, the hint button or the go-on button in its place), left of the counts at their
 * widest and of the go-on button when it is in the middle, with BAND_AIR_PX on each side. The play screen asks without the
 * home button: it is not shown where content rises into the band (homeInBar).
 */
export function bandGap(w: number, speaker = true, home = false): { left: number; right: number } {
  const bar = barItems(w, speaker, home)
  return { left: bar.left[1] + BAND_AIR_PX, right: (bar.nextSide ? bar.counts[0] : Math.min(bar.next[0], bar.counts[0])) - BAND_AIR_PX }
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
 * between the bar's items (bandGap). The
 * door is then left of the screen's centre. Null where it does not help: on a tablet, or when the stage would not grow.
 */
export function bandStageBox(w: number, h: number, top: number, width: number): { x: number; y: number; w: number; h: number; scale: number } | null {
  if (h > BAND_MAX_H) return null
  const { left: l, right: r } = bandGap(w, false)
  const scale = Math.min((h - BAND_TOP_PX) / (900 - top), (r - l) / width)
  if (!(scale > stageBox(w, h, top).scale + 1e-6)) return null
  const cx = (l + r) / 2
  return { x: cx - 800 * scale, y: h - 900 * scale, w: 1600 * scale, h: 900 * scale, scale }
}

/**
 * The CSS variables that place the bar and the stage (set on the play screen's root). With the screen's size and its
 * content's top (STAGE_CONTENT_TOP), the stage's own box (--d2-stage-top, --d2-stage-h; relative to the band, so a notch
 * moves both); without them the stage fills the room below the band. `into`: the content may rise into the band on a
 * phone: 'full' — the screen's own view fills the whole screen (intoBandView, the ladder); a width (BAND_CONTENT_W, the
 * doors) — the stage's box then also has its own left edge and width (bandStageBox).
 */
export function layoutVars(size?: { w: number; h: number }, top = 0, into?: 'full' | number): CSSProperties {
  const v: Record<string, string> = {
    '--d2-bar-top': `max(${BAR_TOP_PX}px, env(safe-area-inset-top))`,
    '--d2-bar-h': `${BAR_H_PX}px`,
    '--d2-content-top': `calc(var(--d2-bar-top) + ${BAR_H_PX + BAR_GAP_PX}px)`,
  }
  const inBand = size && top > 0 && typeof into === 'number' ? bandStageBox(size.w, size.h, top, into) : null
  // a full view (intoBandView): the stage's SVG covers the whole screen, its viewBox places the game
  if (into === 'full') {
    v['--d2-stage-top'] = '0px'
    v['--d2-stage-h'] = '100%'
  } else if (inBand) {
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

/**
 * The screens whose own art rises into the band's empty left end on a phone on its side (BAND_MAX_H): the tower and the
 * wizard of the tower screen use the screen's full height there, up to 10 px below its top (duel.css, the parent's pick).
 */
export const LEFT_INTO_BAND = ['tower']

/**
 * The held home button shows in the bar unless the screen's content rises into the band (layoutVars' `into`: the ladder's
 * full view, or the doors' band box on a phone on its side; LEFT_INTO_BAND: the tower on a phone on its side). There the
 * band's free part is the content's (the parent's pick): the doors and the ladder are placed in the gap right of the left
 * group without the home button (bandGap), and the tower's wizard stands in the band's left end, so the button in the
 * left corner would sit on it; he finds the button again on the next screen (and on the pause cover).
 */
export function homeInBar(size: { w: number; h: number }, top = 0, into?: 'full' | number, kind?: string): boolean {
  if (into === 'full') return false
  if (kind && LEFT_INTO_BAND.includes(kind) && size.h <= BAND_MAX_H) return false
  return !(top > 0 && typeof into === 'number' && bandStageBox(size.w, size.h, top, into))
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
