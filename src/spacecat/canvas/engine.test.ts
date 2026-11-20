import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SfxName } from '../audio/sfx'
import type { RoundContent } from '../content'
import { makeRound } from '../content'
import { itemsOfRung } from '../logic/facts'
import { RUNGS, itemsOfOldRung } from '../logic/ladder'
import type { RoundResult } from '../logic/round'
import type { RungId } from '../logic/rungs'
import { HOP_MS, WIDE, portraitGeom } from './draw'
import { CLEAR_MS, FLY_MS, MARK_MS, MARK_POD_MS, SWELL, SWELL_MS, swellScale } from './effects'
import { PARKED_MS, ZOOM_HEIGHTS_PER_S, createEngine, zoomSpeed, type Engine } from './engine'
import { manualClock, recordingContext } from './testCanvas'

const lcg = (seed: number) => {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32 }
}
// the ship starts in lane 1; the right answer 5 is in lane 1 unless said otherwise
const content = (rightLane = 1): RoundContent => {
  const labels = ['3', '4', '6', '7']
  labels[rightLane] = '5'
  return { kind: 'sum', rung: '3', box: ['2', '+', '3', '=', null], labels, rightLane, flyNumber: '5', itemId: '2+3=5/c', fact: '+2,3' }
}
const G = WIDE
/** a comparison 7 ◯ 5 with the signs in lanes < = > */
const compare = (rightLane = 2): RoundContent => {
  const labels = ['<', '=', '>']
  return { kind: 'compare', rung: 'C1', box: ['7', null, '5'], labels, rightLane, flyNumber: labels[rightLane], itemId: '7?5', fact: '7?5', bigger: 0 }
}
const jumps = (): RoundContent => ({
  kind: 'jumps', rung: 'S1', box: ['5', '10', '15', null], labels: ['20', '25', '16', '30'], rightLane: 0, flyNumber: '20', itemId: '5,10,15,_', fact: '5,10,15,_',
})
const times = (share = false): RoundContent => ({
  kind: 'sum', rung: share ? 'T4b' : 'T2', box: share ? ['12', '÷', '3', '=', null] : ['4', '×', '5', '=', null],
  labels: share ? ['4', '3', '5', '9'] : ['20', '9', '25', '15'], rightLane: 0, flyNumber: share ? '4' : '20',
  itemId: share ? '12/3=4/c' : '4x5=20/c', fact: '', pods: share ? { groups: 3, each: 4, share: true } : { groups: 4, each: 5, share: false },
})
const fontPx = (f: string) => Number(/(\d+)px/.exec(f)![1])

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
  // the ship starts in lane 1; a swipe up counts at the lane where the finger went down, however far that is
  for (const [name, from] of [['in the ship\'s own lane', 1], ['one lane away', 2], ['two lanes away', 3], ['one lane away, on the left', 0]] as const) {
    it(`a swipe up that starts ${name} zooms from that lane at once`, () => {
      engine.play(content(from), 8000)
      clock.tick(500)
      pointer(canvas, 'pointerdown', G.lanes[from], 860)
      clock.tick(30)
      pointer(canvas, 'pointermove', G.lanes[from], 860 - 0.1 * G.H)
      clock.tick(3000)
      expect(ends).toHaveLength(1)
      expect(ends[0]).toMatchObject({ result: 'right', end: 'zoom', points: 2, lane: from })
    })
  }
  it('a swipe up from another lane is a wrong pick there, not a step to the side', () => {
    engine.play(content(1), 8000)
    clock.tick(500)
    pointer(canvas, 'pointerdown', G.lanes[3], 860)
    clock.tick(30)
    pointer(canvas, 'pointermove', G.lanes[3], 860 - 0.1 * G.H)
    clock.tick(3000)
    expect(ends[0]).toMatchObject({ result: 'wrong', end: 'zoom', lane: 3 })
  })
  it('one touch: steer two lanes, then flick up with no lift: it zooms in the lane reached', () => {
    engine.play(content(3), 8000)
    clock.tick(500)
    pointer(canvas, 'pointerdown', G.lanes[1], 860)
    for (let i = 1; i <= 8; i++) { clock.tick(60); pointer(canvas, 'pointermove', G.lanes[1] + (G.lanes[3] - G.lanes[1]) * (i / 8), 860) }
    clock.tick(400)
    expect(ends).toEqual([])
    pointer(canvas, 'pointermove', G.lanes[3], 860)
    clock.tick(30)
    pointer(canvas, 'pointermove', G.lanes[3], 860 - 0.1 * G.H)
    clock.tick(3000)
    expect(ends[0]).toMatchObject({ result: 'right', end: 'zoom', points: 2, lane: 3 })
  })
  it('a slow diagonal drag steers only: no zoom', () => {
    engine.play(content(3), 8000)
    clock.tick(500)
    pointer(canvas, 'pointerdown', G.lanes[1], 860)
    for (let i = 1; i <= 20; i++) {
      clock.tick(60)
      pointer(canvas, 'pointermove', G.lanes[1] + (G.lanes[3] - G.lanes[1]) * (i / 20), 860 - 0.05 * G.H * (i / 20))
    }
    clock.tick(100)
    pointer(canvas, 'pointerup', G.lanes[3], 860)
    expect(ends).toEqual([])
    clock.tick(500)
    expect(sfx).not.toContain('right-zoom')
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
  it('a zoom climbs at least as fast as the original, in screen heights per second, on every screen shape', () => {
    for (const g of [WIDE, portraitGeom(960), portraitGeom(1080), portraitGeom(1200)]) {
      expect(zoomSpeed(g) / g.H).toBeGreaterThanOrEqual(ZOOM_HEIGHTS_PER_S - 1e-9)
    }
    expect(zoomSpeed(portraitGeom(960))).toBeCloseTo(1500)
    expect(zoomSpeed(WIDE)).toBe(1900)
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
      const items = itemsOfOldRung(id)
      for (let n = 0; n < 50; n++) {
        const it = items[Math.floor(rng() * items.length)]
        engine.play(makeRound(rng, it, 1), 8000)
        clock.tick(32)
      }
    }
    // the log keeps each string once; the context saw every draw
    expect(window.__scText.length).toBeGreaterThan(20)
    expect(rec.texts.length).toBeGreaterThan(1000)
    for (const s of window.__scText) expect(s).toMatch(/^[0-9+−×÷=]+$/)
    expect(rec.texts.every((s) => /^[0-9+−×÷=]+$/.test(s))).toBe(true)
  })
  it('a comparison has 3 lanes: the ship glides to the nearest, and the next sum has 4 again', () => {
    engine.play(content(1), 8000)
    clock.tick(32)
    expect(window.__scRound!.lanes).toHaveLength(4)
    engine.play(compare(), 8000)
    clock.tick(32)
    const r = window.__scRound!
    expect(r).toMatchObject({ kind: 'compare', box: ['7', null, '5'], labels: ['<', '=', '>'], shipLane: 1 })
    expect(r.lanes).toEqual([500, 800, 1100])
    expect(r.planets).toHaveLength(3)
    clock.tick(500)
    // the ship reached its new lane with no lane event (no input: a time-out, not a wrong pick)
    clock.tick(8000 + MARK_MS + CLEAR_MS)
    expect(ends[0]).toMatchObject({ result: 'timeout', lane: 1, number: '=' })
    engine.play(content(1), 8000)
    clock.tick(32)
    expect(window.__scRound!.lanes).toHaveLength(4)
    expect(window.__scRound!.planets).toHaveLength(4)
  })
  it('in 3 lanes the keys stop at the last lane and a flick picks the lane under the finger', () => {
    engine.play(compare(2), 8000)
    for (let i = 0; i < 4; i++) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); clock.tick(200) }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    clock.tick(3000 + MARK_MS + CLEAR_MS)
    expect(ends[0]).toMatchObject({ result: 'right', lane: 2, number: '>' })
    engine.play(compare(0), 8000)
    clock.tick(300)
    pointer(canvas, 'pointerdown', 500, 860)
    clock.tick(30)
    pointer(canvas, 'pointermove', 500, 860 - 0.1 * G.H)
    clock.tick(3000 + MARK_MS + CLEAR_MS)
    expect(ends[1]).toMatchObject({ result: 'right', lane: 0, number: '<' })
  })
  it('the signs are drawn as paths, no text: on the planets, in flight and in the ring', () => {
    window.__scText = []
    const rng = lcg(3)
    for (const r of ['C1', 'C2'] as RungId[]) {
      const items = itemsOfRung(r)
      for (let n = 0; n < 12; n++) {
        engine.play(makeRound(rng, items[Math.floor(rng() * items.length)], 1), 2000)
        clock.tick(n % 2 ? 300 : 2000 + MARK_MS + CLEAR_MS + 50)
      }
    }
    expect(rec.texts.length).toBeGreaterThan(50)
    expect(rec.texts.every((s) => /^[0-9]+$/.test(s))).toBe(true)
    for (const s of window.__scText) expect(s).toMatch(/^[0-9]+$/)
  })
  it('a jump row draws its numbers with no commas, and boxIn resolves when the ring shows', async () => {
    let inAt = -1
    engine.play(jumps(), 8000, { frozen: true })
    void engine.boxIn().then(() => { inAt = clock.time() })
    clock.tick(3 * HOP_MS - 40)
    await Promise.resolve()
    expect(inAt).toBe(-1)
    clock.tick(60)
    await Promise.resolve()
    expect(inAt).toBeGreaterThanOrEqual(3 * HOP_MS)
    for (const t of ['5', '10', '15']) expect(rec.texts).toContain(t)
    expect(rec.texts.some((t) => /[,،]/.test(t))).toBe(false)
    // once in, and for other kinds, at once
    let now = false
    void engine.boxIn().then(() => { now = true })
    await Promise.resolve()
    expect(now).toBe(true)
    engine.play(compare(), 8000)
    now = false
    void engine.boxIn().then(() => { now = true })
    await Promise.resolve()
    expect(now).toBe(true)
  })
  it('a pending boxIn resolves when the next round starts', async () => {
    engine.play(jumps(), 8000, { frozen: true })
    let done = false
    void engine.boxIn().then(() => { done = true })
    engine.play(content(1), 8000)
    await Promise.resolve()
    expect(done).toBe(true)
  })
  it('the bigger number swells when the flown sign reaches the ring, also after a wrong pick', () => {
    expect([SWELL, SWELL_MS]).toEqual([1.15, 400])
    const c = compare(2)
    expect(swellScale(c, FLY_MS + SWELL_MS / 2, null)).toEqual([SWELL, 1, 1])
    expect(swellScale(c, FLY_MS - 10, null)).toEqual([1, 1, 1])
    expect(swellScale(c, null, null)).toEqual([1, 1, 1])
    expect(swellScale({ ...c, bigger: 'both' }, FLY_MS + SWELL_MS / 2, null)).toEqual([SWELL, 1, SWELL])
    expect(swellScale(c, null, 400)[0]).toBeCloseTo(SWELL)
    engine.play(c, 8000)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))   // a wrong pick: = in lane 1
    clock.tick(1500)
    const base = fontPx(rec.fonts[rec.texts.lastIndexOf('5')])
    rec.texts.length = 0; rec.fonts.length = 0
    // the result came during that tick; step to the swell's peak of the next round of the same kind
    engine.play(c, 8000)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    let peak = 0
    for (let i = 0; i < 80; i++) {
      clock.tick(16)
      rec.texts.forEach((s, j) => { if (s === '7') peak = Math.max(peak, fontPx(rec.fonts[j])) })
      rec.texts.length = 0; rec.fonts.length = 0
    }
    expect(peak / base).toBeGreaterThan(1.12)
    expect(peak / base).toBeLessThanOrEqual(SWELL + 0.02)
  })
  it('the mark holds 1.5 s with pods after a wrong answer or a time-out', () => {
    expect(MARK_POD_MS).toBe(1500)
    engine.play(times(), 4000)
    clock.tick(32)
    expect(window.__scRound!.pods).toBe(false)
    clock.tick(4000)
    expect(window.__scRound).toMatchObject({ phase: 'mark', result: 'timeout', pods: true })
    clock.tick(MARK_POD_MS - 100)
    expect(ends).toHaveLength(0)
    expect(window.__scRound!.pods).toBe(true)
    clock.tick(CLEAR_MS + 200)
    expect(ends).toHaveLength(1)
    // a right answer keeps the short mark and shows no pods
    engine.play(times(), 4000)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    clock.tick(200)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    clock.tick(1000)
    expect(window.__scRound!.pods).toBe(false)
    clock.tick(MARK_MS + CLEAR_MS)
    expect(ends).toHaveLength(2)
    expect(ends[1].result).toBe('right')
  })
  it('pods: shown from the start, on their cue, or only in a mistake\'s mark', () => {
    engine.play(times(), 8000, { pods: 'start' })
    clock.tick(32)
    expect(window.__scRound!.pods).toBe(true)
    engine.play(times(true), 8000, { pods: 'cue' })
    clock.tick(32)
    expect(window.__scRound!.pods).toBe(false)
    engine.cue('share', true)
    clock.tick(32)
    expect(window.__scRound!.pods).toBe(true)
    engine.cue('share', false)
    clock.tick(32)
    expect(window.__scRound!.pods).toBe(true)
    engine.play(times(), 8000, { pods: 'mistake' })
    engine.cue('ring', true)
    clock.tick(32)
    expect(window.__scRound!.pods).toBe(false)
    // a round without pods never shows them
    engine.play(content(1), 8000, { pods: 'start' })
    engine.cue('pods', true)
    clock.tick(32)
    expect(window.__scRound!.pods).toBe(false)
  })
  it('restart keeps the round\'s pods and its lanes', () => {
    engine.play(compare(), 8000, { frozen: true })
    clock.tick(100)
    engine.restart()
    clock.tick(32)
    expect(window.__scRound!.lanes).toHaveLength(3)
    engine.play(times(), 8000, { frozen: true, pods: 'start' })
    engine.restart()
    clock.tick(32)
    expect(window.__scRound!.pods).toBe(true)
  })
  it('the cues draw no text', () => {
    window.__scText = []
    engine.play(compare(), 8000)
    for (const c of ['signs', 'open', 'bigger', 'equal'] as const) { engine.cue(c, true); clock.tick(200); engine.cue(c, false) }
    engine.play(jumps(), 8000)
    for (const c of ['arcs', 'ring'] as const) { engine.cue(c, true); clock.tick(600); engine.cue(c, false) }
    for (const s of window.__scText) expect(s).toMatch(/^[0-9]+$/)
  })
})
