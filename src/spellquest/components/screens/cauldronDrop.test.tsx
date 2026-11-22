import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Choice } from '../../logic/rounds'
import { BOX_H, BOX_Y, CauldronWord, GAP_MARGIN, POT, TILE_X, ORB_Y, boxXs } from './Cauldron'

const part = (id: string): Choice => ({ kind: 'unit', id, text: id, soundId: `snd-${id}`, itemId: id })
const cat: Choice = { kind: 'word', id: 'cat', text: 'cat', soundId: 'w-cat', itemId: 'cat', units: ['c', 'a', 't'] }
const tiles = ['o', 'a', 'i', 'u']

function draw(over: Partial<Parameters<typeof CauldronWord>[0]> = {}) {
  const onPick = vi.fn()
  const r = render(<CauldronWord boxes={['c', 'a', 't'].map(part)} gap={1} tiles={tiles.map(part)} target={cat}
    onPick={onPick} phase="answer" dir="ltr" correct="a" {...over} />)
  return { onPick, c: r.container }
}
function drag(c: HTMLElement, id: string, to: { x: number; y: number }) {
  const tile = c.querySelector(`[data-tile="${id}"]`)!
  const from = { x: TILE_X[tiles.indexOf(id)], y: ORB_Y }
  fireEvent.pointerDown(tile, { pointerId: 1, clientX: from.x, clientY: from.y })
  fireEvent.pointerMove(tile, { pointerId: 1, clientX: to.x, clientY: to.y })
  fireEvent.pointerUp(tile, { pointerId: 1, clientX: to.x, clientY: to.y })
}
const gapX = boxXs(3).xs[1]
const onGap = { x: gapX, y: BOX_Y }
const onPot = { x: POT.x, y: POT.top + 100 }

describe('the English cauldron: a drop on the empty box', () => {
  it('answers like a drop on the pot, right or wrong', () => {
    for (const id of ['a', 'o']) {
      const pot = draw(); drag(pot.c, id, onPot)
      const gap = draw(); drag(gap.c, id, onGap)
      expect(pot.onPick).toHaveBeenCalledWith(id)
      expect(gap.onPick.mock.calls).toEqual(pot.onPick.mock.calls)
      pot.c.remove(); gap.c.remove()
    }
  })
  it('counts in the margin around the box, not beyond it', () => {
    const w = boxXs(3).w
    const near = draw(); drag(near.c, 'a', { x: gapX + w / 2 + GAP_MARGIN - 5, y: BOX_Y + BOX_H / 2 + GAP_MARGIN - 5 })
    expect(near.onPick).toHaveBeenCalledWith('a')
    const far = draw(); drag(far.c, 'a', { x: gapX + w / 2 + GAP_MARGIN + 20, y: BOX_Y })
    expect(far.onPick).not.toHaveBeenCalled()
  })
  it('answers in the fix flow after a mistake (the marked right tile)', () => {
    const { c, onPick } = draw({ phase: 'mistake', reveal: { right: 'a', wrong: 'o' } })
    drag(c, 'a', onGap)
    expect(onPick).toHaveBeenCalledWith('a')
  })
  it('a drop elsewhere does nothing', () => {
    const { c, onPick } = draw()
    drag(c, 'a', { x: 200, y: 700 })
    drag(c, 'a', { x: boxXs(3).xs[0], y: BOX_Y })
    expect(onPick).not.toHaveBeenCalled()
  })
  it('the pot still works while the box is empty', () => {
    const { c, onPick } = draw({ phase: 'answer' })
    drag(c, 'i', onPot)
    expect(onPick).toHaveBeenCalledWith('i')
  })
})
