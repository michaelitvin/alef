import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const pending: { id: string; resolve: () => void; onCue?: (c: string) => void }[] = []
vi.mock('../utils/duel/duelAudio', () => ({
  unlockDuelAudio: vi.fn(), preloadDuelAudio: vi.fn(), configureDuelAudio: vi.fn(), muteDuelAudio: vi.fn(), stopAllLines: vi.fn(),
  playMusic: vi.fn(), stopMusic: vi.fn(), trackForWave: () => 'calm',
  playSfx: vi.fn(() => Promise.resolve()),
  lineAsset: (id: string) => ({ id, file: id, url: `u:${id}` }),
  playLine: vi.fn((id: string, onCue?: (c: string) => void) => new Promise<void>((resolve) => pending.push({ id, resolve, onCue }))),
}))
import { useDuelGame } from './useDuelGame'
import { muteDuelAudio, playLine, playMusic, unlockDuelAudio } from '../utils/duel/duelAudio'
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
  it('telemetry: closing or leaving the page mid-run is recorded as an abandon (not only a pause)', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    const ev = JSON.parse(exportTelemetry()).events as Record<string, unknown>[]
    expect(ev[ev.length - 1]).toMatchObject({ e: 'abandon', reason: 'pagehide', round: result.current.state.round!.id })
  })
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
  it('things appear when they are said: the tower at "המגדל"; the picture and the marks at their words', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    expect(result.current.hidden).toEqual(['tower'])
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    const intro = pending.find((p) => p.id === 'line-intro')!
    act(() => intro.onCue!('tower'))
    expect(result.current.hidden).toEqual([])
    await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(1500) })
    const how = pending.find((p) => p.id === 'line-how-A')!
    // the round is on screen (monster waiting at the edge) while the wizard explains it
    expect(result.current.state.round).not.toBeNull()
    expect(result.current.state.walking).toBe(false)
    expect(result.current.hidden).toEqual(['picture', 'pad'])
    act(() => how.onCue!('picture'))
    expect(result.current.hidden).toEqual(['pad'])
    const r = result.current.state.round!
    act(() => result.current.choose({ kind: 'rune', mark: r.target })) // too early: still explaining
    expect(result.current.state.outcome).toBeNull()
    act(() => how.onCue!('pad'))
    expect(result.current.hidden).toEqual([])
    await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(100) })
    expect(result.current.state.round!.id).toBe(r.id) // the same round, now walking
    expect(result.current.state.walking).toBe(true)
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
  it('shorter feedback: first time this game → full recap; later, a quick right answer on a strong mark → just the sound', async () => {
    useProgressStore.setState({ duel: { ...useProgressStore.getState().duel,
      byMark: { kamatz: { seen: 40, correct: 40, wrong: 0, timeout: 0, twin: 0, mega: 0 } }, recent: { kamatz: 'oooooooo' } } })
    const mk = (o: MakeRoundOpts) => ({ ...cRound(), type: 'A' as const, id: o.id, walkMs: 60000 })
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), makeRound: mk }))
    act(() => result.current.start())
    await flushLines()
    const afterTap = async () => {
      vi.mocked(playLine).mockClear()
      act(() => result.current.choose({ kind: 'rune', mark: markById('kamatz') }))
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      const said: string[] = []
      for (let g = 0; g < 6 && pending.length; g++) {
        said.push(pending[0].id)
        await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(800) })
      }
      return said
    }
    expect((await afterTap()).slice(0, 3)).toEqual(['wiz-vowel-a', 'wiz-kamatz', expect.stringMatching(/^wiz-word-/)])
    await flushLines()
    const second = await afterTap()
    expect(second[0]).toBe('wiz-vowel-a')
    expect(second).not.toContain('wiz-kamatz')
  })
  it('a defeated boss is congratulated first, then the usual recap', async () => {
    const mk = (o: MakeRoundOpts) => ({ ...cRound(), type: 'A' as const, id: o.id, boss: true, monster: 'dragon', walkMs: 60000 })
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), makeRound: mk }))
    act(() => result.current.start())
    await flushLines()
    act(() => result.current.choose({ kind: 'rune', mark: markById('kamatz') }))
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(result.current.state.outcome).toMatchObject({ kind: 'hit', final: true })
    const said: string[] = []
    for (let g = 0; g < 6 && pending.length; g++) {
      said.push(pending[0].id)
      await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(800) })
    }
    expect(said[0]).toBe('line-boss-win')
    expect(said[1]).toBe('wiz-vowel-a')
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

