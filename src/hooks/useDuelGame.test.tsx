import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const pending: { id: string; resolve: () => void; onCue?: (c: string) => void }[] = []
vi.mock('../utils/duel/duelAudio', () => ({
  unlockDuelAudio: vi.fn(), preloadDuelAudio: vi.fn(), configureDuelAudio: vi.fn(), muteDuelAudio: vi.fn(), stopAllLines: vi.fn(),
  playMusic: vi.fn(), stopMusic: vi.fn(), trackForWave: () => 'calm',
  playSfx: vi.fn(() => Promise.resolve()),
  playLine: vi.fn((id: string, onCue?: (c: string) => void) => new Promise<void>((resolve) => pending.push({ id, resolve, onCue }))),
}))
import { useDuelGame } from './useDuelGame'
import { muteDuelAudio, playLine, unlockDuelAudio } from '../utils/duel/duelAudio'
import { markById } from '../utils/duel/marks'
import { wordsFor } from '../utils/duel/words'
import type { Round } from '../types/duel'
import type { MakeRoundOpts } from '../utils/duel/rounds'
import { useProgressStore } from '../stores/progressStore'
import { clearTelemetry, exportTelemetry } from '../utils/duel/telemetry'
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
  clearTelemetry()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})

describe('useDuelGame', () => {
  it('telemetry: what was shown where, the tap (position, latency), the outcome, assets used, and quitting mid-round', async () => {
    const { result, unmount } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    const r = result.current.state.round!
    await act(async () => { await vi.advanceTimersByTimeAsync(700) })
    const pos = r.runes.findIndex((m) => m.id === r.target.id)
    act(() => result.current.choose({ kind: 'rune', mark: r.target }))
    await flushLines()
    const r2 = result.current.state.round!
    unmount() // left mid-round: churn
    const ev = (JSON.parse(exportTelemetry()).events as Record<string, unknown>[])
    const names = ev.map((e) => e.e)
    expect(names.slice(0, 3)).toEqual(['run_start', 'line', 'line']) // intro + first instruction
    expect(ev.find((e) => e.e === 'line')).toMatchObject({ id: 'line-intro', url: expect.any(String) })
    const shown = ev.find((e) => e.e === 'round' && e.round === r.id)!
    expect(shown).toMatchObject({ type: 'A', target: r.target.id, word: r.word.key, monster: r.monster, walkMs: r.walkMs, pad: r.runes.map((m) => m.id) })
    expect(shown.picture).toEqual(expect.any(String))
    const tap = ev.find((e) => e.e === 'choice')!
    expect(tap).toMatchObject({ round: r.id, key: r.target.id, pos, correct: true })
    expect(tap.msShown as number).toBeGreaterThanOrEqual(700)
    expect(ev.find((e) => e.e === 'outcome')).toMatchObject({ round: r.id, result: 'correct' })
    expect(ev[ev.length - 1]).toMatchObject({ e: 'abandon', round: r2.id })
    for (const e of ev) expect(e.t).toEqual(expect.any(Number))
  })
  it('the lightning appears when "ברק" is spoken; a tap before the next monster casts as soon as it arrives', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    for (let guard = 0; guard < 12 && !pending.some((p) => p.id === 'line-mega'); guard++) {
      const r = result.current.state.round!
      act(() => result.current.choose({ kind: 'rune', mark: r.target }))
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      for (let g = 0; g < 10 && pending.length && !pending.some((p) => p.id === 'line-mega'); g++) {
        await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(2600) })
      }
    }
    const mega = pending.find((p) => p.id === 'line-mega')!
    expect(mega).toBeTruthy()
    expect(result.current.lightning).toBe(false) // full meter, but not yet named
    act(() => mega.onCue!('lightning'))
    expect(result.current.lightning).toBe(true)
    act(() => result.current.megaCast()) // tapped while the last explosion is still settling
    expect(result.current.state.outcome?.mega).toBeFalsy()
    await flushLines()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(result.current.state.outcome?.mega).toBe(true)
  })
  it('every 5 hits in a row is celebrated when the combo line starts', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    for (let guard = 0; guard < 12 && !pending.some((p) => p.id === 'line-combo'); guard++) {
      const r = result.current.state.round!
      act(() => result.current.choose({ kind: 'rune', mark: r.target }))
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      for (let g = 0; g < 10 && pending.length && !pending.some((p) => p.id === 'line-combo'); g++) {
        expect(result.current.celebrate).toBeNull()
        await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(2600) })
      }
    }
    expect(pending.some((p) => p.id === 'line-combo')).toBe(true)
    expect(result.current.celebrate).toMatchObject({ combo: 5 })
  })
  it('a named target lights up while its word is spoken, then fades', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(2600) })
    const how = pending.find((p) => p.id === 'line-how-A')!
    act(() => how.onCue!('picture'))
    expect(result.current.cue).toBe('picture')
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(result.current.cue).toBeNull()
  })
  it('no second wizard: the intro shows no banner (the wizard on the tower is the one speaking)', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(pending.map((p) => p.id)).toEqual(['line-intro'])
    expect(result.current.banner).toBeNull()
  })
  it('after a round: the SOUND first, then the mark name, then the picture word — each highlighted while spoken', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    const r = result.current.state.round!
    act(() => result.current.choose({ kind: 'rune', mark: r.target }))
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    const said: [string, string | null][] = []
    for (let g = 0; g < 6 && pending.length; g++) {
      said.push([pending[0].id, result.current.speaking])
      await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(600) })
    }
    expect(said.slice(0, 3)).toEqual([
      [`wiz-vowel-${r.target.group}`, 'sound'],
      [`wiz-${r.target.id}`, 'name'],
      [`wiz-word-${r.word.key}`, 'word'],
    ])
  })
  it('instructions show no look/listen icon banner (the glow cues point at the real things)', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(1500) })
    expect(pending.map((p) => p.id)).toEqual(['line-how-A'])
    expect(result.current.banner).toBeNull()
  })
  it('a beat of silence separates consecutive wizard lines (intro → instruction)', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(400) })
    expect(pending.map((p) => p.id)).toEqual([]) // still the pause after the intro
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(pending.map((p) => p.id)).toEqual(['line-how-A'])
  })
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
  it('a wrong tap is recorded as a confusion, and the next round is built from lifetime stats and confusions', async () => {
    const seen: MakeRoundOpts[] = []
    const mk = (o: MakeRoundOpts) => { seen.push(o); return { ...cRound(), id: o.id } }
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), makeRound: mk }))
    act(() => result.current.start())
    await flushLines()
    act(() => result.current.choose({ kind: 'rune', mark: markById('segol') })) // asked kamatz
    await flushLines()
    expect(useProgressStore.getState().duel.confusions).toEqual({ kamatz: { segol: 1 } })
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    await flushLines()
    expect(seen.length).toBeGreaterThan(1)
    const last = seen[seen.length - 1]
    expect(last.confusions).toEqual({ kamatz: { segol: 1 } })
    expect(last.lifetime.kamatz).toMatchObject({ seen: 1, wrong: 1 })
  })
  it('the forgiven twin tap also counts as a confusion', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), makeRound: cRound }))
    act(() => result.current.start())
    await flushLines()
    act(() => result.current.choose({ kind: 'rune', mark: markById('patach') }))
    expect(useProgressStore.getState().duel.confusions).toEqual({ kamatz: { patach: 1 } })
  })
  it('adaptive pace: after a monster reaches the tower the next one walks a little slower, and the pace is remembered', async () => {
    const mk = (o: MakeRoundOpts) => ({ ...cRound(), type: 'A' as const, id: o.id, walkMs: 3000 })
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), makeRound: mk }))
    act(() => result.current.start())
    await flushLines()
    const first = result.current.state.round!
    expect(first.walkMs).toBe(3000)
    await act(async () => { await vi.advanceTimersByTimeAsync(3100) })
    expect(result.current.state.outcome).toMatchObject({ kind: 'miss', choiceKey: null })
    for (let g = 0; g < 10 && result.current.state.round?.id === first.id; g++) {
      await flushLines()
      await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    }
    expect(result.current.state.round!.id).not.toBe(first.id)
    const w = result.current.state.round!.walkMs
    expect(w).toBeGreaterThan(3000)
    expect(w).toBeLessThanOrEqual(3000 * 1.12)
    expect(useProgressStore.getState().duel.pace).toBeGreaterThan(1)
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

