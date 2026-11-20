import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FLICK_FRACTION, FLICK_MS, attachInput, type Intent } from './input'

// jsdom has no PointerEvent: a MouseEvent with a pointerId does the same for these listeners
function pointer(el: HTMLElement, type: string, x: number, y: number, id = 1) {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }) as MouseEvent & { pointerId: number }
  Object.defineProperty(e, 'pointerId', { value: id })
  el.dispatchEvent(e)
}
const key = (k: string, repeat = false) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, repeat, bubbles: true }))

const H = 1000
let now = 0
let el: HTMLElement
let got: Intent[]
let enabled = true
let detach: () => void

describe('input', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    el = document.createElement('div')
    el.setPointerCapture = () => {}
    document.body.appendChild(el)
    got = []
    enabled = true
    detach = attachInput(el, {
      toLogical: (cx, cy) => ({ x: cx * 2, y: cy * 2 }), height: () => H,
      planetAt: (x, y) => (y < 200 ? Math.floor(x / 400) : null), enabled: () => enabled,
    }, (i) => got.push(i))
  })
  afterEach(() => {
    detach()
    el.remove()
    vi.restoreAllMocks()
  })

  it('drag sends the finger\'s logical x', () => {
    pointer(el, 'pointerdown', 100, 800)
    pointer(el, 'pointermove', 150, 800)
    pointer(el, 'pointerup', 150, 800)
    expect(got).toEqual([{ type: 'touch' }, { type: 'drag', x: 200 }, { type: 'drag', x: 300 }, { type: 'release' }])
  })
  it('a fast upward move is one flick', () => {
    pointer(el, 'pointerdown', 100, 800)
    now = FLICK_MS - 100
    pointer(el, 'pointermove', 100, 800 - FLICK_FRACTION * H - 1)
    pointer(el, 'pointermove', 100, 500)
    pointer(el, 'pointerup', 100, 500)
    expect(got.filter((i) => i.type === 'flick')).toHaveLength(1)
    expect(got.filter((i) => i.type === 'drag')).toHaveLength(1)
  })
  it('a flick carries the finger\'s logical x', () => {
    pointer(el, 'pointerdown', 150, 800)
    now = 100
    pointer(el, 'pointermove', 150, 800 - FLICK_FRACTION * H - 1)
    expect(got.find((i) => i.type === 'flick')).toEqual({ type: 'flick', x: 300 })
  })
  it('a flick after steering in the same touch is a flick, at the lane under the finger', () => {
    pointer(el, 'pointerdown', 100, 800)
    for (let i = 1; i <= 5; i++) { now = i * 60; pointer(el, 'pointermove', 100 + i * 60, 800) }
    now = 360
    pointer(el, 'pointermove', 400, 800 - FLICK_FRACTION * H - 1)
    expect(got.find((i) => i.type === 'flick')).toEqual({ type: 'flick', x: 800 })
  })
  it('a slow diagonal drag is no flick', () => {
    pointer(el, 'pointerdown', 100, 800)
    for (let i = 1; i <= 20; i++) { now = i * 60; pointer(el, 'pointermove', 100 + i * 15, 800 - i * 4) }
    expect(got.some((i) => i.type === 'flick')).toBe(false)
  })
  it('a slow upward move is no flick', () => {
    pointer(el, 'pointerdown', 100, 800)
    now = FLICK_MS + 50
    pointer(el, 'pointermove', 100, 600)
    expect(got.some((i) => i.type === 'flick')).toBe(false)
  })
  it('a down on a planet is a tap and no drag', () => {
    pointer(el, 'pointerdown', 450, 50)
    pointer(el, 'pointermove', 500, 50)
    pointer(el, 'pointerup', 500, 50)
    expect(got).toEqual([{ type: 'touch' }, { type: 'tapPlanet', lane: 2 }])
  })
  it('held key repeats do not skip lanes', () => {
    key('ArrowRight')
    key('ArrowRight', true)
    key('ArrowRight', true)
    key('ArrowLeft')
    key('ArrowUp')
    expect(got).toEqual([{ type: 'key', dir: 1 }, { type: 'key', dir: -1 }, { type: 'keyZoom' }])
  })
  it('nothing while disabled', () => {
    enabled = false
    pointer(el, 'pointerdown', 100, 800)
    pointer(el, 'pointermove', 100, 500)
    pointer(el, 'pointerup', 100, 500)
    key('ArrowLeft')
    expect(got).toEqual([])
  })
  it('a second finger during a drag is ignored', () => {
    pointer(el, 'pointerdown', 100, 800, 1)
    pointer(el, 'pointerdown', 300, 800, 2)
    pointer(el, 'pointermove', 310, 800, 2)
    expect(got).toEqual([{ type: 'touch' }, { type: 'drag', x: 200 }])
  })
  it('detach removes the listeners', () => {
    detach()
    pointer(el, 'pointerdown', 100, 800)
    key('ArrowLeft')
    expect(got).toEqual([])
    detach = () => {}
  })
})
