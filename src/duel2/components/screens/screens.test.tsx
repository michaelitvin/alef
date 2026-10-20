import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Broom, BROOM_GLYPH_PX, BROOM_WIZARD_H, BROOM_ORB, orbX, wizardBox } from './Broom'
import { MistakeFx } from '../MistakeFx'
import { Stage } from './Stage'
import { CATCH_AT, PASS_AT } from '../../logic/run'
import { Cauldron } from './Cauldron'
import { Ladder, plateYs } from './Ladder'
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
  it('dragging into a lane tells the game at once', () => {
    const onLane = vi.fn()
    const { container } = render(<Broom waves={[]} travelMs={5000} lane={1} onLane={onLane} phase="answer" clock={() => 0} />)
    const stage = container.querySelector('[data-stage]')!
    fireEvent.pointerDown(stage, { clientY: 470, pointerId: 1 })
    fireEvent.pointerMove(stage, { clientY: 200, pointerId: 1 })
    expect(onLane).toHaveBeenLastCalledWith(0)
  })
  it('the demo moves the cauldron orb with the hand', () => {
    const { container } = render(<Cauldron letter={item('mem')} orbs={[mark('kamatz'), mark('cholam'), mark('chirik')]} onPick={() => {}} phase="demo" demo={{ id: 'cholam', t: 1 }} />)
    const img = container.querySelector('[data-orb="cholam"] image')!
    const cx = Number(img.getAttribute('x')) + Number(img.getAttribute('width')) / 2
    const cy = Number(img.getAttribute('y')) + Number(img.getAttribute('height')) / 2
    expect(cx).toBeCloseTo(800, 0)
    expect(cy).toBeGreaterThan(600)
  })
  it('tap on a lane jumps there', () => {
    const onLane = vi.fn()
    const { container } = render(<Broom waves={[]} travelMs={5000} lane={0} onLane={onLane} phase="answer" clock={() => 0} />)
    const stage = container.querySelector('[data-stage]')!
    fireEvent.pointerDown(stage, { clientY: 800, pointerId: 1 })
    fireEvent.pointerUp(stage, { clientY: 800, pointerId: 1 })
    expect(onLane).toHaveBeenLastCalledWith(2)
  })
  it('the orbs of a wave fly popcorn style, not in a column', () => {
    const w = { id: 1, choices: wave, startMs: 0, offsets: [0, 0.2, 0.1], jitter: [-20, 25, 0], resolved: [false, false, false] }
    const { container } = render(<Broom waves={[w]} travelMs={5000} lane={1} onLane={() => {}} phase="mistake" clock={() => 1000} />)
    const xs = [...container.querySelectorAll('[data-wave="1"] [data-orb-i]')].map((e) => e.getAttribute('transform'))
    expect(new Set(xs).size).toBe(3)
  })
  it('a resolved orb leaves the sky', () => {
    const w = { id: 1, choices: wave, startMs: 0, offsets: [0, 0, 0], jitter: [0, 0, 0], resolved: [true, false, false] }
    const { container } = render(<Broom waves={[w]} travelMs={5000} lane={1} onLane={() => {}} phase="answer" clock={() => 1000} />)
    expect(container.querySelectorAll('[data-wave="1"] [data-orb-i]').length).toBe(2)
  })
  it('a missed target does not make the wizard dizzy', () => {
    const { container } = render(<Broom waves={[]} travelMs={5000} lane={1} onLane={() => {}} phase="mistake" missed clock={() => 0} />)
    expect(container.querySelector('[data-wizard] image')!.getAttribute('href')).not.toMatch(/s-wizard-dizzy/)
  })
  it('a missed target shows a soft flash and no shake', () => {
    const { container } = render(<MistakeFx active kind="miss" />)
    expect(container.querySelector('.d2-flash-miss')).not.toBeNull()
    expect(container.querySelector('.d2-flash-red')).toBeNull()
  })
  it('a mistake makes the wizard dizzy', () => {
    const { container } = render(<Broom waves={[]} travelMs={5000} lane={1} onLane={() => {}} phase="mistake" clock={() => 0} />)
    expect(container.querySelector('[data-wizard] image')!.getAttribute('href')).toMatch(/s-wizard-dizzy/)
  })
  it('a mistake shakes the screen and flashes red', () => {
    const { container, rerender } = render(<MistakeFx active={false} />)
    expect(container.querySelector('.d2-flash-red')).toBeNull()
    rerender(<MistakeFx active />)
    expect(container.querySelector('.d2-flash-red')).not.toBeNull()
  })
  it('waves do not move outside the answer phase', async () => {
    vi.useFakeTimers()
    let now = 1000
    const { container } = render(<Broom waves={[{ id: 1, choices: wave, startMs: 0, offsets: [0, 0, 0], jitter: [0, 0, 0], resolved: [false, false, false] }]} travelMs={5000} lane={1} onLane={() => {}} phase="mistake" clock={() => now} />)
    const x0 = container.querySelector('[data-wave="1"]')!.getAttribute('transform')
    now = 3000
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(container.querySelector('[data-wave="1"]')!.getAttribute('transform')).toBe(x0)
  })
  it('a wave resolves when its orbs touch the wizard', () => {
    const w = wizardBox()
    const x = orbX(CATCH_AT)
    expect(x - BROOM_ORB / 2).toBeLessThanOrEqual(w.right)
    expect(x).toBeGreaterThan(w.left + w.width / 2)
  })
  it('the target counts as missed only once its centre is past the back of the wizard', () => {
    expect(orbX(PASS_AT)).toBeLessThanOrEqual(wizardBox().left)
    expect(orbX(PASS_AT)).toBeGreaterThan(wizardBox().left - BROOM_ORB / 2)
  })
  it('the background covers screens wider or taller than the stage', () => {
    const { container } = render(<Stage bg="bg-sky"><g /></Stage>)
    const svg = container.querySelector('svg[data-stage]')!
    expect(svg.getAttribute('overflow')).toBe('visible')
    const xs = [...svg.querySelectorAll('[data-bg-tile]')].map((e) => Number(e.getAttribute('data-x')))
    const ys = [...svg.querySelectorAll('[data-bg-tile]')].map((e) => Number(e.getAttribute('data-y')))
    expect(Math.min(...xs)).toBeLessThan(0)
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(1600)
    expect(Math.min(...ys)).toBeLessThan(0)
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(900)
  })
  it('the lane bands reach the screen edges', () => {
    const { container } = render(<Broom waves={[]} travelMs={5000} lane={1} onLane={() => {}} phase="answer" clock={() => 0} />)
    for (const b of container.querySelectorAll('[data-lane-band]')) {
      expect(Number(b.getAttribute('x'))).toBeLessThan(0)
      expect(Number(b.getAttribute('width'))).toBeGreaterThan(1600 * 2)
    }
    expect(container.querySelectorAll('[data-lane-band]').length).toBe(3)
  })
  it('the flying wizard is big enough to see and small enough to dodge', () => {
    expect(BROOM_WIZARD_H).toBeGreaterThanOrEqual(140)
    expect(BROOM_WIZARD_H).toBeLessThanOrEqual(220 * 0.75)
  })
  it('the glyphs are large', () => {
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
  it('the cauldron stage keeps the finger for the drag (the browser does not pan and cancel it)', () => {
    // touch-action on an inner SVG group is ignored by the browser: it must sit on the stage
    const { container } = render(<Cauldron letter={item('mem')} orbs={[mark('kamatz'), mark('cholam'), mark('chirik')]} onPick={() => {}} phase="answer" />)
    expect((container.querySelector('[data-stage]') as SVGElement).style.touchAction).toBe('none')
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
  it('ladder plates never overlap, on every rung', () => {
    for (let built = 0; built < 5; built++) {
      const ys = [...plateYs(built, 5)].sort((a, b) => a - b)
      expect(ys[1] - ys[0], `rung ${built}`).toBeGreaterThanOrEqual(160)
      expect(ys[2] - ys[1], `rung ${built}`).toBeGreaterThanOrEqual(160)
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(150)
      expect(Math.max(...ys)).toBeLessThanOrEqual(820)
    }
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
  it('the picture sits in the key handle', () => {
    const w = WORDS.find((x) => x.id === 'tent')!
    const { container } = render(<Doors word={w} lit={2} keys={[w]} onPick={() => {}} phase="answer" opening={false} zooming={false} />)
    const key = container.querySelector('[data-key]')!
    const pic = key.querySelector('[data-key-picture]')!
    const disc = key.querySelector('[data-key-disc]')!
    expect(Number(pic.getAttribute('x')) + Number(pic.getAttribute('width')) / 2).toBeCloseTo(Number(disc.getAttribute('cx')))
    expect(Number(pic.getAttribute('y')) + Number(pic.getAttribute('height')) / 2).toBeCloseTo(Number(disc.getAttribute('cy')))
  })
  it('door shows no speaker on the plate', () => {
    const w = WORDS.find((x) => x.id === 'tent')!
    const { container } = render(<Doors word={w} lit={2} keys={[w]} onPick={() => {}} phase="answer" opening={false} zooming={false} />)
    expect(container.querySelector('[aria-label="replay"]')).toBeNull()
  })
  it('choices stay visible during the question but do not answer yet', () => {
    const onPick = vi.fn()
    const { container } = render(<Ghosts signs={wave} onPick={onPick} phase="question" />)
    expect(container.querySelector('.d2-pick-off')).toBeNull()
    fireEvent.pointerDown(container.querySelector('[data-pick]')!)
    expect(onPick).not.toHaveBeenCalled()
    const l = render(<Ladder built={[]} plates={wave} rungs={5} onPick={onPick} phase="demo" />)
    expect(l.container.querySelector('.d2-pick-off')).toBeNull()
    const w = WORDS.find((x) => x.id === 'tent')!
    const d = render(<Doors word={w} lit={2} keys={[w]} onPick={onPick} phase="question" opening={false} zooming={false} />)
    expect(d.container.querySelector('[data-key] .d2-key')!.getAttribute('opacity')).toBe('1')
    fireEvent.pointerDown(d.container.querySelector('[data-key]')!)
    fireEvent.pointerUp(d.container.querySelector('[data-key]')!)
    expect(onPick).not.toHaveBeenCalled()
  })
  it('a ladder plate can be dragged onto the next rung, or tapped', () => {
    const onPick = vi.fn()
    const { container } = render(<Ladder built={[]} plates={wave} rungs={5} onPick={onPick} phase="answer" />)
    const ys = plateYs(0, 5)
    const pl = container.querySelector(`[data-plate="${wave[1].id}"]`)!
    fireEvent.pointerDown(pl, { clientX: 1260, clientY: ys[1], pointerId: 1 })
    fireEvent.pointerMove(pl, { clientX: 1000, clientY: 790, pointerId: 1 })
    expect(pl.getAttribute('transform')).toMatch(/translate/)
    fireEvent.pointerUp(pl, { clientX: 800, clientY: 790, pointerId: 1 })
    expect(onPick).toHaveBeenLastCalledWith(wave[1].id)
    const p0 = container.querySelector(`[data-plate="${wave[0].id}"]`)!
    fireEvent.pointerDown(p0, { clientX: 1260, clientY: ys[0], pointerId: 2 })
    fireEvent.pointerUp(p0, { clientX: 1261, clientY: ys[0], pointerId: 2 })
    expect(onPick).toHaveBeenLastCalledWith(wave[0].id)
  })
  it('a ladder plate dropped away from the ladder picks nothing', () => {
    const onPick = vi.fn()
    const { container } = render(<Ladder built={[]} plates={wave} rungs={5} onPick={onPick} phase="answer" />)
    const pl = container.querySelector(`[data-plate="${wave[2].id}"]`)!
    fireEvent.pointerDown(pl, { clientX: 1260, clientY: 600, pointerId: 3 })
    fireEvent.pointerMove(pl, { clientX: 1450, clientY: 200, pointerId: 3 })
    fireEvent.pointerUp(pl, { clientX: 1450, clientY: 200, pointerId: 3 })
    expect(onPick).not.toHaveBeenCalled()
  })
  it('a key can be dragged onto the door, or tapped', () => {
    const onPick = vi.fn()
    const w = WORDS.find((x) => x.id === 'tent')!
    const keys = WORDS.filter((x) => x.door).slice(0, 3)
    const { container } = render(<Doors word={w} lit={2} keys={keys} onPick={onPick} phase="answer" opening={false} zooming={false} />)
    const k = container.querySelectorAll('[data-key]')[2]
    fireEvent.pointerDown(k, { clientX: 1080, clientY: 690, pointerId: 4 })
    fireEvent.pointerMove(k, { clientX: 900, clientY: 450, pointerId: 4 })
    fireEvent.pointerUp(k, { clientX: 800, clientY: 400, pointerId: 4 })
    expect(onPick).toHaveBeenLastCalledWith(keys[2].id)
    const k0 = container.querySelectorAll('[data-key]')[0]
    fireEvent.pointerDown(k0, { clientX: 520, clientY: 690, pointerId: 5 })
    fireEvent.pointerUp(k0, { clientX: 520, clientY: 690, pointerId: 5 })
    expect(onPick).toHaveBeenLastCalledWith(keys[0].id)
  })
  it('the ladder and door demos move the plate and the key with the hand', () => {
    const l = render(<Ladder built={[]} plates={wave} rungs={5} onPick={() => {}} phase="demo" demo={{ id: wave[1].id, t: 1 }} />)
    expect(l.container.querySelector(`[data-plate="${wave[1].id}"]`)!.getAttribute('transform')).toMatch(/translate\(-460/)
    const w = WORDS.find((x) => x.id === 'tent')!
    const d = render(<Doors word={w} lit={2} keys={[w]} onPick={() => {}} phase="demo" opening={false} zooming={false} demo={{ id: w.id, t: 1 }} />)
    expect(d.container.querySelector('[data-key]')!.getAttribute('transform')).toMatch(/translate/)
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
