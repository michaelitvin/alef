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

  it('a phone on its side gets the landscape board (Book 2 plays only sideways; the portrait board left no room for the field)', async () => {
    // a phone held sideways: landscape, but shorter than the duel's tablet query (min-height 500)
    const mm = vi.fn((q: string) => ({ matches: q === '(orientation: landscape)', media: q, addEventListener: () => {}, removeEventListener: () => {} }))
    vi.stubGlobal('matchMedia', mm)
    try {
      const { container } = render(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
      await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
      expect(container.querySelector('.nd-embedded.nd-landscape')).not.toBeNull()
      expect((container.querySelector('.nd-pad') as HTMLElement).style.gridTemplateColumns).toBe('repeat(4, 1fr)')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('shows no time line while the monster walks (the parent’s pick: it ran under the cue bubble)', async () => {
    const { container } = render(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    let walked = false
    for (let i = 0; i < 40 && !walked; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      walked = !!container.querySelector('.nd-monster')
      expect(container.querySelector('.nd-timebar')).toBeNull()
    }
    expect(walked).toBe(true)
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