describe('embedded in Book 2’s run (spec: one duel, Part 3)', () => {
  type Emb = NonNullable<Parameters<typeof useDuelGame>[0]>['embedded']
  function emb(over: Partial<NonNullable<Emb>> = {}) {
    const answers: [string, string][] = []
    const done: number[] = []
    const seenNow: string[] = []
    const e: NonNullable<Emb> = {
      wave: 1, waves: 2, boss: false, seen: ['tower-intro', 'tower-screen-A', 'tower-screen-B', 'tower-screen-C', 'tower-screen-silent'],
      onSeen: (k) => { seenNow.push(k) }, onAnswer: (r, m) => { answers.push([r, m]); return 'on' }, onDone: (w) => { done.push(w) },
      ...over,
    }
    return { e, answers, done, seenNow }
  }
  /** answers every monster right until `n` answers were given or the visit is done */
  async function playRight(result: { current: ReturnType<typeof useDuelGame> }, n: number, done: number[]) {
    await flushLines()
    for (let k = 0; k < n && !done.length; k++) {
      const r = result.current.state.round
      if (!r || result.current.state.outcome) { await flushLines(); continue }
      act(() => result.current.choose({ kind: 'rune', mark: r.target }))
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      await flushLines()
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      await flushLines()
    }
  }

  it('two waves of five, each answer reported, then onDone once; no מגה line and no lightning', async () => {
    const { e, answers, done } = emb()
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), embedded: e }))
    act(() => result.current.start())
    expect(result.current.state.hearts).toBe(Infinity)
    await playRight(result, 14, done)
    expect(answers.length).toBe(10)
    expect(answers.every(([r]) => r === 'right')).toBe(true)
    expect(done).toEqual([2])
    expect(lines()).not.toContain('line-mega')
    expect(result.current.lightning).toBe(false)
    expect(result.current.state.mega).toBe(0)
    // no next monster after the visit
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    await flushLines()
    expect(answers.length).toBe(10)
  })

  it('onAnswer "over" stops after the feedback: no next monster', async () => {
    const { e, answers, done } = emb({ onAnswer: (r, m) => { answers.push([r, m]); return 'over' } })
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), embedded: e }))
    act(() => result.current.start())
    await flushLines()
    const r = result.current.state.round!
    const wrong = r.runes.find((m) => m.group !== r.target.group)!
    act(() => result.current.choose({ kind: 'rune', mark: wrong }))
    expect(done).toEqual([])
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    await flushLines()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(answers).toEqual([['wrong', r.target.id]])
    expect(done).toEqual([1])
    expect(result.current.state.round!.id).toBe(r.id)
    expect(result.current.state.next).toBeNull()
  })

  it('a monster that reaches the tower is a wrong answer for the run', async () => {
    const { e, answers } = emb()
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), walkOverride: 3000, embedded: e }))
    act(() => result.current.start())
    await flushLines()
    await act(async () => { await vi.advanceTimersByTimeAsync(3100) })
    expect(answers.map(([r]) => r)).toEqual(['wrong'])
    expect(result.current.state.hearts).toBe(Infinity)
  })

  it('no session or run-end records, but the rounds are recorded (the adaptive data)', async () => {
    const { e, done } = emb()
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), embedded: e }))
    act(() => result.current.start())
    await playRight(result, 3, done)
    const d = useProgressStore.getState().duel
    expect(d.sessions).toBe(0)
    expect(d.bestScore).toBe(0)
    expect(Object.values(d.byMark).reduce((a, t) => a + t.seen, 0)).toBe(3)
  })

  it('the gallery (dry) records nothing', async () => {
    const { e, done } = emb({ dry: true })
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), embedded: e }))
    act(() => result.current.start())
    await playRight(result, 2, done)
    expect(useProgressStore.getState().duel.byMark).toEqual({})
  })

  it('the intro plays only when not seen (then it is kept); no duel music', async () => {
    vi.mocked(playMusic).mockClear()
    const a = emb()
    const { result, unmount } = renderHook(() => useDuelGame({ rng: rngConst(0.01), embedded: a.e }))
    act(() => result.current.start())
    await flushLines()
    expect(lines()).not.toContain('line-intro')
    expect(lines()).not.toContain('line-how-A')
    unmount()
    vi.mocked(playLine).mockClear()
    const b = emb({ seen: [] })
    const r2 = renderHook(() => useDuelGame({ rng: rngConst(0.01), embedded: b.e }))
    act(() => r2.result.current.start())
    await flushLines()
    expect(lines()).toContain('line-intro')
    expect(b.seenNow).toEqual(['tower-intro', 'tower-screen-A'])
    expect(vi.mocked(playMusic)).not.toHaveBeenCalled()
  })

  it('wave 5 of a normal visit does not become a boss', async () => {
    const { e, done } = emb({ wave: 4, waves: 2 })
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), embedded: e }))
    act(() => result.current.start())
    const bosses: boolean[] = []
    await flushLines()
    for (let k = 0; k < 14 && !done.length; k++) {
      const r = result.current.state.round
      if (!r || result.current.state.outcome) { await flushLines(); continue }
      bosses.push(r.boss)
      act(() => result.current.choose({ kind: 'rune', mark: r.target }))
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      await flushLines()
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      await flushLines()
    }
    expect(bosses.length).toBe(10)
    expect(bosses.some(Boolean)).toBe(false)
    expect(done).toEqual([5])
  })

  it('owed monsters (a boss visit jumped their waves) are introduced at the start of a wave, and never appear before', async () => {
    const intro: string[] = []
    const { e, done } = emb({ wave: 9, waves: 2, owed: ['ghost', 'bat'], onIntroduced: (id) => { intro.push(id) } })
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), walkOverride: 60_000, embedded: e }))
    act(() => result.current.start())
    const seen: { wave: number; monster: string }[] = []
    await flushLines()
    for (let k = 0; k < 40 && !done.length; k++) {
      const r = result.current.state.round
      if (!r || result.current.state.outcome) { await flushLines(); await act(async () => { await vi.advanceTimersByTimeAsync(3000) }); continue }
      seen.push({ wave: result.current.state.wave, monster: r.monster })
      act(() => result.current.choose({ kind: 'rune', mark: r.target }))
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      await flushLines()
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      await flushLines()
    }
    expect(seen.length).toBe(10)
    expect(intro).toEqual(['ghost', 'bat'])
    expect(lines().filter((l) => l === 'line-new-monster').length).toBe(2)
    // the first monster of each wave is the one just introduced; bat never comes before its introduction
    expect(seen[0].monster).toBe('ghost')
    expect(seen[5].monster).toBe('bat')
    expect(seen.slice(0, 5).some((x) => x.monster === 'bat')).toBe(false)
  })

  it('placement: the first ten monsters ask the ten marks once each', async () => {
    const { e, done } = emb({ placement: true })
    const { result } = renderHook(() => useDuelGame({ rng: Math.random, walkOverride: 60_000, embedded: e }))
    act(() => result.current.start())
    const asked: string[] = []
    await flushLines()
    for (let k = 0; k < 30 && !done.length; k++) {
      const r = result.current.state.round
      if (!r || result.current.state.outcome) { await flushLines(); await act(async () => { await vi.advanceTimersByTimeAsync(3000) }); continue }
      asked.push(r.target.id)
      act(() => result.current.choose({ kind: 'rune', mark: r.target }))
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      await flushLines()
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      await flushLines()
    }
    expect(asked.length).toBe(10)
    expect(new Set(asked).size).toBe(10)
  })

  it('onWaveEnd is asked at the end of each wave but the last; true ends the visit there', async () => {
    const ends: number[] = []
    const a = emb({ waves: 2, onWaveEnd: (w) => { ends.push(w); return false } })
    const r1 = renderHook(() => useDuelGame({ rng: rngConst(0.01), embedded: a.e }))
    act(() => r1.result.current.start())
    await playRight(r1.result, 14, a.done)
    expect(ends).toEqual([1])
    expect(a.answers.length).toBe(10)
    expect(a.done).toEqual([2])
    r1.unmount()
    const b = emb({ waves: 2, onWaveEnd: () => true })
    const r2 = renderHook(() => useDuelGame({ rng: rngConst(0.01), embedded: b.e }))
    act(() => r2.result.current.start())
    await playRight(r2.result, 14, b.done)
    expect(b.answers.length).toBe(5)
    expect(b.done).toEqual([1])
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    await flushLines()
    expect(b.answers.length).toBe(5)
  })

  it('a boss visit is the boss alone: its defeat ends the visit', async () => {
    const { e, answers, done } = emb({ wave: 5, boss: true })
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01), walkOverride: 60_000, embedded: e }))
    act(() => result.current.start())
    await flushLines()
    expect(result.current.state.round?.boss).toBe(true)
    await playRight(result, 30, done)
    expect(answers.length).toBe(8)
    expect(done).toEqual([5])
  })
})
