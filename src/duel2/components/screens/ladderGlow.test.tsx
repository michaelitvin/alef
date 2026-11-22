// The English ladder's cues (Ladder.tsx): the glow attributes by phase. Foot rung: while the foot word plays; the gold box
// (marked rung) or the box row (unmarked): while the new word plays, and a soft pulse while he can answer; the row while he
// holds a plate (more over it). The Hebrew ladder has none of them.
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BOX_ROW_W, hoverPlate, Ladder, LADDER_CX, ladderView, nextRungY, PLATE_W, RUNG_W } from './Ladder'
import { PLATE_ASPECT } from '../Orb'
import { syllableChoice, type Choice } from '../../logic/rounds'
import { syllable } from '../../logic/content'

const c = (n: string): Choice => ({ ...syllableChoice(syllable('bet', 'chirik')), id: n, text: n, soundId: `w-${n}` })
const from = [c('s'), c('a'), c('t')]
const plates = [c('p'), c('i'), c('n')]
const view = (o: { marked: boolean; cue?: 'foot' | 'box'; phase?: 'answer' | 'question' | 'demo' }) =>
  render(<Ladder built={[c('sat')]} plates={plates} rungs={4} onPick={() => {}} phase={o.phase ?? 'answer'} dir="ltr" cue={o.cue}
    change={{ from, at: 1, marked: o.marked }} />).container
const q = (el: HTMLElement, s: string) => el.querySelector(s)

describe('the English ladder cues', () => {
  it('the foot rung glows while the foot word plays, and nothing else does', () => {
    const el = view({ marked: true, cue: 'foot', phase: 'question' })
    expect(q(el, '[data-cue-glow="foot"]')).not.toBeNull()
    expect(q(el, '[data-box-glow]')).toBeNull()
    expect(q(el, '[data-row-glow]')).toBeNull()
  })
  it('the gold box glows while the new word plays, then keeps a soft pulse while he can answer', () => {
    expect(q(view({ marked: true, cue: 'box' }), '[data-box-glow="cue"]')).not.toBeNull()
    const soft = view({ marked: true })
    expect(q(soft, '[data-box-glow="soft"]')).not.toBeNull()
    expect(q(soft, '[data-cue-glow]')).toBeNull()
    // not while the demo or the question (he cannot answer yet)
    expect(q(view({ marked: true, phase: 'question' }), '[data-box-glow]')).toBeNull()
  })
  it('an unmarked rung has no gold box: its row pulses instead', () => {
    expect(q(view({ marked: false, cue: 'box' }), '[data-row-glow="cue"]')).not.toBeNull()
    expect(q(view({ marked: false }), '[data-row-glow="soft"]')).not.toBeNull()
    expect(q(view({ marked: false }), '[data-box-glow]')).toBeNull()
  })
  it('while he holds a plate the row glows, more when the plate is over it', () => {
    const el = view({ marked: true })
    const plate = q(el, '[data-plate="i"]')!
    const row = nextRungY(1, 4)
    // (the test's svg has no layout: the stage point of a pointer is its client point)
    fireEvent.pointerDown(plate, { pointerId: 1, clientX: 1260, clientY: 600 })
    expect(q(el, '[data-row-glow="drag"]')).not.toBeNull()
    fireEvent.pointerMove(plate, { pointerId: 1, clientX: LADDER_CX, clientY: row })
    expect(q(el, '[data-row-glow="over"]')).not.toBeNull()
    fireEvent.pointerUp(plate, { pointerId: 1, clientX: LADDER_CX, clientY: row })
    expect(q(el, '[data-row-glow="over"]')).toBeNull()
  })
  it('the hovering plate (a lift, the demo) never covers the box row or the rung below it, at any rung and size', () => {
    const half = (PLATE_W * PLATE_ASPECT) / 2
    for (const size of [undefined, { w: 1024, h: 768 }, { w: 740, h: 360 }, { w: 844, h: 390 }]) {
      const v = ladderView(size)
      for (let rungs = 3; rungs <= 7; rungs++) {
        for (let built = 1; built < rungs; built++) {
          const h = hoverPlate(v, built, rungs)
          const x = h.x ?? LADDER_CX
          const plate = { l: x - (PLATE_W / 2) * h.s, r: x + (PLATE_W / 2) * h.s, t: h.y - half * h.s, b: h.y + half * h.s }
          const row = nextRungY(built, rungs)
          const things = [{ l: LADDER_CX - BOX_ROW_W / 2, r: LADDER_CX + BOX_ROW_W / 2, t: row - 48, b: row + 48 }, { l: LADDER_CX - RUNG_W / 2, r: LADDER_CX + RUNG_W / 2, t: row + 150 - half, b: row + 150 + half }]
          for (const o of things) {
            const clear = plate.r <= o.l || plate.l >= o.r || plate.b <= o.t || plate.t >= o.b
            expect(clear, `${JSON.stringify(size)} rung ${built}/${rungs}`).toBe(true)
          }
        }
      }
    }
  })
})
