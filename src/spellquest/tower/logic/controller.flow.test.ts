// The first duel's flow, driven directly (no React): the controller on the browser's timers (faked here) and an audio
// stub at its `audio` seam, so that each test ends each wizard line, and fires its cues, by hand.
// (controller.test.ts plays it on the instant clock and the kit's fake player; useDuelGame.test.tsx: the hook.)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DuelController, type DuelAudio, type DuelEmbedded, type DuelOpts } from './controller'
import { markById } from './marks'
import { wordsFor } from './words'
import type { Choice, Round } from '../types'
import type { MakeRoundOpts } from './rounds'
import { useProgressStore } from '../../../stores/progressStore'
import { createTelemetry } from '../../../shared/telemetry'
import { INITIAL_PROGRESS_STATE } from '../../../types/progress'

const pending: { id: string; resolve: () => void; onCue?: (c: string) => void }[] = []
const audio = {
  unlock: vi.fn(), mute: vi.fn(), stopAllLines: vi.fn(), setLog: vi.fn(),
  playSfx: vi.fn(() => Promise.resolve()),
  lineAsset: (id: string) => ({ id, file: id, url: `u:${id}` }),
  playLine: vi.fn((id: string, onCue?: (c: string) => void) => new Promise<void>((resolve) => pending.push({ id, resolve, onCue }))),
} satisfies DuelAudio

/** the live controllers: each test step commits them (as React rendered and ran its effects at the end of an act) */
const live = new Set<DuelController>()
/**
 * A controller with the hook's surface, on the hook's timing (`reactOnCommit`: the flow reacts to a new state when
 * React has rendered it); `unmount` = leaving the screen.
 */
function game(o: Omit<DuelOpts, 'audio' | 'reactOnCommit'>) {
  const c = new DuelController({ ...o, audio, reactOnCommit: true })
  live.add(c)
  const result = {
    get current() {
      return {
        ...c.getView(),
        start: () => c.start(),
        choose: (x: Choice) => c.choose(x),
        megaCast: () => c.megaCast(),
        pause: () => c.pause(),
        resume: () => c.resume(),
        replayClue: () => c.replay(),
      }
    },
  }
  return { c, result, unmount: () => { live.delete(c); c.destroy() } }
}
const commitAll = () => live.forEach((c) => c.commit())
/** one test step: the call, then the reactions to what it changed (an async step: once it has settled) */
function act<T>(fn: () => T): T {
  const r = fn()
  if (r instanceof Promise) {
    return r.then(async (v) => {
      // as React's act: flush, let the microtasks the reactions started run, flush again
      for (let i = 0; i < 5; i++) {
        commitAll()
        await Promise.resolve()
      }
      commitAll()
      return v
    }) as T
  }
  commitAll()
  return r
}

/** Finish spoken lines one by one, letting the timers between them run. */
const flushLines = async () => {
  for (let guard = 0; guard < 50 && pending.length; guard++) {
    await act(async () => {
      pending.shift()!.resolve()
      await vi.advanceTimersByTimeAsync(2600)
    })
  }
}
const lines = () => audio.playLine.mock.calls.map((c) => c[0])
const rngConst = (v: number) => () => v
/** the log the hook writes to (Book 2's in the tower) */
const tel = createTelemetry('t-tower', { game: 'book2' })
const exportTelemetry = () => tel.events()

beforeEach(() => {
  live.clear()
  vi.useFakeTimers()
  pending.length = 0
  audio.playLine.mockClear()
  localStorage.clear()
  tel.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})

type Emb = DuelEmbedded
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
/**
 * The tower's first visit ever: nothing seen yet, so the intro and each screen's explanation play (what the old
 * standalone page did on every run); three waves from wave 1, so the long tests never reach the visit's end.
 */
const firstVisit = (over: Partial<NonNullable<Emb>> = {}) => emb({ seen: [], waves: 3, ...over }).e

