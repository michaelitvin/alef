import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SfxName } from '../audio/sfx'
import type { RoundContent } from '../content'
import { makeRound } from '../content'
import { RUNGS, itemsOfRung, maxNumber, type RungId } from '../logic/facts'
import type { RoundResult } from '../logic/round'
import { GEOM } from './draw'
import { CLEAR_MS, MARK_MS } from './effects'
import { PARKED_MS, createEngine, type Engine } from './engine'
import { manualClock, recordingContext } from './testCanvas'

const lcg = (seed: number) => {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32 }
}
// the ship starts in lane 1; the right answer 5 is in lane 1 unless said otherwise
const content = (rightLane = 1): RoundContent => {
  const labels = ['3', '4', '6', '7']
  labels[rightLane] = '5'
  return { box: ['2', '+', '3', '=', null], labels, rightLane, flyNumber: '5', itemId: '2+3=5/c', fact: '+2,3' }
}
const G = GEOM.wide

function pointer(el: HTMLElement, type: string, x: number, y: number) {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true })
  Object.defineProperty(e, 'pointerId', { value: 1 })
  el.dispatchEvent(e)
}

let canvas: HTMLCanvasElement
let clock: ReturnType<typeof manualClock>
let engine: Engine
let ends: RoundResult[]
let sfx: SfxName[]
let rec: ReturnType<typeof recordingContext>

