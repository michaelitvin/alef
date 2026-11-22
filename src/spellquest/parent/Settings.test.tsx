// Spell Quest's section in the parent area (moved from the old parent screen's test and the first duel's stats card's test):
// the placement control, the stage line, drawing, the shopping range and money, the first duel's history, the flight
// speed, the export, the developer screens and the reset of Spell Quest only.
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SpellQuestSettings from './Settings'
import SpellQuestDevTools from './DevTools'
import { spellQuestParent } from '.'
import { useSpellQuestStore } from '../store'
import { flightPace } from '../logic/run'
import { spellQuestTelemetry } from '../telemetry'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'

const section = () => render(<SpellQuestSettings goTo={() => {}} />)

describe('Book 2\'s section in the parent area', () => {
  beforeEach(() => { useProgressStore.setState({ ...INITIAL_PROGRESS_STATE }) })
  afterEach(() => vi.restoreAllMocks())

  it('“already knows nikkud”: the parent opens Book 2 at stage 0 (logged); the switch shows only while the book is closed', () => {
    useSpellQuestStore.getState().resetProgress()
    useSpellQuestStore.setState({ screensOpen: false })
    const track = vi.spyOn(spellQuestTelemetry, 'track')
    const { container } = section()
    const box = container.querySelector('[data-open-book] [data-setting-open-book]') as HTMLInputElement
    expect(box).not.toBeNull()
    fireEvent.click(box)
    expect(useSpellQuestStore.getState().screensOpen).toBe(true)
    expect(track).toHaveBeenCalledWith('book-open', expect.objectContaining({ by: 'parent' }))
    expect(container.querySelector('[data-setting-open-book]')).toBeNull()
    expect(container.querySelector('[data-stage-line]')!.textContent).toMatch(/^Stage 1/)
  })

  it('the stage line says stage 0 (the tower) before Book 2 opens', () => {
    useSpellQuestStore.setState({ screensOpen: false })
    const { container, unmount } = section()
    expect(container.querySelector('[data-stage-line]')!.textContent).toMatch(/^Stage 0: the tower/)
    unmount()
    useSpellQuestStore.setState({ screensOpen: true })
    const r = section()
    expect(r.container.querySelector('[data-stage-line]')!.textContent).toMatch(/^Stage 1/)
  })

  it('the first duel’s history: sessions, minutes, best score, best wave, and a row per mark played, most misses first', () => {
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE, tower: { ...INITIAL_PROGRESS_STATE.tower, sessions: 7, bestScore: 4321, bestWave: 9, roundsMs: 180_000,
      byMark: { kamatz: { seen: 30, correct: 20, wrong: 4, timeout: 2, twin: 1, mega: 4 }, segol: { seen: 10, correct: 2, wrong: 6, timeout: 2, twin: 0, mega: 0 } } } })
    const { container } = section()
    expect(container.querySelector('[data-duel-best]')!.textContent).toBe('4321')
    expect(container.querySelector('[data-duel-wave]')!.textContent).toBe('9')
    expect(container.querySelector('[data-duel-sessions]')!.textContent).toBe('7')
    expect(container.querySelector('[data-duel-minutes]')!.textContent).toBe('3')
    const marks = [...container.querySelectorAll('[data-duel-mark]')].map((r) => r.getAttribute('data-duel-mark'))
    expect(marks).toEqual(['segol', 'kamatz'])
    const row = container.querySelector('[data-duel-mark="kamatz"]')!
    expect([...row.querySelectorAll('td')].slice(1).map((td) => td.textContent)).toEqual(['30', '67%', '4', '2', '1', '4'])
  })

  it('the first duel’s screens table: twin and lightning columns, no row for the dropped picture screen', () => {
    const st = useProgressStore.getState()
    st.recordTowerRound('kamatz', 'C', 'correct', 1000)
    st.recordTowerTwin('kamatz', 'C')
    st.recordTowerRound('chirik', 'D', 'mega', 1000)
    const { container } = section()
    expect(container.querySelector('[data-duel-mark="kamatz"] [data-col="twin"]')!.textContent).toBe('1')
    expect(container.querySelector('[data-duel-mark="chirik"] [data-col="mega"]')!.textContent).toBe('1')
    expect(container.querySelector('[data-duel-mark="chirik"] [data-col="correct"]')!.textContent).toBe('0%')
    expect(container.querySelector('[data-duel-type="C"] [data-col="twin"]')!.textContent).toBe('1')
    expect(container.querySelector('[data-duel-type="D"]')).toBeNull()
  })

  it('has no export of its own: Book 2’s telemetry and the first duel’s history link to the Data section', () => {
    const goTo = vi.fn()
    const { container } = render(<SpellQuestSettings goTo={goTo} />)
    expect(screen.queryByText('Export telemetry')).toBeNull()
    expect(container.querySelector('[data-duel-export]')).toBeNull()
    const links = container.querySelectorAll('[data-goto-data]')
    expect(links).toHaveLength(2)
    links.forEach((l) => fireEvent.click(l))
    expect(goTo.mock.calls).toEqual([['data'], ['data']])
  })

  it('shows the flight speed this device has learned, and can reset it (it adapts per device)', () => {
    useSpellQuestStore.setState({ pace: 0.85 })
    const { container } = section()
    expect(container.querySelector('[data-pace]')!.textContent).toMatch(/0\.85/)
    // the rule as the flight applies it (flightPace): a catch 1% faster, a mistake 4% slower
    const text = container.querySelector('[data-pace]')!.parentElement!.textContent!
    expect(text).toMatch(/a mistake 4% slower/)
    expect(flightPace(1, 'miss')).toBeCloseTo(1.04)
    expect(flightPace(1, 'catch')).toBeCloseTo(0.99)
    fireEvent.click(screen.getByText('Reset flight speed'))
    expect(useSpellQuestStore.getState().pace).toBe(1)
  })

  it('the parent can turn the drawing screens off and on here (logged); the stroke count and a link to the stroke review', () => {
    useSpellQuestStore.getState().setSettings({ drawing: false })
    useSpellQuestStore.setState({ strokeMarks: { 'ד-print': 'ok' } })
    const track = vi.spyOn(spellQuestTelemetry, 'track')
    const goTo = vi.fn()
    const { container } = render(<SpellQuestSettings goTo={goTo} />)
    const box = container.querySelector('input[data-setting-drawing]') as HTMLInputElement
    expect(box.checked).toBe(false)
    fireEvent.click(box)
    expect(useSpellQuestStore.getState().settings.drawing).toBe(true)
    expect(track).toHaveBeenCalledWith('settings', { keys: ['drawing'], drawing: true })
    expect(container.querySelector('[data-stroke-count]')!.textContent).toBe('1')
    fireEvent.click(container.querySelector('[data-goto-dev]')!)
    expect(goTo).toHaveBeenCalledWith('developer')
  })

  it('sets the number range (logged) and shows the money section', () => {
    useSpellQuestStore.setState({ merchant: { visits: 5, purchases: 3, declines: 2, short: 4, over: 1, hints: 6, level: 1, demoSeen: true, undoShown: true, cleanRow: 0, hintRow: 0 } })
    const track = vi.spyOn(spellQuestTelemetry, 'track')
    const { container } = section()
    expect((container.querySelector('input[data-range="100"]') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(container.querySelector('input[data-range="10"]')!)
    expect(useSpellQuestStore.getState().settings.range).toBe(10)
    expect(track).toHaveBeenCalledWith('settings', expect.objectContaining({ range: 10 }))
    const money = container.querySelector('[data-money]')!
    expect(money.querySelector('[data-money-visits]')!.textContent).toBe('5')
    expect(money.querySelector('[data-money-purchases]')!.textContent).toBe('3')
    expect(money.querySelector('[data-money-declines]')!.textContent).toBe('2')
    expect(money.querySelector('[data-money-short]')!.textContent).toBe('4')
    expect(money.querySelector('[data-money-over]')!.textContent).toBe('1')
    expect(money.querySelector('[data-money-hints]')!.textContent).toBe('6')
    expect(money.querySelector('[data-money-level]')!.textContent).toMatch(/1/)
    useSpellQuestStore.getState().setSettings({ range: 100 })
  })

  it('the developer tools open the gallery, the stroke review and the test board', () => {
    const openDev = vi.fn()
    render(<SpellQuestDevTools goTo={() => {}} openDev={openDev} />)
    fireEvent.click(screen.getByText(/Screens/))
    fireEvent.click(screen.getByText(/Stroke review/))
    fireEvent.click(screen.getByText(/test board/))
    expect(openDev.mock.calls.map((c) => c[0])).toEqual(['gallery', 'strokes', 'drawtest'])
  })

  it('reset clears Book 2 only (the lessons and the first duel’s history stay)', async () => {
    useSpellQuestStore.setState({ crystals: 4 })
    useProgressStore.setState({ tower: { ...INITIAL_PROGRESS_STATE.tower, sessions: 3 }, stats: { ...INITIAL_PROGRESS_STATE.stats, lettersLearned: 5 } })
    await spellQuestParent.reset()
    expect(useSpellQuestStore.getState().crystals).toBe(0)
    expect(useProgressStore.getState().tower.sessions).toBe(3)
    expect(useProgressStore.getState().stats.lettersLearned).toBe(5)
  })
})
