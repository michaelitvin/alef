// The hook bridge: one controller per mount, its view through React, the newest props, the page's pagehide, and the
// unmount. The flow itself is tested on the controller (utils/duel/controller.flow.test.ts and controller.test.ts).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDuelGame } from './useTower'
import type { DuelEmbedded } from './logic/controller'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { useProgressStore } from '../../stores/progressStore'
import { createTelemetry } from '../../shared/telemetry'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'

const audio = installFakeAudio()
const tel = createTelemetry('t-tower-hook', { game: 'book2' })
const events = () => tel.events() as Record<string, unknown>[]
const SEEN = ['tower-intro', 'tower-screen-A', 'tower-screen-B', 'tower-screen-C', 'tower-screen-D', 'tower-screen-silent']

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  tel.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})
afterEach(() => vi.useRealTimers())

function emb(over: Partial<DuelEmbedded> = {}): DuelEmbedded {
  return { wave: 1, waves: 2, boss: false, seen: SEEN, onSeen: () => {}, onAnswer: () => 'on', onDone: () => {}, ...over }
}
const flow = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

describe('useDuelGame (the hook bridge)', () => {
  it('one controller per mount: start shows a monster, and the view follows the flow', async () => {
    const { result, rerender } = renderHook(() => useDuelGame({ telemetry: tel, rng: () => 0.01, walkOverride: 60_000, embedded: emb() }))
    act(() => result.current.start())
    await flow(3000)
    const r = result.current.state.round!
    expect(r).not.toBeNull()
    rerender() // a new render keeps the same controller: the same monster
    expect(result.current.state.round).toBe(r)
    act(() => result.current.choose({ kind: 'rune', mark: r.target }))
    expect(result.current.state.outcome).toMatchObject({ kind: 'hit' })
    expect(result.current.feedback).not.toBeNull()
    // the recap is said after the effects
    await flow(3000)
    expect(audio.said()).toContain(`wiz-vowel-${r.target.group}`)
  })

  it('the newest props: an answer goes to the onAnswer of the last render', async () => {
    const first: string[] = []
    const last: string[] = []
    let onAnswer = (r: 'right' | 'wrong') => { first.push(r); return 'on' as const }
    const { result, rerender } = renderHook(() => useDuelGame({ telemetry: tel, rng: () => 0.01, walkOverride: 60_000, embedded: emb({ onAnswer }) }))
    act(() => result.current.start())
    await flow(3000)
    onAnswer = (r) => { last.push(r); return 'on' }
    rerender()
    const r = result.current.state.round!
    act(() => result.current.choose({ kind: 'rune', mark: r.target }))
    expect(first).toEqual([])
    expect(last).toEqual(['right'])
  })

  it('leaving the page mid-visit records an abandon; unmounting records one and unmutes', async () => {
    const { result, unmount } = renderHook(() => useDuelGame({ telemetry: tel, rng: () => 0.01, walkOverride: 60_000, embedded: emb() }))
    act(() => result.current.start())
    await flow(3000)
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(events().slice(-1)[0]).toMatchObject({ e: 'abandon', reason: 'pagehide', via: 'tower' })
    act(() => result.current.pause())
    expect(audio.muted).toBe(true)
    unmount()
    expect(events().slice(-1)[0]).toMatchObject({ e: 'abandon', reason: 'unmount' })
    expect(audio.muted).toBe(false)
    // nothing goes on after the unmount
    const n = events().length
    window.dispatchEvent(new Event('pagehide'))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(events().filter((e) => e.e === 'round').length).toBe(events().slice(0, n).filter((e) => e.e === 'round').length)
  })
})
