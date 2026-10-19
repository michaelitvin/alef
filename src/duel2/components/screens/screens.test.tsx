import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Broom, BROOM_GLYPH_PX, BROOM_WIZARD_H } from './Broom'
import { Cauldron } from './Cauldron'
import { Ladder } from './Ladder'
import { Ghosts, GHOST_GLYPH_PX, GHOST_H } from './Ghosts'
import { Doors } from './Doors'
import { Crystal } from './Crystal'
import { item, mark, syllable } from '../../logic/content'
import { syllableChoice } from '../../logic/rounds'
import { WORDS } from '../../data/words'

const c = (i: string, m: Parameters<typeof mark>[0]) => syllableChoice(syllable(i, m))
const wave = [c('bet', 'chirik'), c('kaf', 'chirik'), c('bet', 'kamatz')]

describe('screens', () => {
  afterEach(() => vi.useRealTimers())

  it('drag released between lanes snaps to the nearest lane', () => {
    const onLane = vi.fn()
    const { container } = render(<Broom waves={[]} travelMs={5000} lane={0} onLane={onLane} phase="answer" clock={() => 0} />)
    const stage = container.querySelector('[data-stage]')!
    fireEvent.pointerDown(stage, { clientY: 250, pointerId: 1 })
    fireEvent.pointerMove(stage, { clientY: 441, pointerId: 1 })
    fireEvent.pointerUp(stage, { clientY: 441, pointerId: 1 })
    expect(onLane).toHaveBeenLastCalledWith(1)
  })
  it('tap on a lane jumps there', () => {
    const onLane = vi.fn()
    const { container } = render(<Broom waves={[]} travelMs={5000} lane={0} onLane={onLane} phase="answer" clock={() => 0} />)
    const stage = container.querySelector('[data-stage]')!
    fireEvent.pointerDown(stage, { clientY: 800, pointerId: 1 })
    fireEvent.pointerUp(stage, { clientY: 800, pointerId: 1 })
    expect(onLane).toHaveBeenLastCalledWith(2)
  })
  it('waves do not move outside the answer phase', async () => {
    vi.useFakeTimers()
    let now = 1000
    const { container } = render(<Broom waves={[{ id: 1, choices: wave, startMs: 0 }]} travelMs={5000} lane={1} onLane={() => {}} phase="mistake" clock={() => now} />)
    const x0 = container.querySelector('[data-wave="1"]')!.getAttribute('transform')
    now = 3000
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(container.querySelector('[data-wave="1"]')!.getAttribute('transform')).toBe(x0)
  })
  it('the wizard is small next to the glyphs', () => {
    expect(BROOM_WIZARD_H).toBeLessThanOrEqual(220 * 0.5 + 1)
    expect(BROOM_GLYPH_PX).toBeGreaterThan(80)
    expect(GHOST_GLYPH_PX).toBeGreaterThanOrEqual(GHOST_H * 0.25)
  })
  it('cauldron accepts a tap or a drop on the pot', () => {
    const onPick = vi.fn()
    const { container } = render(<Cauldron letter={item('mem')} orbs={[mark('kamatz'), mark('cholam'), mark('chirik')]} onPick={onPick} phase="answer" />)
    const orb = container.querySelector('[data-orb="cholam"]')!
    fireEvent.pointerDown(orb, { clientX: 800, clientY: 200, pointerId: 1 })
    fireEvent.pointerUp(orb, { clientX: 802, clientY: 201, pointerId: 1 })
    expect(onPick).toHaveBeenLastCalledWith('cholam')
    const orb2 = container.querySelector('[data-orb="kamatz"]')!
    fireEvent.pointerDown(orb2, { clientX: 450, clientY: 200, pointerId: 2 })
    fireEvent.pointerMove(orb2, { clientX: 700, clientY: 600, pointerId: 2 })
    fireEvent.pointerUp(orb2, { clientX: 800, clientY: 700, pointerId: 2 })
    expect(onPick).toHaveBeenLastCalledWith('kamatz')
  })
  it('a drag that ends away from the pot picks nothing', () => {
    const onPick = vi.fn()
    const { container } = render(<Cauldron letter={item('mem')} orbs={[mark('kamatz'), mark('cholam'), mark('chirik')]} onPick={onPick} phase="answer" />)
    const orb = container.querySelector('[data-orb="chirik"]')!
    fireEvent.pointerDown(orb, { clientX: 1150, clientY: 200, pointerId: 3 })
    fireEvent.pointerMove(orb, { clientX: 1400, clientY: 300, pointerId: 3 })
    fireEvent.pointerUp(orb, { clientX: 1450, clientY: 300, pointerId: 3 })
    expect(onPick).not.toHaveBeenCalled()
  })
  it('ladder shows the built rungs and three plates', () => {
    const { container } = render(<Ladder built={[c('lamed', 'kamatz')]} plates={[c('lamed', 'chirik'), c('lamed', 'shuruk'), c('lamed', 'segol')]} rungs={5} onPick={() => {}} phase="answer" />)
    expect(container.querySelectorAll('[data-rung]').length).toBe(1)
    expect(container.querySelectorAll('[data-plate]').length).toBe(3)
  })
  it('door syllables light right to left', () => {
    const w = WORDS.find((x) => x.id === 'tent')!
    const keys = WORDS.filter((x) => x.door).slice(0, 3)
    const { container } = render(<Doors word={w} lit={1} keys={keys} onPick={() => {}} phase="answer" opening={false} zooming={false} />)
    const syl = [...container.querySelectorAll('[data-syl]')]
    const first = syl.find((e) => e.getAttribute('data-syl') === '0')!
    const second = syl.find((e) => e.getAttribute('data-syl') === '1')!
    expect(Number(first.getAttribute('data-cx'))).toBeGreaterThan(Number(second.getAttribute('data-cx')))
    expect(first.getAttribute('data-lit')).toBe('1')
    expect(second.getAttribute('data-lit')).toBe('0')
  })
  it('door shows no speaker on the plate', () => {
    const w = WORDS.find((x) => x.id === 'tent')!
    const { container } = render(<Doors word={w} lit={2} keys={[w]} onPick={() => {}} phase="answer" opening={false} zooming={false} />)
    expect(container.querySelector('[aria-label="replay"]')).toBeNull()
  })
  it('ghosts face left', () => {
    const { container } = render(<Ghosts signs={wave} onPick={() => {}} phase="answer" />)
    const ghosts = [...container.querySelectorAll('[data-ghost]')]
    expect(ghosts.length).toBe(3)
    for (const g of ghosts) expect(g.getAttribute('data-facing')).toBe('left')
  })
  it('crystal calls onDone', async () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<Crystal kind={1} onDone={onDone} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(4000) })
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
