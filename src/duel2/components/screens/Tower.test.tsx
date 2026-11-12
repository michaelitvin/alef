// The tower screen: the first duel's board inside Book 2's run (spec: one duel, Part 3).
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../../utils/duel/duelAudio', async (orig) => {
  const m = await orig<typeof import('../../../utils/duel/duelAudio')>()
  return { ...m, playLine: vi.fn(() => Promise.resolve()), playSfx: vi.fn(() => Promise.resolve()), playMusic: vi.fn(), muteDuelAudio: vi.fn() }
})
import { Tower } from './Tower'
import { muteDuelAudio, playMusic } from '../../../utils/duel/duelAudio'
import { useDuel2Store } from '../../store'
import { useProgressStore } from '../../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../../types/progress'

const view = { screen: 'tower' as const, wave: 1, waves: 2, boss: false, visit: 1 }

describe('Tower', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useDuel2Store.getState().resetProgress()
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
    vi.mocked(playMusic).mockClear()
    vi.mocked(muteDuelAudio).mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('draws the duel’s board with no HUD, no מגה button and none of the duel’s covers', async () => {
    const { container } = render(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(container.querySelector('.nd-embedded')).not.toBeNull()
    expect(container.querySelector('.nd-hud')).toBeNull()
    expect(container.querySelector('.nd-mega-btn')).toBeNull()
    expect(container.querySelector('.nd-pause-cover')).toBeNull()
    expect(container.querySelector('.nd-pad')).not.toBeNull()
    expect(vi.mocked(playMusic)).not.toHaveBeenCalled()
  })

  it('its intro is kept in Book 2’s save, so it plays once ever', async () => {
    render(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(useDuel2Store.getState().demosSeen).toContain('tower-intro')
  })

  it('a lock pauses the board under Book 2’s cover (the duel shows no cover of its own); the play resumes it', async () => {
    const { container, rerender } = render(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    rerender(<Tower view={view} paused onAnswer={() => 'on'} onDone={() => {}} />)
    expect(vi.mocked(muteDuelAudio)).toHaveBeenLastCalledWith(true)
    expect(container.querySelector('.nd-pause-cover')).toBeNull()
    rerender(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    expect(vi.mocked(muteDuelAudio)).toHaveBeenLastCalledWith(false)
  })
})