describe('DuelController', () => {
  it('telemetry: every event says via: tower and its visit, and the log keeps the run number it was given (Book 2’s run)', async () => {
    tel.setRun(7)
    const { result, unmount } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    await flushLines()
    unmount()
    const ev = exportTelemetry() as Record<string, unknown>[]
    expect(ev.length).toBeGreaterThan(1)
    for (const x of ev) expect(x).toMatchObject({ run: 7, via: 'tower', visit: 1, g: 'book2' })
    expect(ev[0]).toMatchObject({ e: 'run_start', embedded: true })
    tel.setRun(0)
  })
  it('telemetry: closing or leaving the page mid-run is recorded as an abandon (not only a pause)', async () => {
    const { c, result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    await flushLines()
    act(() => c.pageHidden())
    const ev = exportTelemetry() as Record<string, unknown>[]
    expect(ev[ev.length - 1]).toMatchObject({ e: 'abandon', reason: 'pagehide', round: result.current.state.round!.id })
  })
  it('telemetry: what was shown where, the tap (position, latency), the outcome, assets used, and quitting mid-round', async () => {
    const { result, unmount } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    await flushLines()
    const r = result.current.state.round!
    await act(async () => { await vi.advanceTimersByTimeAsync(700) })
    const pos = r.runes.findIndex((m) => m.id === r.target.id)
    act(() => result.current.choose({ kind: 'rune', mark: r.target }))
    await flushLines()
    const r2 = result.current.state.round!
    unmount() // left mid-round: churn
    const ev = (exportTelemetry() as Record<string, unknown>[])
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(2600) })
    const how = pending.find((p) => p.id === 'line-how-A')!
    act(() => how.onCue!('picture'))
    expect(result.current.cue).toBe('picture')
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(result.current.cue).toBeNull()
  })
  it('no second wizard: the intro shows no banner (the wizard on the tower is the one speaking)', async () => {
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(pending.map((p) => p.id)).toEqual(['line-intro'])
    expect(result.current.banner).toBeNull()
  })
  it('after a round: the SOUND first, then the mark name, then the picture word — each highlighted while spoken', async () => {
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(1500) })
    expect(pending.map((p) => p.id)).toEqual(['line-how-A'])
    expect(result.current.banner).toBeNull()
  })
  it('a beat of silence separates consecutive wizard lines (intro → instruction)', async () => {
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(400) })
    expect(pending.map((p) => p.id)).toEqual([]) // still the pause after the intro
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(pending.map((p) => p.id)).toEqual(['line-how-A'])
  })
  it('intro and the first-screen instruction play before the monster appears', async () => {
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    expect(result.current.state.round).toBeNull()
    await flushLines()
    expect(lines().slice(0, 2)).toEqual(['line-intro', 'line-how-A'])
    expect(result.current.state.round?.type).toBe('A')
  })
  it('the next round waits for every wizard line (name, sound, word)', async () => {
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit(), makeRound: mk })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit(), makeRound: cRound })
    act(() => result.current.start())
    await flushLines()
    act(() => result.current.choose({ kind: 'rune', mark: markById('patach') }))
    expect(useProgressStore.getState().duel.confusions).toEqual({ kamatz: { patach: 1 } })
  })
  it('adaptive pace: after a monster reaches the tower the next one walks a little slower, and the pace is remembered', async () => {
    const mk = (o: MakeRoundOpts) => ({ ...cRound(), type: 'A' as const, id: o.id, walkMs: 3000 })
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit(), makeRound: mk })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit(), makeRound: mk })
    act(() => result.current.start())
    await flushLines()
    const afterTap = async () => {
      audio.playLine.mockClear()
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit(), makeRound: mk })
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
})

const cRound = (): Round => ({
  id: 77, type: 'C', target: markById('kamatz'), runes: [markById('kamatz'), markById('patach'), markById('segol'), markById('chirik')],
  word: wordsFor('a')[0], padWords: [], monster: 'fuzzy', boss: false, walkMs: 60000,
})

describe('review fixes', () => {
  it('leaving while paused does not leave the app muted; a new run unmutes', async () => {
    const { result, unmount } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    await flushLines()
    act(() => result.current.pause())
    audio.mute.mockClear()
    unmount()
    expect(audio.mute).toHaveBeenLastCalledWith(false)
    const second = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    audio.mute.mockClear()
    act(() => second.result.current.start())
    expect(audio.mute).toHaveBeenCalledWith(false)
  })
  it('resume re-unlocks audio inside the tap', async () => {
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit() })
    act(() => result.current.start())
    await flushLines()
    act(() => result.current.pause())
    audio.unlock.mockClear()
    act(() => result.current.resume())
    expect(audio.unlock).toHaveBeenCalled()
  })
  it('a fast double tap on the forgiven twin costs nothing and records one twin', async () => {
    const { e, answers } = emb({ seen: [], waves: 3 })
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: e, makeRound: cRound })
    act(() => result.current.start())
    await flushLines()
    expect(result.current.state.round?.type).toBe('C')
    act(() => {
      result.current.choose({ kind: 'rune', mark: markById('patach') })
      result.current.choose({ kind: 'rune', mark: markById('patach') })
    })
    expect(answers).toEqual([]) // no answer for the run: no heart lost
    expect(result.current.state.outcome).toBeNull()
    expect(useProgressStore.getState().duel.byMark.kamatz.twin).toBe(1)
    // the right answer still works afterwards
    act(() => result.current.choose({ kind: 'rune', mark: markById('kamatz') }))
    expect(result.current.state.outcome?.kind).toBe('hit')
  })
  it('the outcome speech waits for the "almost" lines to finish (no overlapping wizard voices)', async () => {
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit(), makeRound: cRound })
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
      audio.playLine.mockClear()
      pending.length = 0
      const { result, unmount } = game({ telemetry: tel, rng: rngConst(0.01), embedded: firstVisit(), makeRound: mk })
      act(() => result.current.start())
      await flushLines()
      const calls = audio.playLine.mock.calls
      expect(calls.map((c) => c[0])).toContain(expected)
      expect(calls.some((c) => String(c[0]).startsWith('mon-'))).toBe(false)
      unmount()
    }
  })
})

