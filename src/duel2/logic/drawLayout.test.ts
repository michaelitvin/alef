import { describe, expect, it } from 'vitest'
import { WORDS } from '../data/words'
import { strokesOf } from '../data/strokes'
import { BOARD, drawLayout, strokeTiming, toNorm, toStagePt } from './drawLayout'
import { marksFor, splitWord } from './draw'

const lay = (id: string, script: 'print' | 'hand') => {
  const w = WORDS.find((x) => x.id === id)!
  const sp = splitWord(w, script)
  const marks = marksFor(w, 2)
  return drawLayout({ ...sp, script, def: strokesOf(sp.letter, script), marksAbove: marks.some((m) => m.zone.startsWith('above') || m.zone === 'vav-above'), marksUnder: marks.some((m) => m.zone === 'under') })
}

describe('drawing layout', () => {
  it('every word fits the board in both scripts, the slot at the right (Hebrew reads right to left)', () => {
    for (const w of WORDS) for (const sc of ['print', 'hand'] as const) {
      const L = lay(w.id, sc)
      expect(L.slot.right, w.id).toBeLessThanOrEqual(BOARD.right)
      expect(L.slot.top, w.id).toBeGreaterThanOrEqual(BOARD.top)
      expect(L.slot.bottom, w.id).toBeLessThanOrEqual(BOARD.bottom)
      expect(L.rest.cx, w.id).toBeLessThan(L.slot.left)
      expect(L.u).toBeGreaterThan(120)
    }
  })
  it('the vav sits between the slot and the rest, and its box is in letter units', () => {
    const L = lay('fox', 'print')
    expect(L.vav).toBeDefined()
    expect(L.vav!.cx).toBeLessThan(L.slot.left)
    expect(L.vav!.cx).toBeGreaterThan(L.rest.cx)
    expect(L.vav!.box.right).toBeLessThan(0)
  })
  it('stage and letter units convert both ways', () => {
    const L = lay('camel', 'print')
    const p = toStagePt(L, [0.5, 1])
    expect(p[1]).toBeCloseTo(L.lines.base)
    const q = toNorm(L, p)
    expect(q[0]).toBeCloseTo(0.5)
    expect(q[1]).toBeCloseTo(1)
  })
  it('the hand takes longer on a longer stroke; a tap is short', () => {
    const t = strokeTiming([[[0, 0], [1, 0]], [[0, 0], [0.2, 0]], [[0.5, 0.5]]])
    expect(t.dur[0]).toBeGreaterThan(t.dur[1])
    expect(t.dur[2]).toBeLessThan(t.dur[1])
    expect(t.total).toBeGreaterThan(t.start[2] + t.dur[2])
  })
})
