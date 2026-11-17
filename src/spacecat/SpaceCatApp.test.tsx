import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const { preload } = vi.hoisted(() => ({ preload: vi.fn(() => Promise.resolve()) }))
vi.mock('./assets/preload', () => ({ preloadSpaceCat: preload }))
import SpaceCatApp from './SpaceCatApp'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { clearGender } from '../shared/player'

installFakeAudio()

describe('Space Cat app', () => {
  afterEach(() => clearGender())

  it('starts on the cover', () => {
    const { container } = render(<SpaceCatApp />)
    expect(container.querySelector('[data-screen="cover"]')).not.toBeNull()
  })

  it('never asks boy or girl', async () => {
    clearGender()
    const { container } = render(<SpaceCatApp />)
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    expect(container.querySelector('[data-screen="gender-question"]')).toBeNull()
    expect(container.querySelector('[data-screen="play"]')).not.toBeNull()
  })
})
