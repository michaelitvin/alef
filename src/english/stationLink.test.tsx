// A station link from the English path on home (`spellquest/?course=en&station=<id>`) opens that English screen, through the
// course's `openScreens(save, course)`; a station that is not open for him opens the cover.
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../spellquest/screens/Play', () => ({ Play: () => <div data-screen="play" /> }))
vi.mock('./assets/preload', () => ({ ENGLISH_FONTS: [], preloadEnglishAssets: () => Promise.resolve() }))
import SpellQuestApp from '../spellquest/SpellQuestApp'
import { clearGender } from '../shared/player'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { englishSavePort } from './savePort'
import { useEnglishStore } from './store'
import { cycleOf } from '../spellquest/logic/run'
import { ENGLISH } from './course'
import { englishDoorsPlayable, englishStationsUpTo } from './doorsPlayable'
import { englishOpenStations, englishPlayableStations } from './station'
import { readEnglishSave } from './saveFormat'
import { enDoorsPlayable } from './logic/rounds/doors'
import { wordPicture } from './assets/images'
installFakeAudio()

const at = (url: string) => history.replaceState(null, '', url)
const saveAt = (stage: number) => englishSavePort().setStage(stage)
const doorsStage = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((s) => enDoorsPlayable(s, { picture: wordPicture }))

describe('a station link of the English path', () => {
  beforeEach(() => { localStorage.clear(); clearGender(); useEnglishStore.getState().resetProgress() })
  afterEach(() => { clearGender(); at('/') })

  const station = (c: HTMLElement) => c.querySelector('[data-screen="station"]')?.getAttribute('data-station') ?? null

  it('a station link opens that English screen', async () => {
    saveAt(1)
    at('/spellquest/?course=en&station=broom'); const { container } = render(<SpellQuestApp goHome={() => {}} />)
    await waitFor(() => expect(station(container)).toBe('broom'), { timeout: 10_000 })
    expect(container.querySelector('[data-testid="cover"]')).toBeNull()
  })

  it('a doors link on a save where the doors play opens the English doors session', async () => {
    expect(doorsStage, 'a stage that plays the doors').toBeDefined()
    saveAt(doorsStage!)
    at('/spellquest/?course=en&station=doors'); const { container } = render(<SpellQuestApp goHome={() => {}} />)
    await waitFor(() => expect(station(container)).toBe('doors'), { timeout: 10_000 })
  })

  it('the parent lowers the start stage 2 to 1: home keeps the ghosts open, and its link opens the cover (the cycle at stage 1 has none)', async () => {
    saveAt(2); englishSavePort().openStations(englishStationsUpTo(2, true))
    englishSavePort().setStage(1)
    const save = readEnglishSave()
    expect(englishOpenStations(save, englishDoorsPlayable)).toContain('ghosts')
    expect(englishPlayableStations(save, englishDoorsPlayable)).not.toContain('ghosts')
    at('/spellquest/?course=en&station=ghosts'); const { container } = render(<SpellQuestApp goHome={() => {}} />)
    await screen.findByTestId('cover', {}, { timeout: 10_000 })
    expect(station(container)).toBeNull()
  })

  it('the stations his stage plays now are exactly the course cycle at that stage and setting (home and link agree)', () => {
    for (const drawing of [true, false]) for (const stage of [1, 2, 5]) {
      saveAt(stage); englishSavePort().setSettings({ drawing })
      const playable = englishPlayableStations(readEnglishSave(), englishDoorsPlayable)
      expect(playable).toEqual(cycleOf(stage, drawing, true, ENGLISH.stages))
    }
  })
})
