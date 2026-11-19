// The tower's content seam: a course other than Hebrew gives the first duel its rounds, its runes, its spoken parts and
// the tallies its answers go to; the board, the waves and the flow stay the duel's own.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { DuelController, type DuelAudio } from './controller'
import { memoryTallies } from './tallies'
import type { TowerContent } from './content'
import { duelReducer, initialDuelState } from './reducer'
import { isCorrect } from './rules'
import type { DuelMark, Round } from '../../types/duel'
import { instantSleeper } from '../../shared/sleeper'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'
import { useDuel2Store } from '../../duel2/store'
import { Tower } from '../../duel2/components/screens/Tower'
import { memorySavePort } from '../../duel2/savePort'

const LETTERS = ['m', 's', 't', 'a']
const mark = (id: string): DuelMark => ({ id, name: id, group: 'a' })

/**
 * a Latin course's tower: four letter runes, the answer is always `m`. A sound screen (B) whose runes share one sound
 * group: by the Hebrew rules every rune would be right, by the course's only `m` is
 */
const FAKE: TowerContent = {
  makeRound: (o) => ({
    id: o.id, type: 'B', target: mark('m'), runes: LETTERS.map(mark),
    runeTexts: LETTERS.map((id) => ({ id, text: id, alphabet: 'latin' as const })),
    word: { key: 'moon', group: 'a', he: '' }, padWords: [], monster: o.boss ? 'dragon' : 'fuzzy', boss: o.boss, walkMs: 9000,
  }),
  isCorrect: (r, c) => c.kind === 'rune' && c.mark.id === r.target.id,
  isTwin: () => false,
  questionParts: (r) => [`en-ask-${r.target.id}`],
  feedbackParts: (r, plan) => [
    `en-sound-${r.target.id}`,
    ...(plan.say !== 'sound' ? [`en-name-${r.target.id}`] : []),
    ...(plan.say === 'full' ? [`en-word-${r.word.key}`] : []),
  ],
  howLine: () => ({ id: 'en-how-letter', key: 'letter', cues: ['pad'] }),
  twinParts: () => [],
  runeOf: (r: Round, i) => r.runeTexts![i],
}

function fakeAudio() {
  const said: string[] = []
  const audio: DuelAudio = {
    playLine: (id) => { said.push(id); return Promise.resolve() },
    playSfx: () => Promise.resolve(),
    lineAsset: (id) => ({ id, file: `${id}.mp3`, url: null }),
    stopAllLines: () => {}, mute: () => {}, unlock: () => {}, setLog: () => {},
  }
  return { audio, said }
}

/**
 * Awaits the flow until `done`: it runs on the virtual clock and the fake audio, so microtasks carry it; a macrotask
 * every 200 turns lets anything else in. Bounded, and cheap under load (20,000 setTimeout(0) turns timed out there).
 */
async function settle(done: () => boolean, rounds = 4000) {
  for (let i = 0; i < rounds && !done(); i++) {
    for (let j = 0; j < 200 && !done(); j++) await null
    await new Promise((r) => setTimeout(r, 0))
  }
}

const indexOfRun = (xs: string[], run: string[]) => xs.findIndex((_, i) => run.every((x, j) => xs[i + j] === x))

beforeEach(() => {
  localStorage.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
  useDuel2Store.getState().resetProgress()
})

