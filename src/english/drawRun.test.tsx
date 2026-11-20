// The English drawing in the run (Task 28): the course's rounds on the Latin board. He hears the word, then its first
// sound; he writes the letter in its box; its answer counts on the letter's unit (its tallies and the stage pass), and a
// whole word on the word. A fresh save sees the drawing's demo once.
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController, type DrawView, type View } from '../duel2/controller'
import type { Course, DrawItem } from '../duel2/course/types'
import { resample, splitMarks } from '../duel2/logic/recognizer'
import { proceed, seeded } from '../duel2/testing/runHarness'
import { fakeAudio } from '../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { isMark, latinStrokesOf } from './data/strokes'
import { wordChoice } from './logic/rounds/broom'
import { unitChoice } from './logic/pick'
import { unit } from './content/units'
import { word } from './content/words'
import { memoryEnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'

const placed = (stage: number, more: Partial<EnglishSave> = {}) => memoryEnglishSavePort({
  stage: { stage, newAnswers: '' }, placement: { state: null, requested: false, done: { level: stage, answers: 5, at: 1 }, runs: 1 }, ...more,
})
/** a session of three drawing rounds */
const course = (drawWords?: Course['rounds']['drawWords']): Course => ({
  ...ENGLISH,
  rounds: { ...ENGLISH.rounds, ...(drawWords ? { drawWords } : {}) },
  stages: { ...ENGLISH.stages, sessionLength: { ...ENGLISH.stages.sessionLength, draw: 3 } },
})
const events = (e: string) => (ENGLISH.telemetry.events() as { e: string }[]).filter((x) => x.e === e) as unknown as Record<string, unknown>[]
const tick = () => act(async () => { await vi.advanceTimersByTimeAsync(50) })

/** he writes each box's letter as the data has it, then the marks still missing where the data has them */
function act1(c: RunController, marked: Set<string>, wrong = { left: 0 }) {
  const v = c.view
  const s = v.screen as DrawView | null
  if (v.needNext || v.fixing) { proceed(c); return }
  if (s?.screen !== 'draw' || v.phase !== 'answer' || s.demo) return
  const box = s.box ?? 0
  const dx = s.layout.boxes?.[box].dx ?? 0
  const at = (p: [number, number][], d: number) => resample(p, 30).map(([x, y]) => [x + d, y] as [number, number])
  if (s.strokes.some((x) => x.state === 'live' || x.state === 'pending' || x.state === 'wrong')) return
  if (s.mode === 'letter') {
    // (a new round: no mark drawn yet)
    if (!s.strokes.length) marked.clear()
    const body = splitMarks(latinStrokesOf(s.letter), isMark).body.variants[0]
    const done = s.strokes.filter((x) => (x.box ?? 0) === box && !x.mark && (x.state === 'ok' || x.state === 'helped')).length
    // (a first stroke written backwards, `wrong.left` times: the hand then draws it for him)
    if (done === 0 && wrong.left > 0) { wrong.left--; c.gesture({ type: 'stroke', pts: at([...body[0].pts].reverse(), dx) }); return }
    if (done < body.length) c.gesture({ type: 'stroke', pts: at(body[done].pts, dx) })
  } else if (s.mode === 'mark') {
    s.letters!.forEach((l, i) => {
      const m = splitMarks(latinStrokesOf(l), isMark).marks[0]
      const key = `${s.word.id}:${i}`
      if (m && !marked.has(key)) { marked.add(key); c.gesture({ type: 'stroke', pts: m.pts.map(([x, y]) => [x + (s.layout.boxes?.[i].dx ?? 0), y]) }) }
    })
  }
}
async function play(c: RunController) {
  const marked = new Set<string>()
  for (let g = 0; g < 6000 && !c.view.over; g++) { act1(c, marked); await tick() }
}

beforeEach(() => { vi.useFakeTimers(); ENGLISH.telemetry.clear(); fakeAudio.reset() })
afterEach(() => { vi.useRealTimers() })

describe('the English drawing in the run', () => {
  it('a seeded English session draws three letters on the Latin board; each counts on its unit and towards the stage', async () => {
    const save = placed(1, { demosSeen: ['demo-draw'] })
    const c = new RunController({ course: course(), save, now: () => Date.now(), rng: seeded(3), session: { screen: 'draw' } })
    c.start()
    await play(c)
    expect(c.view.over).toMatchObject({ session: true })
    const done = events('draw-done')
    expect(done).toHaveLength(3)
    // stage 1, fresh: the new letter is a (hand order), in words that start with it
    expect(done.map((x) => x.letter)).toEqual(['a', 'a', 'a'])
    expect(done.every((x) => x.wrongStrokes === 0 && x.helped === false)).toBe(true)
    const said = fakeAudio.said()
    const first = said.indexOf(`w-${done[0].word as string}`)
    expect(first).toBeGreaterThanOrEqual(0)
    expect(said[first + 1]).toBe('snd-ae')
    expect(said).not.toContain('ln-a')
    // his answers: the drawing's tally, the unit's, and the stage's new answers (a is a stage-1 unit)
    const st = save.read()
    expect(st.tallies['dr:a:print']).toMatchObject({ seen: 3, wrong: 0 })
    expect(st.tallies.a).toMatchObject({ seen: 3, wrong: 0 })
    expect(st.stage.newAnswers).toBe('ooo')
    c.destroy()
  }, 60_000)

  it('a letter the hand finished for him counts as helped on its unit, not as a wrong answer (M2); the Hebrew drawing is unchanged', async () => {
    const save = placed(1, { demosSeen: ['demo-draw'] })
    const c = new RunController({ course: course(), save, now: () => Date.now(), rng: seeded(3), session: { screen: 'draw' } })
    c.start()
    const wrong = { left: 3 }; const marked = new Set<string>()
    for (let g = 0; g < 6000 && !c.view.over; g++) { act1(c, marked, wrong); await tick() }
    expect(events('draw-done')[0]).toMatchObject({ helped: true })
    const st = save.read()
    expect(st.tallies.a).toMatchObject({ seen: 3, wrong: 0, helped: 1 })
    expect(st.tallies['dr:a:print']).toMatchObject({ seen: 3, wrong: 0 })
    c.destroy()
  }, 60_000)

  it('a whole word is written in its three boxes, the dot of i after the n; it counts on the word', async () => {
    const pin = word('pin')
    const item: DrawItem = { id: 'pin', letters: ['p', 'i', 'n'], voice: 'w-pin', alphabet: 'latin', asked: wordChoice(pin), text: 'pin' }
    const save = placed(2, { demosSeen: ['demo-draw'] })
    const c = new RunController({ course: course(() => [item]), save, now: () => Date.now(), rng: seeded(4), session: { screen: 'draw' } })
    c.start()
    await play(c)
    const done = events('draw-done')
    expect(done).toHaveLength(3)
    expect(done.every((x) => x.letter === 'pin' && x.wrongStrokes === 0)).toBe(true)
    expect(events('draw-mark').filter((x) => x.ok)).toHaveLength(3)
    expect(fakeAudio.said()).toContain('draw-dot-1')
    const st = save.read()
    expect(st.tallies['dr:i:print']).toMatchObject({ seen: 3 })
    expect(st.tallies.p).toMatchObject({ seen: 3, wrong: 0 })
    expect(st.tallies['sc:draw']).toMatchObject({ seen: 3 })
    c.destroy()
  }, 60_000)

  it('qu: he hears /kw/, the hand shows q (its letter demo), and he writes q and u in two boxes; it counts on qu', async () => {
    const item: DrawItem = { id: 'quiz', letters: ['q', 'u'], voice: 'w-quiz', firstSound: 'snd-kw', alphabet: 'latin', asked: unitChoice(unit('qu')), text: 'quiz' }
    const save = placed(3, { demosSeen: ['demo-draw'] })
    const c = new RunController({ course: course(() => [item]), save, now: () => Date.now(), rng: seeded(5), session: { screen: 'draw' } })
    c.start()
    let demo = false
    for (let g = 0; g < 6000 && !c.view.over; g++) {
      const s = c.view.screen as DrawView | null
      if (s?.screen === 'draw' && s.demo && !s.demo.hint) demo = true
      act1(c, new Set())
      await tick()
    }
    expect(demo).toBe(true)
    const v = events('draw-done')
    expect(v.map((x) => x.letter)).toEqual(['qu', 'qu', 'qu'])
    const st = save.read()
    expect(st.tallies['dr:q:print']).toMatchObject({ seen: 3 })
    expect(st.tallies['dr:u:print']).toMatchObject({ seen: 3 })
    expect(st.tallies.qu).toMatchObject({ seen: 3, wrong: 0 })
    expect(st.stage.newAnswers).toBe('ooo')
    c.destroy()
  }, 60_000)

  it('a fresh save says the drawing\'s demo line once, and keeps it seen', async () => {
    const save = placed(1)
    expect(save.read().demosSeen).not.toContain('demo-draw')
    const c = new RunController({ course: course(), save, now: () => Date.now(), rng: seeded(6), session: { screen: 'draw' } })
    c.start()
    await play(c)
    expect(fakeAudio.said().filter((id) => id === 'demo-draw-1')).toHaveLength(1)
    expect(save.read().demosSeen).toContain('demo-draw')
    const v = c.view as View
    expect(v.over).toBeTruthy()
    c.destroy()
  }, 60_000)
})
