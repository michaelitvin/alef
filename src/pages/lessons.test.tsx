import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { NikkudNodeView } from './Nikkud/NikkudNodeView'
import { SyllableNodeView } from './Syllables/SyllableNodeView'
import { LettersPage } from './Letters/LettersPage'
import { NikkudPage } from './Nikkud/NikkudPage'
import { SyllablesPage } from './Syllables/SyllablesPage'
import { WordsPage } from './Words/WordsPage'
import { SentencesPage } from './Sentences/SentencesPage'
import { useProgressStore } from '../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'

let go: (to: string) => void = () => {}
function Nav() {
  const navigate = useNavigate()
  go = (to) => navigate(to)
  return null
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  ;(Error as unknown as { stackTraceLimit: number }).stackTraceLimit = 60
  localStorage.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE, nodes: {} })
})
afterEach(() => vi.restoreAllMocks())

describe('hooks run on every render of a node view, even for an unknown id', () => {
  it('NikkudNodeView: a valid id, then an unknown id', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <MemoryRouter initialEntries={['/nikkud/kamatz']}>
        <Nav />
        <Routes>
          <Route path="/nikkud/:nikkudId" element={<NikkudNodeView />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).not.toContain('Nikkud not found')
    act(() => go('/nikkud/nope'))
    expect(container.textContent).toContain('Nikkud not found')
    expect(err.mock.calls.flat().join(' ')).not.toMatch(/fewer hooks|order of Hooks/i)
  })

  it('SyllableNodeView: a valid id, then an unknown id', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <MemoryRouter initialEntries={['/syllables/drill-bet-all']}>
        <Nav />
        <Routes>
          <Route path="/syllables/:drillId" element={<SyllableNodeView />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).not.toContain('פעילות לא נמצאה')
    act(() => go('/syllables/nope'))
    expect(container.textContent).toContain('פעילות לא נמצאה')
    expect(err.mock.calls.flat().join(' ')).not.toMatch(/fewer hooks|order of Hooks/i)
  })
})

describe('a list page does not write the save while it renders', () => {
  const pages = [
    ['LettersPage', LettersPage, 'letters-'],
    ['NikkudPage', NikkudPage, 'nikkud-'],
    ['SyllablesPage', SyllablesPage, 'syllables-'],
    ['WordsPage', WordsPage, 'words-'],
    ['SentencesPage', SentencesPage, 'sentences-'],
  ] as const

  it.each(pages)('%s', (_name, Page, prefix) => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    // levels stay open so the page has nodes to create
    const levels = { ...useProgressStore.getState().levels }
    for (const id of ['letters', 'nikkud', 'syllables', 'words', 'sentences']) {
      levels[id] = { ...levels[id], unlocked: true }
    }
    useProgressStore.setState({ levels })
    const duringRender: string[] = []
    const unsub = useProgressStore.subscribe(() => {
      if (/renderWithHooks/.test(new Error().stack ?? '')) duringRender.push('write')
    })
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    )
    unsub()
    expect(duringRender).toEqual([])
    expect(err.mock.calls.flat().join(' ')).not.toMatch(/while rendering/i)
    // the open nodes are still created, after the render
    const keys = Object.keys(useProgressStore.getState().nodes)
    expect(keys.some((k) => k.startsWith(prefix))).toBe(true)
  })
})
