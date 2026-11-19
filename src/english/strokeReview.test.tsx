// The English page's stroke review and its drawing board (Task 28): the Latin letters on four lines, the alphabet choice
// beside the script, the marks in the English save; the Latin board draws four lines and a box for each letter.
import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { CourseProvider } from '../duel2/course/CourseContext'
import { Strokes } from '../duel2/screens/Strokes'
import { Draw } from '../duel2/components/screens/Draw'
import { latinLayout } from '../duel2/logic/drawLayout'
import type { DrawView } from '../duel2/controller'
import { useDuel2Store } from '../duel2/store'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { LATIN_STROKES, latinStrokesOf } from './data/strokes'
import { useEnglishStore } from './store'
import { ENGLISH_FRESH } from './saveFormat'

installFakeAudio()

describe('the English stroke review', () => {
  afterEach(() => { useEnglishStore.setState({ ...ENGLISH_FRESH } as never) })

  it('lists the 52 Latin letters on four lines, keeps the marks in the English save, and has the alphabet choice', () => {
    const before = useDuel2Store.getState().strokeMarks
    const { container, getByText } = render(<CourseProvider value={ENGLISH}><Strokes onBack={() => {}} /></CourseProvider>)
    expect(container.querySelectorAll('[data-latin] [data-stroke-card]').length).toBe(LATIN_STROKES.length)
    expect(container.querySelectorAll('[data-stroke-card="a-latin"] svg[data-variant]').length).toBe(2)
    expect(container.querySelectorAll('[data-stroke-card="g-latin"] svg[data-variant="1"] line[data-line]').length).toBe(4)
    fireEvent.click(container.querySelector('[data-stroke-card="a-latin"] [data-mark-ok]')!)
    expect(useEnglishStore.getState().strokeMarks['a-latin']).toBe('ok')
    expect(useDuel2Store.getState().strokeMarks).toBe(before)
    expect(container.querySelector('[data-reviewed]')!.textContent).toMatch(/1 of 52/)
    // the Hebrew letters are a choice away (their own count)
    fireEvent.click(getByText('Hebrew'))
    expect(container.querySelector('[data-latin]')).toBeNull()
    expect(container.querySelectorAll('[data-stroke-card]').length).toBeGreaterThan(0)
    expect(container.querySelector('[data-reviewed]')!.textContent).toMatch(/0 of/)
  }, 30_000)

  it('the Hebrew page has no alphabet choice', () => {
    const { container } = render(<Strokes onBack={() => {}} />)
    expect(container.querySelector('[data-alphabet]')).toBeNull()
    expect(container.querySelector('[data-latin]')).toBeNull()
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
  })
})