describe('the engine', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockImplementation(() => clock.time())
    rec = recordingContext()
    canvas = document.createElement('canvas')
    canvas.setPointerCapture = () => {}
    document.body.appendChild(canvas)
    clock = manualClock()
    ends = []
    sfx = []
    engine = createEngine(canvas, { sfx: (n) => sfx.push(n), clock })
    engine.onEnd = (r) => ends.push(r)
  })
  afterEach(() => {
    engine.destroy()
    canvas.remove()
    rec.restore()
    vi.restoreAllMocks()
  })

  it('frozen planets do not move and flight time does not run', () => {
    engine.play(content(2), 8000, { frozen: true })
    clock.tick(20_000)
    expect(ends).toEqual([])
    engine.resume()
    clock.tick(8000 + MARK_MS + CLEAR_MS + 100)
    expect(ends).toHaveLength(1)
    expect(ends[0]).toMatchObject({ result: 'timeout', end: 'arrival', endMs: 8000 })
  })
  it('a flick on the right lane ends right with 2 points', () => {
    engine.play(content(1), 8000)
    clock.tick(500)
    pointer(canvas, 'pointerdown', G.lanes[1], 860)
    clock.tick(50)
    pointer(canvas, 'pointermove', G.lanes[1], 860 - 0.1 * G.H)
    clock.tick(3000)
    expect(ends).toHaveLength(1)
    expect(ends[0]).toMatchObject({ result: 'right', end: 'zoom', points: 2, lane: 1 })
    expect(sfx).toContain('right-zoom')
  })
  it('a drag released between lanes glides to the nearest', () => {
    engine.play(content(3), 8000)
    pointer(canvas, 'pointerdown', G.lanes[1], 860)
    pointer(canvas, 'pointermove', G.lanes[2] + 0.4 * 240, 860)
    clock.tick(400)
    pointer(canvas, 'pointerup', G.lanes[2] + 0.4 * 240, 860)
    clock.tick(9000 + MARK_MS + CLEAR_MS)
    expect(ends[0]).toMatchObject({ lane: 2, result: 'wrong' })
  })
  it('a drag released exactly between two lanes stays in the ship\'s lane', () => {
    engine.play(content(3), 8000)
    pointer(canvas, 'pointerdown', G.lanes[1], 860)
    pointer(canvas, 'pointermove', G.lanes[1] + 120, 860)
    clock.tick(400)
    pointer(canvas, 'pointerup', G.lanes[1] + 120, 860)
    clock.tick(9000 + MARK_MS + CLEAR_MS)
    expect(ends[0]).toMatchObject({ lane: 1 })
  })
  it('a tap on a planet glides there and zooms', () => {
    engine.play(content(3), 8000)
    clock.tick(1000)
    const y = G.y0 + (G.yArr - G.y0) * (1000 / 8000)
    pointer(canvas, 'pointerdown', G.lanes[3], y)
    clock.tick(3000 + MARK_MS + CLEAR_MS)
    expect(ends[0]).toMatchObject({ result: 'right', end: 'zoom', lane: 3 })
  })
  it('keys move one lane per press and up zooms', () => {
    engine.play(content(2), 8000)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    clock.tick(300)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    clock.tick(3000 + MARK_MS + CLEAR_MS)
    expect(ends[0]).toMatchObject({ result: 'right', end: 'zoom', lane: 2, points: 2 })
  })
  it('onEnd fires once per round, after the mark', () => {
    engine.play(content(2), 4000)
    clock.tick(4000 + MARK_MS)
    expect(ends).toHaveLength(0)
    clock.tick(CLEAR_MS + 50)
    expect(ends).toHaveLength(1)
    clock.tick(5000)
    expect(ends).toHaveLength(1)
    expect(sfx).toEqual(['timeout', 'heart'])
  })
  it('the parked callback fires once', () => {
    let parked = 0
    engine.onFirstParkedUnderRight = () => { parked++ }
    engine.play(content(2), 8000)
    pointer(canvas, 'pointerdown', G.lanes[1], 860)
    pointer(canvas, 'pointermove', G.lanes[2], 860)
    pointer(canvas, 'pointerup', G.lanes[2], 860)
    clock.tick(300 + PARKED_MS)
    expect(parked).toBe(1)
    clock.tick(3000)
    expect(parked).toBe(1)
  })
  it('a touch removes the demo hand at once', async () => {
    engine.play(content(2), 8000, { frozen: true })
    let done = false
    void engine.demoHand('flick', 2, 5000).then(() => { done = true })
    clock.tick(100)
    pointer(canvas, 'pointerdown', G.lanes[1], 860)
    await Promise.resolve()
    expect(done).toBe(true)
  })
  it('no input while it is off', () => {
    engine.play(content(1), 4000)
    engine.setInput(false)
    pointer(canvas, 'pointerdown', G.lanes[1], 860)
    pointer(canvas, 'pointermove', G.lanes[1], 500)
    clock.tick(4000 + MARK_MS + CLEAR_MS + 50)
    expect(ends[0]).toMatchObject({ result: 'right', end: 'arrival', points: 1 })
  })
  it('restart plays the same content from the top', () => {
    engine.setHud({ dots: 2, points: 5, hearts: 3 })
    engine.play(content(2), 4000)
    clock.tick(2000)
    engine.freeze()
    engine.restart()
    engine.resume()
    clock.tick(3000)
    expect(ends).toHaveLength(0)
    clock.tick(1000 + MARK_MS + CLEAR_MS + 50)
    expect(ends[0]).toMatchObject({ result: 'timeout', endMs: 4000 })
  })
  it('the sum box draws only digits, signs and no "?"', () => {
    const rng = lcg(7)
    window.__scText = []
    for (const { id } of RUNGS) {
      const items = itemsOfRung(id)
      const open = RUNGS.filter((r) => r.id <= id).map((r) => r.id as RungId)
      for (let n = 0; n < 50; n++) {
        const it = items[Math.floor(rng() * items.length)]
        engine.play(makeRound(rng, it, 1, maxNumber(open)), 8000)
        clock.tick(32)
      }
    }
    expect(window.__scText.length).toBeGreaterThan(1000)
    for (const s of window.__scText) expect(s).toMatch(/^[0-9+−×÷=]+$/)
    expect(rec.texts.every((s) => /^[0-9+−×÷=]+$/.test(s))).toBe(true)
  })
})
