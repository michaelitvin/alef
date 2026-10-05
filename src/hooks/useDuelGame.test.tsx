import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const pending: { id: string; resolve: () => void }[] = []
vi.mock('../utils/duel/duelAudio', () => ({
  unlockDuelAudio: vi.fn(), preloadDuelAudio: vi.fn(), configureDuelAudio: vi.fn(), muteDuelAudio: vi.fn(), stopAllLines: vi.fn(),
  playMusic: vi.fn(), stopMusic: vi.fn(), trackForWave: () => 'calm',
  playSfx: vi.fn(() => Promise.resolve()),
  playLine: vi.fn((id: string) => new Promise<void>((resolve) => pending.push({ id, resolve }))),
}))
import { useDuelGame } from './useDuelGame'
import { playLine } from '../utils/duel/duelAudio'
import { useProgressStore } from '../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'

/** Finish spoken lines one by one, letting the timers between them run. */
const flushLines = async () => {
  for (let guard = 0; guard < 50 && pending.length; guard++) {
    await act(async () => {
      pending.shift()!.resolve()
      await vi.advanceTimersByTimeAsync(2600)
    })
  }
}
const lines = () => vi.mocked(playLine).mock.calls.map((c) => c[0])
const rngConst = (v: number) => () => v

beforeEach(() => {
  vi.useFakeTimers()
  pending.length = 0
  vi.mocked(playLine).mockClear()
  localStorage.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})

describe('useDuelGame', () => {
  it('intro and the first-screen instruction play before the monster appears', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    expect(result.current.state.round).toBeNull()
    await flushLines()
    expect(lines().slice(0, 2)).toEqual(['line-intro', 'line-how-A'])
    expect(result.current.state.round?.type).toBe('A')
    expect(useProgressStore.getState().duel.sessions).toBe(1)
  })
  it('the next round waits for every wizard line (name, sound, word)', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    const r = result.current.state.round!
    act(() => result.current.choose({ kind: 'rune', mark: r.target }))
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(result.current.state.outcome?.kind).toBe('hit')
    await flushLines()
    expect(lines()).toEqual(expect.arrayContaining([`wiz-${r.target.id}`, `wiz-vowel-${r.target.group}`, `wiz-word-${r.word.key}`]))
    expect(result.current.state.round?.id).not.toBe(r.id)
    expect(useProgressStore.getState().duel.byMark[r.target.id].correct).toBe(1)
  })
  it('pausing during an announcement holds the round until resume; exactly one round after resume', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    act(() => result.current.pause())
    await flushLines()
    expect(result.current.state.round).toBeNull()
    act(() => result.current.resume())
    await flushLines()
    expect(result.current.state.round).not.toBeNull()
    expect(result.current.state.paused).toBe(false)
  })
  it('a double tap yields one outcome and one stats record', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    const r = result.current.state.round!
    act(() => {
      result.current.choose({ kind: 'rune', mark: r.target })
      result.current.choose({ kind: 'rune', mark: r.target })
    })
    await flushLines()
    expect(useProgressStore.getState().duel.byMark[r.target.id].seen).toBe(1)
  })
  it('a monster that reaches the tower costs a heart (timeout)', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), walkOverride: 3000 }))
    act(() => result.current.start())
    await flushLines()
    await act(async () => { await vi.advanceTimersByTimeAsync(3100) })
    expect(result.current.state.outcome).toMatchObject({ kind: 'miss', choiceKey: null })
    expect(result.current.state.hearts).toBe(2)
  })
})