describe('embedded in Book 2’s run (spec: one duel, Part 3)', () => {
  /** answers every monster right until `n` answers were given or the visit is done */
  async function playRight(result: ReturnType<typeof game>['result'], n: number, done: number[]) {
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

  it('two waves of five, each answer reported, then onDone once', async () => {
    const { e, answers, done } = emb()
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: e })
    act(() => result.current.start())
    expect(result.current.state).not.toHaveProperty('hearts') // the run owns the hearts
    await playRight(result, 14, done)
    expect(answers.length).toBe(10)
    expect(answers.every(([r]) => r === 'right')).toBe(true)
    expect(done).toEqual([2])
    // no next monster after the visit
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    await flushLines()
    expect(answers.length).toBe(10)
  })

  /** answers right until the wizard starts "tap the lightning" (line-mega); returns that pending line */
  async function toMegaLine(result: ReturnType<typeof game>['result']) {
    await flushLines()
    for (let guard = 0; guard < 12 && !pending.some((p) => p.id === 'line-mega'); guard++) {
      const r = result.current.state.round
      if (r && !result.current.state.outcome) act(() => result.current.choose({ kind: 'rune', mark: r.target }))
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      for (let g = 0; g < 10 && pending.length && !pending.some((p) => p.id === 'line-mega'); g++) {
        await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(2600) })
      }
    }
    return pending.find((p) => p.id === 'line-mega')
  }

  it('the מגה spell is back (the parent, 2026-11-14): after 8 hits the line plays and the lightning shows', async () => {
    const charges: number[] = []
    const { e, answers } = emb({ waves: 3, onCharge: (n) => { charges.push(n) } })
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), walkOverride: 60_000, embedded: e })
    act(() => result.current.start())
    const line = await toMegaLine(result)
    expect(line).toBeTruthy()
    expect(answers.length).toBe(8)
    expect(result.current.state.mega).toBe(8)
    expect(charges[charges.length - 1]).toBe(8)
    expect(result.current.lightning).toBe(false) // charged, but not named yet
    act(() => line!.onCue!('lightning'))
    expect(result.current.lightning).toBe(true)
  })

  it('a cast kills the monster; it is no answer for the run (no star, no streak, no heart) and not in the mastery data', async () => {
    const megas: string[] = []
    const charges: number[] = []
    const { e, answers } = emb({ waves: 3, onMega: (m) => { megas.push(m) }, onCharge: (n) => { charges.push(n) } })
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), walkOverride: 60_000, embedded: e })
    act(() => result.current.start())
    const line = await toMegaLine(result)
    act(() => line!.onCue!('lightning'))
    await flushLines()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    await flushLines()
    const r = result.current.state.round!
    expect(result.current.state.outcome).toBeNull()
    const before = useProgressStore.getState().duel
    const combo = result.current.state.combo
    const kills = result.current.state.kills
    act(() => result.current.megaCast())
    expect(result.current.state.outcome).toMatchObject({ kind: 'hit', mega: true })
    expect(result.current.state.combo).toBe(combo)
    expect(result.current.state.mega).toBe(0)
    expect(charges[charges.length - 1]).toBe(0)
    expect(answers.length).toBe(8) // not reported: no star, no towerTail, the streak and the hearts stay
    expect(megas).toEqual([r.target.id])
    const after = useProgressStore.getState().duel
    expect(after.recent?.[r.target.id]).toBe(before.recent?.[r.target.id]) // not a right answer for mastery
    expect(after.pace).toBe(before.pace)
    expect(after.byMark[r.target.id]?.mega).toBe(1) // counted on its own (the parent report's מגה column)
    expect(result.current.lightning).toBe(false)
    // the wave goes on: the kill counts toward its five
    await flushLines()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    await flushLines()
    expect(result.current.state.kills).toBe(kills + 1)
    const ev = exportTelemetry() as Record<string, unknown>[]
    expect(ev.some((x) => x.e === 'outcome' && x.result === 'mega')).toBe(true)
    expect(ev.some((x) => x.e === 'mega_tap')).toBe(true)
  })

  it('a charge carried over from the last visit: the line plays again after the first hit, then the lightning', async () => {
    const { e } = emb({ mega: 8 })
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), walkOverride: 60_000, embedded: e })
    act(() => result.current.start())
    expect(result.current.state.mega).toBe(8)
    expect(result.current.lightning).toBe(false)
    const line = await toMegaLine(result)
    expect(line).toBeTruthy()
  })

  it('a cast tapped while paused does nothing; one queued between monsters waits through a pause', async () => {
    const megas: string[] = []
    const { e } = emb({ waves: 3, onMega: (m) => { megas.push(m) } })
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), walkOverride: 60_000, embedded: e })
    act(() => result.current.start())
    const line = await toMegaLine(result)
    act(() => line!.onCue!('lightning'))
    act(() => result.current.megaCast()) // the last hit's feedback is still on: queued
    act(() => result.current.pause())
    await act(async () => { line!.resolve(); await vi.advanceTimersByTimeAsync(5000) })
    await flushLines()
    expect(megas).toEqual([])
    act(() => result.current.megaCast()) // paused: ignored
    expect(result.current.state.outcome?.mega).toBeFalsy()
    act(() => result.current.resume())
    await flushLines()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(megas.length).toBe(1)
  })

  it('onAnswer "over" stops after the feedback: no next monster', async () => {
    const { e, answers, done } = emb({ onAnswer: (r, m) => { answers.push([r, m]); return 'over' } })
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: e })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), walkOverride: 3000, embedded: e })
    act(() => result.current.start())
    await flushLines()
    await act(async () => { await vi.advanceTimersByTimeAsync(3100) })
    expect(result.current.state.outcome).toMatchObject({ kind: 'miss', choiceKey: null })
    expect(answers.map(([r]) => r)).toEqual(['wrong'])
    expect(result.current.state).not.toHaveProperty('hearts') // the run owns the hearts
  })

  it('the rounds are recorded (the adaptive data), but no session or run-end records', async () => {
    const { e, done } = emb()
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: e })
    act(() => result.current.start())
    await playRight(result, 3, done)
    const d = useProgressStore.getState().duel
    expect(d.sessions).toBe(0)
    expect(d.bestScore).toBe(0)
    expect(Object.values(d.byMark).reduce((a, t) => a + t.seen, 0)).toBe(3)
  })

  it('the gallery (dry) records nothing', async () => {
    const { e, done } = emb({ dry: true })
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: e })
    act(() => result.current.start())
    await playRight(result, 2, done)
    expect(useProgressStore.getState().duel.byMark).toEqual({})
  })

  it('the intro plays only when not seen (then it is kept)', async () => {
    const a = emb()
    const { result, unmount } = game({ telemetry: tel, rng: rngConst(0.01), embedded: a.e })
    act(() => result.current.start())
    await flushLines()
    expect(lines()).not.toContain('line-intro')
    expect(lines()).not.toContain('line-how-A')
    unmount()
    audio.playLine.mockClear()
    const b = emb({ seen: [] })
    const r2 = game({ telemetry: tel, rng: rngConst(0.01), embedded: b.e })
    act(() => r2.result.current.start())
    await flushLines()
    expect(lines()).toContain('line-intro')
    expect(b.seenNow).toEqual(['tower-intro', 'tower-screen-A'])
  })

  it('wave 5 of a normal visit does not become a boss', async () => {
    const { e, done } = emb({ wave: 4, waves: 2 })
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), embedded: e })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), walkOverride: 60_000, embedded: e })
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
    const { result } = game({ telemetry: tel, rng: Math.random, walkOverride: 60_000, embedded: e })
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
    const r1 = game({ telemetry: tel, rng: rngConst(0.01), embedded: a.e })
    act(() => r1.result.current.start())
    await playRight(r1.result, 14, a.done)
    expect(ends).toEqual([1])
    expect(a.answers.length).toBe(10)
    expect(a.done).toEqual([2])
    r1.unmount()
    const b = emb({ waves: 2, onWaveEnd: () => true })
    const r2 = game({ telemetry: tel, rng: rngConst(0.01), embedded: b.e })
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
    const { result } = game({ telemetry: tel, rng: rngConst(0.01), walkOverride: 60_000, embedded: e })
    act(() => result.current.start())
    await flushLines()
    expect(result.current.state.round?.boss).toBe(true)
    await playRight(result, 30, done)
    expect(answers.length).toBe(8)
    expect(done).toEqual([5])
  })
})
