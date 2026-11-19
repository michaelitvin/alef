// A station link from the English path on home (`duel2/?course=en&station=<id>`) opens that English screen, through the
// course's `openScreens(save, course)`; a station that is not open for him opens the cover.
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../duel2/screens/Play', () => ({ Play: () => <div data-screen="play" /> }))
vi.mock('./assets/preload', () => ({ ENGLISH_FONTS: [], preloadEnglishAssets: () => Promise.resolve() }))
import Duel2App from '../duel2/Duel2App'
import { clearGender } from '../shared/player'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { englishSavePort } from './savePort'
import { useEnglishStore } from './store'
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
    at('/duel2/?course=en&station=broom'); const { container } = render(<Duel2App goHome={() => {}} />)
    await waitFor(() => expect(station(container)).toBe('broom'), { timeout: 10_000 })
    expect(container.querySelector('[data-testid="cover"]')).toBeNull()
  })

  it('the doors link opens the cover at stage 1 (no door can be made there yet)', async () => {
    saveAt(1)
    expect(enDoorsPlayable(1, { picture: wordPicture })).toBe(false)
    at('/duel2/?course=en&station=doors'); const { container } = render(<Duel2App goHome={() => {}} />)
    expect((await screen.findByTestId('cover', {}, { timeout: 10_000 })).getAttribute('data-course')).toBe('en')
    expect(station(container)).toBeNull()
  })

  it('a doors link on a save where the doors play opens the English doors session', async () => {
    expect(doorsStage, 'a stage that plays the doors').toBeDefined()
    saveAt(doorsStage!)
    at('/duel2/?course=en&station=doors'); const { container } = render(<Duel2App goHome={() => {}} />)
    await waitFor(() => expect(station(container)).toBe('doors'), { timeout: 10_000 })
  })
})
