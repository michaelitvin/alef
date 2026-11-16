// Drag, flick, tap and keys on the stage, turned into intents for the engine. The stage has `touch-action: none`.

/** an upward move longer than this share of the stage's height ... */
export const FLICK_FRACTION = 0.07
/** ... within this many ms of the finger going down is a flick (a zoom) */
export const FLICK_MS = 400

export type Intent = { type: 'drag'; x: number } | { type: 'release' } | { type: 'flick' } | { type: 'tapPlanet'; lane: number }
  | { type: 'key'; dir: -1 | 1 } | { type: 'keyZoom' } | { type: 'touch' }

export interface InputOpts {
  /** client (CSS px) to the layout's logical coordinates */
  toLogical: (cx: number, cy: number) => { x: number; y: number }
  /** the stage's height in CSS px */
  height: () => number
  /** the lane of the planet at this logical point, or null */
  planetAt: (x: number, y: number) => number | null
  enabled: () => boolean
}

type PE = PointerEvent & { pointerId: number }

/** Listens on the stage (pointers) and the window (keys); returns a function that removes the listeners. */
export function attachInput(el: HTMLElement, opts: InputOpts, on: (i: Intent) => void): () => void {
  let down: { id: number; y: number; at: number; flicked: boolean } | null = null

  const onDown = (e: Event) => {
    const p = e as PE
    if (!opts.enabled() || down) return
    on({ type: 'touch' })
    const q = opts.toLogical(p.clientX, p.clientY)
    const lane = opts.planetAt(q.x, q.y)
    if (lane !== null) { on({ type: 'tapPlanet', lane }); return }
    try { el.setPointerCapture?.(p.pointerId) } catch { /* the pointer is gone already */ }
    down = { id: p.pointerId, y: p.clientY, at: performance.now(), flicked: false }
    on({ type: 'drag', x: q.x })
  }
  const onMove = (e: Event) => {
    const p = e as PE
    if (!down || p.pointerId !== down.id) return
    if (!opts.enabled()) { down = null; return }
    if (down.flicked) return
    if (down.y - p.clientY > FLICK_FRACTION * opts.height() && performance.now() - down.at < FLICK_MS) {
      down.flicked = true
      on({ type: 'flick' })
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
    if (!opts.enabled()) return
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
