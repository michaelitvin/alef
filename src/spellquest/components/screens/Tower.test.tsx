// The tower screen: the first duel's board inside Spell Quest's run (spec: one duel, Part 3).
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../tower/logic/towerAudio', async (orig) => {
  const m = await orig<typeof import('../../tower/logic/towerAudio')>()
  // "tap the lightning": its cue fires as the line is said (as the real player does by the line's end)
  return { ...m, playLine: vi.fn((id: string, onCue?: (c: 'lightning') => void) => { if (id === 'line-mega') onCue?.('lightning'); return Promise.resolve() }), playSfx: vi.fn(() => Promise.resolve()), muteTowerAudio: vi.fn() }
})
import { Tower } from './Tower'
import { muteTowerAudio } from '../../tower/logic/towerAudio'
import { useSpellQuestStore } from '../../store'
import { useProgressStore } from '../../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../../types/progress'
import { spellQuestTelemetry } from '../../telemetry'
import { SESSION, readLog } from '../../../shared/telemetry'

const view = { screen: 'tower' as const, wave: 1, waves: 2, boss: false, visit: 1 }

describe('Tower', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useSpellQuestStore.getState().resetProgress()
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
    vi.mocked(muteTowerAudio).mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('the duel’s events go to Book 2’s log: g book2, via tower, the page’s one session, Book 2’s run; none in the old log (ADR 0004)', async () => {
    localStorage.clear()
    spellQuestTelemetry.clear()
    spellQuestTelemetry.setRun(5)
    const { unmount } = render(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })
    unmount()
    spellQuestTelemetry.flush()
    const rounds = readLog('alef-spellquest-telemetry').filter((e) => e.e === 'round')
    expect(rounds.length).toBeGreaterThan(0)
    for (const r of rounds) expect(r).toMatchObject({ g: 'spellquest', via: 'tower', s: SESSION, run: 5, visit: 1 })
    expect(localStorage.getItem('alef-tower-history-telemetry')).toBeNull()
    spellQuestTelemetry.setRun(0)
  })

  it('the gallery’s tower (dry) records no event', async () => {
    localStorage.clear()
    spellQuestTelemetry.clear()
    const { unmount } = render(<Tower view={view} paused={false} dry onAnswer={() => 'on'} onDone={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })
    unmount()
    expect(spellQuestTelemetry.events().length).toBe(0)
    expect(localStorage.getItem('alef-tower-history-telemetry')).toBeNull()
  })

  it('draws the duel’s board with no HUD, no מגה button before the charge, and none of the duel’s covers', async () => {
    const { container } = render(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(container.querySelector('.nd-embedded')).not.toBeNull()
    expect(container.querySelector('.nd-hud')).toBeNull()
    expect(container.querySelector('.nd-mega-btn')).toBeNull()
    expect(container.querySelector('.nd-pause-cover')).toBeNull()
    expect(container.querySelector('.nd-pad')).not.toBeNull()
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
    expect(useSpellQuestStore.getState().demosSeen).toContain('tower-intro')
  })

  it('a lock pauses the board under Book 2’s cover (the duel shows no cover of its own); the play resumes it', async () => {
    const { container, rerender } = render(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    rerender(<Tower view={view} paused onAnswer={() => 'on'} onDone={() => {}} />)
    expect(vi.mocked(muteTowerAudio)).toHaveBeenLastCalledWith(true)
    expect(container.querySelector('.nd-pause-cover')).toBeNull()
    rerender(<Tower view={view} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    expect(vi.mocked(muteTowerAudio)).toHaveBeenLastCalledWith(false)
  })

  it('the מגה spell (the parent brought it back, 2026-11-14): a carried charge, a hit, the line, the lightning; a cast is no answer', async () => {
    const answers: string[] = []
    const megas: string[] = []
    const charges: number[] = []
    const v = { ...view, mega: 8 }
    const props = { view: v, onAnswer: (r: 'right' | 'wrong') => { answers.push(r); return 'on' as const }, onDone: () => {},
      onMega: (m: string) => { megas.push(m) }, onCharge: (n: number) => { charges.push(n) } }
    const { container, rerender } = render(<Tower {...props} paused={false} />)
    const right = async () => {
      for (let i = 0; i < 40 && !container.querySelector('.nd-rune[data-correct="1"]:not(:disabled)'); i++) await act(async () => { await vi.advanceTimersByTimeAsync(250) })
      act(() => { (container.querySelector('.nd-rune[data-correct="1"]') as HTMLButtonElement).click() })
    }
    await right()
    expect(container.querySelector('.nd-mega-btn')).toBeNull()
    for (let i = 0; i < 40 && !container.querySelector('.nd-mega-btn'); i++) await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    expect(container.querySelector('.nd-mega-btn')).not.toBeNull()
    // a lock hides it under Spell Quest's cover; the play brings it back
    rerender(<Tower {...props} paused />)
    expect(container.querySelector('.nd-mega-btn')).toBeNull()
    rerender(<Tower {...props} paused={false} />)
    for (let i = 0; i < 40 && !(container.querySelector('.nd-rune[data-correct="1"]:not(:disabled)') && container.querySelector('.nd-mega-btn')); i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    }
    act(() => { (container.querySelector('.nd-mega-btn') as HTMLButtonElement).click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(megas.length).toBe(1)
    expect(answers).toEqual(['right'])
    expect(charges[charges.length - 1]).toBe(0)
    expect(container.querySelector('.nd-mega-btn')).toBeNull()
  }, 30_000)
})
