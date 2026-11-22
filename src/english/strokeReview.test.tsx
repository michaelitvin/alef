// The English page's stroke review and its drawing board (Task 28): the Latin letters on four lines, the alphabet choice
// beside the script, the marks in the English save; the Latin board draws four lines and a box for each letter.
import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { CourseProvider } from '../spellquest/course/CourseContext'
import { Strokes } from '../spellquest/screens/Strokes'
import { Draw } from '../spellquest/components/screens/Draw'
import { drawLayout, latinLayout } from '../spellquest/logic/drawLayout'
import { strokesOf } from '../spellquest/data/strokes'
import type { DrawView } from '../spellquest/controller'
import { useDuel2Store } from '../spellquest/store'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { LATIN_STROKES, latinStrokesOf } from './data/strokes'
import { useEnglishStore } from './store'
import { ENGLISH_FRESH } from './saveFormat'

installFakeAudio()

describe('the English stroke review', () => {
  afterEach(() => { useEnglishStore.setState({ ...ENGLISH_FRESH } as never) })

  it('lists the 52 Latin letters on four lines (no Hebrew letter), and keeps the marks in the English save', () => {
    const before = useDuel2Store.getState().strokeMarks
    const { container } = render(<CourseProvider value={ENGLISH}><Strokes onBack={() => {}} /></CourseProvider>)
    expect(container.querySelectorAll('[data-latin] [data-stroke-card]').length).toBe(LATIN_STROKES.length)
    expect(container.querySelectorAll('[data-stroke-card="a-latin"] svg[data-variant]').length).toBe(2)
    expect(container.querySelectorAll('[data-stroke-card="g-latin"] svg[data-variant="1"] line[data-line]').length).toBe(4)
    fireEvent.click(container.querySelector('[data-stroke-card="a-latin"] [data-mark-ok]')!)
    expect(useEnglishStore.getState().strokeMarks['a-latin']).toBe('ok')
    expect(useDuel2Store.getState().strokeMarks).toBe(before)
    expect(container.querySelector('[data-reviewed]')!.textContent).toMatch(/1 of 52/)
    // no Hebrew letter, and no choice of one
    expect(container.querySelectorAll('[data-stroke-card]').length).toBe(LATIN_STROKES.length)
    expect(container.querySelector('[data-stroke-card$="-print"]')).toBeNull()
    expect(container.textContent).not.toMatch(/Handwriting|Hebrew/)
  }, 30_000)

  it('the Hebrew page reviews the Hebrew letters only', () => {
    const { container } = render(<Strokes onBack={() => {}} />)
    expect(container.querySelector('[data-latin]')).toBeNull()
    expect(container.querySelector('[data-stroke-card$="-latin"]')).toBeNull()
  })
})

describe('the Latin drawing board', () => {
  it('draws the four lines and a box for each letter of a whole word', () => {
    const W = ENGLISH.writing!
    const letters = ['p', 'i', 'n']
    const layout = latinLayout({ defs: letters.map(latinStrokesOf), rest: '', capital: false, lines: W.lines, font: W.font, unitEm: W.unitEm, em: W.em })
    const view: DrawView = { screen: 'draw', word: { id: 'pin' }, script: 'print', letter: 'p', layout, marks: [], strokes: [], mode: 'letter', alphabet: 'latin', letters, box: 0 }
    const { container } = render(<CourseProvider value={ENGLISH}><Draw view={view} phase="answer" onStroke={() => {}} /></CourseProvider>)
    expect(container.querySelector('[data-lines][data-four]')!.querySelectorAll('line').length).toBe(4)
    expect(container.querySelectorAll('[data-slot]').length).toBe(3)
    // no picture file: no picture frame
    expect(container.querySelector('[data-picture]')).toBeNull()
    // the start dot of p's first stroke, in the first box
    const dot = container.querySelector('[data-start-dot]')!
    const [sx, sy] = latinStrokesOf('p').variants[0][0].pts[0]
    expect(Number(dot.getAttribute('cx'))).toBeCloseTo(layout.x0 + sx * layout.u)
    expect(Number(dot.getAttribute('cy'))).toBeCloseTo(layout.top + sy * layout.u)
    // in the second box once he writes it (the i), and gone while he draws the letter
    const second = { ...view, letter: 'i', box: 1, strokes: [{ id: 1, pts: [[0.1, 0.4], [0.1, 1]] as [number, number][], state: 'ok' as const, box: 0 }] }
    const r2 = render(<CourseProvider value={ENGLISH}><Draw view={second} phase="answer" onStroke={() => {}} /></CourseProvider>)
    const [ix, iy] = latinStrokesOf('i').variants[0][0].pts[0]
    expect(Number(r2.container.querySelector('[data-start-dot]')!.getAttribute('cx'))).toBeCloseTo(layout.x0 + (ix + layout.boxes![1].dx) * layout.u)
    expect(Number(r2.container.querySelector('[data-start-dot]')!.getAttribute('cy'))).toBeCloseTo(layout.top + iy * layout.u)
    const drawing = { ...second, strokes: [...second.strokes, { id: 2, pts: [[0.8, 0.4], [0.8, 0.7]] as [number, number][], state: 'pending' as const, box: 1 }] }
    const r3 = render(<CourseProvider value={ENGLISH}><Draw view={drawing} phase="answer" onStroke={() => {}} /></CourseProvider>)
    expect(r3.container.querySelector('[data-start-dot]')).toBeNull()
  })

  it('the Hebrew board has no start dot', () => {
    const def = strokesOf('ב', 'print')
    const layout = drawLayout({ letter: 'ב', vav: false, rest: 'ית', script: 'print', def, marksAbove: false, marksUnder: false }, () => null)
    const view: DrawView = { screen: 'draw', word: { id: 'house' }, script: 'print', letter: 'ב', layout, marks: [], strokes: [], mode: 'letter' }
    const { container } = render(<Draw view={view} phase="answer" onStroke={() => {}} />)
    expect(container.querySelector('[data-slot]')).not.toBeNull()
    expect(container.querySelector('[data-start-dot]')).toBeNull()
  })
})
