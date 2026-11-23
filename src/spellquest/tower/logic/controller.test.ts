// @vitest-environment jsdom

// the tower's flow on its seams: a clock that never waits (instantSleeper) and the audio kit's fake player.
import { beforeEach, describe, expect, it } from 'vitest'
import { TowerController, type TowerEmbedded } from './controller'
import { MONSTERS_PER_WAVE } from './rules'
import { instantSleeper } from '../../../shared/sleeper'
import { installFakeAudio } from '../../../shared/gameAudio/fakePlayer'
import { useProgressStore } from '../../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../../types/progress'

const audio = installFakeAudio()

beforeEach(() => {
  localStorage.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})

/** every screen already explained, the intro heard: the visit goes straight to its monsters */
const SEEN = ['tower-intro', 'tower-screen-A', 'tower-screen-B', 'tower-screen-C', 'tower-screen-D', 'tower-screen-silent']

/** lets the flow go on: the instant clock pumps on microtasks, the audio kit's cue timers on the real ones */
async function until(pred: () => boolean, what: string) {
  for (let i = 0; i < 5000 && !pred(); i++) await new Promise((r) => setTimeout(r, 0))
  if (!pred()) throw new Error(`condition not met: ${what}`)
}

function make(over: Partial<TowerEmbedded> = {}) {
  const answers: [string, string][] = []
  const done: number[] = []
  const events: { e: string; data: Record<string, unknown> }[] = []
  const embedded: TowerEmbedded = {
    wave: 1, waves: 1, boss: false, seen: SEEN, onSeen: () => {},
    onAnswer: (r, m) => { answers.push([r, m]); return 'on' },
    onDone: (w) => { done.push(w) },
    ...over,
  }
  const c = new TowerController({
    embedded, rng: () => 0.01, sleeper: instantSleeper(),
    telemetry: { track: (e, data = {}) => { events.push({ e, data }) }, flush: () => {} },
  })
  return { c, answers, done, events }
}

/** he taps the right mark as soon as a monster can be answered (before the instant clock lets it reach the tower) */
function answerRight(c: TowerController) {
  let last = -1
  return c.subscribe(() => {
    const s = c.getView().state
    const r = s.round
    if (!r || s.outcome || s.preview || s.paused || r.id === last) return
    last = r.id
    queueMicrotask(() => c.choose(r.type === 'D' ? { kind: 'sound', group: r.target.group } : { kind: 'rune', mark: r.target }))
  })
}

describe('TowerController', () => {
  it('plays one wave: each right answer goes to the run, the recap is sound → name → word, then the visit ends', async () => {
    const { c, answers, done, events } = make()
    const stop = answerRight(c)
    c.start()
    await until(() => done.length > 0, 'the visit ends')
    stop()
    expect(answers).toHaveLength(MONSTERS_PER_WAVE)
    expect(answers.every(([r]) => r === 'right')).toBe(true)
    expect(done).toEqual([1])
    // the first answer gets the full recap (the first time this mark comes up)
    const said = audio.said()
    const first = events.find((x) => x.e === 'round')!.data as { target: string }
    const i = said.findIndex((id) => id.startsWith('wiz-vowel-'))
    expect(said[i + 1]).toBe(`wiz-${first.target}`)
    expect(said[i + 2]).toMatch(/^wiz-word-/)
    // every event says it came from the tower, from this visit
    expect(events.length).toBeGreaterThan(0)
    for (const x of events) expect(x.data).toMatchObject({ via: 'tower', visit: 1 })
    expect(events.filter((x) => x.e === 'outcome')).toHaveLength(MONSTERS_PER_WAVE)
    // the adaptive data is the tower's
    expect(Object.values(useProgressStore.getState().tower.byMark).reduce((n, t) => n + t.correct, 0)).toBe(MONSTERS_PER_WAVE)
    c.destroy()
  })

  it('a pause holds the monster on the field; the resume brings it back from the edge', async () => {
    const { c } = make({ waves: 3 })
    // paused as soon as the first monster is on the field (the instant clock would let it reach the tower)
    let paused = false
    const stop = c.subscribe(() => {
      if (!paused && c.getView().state.round) { paused = true; queueMicrotask(() => c.pause()) }
    })
    c.start()
    await until(() => c.getView().state.paused, 'the pause')
    stop()
    // the paused field waits: nothing times out
    await new Promise((r) => setTimeout(r, 20))
    expect(c.getView().state.outcome).toBeNull()
    const r = c.getView().state.round!
    expect(audio.muted).toBe(true)
    c.resume()
    expect(audio.muted).toBe(false)
    expect(c.getView().state.round!.id).not.toBe(r.id)
    expect(c.getView().state.round!.target.id).toBe(r.target.id)
    c.destroy()
  })
})
