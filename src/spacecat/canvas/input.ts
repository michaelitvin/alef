// Drag, flick (it carries the logical x where the finger went down), tap and keys on the stage, turned into intents for the engine. The stage has `touch-action: none`.

/**
 * A flick (a zoom) is detected during the touch, from the finger's last FLICK_MS: it moved up by more than this share of
 * the stage's height, and more up than sideways (a slow drift up while he steers, or a diagonal drag, is no flick).
 * The original uses the same 0.07, from the touch-down point within 400 ms; here it is the last 150 ms, so a flick
 * after steering, with no lift, counts too.
 */
export const FLICK_FRACTION = 0.07
export const FLICK_MS = 150

export type Intent = { type: 'drag'; x: number } | { type: 'release' } | { type: 'flick'; x: number } | { type: 'tapPlanet'; lane: number }
  | { type: 'key'; dir: -1 | 1 } | { type: 'keyZoom' } | { type: 'touch' }

export interface InputOpts {
  /** client (CSS px) to the layout's logical coordinates */
  toLogical: (cx: number, cy: number) => { x: number; y: number }
  /** the stage's height in CSS px */
  height: () => number
  /** the lane of the planet at this logical point, or null */
  planetAt: (x: number, y: number) => number | null
  enabled: () => boolean
  /** a touch or an arrow key while `enabled` is false (the controller ends an intro with it) */
  held?: () => void
}

type PE = PointerEvent & { pointerId: number }

/** Listens on the stage (pointers) and the window (keys); returns a function that removes the listeners. */
export function attachInput(el: HTMLElement, opts: InputOpts, on: (i: Intent) => void): () => void {
  let down: { id: number; flicked: boolean; trail: { cx: number; cy: number; lx: number; at: number }[] } | null = null

  const onDown = (e: Event) => {
    const p = e as PE
    if (down) return
    if (!opts.enabled()) { opts.held?.(); return }
    on({ type: 'touch' })
    const q = opts.toLogical(p.clientX, p.clientY)
    const lane = opts.planetAt(q.x, q.y)
    if (lane !== null) { on({ type: 'tapPlanet', lane }); return }
    try { el.setPointerCapture?.(p.pointerId) } catch { /* the pointer is gone already */ }
    down = { id: p.pointerId, flicked: false, trail: [{ cx: p.clientX, cy: p.clientY, lx: q.x, at: performance.now() }] }
    on({ type: 'drag', x: q.x })
  }
  const onMove = (e: Event) => {
    const p = e as PE
    if (!down || p.pointerId !== down.id) return
    if (!opts.enabled()) { down = null; return }
    if (down.flicked) return
    const at = performance.now(), lx = opts.toLogical(p.clientX, p.clientY).x
    down.trail.push({ cx: p.clientX, cy: p.clientY, lx, at })
    while (down.trail.length > 1 && at - down.trail[0].at > FLICK_MS) down.trail.shift()
    const oldest = down.trail[0], up = oldest.cy - p.clientY
    if (up > FLICK_FRACTION * opts.height() && up > Math.abs(p.clientX - oldest.cx)) {
      // the zoom is in the lane under the finger now (an upward move is mostly vertical)
      down.flicked = true
      on({ type: 'flick', x: lx })
      return
    }
    on({ type: 'drag', x: opts.toLogical(p.clientX, p.clientY).x })
  }
  const onUp = (e: Event) => {
    const p = e as PE
    if (!down || p.pointerId !== down.id) return
    down = null
    if (opts.enabled()) on({ type: 'release' })
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp') return
    if (!opts.enabled()) { if (!e.repeat) opts.held?.(); return }
    e.preventDefault()
    if (e.repeat) return
    on(e.key === 'ArrowUp' ? { type: 'keyZoom' } : { type: 'key', dir: e.key === 'ArrowLeft' ? -1 : 1 })
  }

  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
  window.addEventListener('keydown', onKey)
  return () => {
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    window.removeEventListener('keydown', onKey)
  }
}
