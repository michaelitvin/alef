// The English section's level, sound units and words (parent text): the placement again, the start stage that never closes
// a station or lowers a rating, a unit chip with its counts, and the words read with and without the hint.
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings'
import { englishParent } from '.'
import { ENGLISH } from '../course'
import { englishOpenStations, englishStationRatings } from '../station'
import { enDoorsPlayable } from '../logic/rounds/doors'
import { wordPicture } from '../assets/images'
import { englishDoorsPlayable } from '../doorsPlayable'
import { stationsUpTo } from '../station'
import { englishSavePort } from '../savePort'
import { readEnglishSave } from '../saveFormat'
import { useEnglishStore } from '../store'
import { englishTelemetry } from '../telemetry'
import { localDate } from './date'
import { unitState } from './Units'

const section = () => render(<Settings goTo={() => {}} />)
const el = (c: HTMLElement, sel: string) => c.querySelector(sel) as HTMLElement

describe('the English section: level, sound units, words', () => {
  beforeEach(() => {
    // (Book 2's settings test leaves `alef-range` in storage: nothing here depends on it)
    localStorage.clear()
    useEnglishStore.getState().resetProgress()
  })
  afterEach(() => vi.restoreAllMocks())

  it('a lower start stage keeps every open station and its rating', () => {
    useEnglishStore.setState({
      stage: { stage: 5, newAnswers: '' }, openedStations: ['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors'],
      recent: { 'sc:broom': 'ooooo', 'sc:cauldron': 'ooxo' }, tower: { byMark: {}, confusions: {}, recent: { a: 'ooo' }, pace: 1 },
      tallies: { a: { seen: 9, wrong: 1 } },
    })
    const open = englishOpenStations(readEnglishSave(), englishDoorsPlayable)
    const ratings = englishStationRatings(readEnglishSave())
    expect(open).toContain('doors')
    expect(ratings.broom).toBe(3)
    const { container } = section()
    fireEvent.change(el(container, '[data-start-stage]'), { target: { value: '2' } })
    fireEvent.click(el(container, '[data-set-stage]'))
    expect(useEnglishStore.getState().stage.stage).toBe(2)
    expect(useEnglishStore.getState().stage.newAnswers).toBe('')
    for (const id of open) expect(englishOpenStations(readEnglishSave(), englishDoorsPlayable)).toContain(id)
    expect(englishStationRatings(readEnglishSave())).toEqual(ratings)
    expect(useEnglishStore.getState().tallies.a).toEqual({ seen: 9, wrong: 1 })
    expect(useEnglishStore.getState().openedStations).toEqual(expect.arrayContaining(open))
  })

  it('at stage 1 the doors are opened (its door words have pictures)', () => {
    const { container } = section()
    englishSavePort().setStage(3)
    fireEvent.change(el(container, '[data-start-stage]'), { target: { value: '1' } })
    fireEvent.click(el(container, '[data-set-stage]'))
    expect(useEnglishStore.getState().stage.stage).toBe(1)
    expect(enDoorsPlayable(1, { picture: wordPicture })).toBe(true)
    expect(useEnglishStore.getState().openedStations).toContain('doors')
    expect(englishOpenStations(readEnglishSave(), englishDoorsPlayable)).toContain('doors')
    expect(stationsUpTo(1, true, () => true)).toContain('doors')
  })

  it('a higher start stage seeds the lower stages and opens their stations', () => {
    const { container } = section()
    fireEvent.change(el(container, '[data-start-stage]'), { target: { value: '4' } })
    fireEvent.click(el(container, '[data-set-stage]'))
    const s = useEnglishStore.getState()
    expect(s.stage.stage).toBe(4)
    expect(s.tallies.m?.seen).toBeGreaterThan(0)
    expect(englishOpenStations(readEnglishSave(), englishDoorsPlayable)).toEqual(expect.arrayContaining(['tower', 'broom', 'ghosts', 'cauldron']))
  })

  it('run the placement again: the next run starts in the placement', () => {
    const done = { level: 3, answers: 12, at: Date.UTC(2026, 10, 19, 12) }
    englishSavePort().setPlacement({ state: null, requested: false, done, runs: 1 })
    expect(ENGLISH.placement!.due(englishSavePort())).toBe(false)
    const track = vi.spyOn(englishTelemetry, 'track')
    const { container } = section()
    expect(el(container, '[data-level-found]').textContent).toMatch(/level 3, after 12 answers/)
    fireEvent.click(el(container, '[data-placement-again]'))
    const p = useEnglishStore.getState().placement
    expect(p.requested).toBe(true)
    expect(p.done).toEqual(done)
    expect(ENGLISH.placement!.due(englishSavePort())).toBe(true)
    expect(track).toHaveBeenCalledWith('settings', { keys: ['placement'], placement: 'again' })
  })

  it('a unit chip shows helped apart from right', () => {
    useEnglishStore.setState({ tallies: { m: { seen: 10, wrong: 2, helped: 3 }, s: { seen: 1, wrong: 0 } } })
    const { container } = section()
    expect(el(container, '[data-unit="a"]').dataset.state).toBe('unseen')
    expect(el(container, '[data-unit="s"]').dataset.state).toBe('learning')
    fireEvent.click(el(container, '[data-unit="m"]'))
    const d = el(container, '[data-unit-detail="m"]')
    expect(d.querySelector('[data-n="right"]')!.textContent).toBe('5')
    expect(d.querySelector('[data-n="wrong"]')!.textContent).toBe('2')
    expect(d.querySelector('[data-n="helped"]')!.textContent).toBe('3')
    expect(unitState({ seen: 10, wrong: 0, helped: 8 })).toBe('learning')
    expect(unitState({ seen: 10, wrong: 1 })).toBe('knows')
  })

  it('a unit shows its mix-ups', () => {
    useEnglishStore.setState({ tallies: { m: { seen: 4, wrong: 2 } }, confusions: { letters: { m: { n: 2 } }, vowels: {}, syllables: {} } })
    const { container } = section()
    fireEvent.click(el(container, '[data-unit="m"]'))
    expect(el(container, '[data-unit-mixups]').textContent).toBe('Mix-ups: n (2)')
  })

  it('words: read alone and with the hint, and the nonsense words apart', () => {
    useEnglishStore.setState({ tower: { byMark: { map: { seen: 6, correct: 3, wrong: 1, timeout: 0, twin: 0, mega: 0, helped: 2 }, sluk: { seen: 2, correct: 2, wrong: 0, timeout: 0, twin: 0, mega: 0 } }, confusions: {}, recent: {}, pace: 1 } })
    const { container } = section()
    const row = el(container, '[data-words-table="Words"] [data-word="map"]')
    expect(row.querySelector('[data-n="right"]')!.textContent).toBe('3')
    expect(row.querySelector('[data-n="helped"]')!.textContent).toBe('2')
    expect(container.querySelector('[data-words-table="Words"] [data-word="sluk"]')).toBeNull()
    expect(container.querySelector('[data-words-table="Nonsense words"] [data-word="sluk"]')).not.toBeNull()
  })

  it('words from the other screens count too, and a heart word adds the tower\'s and the others\'', () => {
    useEnglishStore.setState({
      tallies: { 'w:sluk': { seen: 3, wrong: 1, helped: 1 }, 'w:the': { seen: 4, wrong: 0, helped: 1 } },
      tower: { byMark: { the: { seen: 2, correct: 2, wrong: 0, timeout: 0, twin: 0, mega: 0 } }, confusions: {}, recent: {}, pace: 1 },
    })
    const { container } = section()
    const nonsense = el(container, '[data-words-table="Nonsense words"] [data-word="sluk"]')
    expect(nonsense.querySelector('[data-n="right"]')!.textContent).toBe('1')
    expect(nonsense.querySelector('[data-n="helped"]')!.textContent).toBe('1')
    const heart = el(container, '[data-words-table="Words"] [data-word="the"]')
    expect(heart.querySelector('[data-n="right"]')!.textContent).toBe('5')
    expect(heart.querySelector('[data-n="helped"]')!.textContent).toBe('1')
  })

  it('a damaged placement date does not break the summary or the level', () => {
    const state = { placement: { state: null, requested: false, done: { level: 2, answers: 9, at: 'x' }, runs: 1 }, stage: { stage: 2 } }
    expect(englishParent.summary(JSON.stringify({ state, version: 1 }))).toMatch(/^Level 2 \(placement: 9 answers\) · stage 2/)
    expect(localDate(NaN)).toBeNull()
    const at = new Date(2026, 10, 19, 12)
    expect(localDate(at.getTime())).toBe('2026-11-19')
  })
})
