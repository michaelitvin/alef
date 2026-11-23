// The English page: `?course=en` opens Spell Quest's app on the English course, with its own save, purse, log and play time;
// the Hebrew page stays as it was.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// the English run is not built yet (its stages and rounds come in later tasks): the play screen is a stand-in
vi.mock('../spellquest/screens/Play', () => ({ Play: () => <div data-screen="play" /> }))
// jsdom loads no fonts or pictures: the preload is done at once
vi.mock('./assets/preload', () => ({ ENGLISH_FONTS: [], preloadEnglishAssets: () => Promise.resolve() }))
import SpellQuestApp from '../spellquest/SpellQuestApp'
import { useSpellQuestStore } from '../spellquest/store'
import { SAVE_VERSION } from '../spellquest/saveFormat'
import { readLog } from '../shared/telemetry'
import { PLAYTIME_GAMES } from '../shared/playtime'
import { gameParent } from '../parent/registry'
import { clearGender } from '../shared/player'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { ENGLISH_LOG } from './telemetryLog'
installFakeAudio()

const hebrewSaveWith = (s: { coins: number }) => JSON.stringify({ state: { coins: s.coins, totalStars: 120, stage: { stage: 2, newAnswers: 'oox' } }, version: SAVE_VERSION })
const PROGRESS_RAW = JSON.stringify({ state: { duel: { recent: { kamatz: 'ooo' } } }, version: 0 })
const at = (url: string) => history.replaceState(null, '', url)

describe('the English page', () => {
  beforeEach(() => { localStorage.clear(); clearGender() })
  afterEach(() => { clearGender(); at('/') })

  it('?course=en opens the English cover', async () => {
    at('/spellquest/?course=en'); render(<SpellQuestApp goHome={() => {}} />)
    expect((await screen.findByTestId('cover', {}, { timeout: 15000 })).getAttribute('data-course')).toBe('en')
  })

  it('the English cover shows the English purse', async () => {
    localStorage.setItem('alef-spellquest', hebrewSaveWith({ coins: 40 }))
    await useSpellQuestStore.persist.rehydrate()
    expect(useSpellQuestStore.getState().coins).toBe(40)
    at('/spellquest/?course=en'); render(<SpellQuestApp goHome={() => {}} />)
    expect((await screen.findByTestId('cover', {}, { timeout: 15000 })).querySelector('[data-coins]')!.textContent).toBe('0')
  })

  it('opening English leaves alef-spellquest and alef-progress byte-equal', async () => {
    const duel2 = hebrewSaveWith({ coins: 40 }); localStorage.setItem('alef-spellquest', duel2); localStorage.setItem('alef-progress', PROGRESS_RAW)
    await useSpellQuestStore.persist.rehydrate()
    at('/spellquest/?course=en'); render(<SpellQuestApp goHome={() => {}} />); await screen.findByTestId('cover', {}, { timeout: 15000 })
    // the first duel's import runs on the Hebrew page only
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    expect(localStorage.getItem('alef-spellquest')).toBe(duel2); expect(localStorage.getItem('alef-progress')).toBe(PROGRESS_RAW)
  })

  it('the English page tracks into its own log', async () => {
    at('/spellquest/?course=en'); const { container } = render(<SpellQuestApp goHome={() => {}} />)
    fireEvent.click(within(await screen.findByTestId('cover', {}, { timeout: 15000 })).getByLabelText('play'))
    // boy or girl is not set: the play gate asks first
    await waitFor(() => expect(container.querySelector('[data-gender="boy"]')).not.toBeNull())
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    fireEvent.click(container.querySelector('[data-gender="boy"]')!)
    await waitFor(() => expect(readLog('alef-english-telemetry').some((e) => e.e === 'player' && e.g === 'english')).toBe(true), { timeout: 3000 })
    expect(readLog('alef-spellquest-telemetry').some((e) => e.e === 'player')).toBe(false)
  }, 60_000)

  it('the Hebrew page is the same as before', async () => {
    at('/spellquest/'); render(<SpellQuestApp goHome={() => {}} />)
    expect((await screen.findByTestId('cover', {}, { timeout: 15000 })).getAttribute('data-course')).toBe('he')
    expect(screen.getByTestId('cover').hasAttribute('dir')).toBe(false)
  })

  it('play time counts under english', () => { expect(PLAYTIME_GAMES).toContain('english') })

  it('the English page has a parent section and its log is registered', () => { expect(gameParent('english').logs).toContain(ENGLISH_LOG) })
})
