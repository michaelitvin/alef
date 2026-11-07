// spec 2026-11-07 girls: the duel asks boy or girl before the first round while the setting is unset
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
vi.mock('../../utils/duel/duelAudio', async (orig) => {
  const m = await orig<typeof import('../../utils/duel/duelAudio')>()
  return { ...m, playLine: vi.fn(() => Promise.resolve()) }
})
import DuelPage from './DuelPage'
import { playLine } from '../../utils/duel/duelAudio'
import { clearGender, getPlayer, setGender } from '../../shared/player'
import * as tel from '../../utils/duel/telemetry'

describe('DuelPage: the boy/girl question', () => {
  afterEach(() => clearGender())
  it('asks first when unset, then starts the game as the child chose', async () => {
    clearGender()
    const track = vi.spyOn(tel, 'track')
    const { container } = render(<MemoryRouter><DuelPage /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('play'))
    const q = container.querySelector('[data-screen="gender-question"]')!
    expect(q).not.toBeNull()
    expect(q.querySelector('[data-gender="girl"] img')!.getAttribute('src')).toMatch(/wizard-idle-girl/)
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    expect(playLine).toHaveBeenCalledWith('line-ask-gender')
    fireEvent.click(q.querySelector('[data-gender="girl"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 600)) })
    expect(getPlayer()).toMatchObject({ gender: 'girl', by: 'child' })
    expect(track).toHaveBeenCalledWith('player', { gender: 'girl', by: 'child' })
    expect(container.querySelector('[data-screen="gender-question"]')).toBeNull()
    track.mockRestore()
  })
  it('does not ask once it is set', () => {
    setGender('boy', 'child')
    const { container } = render(<MemoryRouter><DuelPage /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('play'))
    expect(container.querySelector('[data-screen="gender-question"]')).toBeNull()
  })
})
