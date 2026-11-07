import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Draw } from './Draw'
import { penAt } from '../StrokeAnim'
import type { DrawView } from '../../controller'
import { WORDS } from '../../data/words'
import { strokesOf } from '../../data/strokes'
import { drawLayout, strokeTiming } from '../../logic/drawLayout'
import { marksFor, splitWord } from '../../logic/draw'

function view(id: string, script: 'print' | 'hand', p: Partial<DrawView> = {}): DrawView {
  const word = WORDS.find((w) => w.id === id)!
  const sp = splitWord(word, script)
  const def = strokesOf(sp.letter, script)
  const marks = marksFor(word, 2)
  return { screen: 'draw', word, script, letter: sp.letter, marks, strokes: [], mode: 'letter',
    layout: drawLayout({ ...sp, script, def, marksAbove: false, marksUnder: true }), ...p }
}
const noText = (root: Element) => {
  const c = root.cloneNode(true) as Element
  c.querySelectorAll('[data-glyph]').forEach((e) => e.remove())
  return c.textContent?.replace(/\s+/g, '') ?? ''
}

describe('drawing screen', () => {
  it('shows the picture, the lines, the slot and the rest of the word; no text but the learning glyphs', () => {
    const { container } = render(<Draw view={view('fox', 'print')} phase="answer" onStroke={() => {}} />)
    expect(container.querySelector('[data-picture]')).not.toBeNull()
    expect(container.querySelectorAll('[data-lines] line').length).toBe(4)
    expect(container.querySelector('[data-slot]')!.getAttribute('class')).toMatch(/pulse/)
    expect(container.querySelector('[data-vav]')).not.toBeNull()
    expect(noText(container)).toBe('')
  })
  it('a finger stroke on the board reaches the game in letter units', () => {
    const onStroke = vi.fn()
    const v = view('camel', 'print')
    const { container } = render(<Draw view={v} phase="answer" onStroke={onStroke} />)
    const pad = container.querySelector('[data-draw-pad]')!
    const L = v.layout
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: L.x0, clientY: L.top })
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: L.x0 + L.u, clientY: L.top })
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: L.x0 + L.u, clientY: L.top + L.u })
    fireEvent.pointerUp(pad, { pointerId: 1, clientX: L.x0 + L.u, clientY: L.top + L.u })
    expect(onStroke).toHaveBeenCalledTimes(1)
    const pts = onStroke.mock.calls[0][0]
    expect(pts[0][0]).toBeCloseTo(0)
    expect(pts[2][1]).toBeCloseTo(1)
  })
  it('the slot stops pulsing once his finger is down, and after his first stroke', () => {
    const { container, rerender } = render(<Draw view={view('camel', 'print')} phase="answer" onStroke={() => {}} />)
    const pad = container.querySelector('[data-draw-pad]')!
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 500, clientY: 400 })
    expect(container.querySelector('[data-slot]')!.getAttribute('class') ?? '').not.toMatch(/pulse/)
    fireEvent.pointerUp(pad, { pointerId: 1, clientX: 600, clientY: 400 })
    rerender(<Draw view={view('camel', 'print', { strokes: [{ id: 1, pts: [[0, 0], [1, 0]], state: 'ok' }] })} phase="answer" onStroke={() => {}} />)
    expect(container.querySelector('[data-slot]')!.getAttribute('class') ?? '').not.toMatch(/pulse/)
  })
  it('a stroke cut off because the hand or the voice began fades out instead of vanishing', () => {
    const onStroke = vi.fn()
    const v = view('camel', 'print')
    const { container, rerender } = render(<Draw view={v} phase="answer" onStroke={onStroke} />)
    const pad = container.querySelector('[data-draw-pad]')!
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 500, clientY: 400 })
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 560, clientY: 450 })
    rerender(<Draw view={v} phase="feedback" onStroke={onStroke} />)
    fireEvent.pointerUp(container.querySelector('[data-draw-pad]')!, { pointerId: 1, clientX: 600, clientY: 500 })
    expect(onStroke).not.toHaveBeenCalled()
    expect(container.querySelector('[data-discarded]')!.getAttribute('class')).toMatch(/fade/)
  })
  it('no strokes while the hand shows or the voice speaks', () => {
    const onStroke = vi.fn()
    const { container } = render(<Draw view={view('camel', 'print')} phase="feedback" onStroke={onStroke} />)
    const pad = container.querySelector('[data-draw-pad]')!
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 500, clientY: 400 })
    fireEvent.pointerUp(pad, { pointerId: 1, clientX: 600, clientY: 400 })
    expect(onStroke).not.toHaveBeenCalled()
  })
  it('his strokes: gold when right, fading when wrong; the demo shows the hand', () => {
    const v = view('camel', 'print', {
      strokes: [{ id: 1, pts: [[0, 0], [1, 0]], state: 'ok' }, { id: 2, pts: [[0, 0], [0, 1]], state: 'wrong' }],
      demo: { id: 1, strokes: [[[0, 0], [1, 1]]] },
    })
    const { container } = render(<Draw view={v} phase="feedback" onStroke={() => {}} />)
    expect(container.querySelector('[data-stroke="ok"]')!.getAttribute('stroke')).toBe('#ffd34d')
    expect(container.querySelector('[data-stroke="wrong"]')!.closest('g')!.getAttribute('class')).toMatch(/fade/)
    expect(container.querySelector('[data-demo-hand]')).not.toBeNull()
  })
  it('the line feedback glows the part outside the lines', () => {
    const v = view('camel', 'print', { strokes: [{ id: 1, pts: [[0, -0.5], [0, 1]], state: 'ok' }], lineFx: { kind: 'tall', outside: { from: -Infinity, to: 0 } } })
    const { container } = render(<Draw view={v} phase="feedback" onStroke={() => {}} />)
    expect(container.querySelector('[data-linefx="tall"] clipPath rect')).not.toBeNull()
  })
  it('handwriting shows the word in the handwriting font', () => {
    const { container } = render(<Draw view={view('camel', 'hand')} phase="answer" onStroke={() => {}} />)
    expect((container.querySelector('[data-word] text') as SVGTextElement).style.fontFamily).toMatch(/Dana Yad/)
  })
  it('the hand follows the pen: along a stroke, then glides to the next one', () => {
    const s = [[[0, 0], [1, 0]], [[0, 1], [1, 1]]] as [number, number][][]
    const t = strokeTiming(s)
    const mid = penAt(s, t.start[0] + t.dur[0] / 2)
    expect(mid.tip[0]).toBeCloseTo(0.5, 1)
    expect(mid.pressing).toBe(true)
    const gap = penAt(s, t.start[1] - 1)
    expect(gap.pressing).toBe(false)
    expect(gap.drawn).toEqual([1, 0])
  })
})