describe('the tower on another course’s content', () => {
  it('the pad shows the course’s four Latin runes (the right one marked), and a tap on m is a right answer for m', async () => {
    vi.useFakeTimers()
    try {
      const { audio, said } = fakeAudio()
      const onAnswer = vi.fn(() => 'on' as const)
      const tallies = memoryTallies()
      const save = memorySavePort()
      const events: string[] = []
      const duel2Before = localStorage.getItem('alef-duel2')
      const duel2State = JSON.stringify(useDuel2Store.getState())
      const { container, unmount } = render(createElement(Tower, {
        view: { screen: 'tower', wave: 1, waves: 1, boss: false, visit: 1 }, paused: false, onAnswer, onDone: () => {},
        course: {
          tower: { content: FAKE, tallies: () => tallies, audio }, save: () => save,
          telemetry: { track: (e: string) => { events.push(e) }, flush: () => {} } as never,
        },
      }))
      let buttons: HTMLButtonElement[] = []
      for (let i = 0; i < 60 && !(buttons.length && !buttons[0].disabled); i++) {
        await act(async () => { await vi.advanceTimersByTimeAsync(250) })
        buttons = [...container.querySelectorAll<HTMLButtonElement>('.nd-pad button')]
      }
      expect(buttons.map((b) => b.textContent)).toEqual(LETTERS)
      expect(buttons.filter((b) => b.getAttribute('data-correct') === '1').map((b) => b.textContent)).toEqual(['m'])
      expect(container.querySelectorAll('.nd-pad svg')).toHaveLength(0)
      await act(async () => { fireEvent.click(buttons[0]) })
      expect(onAnswer).toHaveBeenCalledWith('right', 'm')
      await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
      expect(indexOfRun(said, ['en-sound-m', 'en-name-m', 'en-word-moon'])).toBeGreaterThan(-1)
      unmount()
      // what was explained is kept in the course's save, the events go to its log; Book 2's save (alef-duel2) is untouched
      expect(save.read().demosSeen).toEqual(expect.arrayContaining(['tower-intro', 'tower-screen-letter']))
      expect(events).toContain('round')
      expect(localStorage.getItem('alef-duel2')).toBe(duel2Before)
      expect(JSON.stringify(useDuel2Store.getState())).toBe(duel2State)
    } finally {
      vi.useRealTimers()
    }
  }, 60_000)

  it('says the course’s question, explanation and feedback parts in order, never a Hebrew line-how', async () => {
    const { audio, said } = fakeAudio()
    const answers: string[] = []
    const done: number[] = []
    const tallies = memoryTallies()
    const before = localStorage.getItem('alef-progress')
    const duelBefore = structuredClone(useProgressStore.getState().duel)
    const c = new DuelController({
      embedded: {
        wave: 1, waves: 1, boss: false, seen: [], onSeen: () => {},
        onAnswer: (r, m) => { answers.push(`${r}:${m}`); return 'on' }, onDone: (w) => { done.push(w) },
      },
      telemetry: { track: () => {}, flush: () => {} },
      content: FAKE, tallies, audio, sleeper: instantSleeper(), rng: () => 0.5,
    })
    let last = -1
    const stop = c.subscribe(() => {
      const s = c.getView().state
      const r = s.round
      if (!r || s.outcome || s.preview || s.paused || r.id === last) return
      last = r.id
      queueMicrotask(() => c.choose({ kind: 'rune', mark: r.target }))
    })
    c.start()
    await settle(() => done.length > 0)
    stop()
    c.destroy()

    expect(done).toEqual([1])
    expect(answers).toEqual(Array(5).fill('right:m'))
    // the first round of its kind is explained with the course's line, then its question; the first answer gets the full recap
    expect(said.filter((id) => id.startsWith('line-how-'))).toEqual([])
    const how = said.indexOf('en-how-letter')
    expect(how).toBeGreaterThan(-1)
    expect(said.filter((id) => id === 'en-how-letter')).toHaveLength(1)
    expect(said.indexOf('en-ask-m')).toBeGreaterThan(how)
    expect(indexOfRun(said, ['en-ask-m', 'en-sound-m', 'en-name-m', 'en-word-moon'])).toBeGreaterThan(how)
    // the answers went to the tower's tallies, and none to the first duel's save (alef-progress)
    expect(localStorage.getItem('alef-progress')).toBe(before)
    expect(useProgressStore.getState().duel).toEqual(duelBefore)
    const t = tallies.read()
    expect(t.byMark.m).toMatchObject({ seen: 5, correct: 5 })
    expect(t.recent.m).toBe('ooooo')
  })

  it('the course judges the tap: a rune the Hebrew rules would take is a miss when the course says so', async () => {
    const { audio } = fakeAudio()
    const answers: string[] = []
    const done: number[] = []
    const tallies = memoryTallies()
    const c = new DuelController({
      embedded: {
        wave: 1, waves: 1, boss: false, seen: [], onSeen: () => {},
        onAnswer: (r, m) => { answers.push(`${r}:${m}`); return 'over' }, onDone: (w) => { done.push(w) },
      },
      telemetry: { track: () => {}, flush: () => {} },
      content: FAKE, tallies, audio, sleeper: instantSleeper(), rng: () => 0.5,
    })
    let tapped = false
    const stop = c.subscribe(() => {
      const s = c.getView().state
      const r = s.round
      if (!r || s.outcome || s.preview || s.paused || tapped) return
      tapped = true
      const wrong = r.runes.find((m) => m.id === 's')!
      // the Hebrew rules would call it right (the same sound group)
      expect(isCorrect(r, { kind: 'rune', mark: wrong })).toBe(true)
      queueMicrotask(() => c.choose({ kind: 'rune', mark: wrong }))
    })
    c.start()
    await settle(() => done.length > 0)
    stop()
    c.destroy()
    expect(answers).toEqual(['wrong:m'])
    expect(tallies.read().confusions).toEqual({ m: { s: 1 } })
  })

  it('the reducer takes the course\'s verdict over the Hebrew rules', () => {
    const round = FAKE.makeRound({ id: 1, wave: 1, boss: false, rng: () => 0.5, lifetime: {} })
    const s = duelReducer(duelReducer({ ...initialDuelState, phase: 'playing' }, { type: 'START_AT', wave: 1, boss: false }), { type: 'ROUND_READY', round })
    const s2 = { kind: 'rune' as const, mark: round.runes[1] }
    expect(duelReducer(s, { type: 'CHOOSE', choice: s2, effect: 'gentle' }).outcome?.kind).toBe('hit')
    expect(duelReducer(s, { type: 'CHOOSE', choice: s2, effect: 'gentle', verdict: { correct: false, twin: false } }).outcome?.kind).toBe('miss')
    const twin = duelReducer(s, { type: 'CHOOSE', choice: s2, effect: 'gentle', verdict: { correct: false, twin: true } })
    expect(twin.outcome).toBeNull()
    expect(twin.twinTried).toBe('s')
    const m = { kind: 'rune' as const, mark: round.runes[0] }
    expect(duelReducer(s, { type: 'CHOOSE', choice: m, effect: 'gentle', verdict: { correct: true, twin: false } }).outcome?.kind).toBe('hit')
  })

  it('memory tallies keep twins, confusions and the pace, as the progress store does', () => {
    const t = memoryTallies({ pace: 1.2 })
    t.recordDuelRound('m', 'C', 'wrong', 1200)
    t.recordDuelRound('m', 'C', 'mega', 800, { recent: false })
    t.recordDuelTwin('m', 'C')
    t.recordDuelConfusion('m', 's')
    t.recordDuelConfusion('m', 's')
    expect(t.read()).toEqual({
      byMark: { m: { seen: 2, correct: 0, wrong: 1, timeout: 0, twin: 1, mega: 1 } },
      confusions: { m: { s: 2 } }, recent: { m: 'x' }, pace: 1.2,
    })
    t.setDuelPace(0.9)
    expect(t.read().pace).toBe(0.9)
  })
})

afterEach(() => { vi.useRealTimers() })