const cRound = (): Round => ({
  id: 77, type: 'C', target: markById('kamatz'), runes: [markById('kamatz'), markById('patach'), markById('segol'), markById('chirik')],
  word: wordsFor('a')[0], padWords: [], monster: 'fuzzy', boss: false, walkMs: 60000,
})

describe('useDuelGame review fixes', () => {
  it('leaving while paused does not leave the app muted; a new run unmutes', async () => {
    const { result, unmount } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    act(() => result.current.pause())
    vi.mocked(muteDuelAudio).mockClear()
    unmount()
    expect(vi.mocked(muteDuelAudio)).toHaveBeenLastCalledWith(false)
    const second = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    vi.mocked(muteDuelAudio).mockClear()
    act(() => second.result.current.start())
    expect(vi.mocked(muteDuelAudio)).toHaveBeenCalledWith(false)
  })
  it('resume re-unlocks audio inside the tap', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    act(() => result.current.pause())
    vi.mocked(unlockDuelAudio).mockClear()
    act(() => result.current.resume())
    expect(vi.mocked(unlockDuelAudio)).toHaveBeenCalled()
  })
  it('a fast double tap on the forgiven twin costs nothing and records one twin', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), makeRound: cRound }))
    act(() => result.current.start())
    await flushLines()
    expect(result.current.state.round?.type).toBe('C')
    act(() => {
      result.current.choose({ kind: 'rune', mark: markById('patach') })
      result.current.choose({ kind: 'rune', mark: markById('patach') })
    })
    expect(result.current.state.hearts).toBe(3)
    expect(result.current.state.outcome).toBeNull()
    expect(useProgressStore.getState().duel.byMark.kamatz.twin).toBe(1)
    // the right answer still works afterwards
    act(() => result.current.choose({ kind: 'rune', mark: markById('kamatz') }))
    expect(result.current.state.outcome?.kind).toBe('hit')
  })
  it('the outcome speech waits for the "almost" lines to finish (no overlapping wizard voices)', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), makeRound: cRound }))
    act(() => result.current.start())
    await flushLines()
    const namesBefore = lines().filter((l) => l === 'wiz-kamatz').length // the clue itself says the name
    act(() => result.current.choose({ kind: 'rune', mark: markById('patach') }))
    act(() => result.current.choose({ kind: 'rune', mark: markById('kamatz') }))
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    // "almost" is still speaking (unresolved) → the name feedback must not have started
    expect(pending.map((p) => p.id)).toEqual(['line-almost'])
    expect(lines().filter((l) => l === 'wiz-kamatz').length).toBe(namesBefore)
    await flushLines()
    expect(lines()).toEqual(expect.arrayContaining(['line-almost', 'wiz-patach', 'wiz-kamatz']))
  })
})

describe('clues are spoken once, cleanly, by the narrator (no monster voice)', () => {
  const bRound = (): Round => ({ ...cRound(), id: 78, type: 'B', target: markById('cholam') })
  it('name screen: the clue is the mark name line; sound screen: the vowel line; never a mon- line or a changed rate', async () => {
    for (const [mk, expected] of [[cRound, 'wiz-kamatz'], [bRound, 'wiz-vowel-o']] as const) {
      vi.mocked(playLine).mockClear()
      pending.length = 0
      const { result, unmount } = renderHook(() => useDuelGame({ rng: rngConst(0.01), makeRound: mk }))
      act(() => result.current.start())
      await flushLines()
      const calls = vi.mocked(playLine).mock.calls
      expect(calls.map((c) => c[0])).toContain(expected)
      expect(calls.some((c) => String(c[0]).startsWith('mon-'))).toBe(false)
      unmount()
    }
  })
})
