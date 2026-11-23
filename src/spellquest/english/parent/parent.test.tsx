// The English path's section in the parent area: it is listed with its log, the summary line, the path and drawing
// switches, the one number range, and a reset that leaves Spell Quest's save alone (and the other way round).
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParentArea } from '../../../parent/ParentArea'
import { GAMES } from '../../../parent/registry'
import { storeSavePort, memorySavePort } from '../../savePort'
import { useSpellQuestStore } from '../../store'
import { englishSavePort, memoryEnglishSavePort } from '../savePort'
import { useEnglishStore } from '../store'
import { englishTelemetry } from '../telemetry'
import { getNumberRange, setNumberRange } from '../../../shared/numberRange'
import { englishParent } from '.'
import spellQuestReset from '../../parent/reset'

const LAZY = { timeout: 15000 }
const raw = (k: string) => localStorage.getItem(k)

describe('the English section in the parent area', () => {
  beforeEach(() => {
    localStorage.clear()
    useEnglishStore.getState().resetProgress()
    useSpellQuestStore.getState().resetProgress()
    englishSavePort().setSettings({ path: true, drawing: true })
  })
  afterEach(() => vi.restoreAllMocks())

  it('the area lists the English section and its log', async () => {
    expect(GAMES.map((g) => g.id)).toContain('spellquest-en')
    expect(englishParent.logs?.map((l) => l.key)).toEqual(['alef-spellquest-en-telemetry'])
    const { container } = render(<ParentArea game="spellquest-en" onClose={() => {}} />)
    expect(container.querySelector('[data-log="alef-spellquest-en-telemetry"]')).not.toBeNull()
    expect(container.querySelector('[data-progress-game="spellquest-en"]')).not.toBeNull()
    await screen.findByText(/Number range for shopping/, {}, LAZY)
    expect(container.querySelector('[data-spellquest-en-settings]')).not.toBeNull()
  })

  it('the summary line: level, placement, stage, runs, best run, crystals', () => {
    const at = Date.UTC(2026, 10, 19, 12)
    const state = { placement: { state: null, requested: false, done: { level: 3, answers: 12, at }, runs: 1 }, stage: { stage: 2 }, runs: 4, bestRun: 7, crystals: 5 }
    expect(englishParent.summary(JSON.stringify({ state, version: 1 })))
      .toBe('Level 3 (placement: 12 answers, 2026-11-19) · stage 2 · runs 4 · best run 7 · crystals 5')
    expect(englishParent.summary(JSON.stringify({ state: { ...state, placement: { done: null } }, version: 1 }))).toMatch(/^Not placed yet · stage 2/)
    expect(englishParent.summary(null)).toBeNull()
  })

  it('a reset clears alef-spellquest-en and leaves alef-spellquest-he byte-equal', async () => {
    useSpellQuestStore.setState({ crystals: 3 })
    useEnglishStore.setState({ crystals: 9, runs: 2 })
    const spellQuestBefore = raw('alef-spellquest-he')
    expect(spellQuestBefore).not.toBeNull()
    await englishParent.reset()
    expect(useEnglishStore.getState().crystals).toBe(0)
    expect(raw('alef-spellquest-he')).toBe(spellQuestBefore)
    expect(JSON.parse(raw('alef-spellquest-en')!).state.crystals).toBe(0)
  })

  it('and the other way: Spell Quest\'s reset leaves alef-spellquest-en byte-equal', () => {
    useSpellQuestStore.setState({ crystals: 3 })
    useEnglishStore.setState({ crystals: 9, runs: 2 })
    const englishBefore = raw('alef-spellquest-en')
    expect(englishBefore).not.toBeNull()
    spellQuestReset()
    expect(useSpellQuestStore.getState().crystals).toBe(0)
    expect(raw('alef-spellquest-en')).toBe(englishBefore)
  })

  it('the number range is one setting: set in English, Spell Quest\'s merchant uses it', () => {
    const { container } = render(<ParentArea game="spellquest-en" onClose={() => {}} />)
    return screen.findByText(/Number range for shopping/, {}, LAZY).then(() => {
      const track = vi.spyOn(englishTelemetry, 'track')
      expect((container.querySelector('input[data-range="100"]') as HTMLInputElement).checked).toBe(true)
      fireEvent.click(container.querySelector('input[data-range="10"]')!)
      expect(track).toHaveBeenCalledWith('range-set', { range: 10 })
      expect(getNumberRange()).toBe(10)
      expect(storeSavePort.range()).toBe(10)
      expect(englishSavePort().range()).toBe(10)
    })
  })

  it('the memory ports read the range an old test sets in the save, and 100 otherwise', () => {
    expect(memorySavePort().range()).toBe(100)
    expect(memorySavePort({ settings: { sfx: true, music: true, volume: 1, range: 1000 } }).range()).toBe(1000)
    expect(memoryEnglishSavePort().range()).toBe(100)
  })

  it('the range seeds from an old Spell Quest save once', () => {
    localStorage.setItem('alef-spellquest-he', JSON.stringify({ state: { settings: { range: 1000 } }, version: 7 }))
    expect(getNumberRange()).toBe(1000)
    setNumberRange(10)
    localStorage.setItem('alef-spellquest-he', JSON.stringify({ state: { settings: { range: 100 } }, version: 7 }))
    expect(getNumberRange()).toBe(10)
  })

  it('turning the path off sets settings.path false (logged); the drawing switch sets drawing', async () => {
    const { container } = render(<ParentArea game="spellquest-en" onClose={() => {}} />)
    await screen.findByText(/Number range for shopping/, {}, LAZY)
    const track = vi.spyOn(englishTelemetry, 'track')
    const path = container.querySelector('input[data-setting-path]') as HTMLInputElement
    expect(path.checked).toBe(true)
    fireEvent.click(path)
    expect(useEnglishStore.getState().settings.path).toBe(false)
    expect(track).toHaveBeenCalledWith('settings', { keys: ['path'], path: false })
    fireEvent.click(container.querySelector('input[data-setting-drawing]')!)
    expect(useEnglishStore.getState().settings.drawing).toBe(false)
  })
})
