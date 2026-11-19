// The spell book in the run (Task 24): the visit runs the spell policy (policies/spell.ts). The English rounds come in
// Task 25, so the course here gives the gallery's fixture round (fish: f · i · sh). A right tile fills its box, the last
// casts the spell (a star when no mistake came on the way); a wrong tile costs a heart, as on the calm screens, and he
// fixes it himself; a fresh save sees the demo once.
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController, type SpellView, type View } from '../duel2/controller'
import type { Course } from '../duel2/course/types'
import { spellFixture } from '../duel2/data/spellFixtures'
import { seeded, until } from '../duel2/testing/runHarness'
import { fakeAudio } from '../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { memoryEnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'

/** the English course with the fixture as its spell round, and a session of three rounds */
const COURSE: Course = {
  ...ENGLISH,
  rounds: { ...ENGLISH.rounds, spellRound: () => spellFixture(ENGLISH) },
  stages: { ...ENGLISH.stages, sessionLength: { ...ENGLISH.stages.sessionLength, spell: 3 } },
}
const placed = (more: Partial<EnglishSave> = {}) => memoryEnglishSavePort({
  stage: { stage: 4, newAnswers: '' }, placement: { state: null, requested: false, done: { level: 4, answers: 5, at: 1 }, runs: 1 }, ...more,
})
const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const spell = (v: View) => v.screen as SpellView
const events = (e: string) => (ENGLISH.telemetry.events() as { e: string }[]).filter((x) => x.e === e) as unknown as Record<string, unknown>[]

/** he drops the right tile into each empty box (on a `wrong` round, a wrong tile into the second first, then he fixes it) */
async function playRound(c: RunController, wrong: boolean) {
  // (the round before is cast: the next one starts)
  await until(c, (v) => (v.screen?.screen === 'spell' && !spell(v).alive) || !!v.over)
  if (c.view.over) return
  const n = spell(c.view).round.boxes.filter((_, i) => spell(c.view).filled[i] === null).length
  for (let k = 0; k < n; k++) {
    // (after a mistake: he does the right move himself)
    await until(c, (v) => v.phase === 'answer' || !!v.fixing || !!v.over)
    if (c.view.over) return
    const s = spell(c.view)
    const box = s.filled.findIndex((x) => x === null)
    const unit = s.round.boxes[box].unit
    if (wrong && k === 1) {
      c.gesture({ type: 'drop', tile: s.round.tiles.find((t) => !s.round.boxes.some((b) => b.unit === t.unit))!.unit, box })
      await until(c, (v) => !!v.fixing || !!v.over)
      if (c.view.over) return
      expect(spell(c.view).glow).toBe(unit)
    }
    c.gesture({ type: 'drop', tile: unit, box })
  }
  await until(c, (v) => spell(v).alive || !!v.over)
}

beforeEach(() => { vi.useFakeTimers(); ENGLISH.telemetry.clear(); fakeAudio.reset() })
afterEach(() => { vi.useRealTimers() })

describe('the spell book in the run', () => {
  it('a seeded English session plays its three spell rounds to the end; a wrong tile is fixed, and only a clean cast earns a star', async () => {
    const save = placed({ demosSeen: ['demo-spell'] })
    const c = new RunController({ course: COURSE, save, now: () => Date.now(), rng: seeded(4), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.screen?.screen === 'spell')
    for (const wrong of [false, true, false]) await playRound(c, wrong)
    await until(c, (v) => !!v.over)
    expect(c.view.over).toMatchObject({ session: true, score: 2 })
    expect(events('spell-cast').map((x) => x.mistakes)).toEqual([0, 1, 0])
    expect(events('spell-drop').filter((x) => x.ok === false)).toEqual([expect.objectContaining({ box: 1, tile: 'ch', unit: 'i' })])
    expect(events('fix')).toEqual([expect.objectContaining({ screen: 'spell', target: 'snd-ih' })])
    // each cast is one answer on the word: two right, one after a mistake
    expect(save.read().tallies['spell:fish']).toMatchObject({ seen: 3, wrong: 1 })
    // he hears each box's sound as it lands, then the word
    const said = fakeAudio.said()
    expect(said).toEqual(expect.arrayContaining(['w-fish', 'snd-f', 'snd-ih', 'snd-sh']))
    expect(said).not.toContain('demo-spell-1')
    c.destroy()
  }, 60_000)

  it('a wrong tile costs a heart; when the hearts run out the run ends there', async () => {
    const save = placed({ demosSeen: ['demo-spell'] })
    const c = new RunController({ course: COURSE, save, now: () => Date.now(), rng: seeded(5), force: { screen: 'spell', stage: 4 } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    const start = c.view.hearts
    expect(start).toBe(3)
    for (let k = 1; k <= start; k++) {
      await until(c, (v) => (v.phase === 'answer' && !v.fixing) || !!v.over)
      const s = spell(c.view)
      c.gesture({ type: 'drop', tile: 'o', box: s.filled.findIndex((x) => x === null) })
      await until(c, (v) => v.hearts === start - k || !!v.over)
      expect(c.view.hearts).toBe(start - k)
      if (k < start) {
        await until(c, (v) => !!v.fixing)
        if (k === 1) {
          // while he waits, the right tile's sound again every 8 s
          const n = () => fakeAudio.said().filter((id) => id === 'snd-f').length
          const before = n()
          await wait(16_100)
          expect(n() - before).toBe(2)
        }
        // he fixes it: the rest of the word, and the next round
        await playRound(c, false)
      }
    }
    await until(c, (v) => !!v.over)
    expect(c.view.over).toBeTruthy()
    expect(events('spell-cast')).toHaveLength(start - 1)
    expect(events('fix')[0]).toMatchObject({ screen: 'spell', target: 'snd-f', replays: 2 })
    c.destroy()
  }, 60_000)

  it('a fresh save says the spell book\'s demo line once, and keeps it seen', async () => {
    const save = placed()
    expect(save.read().demosSeen).not.toContain('demo-spell')
    const c = new RunController({ course: COURSE, save, now: () => Date.now(), rng: seeded(6), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    expect(fakeAudio.said().filter((id) => id === 'demo-spell-1')).toHaveLength(1)
    expect(save.read().demosSeen).toContain('demo-spell')
    expect(events('demo')).toEqual([expect.objectContaining({ demo: 'demo-spell' })])
    await playRound(c, false)
    await until(c, (v) => v.phase === 'answer' || !!v.over)
    expect(fakeAudio.said().filter((id) => id === 'demo-spell-1')).toHaveLength(1)
    c.destroy()
  }, 60_000)

  it('the ? and his wait: the next tile glows (a touch takes it away), the word again after 8 s, the hint by itself after 16 s', async () => {
    const c = new RunController({ course: COURSE, save: placed({ demosSeen: ['demo-spell'] }), now: () => Date.now(), rng: seeded(8), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    expect(c.view.hintAvailable).toBe(true)
    c.hint()
    expect(spell(c.view).glow).toBe('f')
    c.gesture({ type: 'touch', by: 'answer' })
    expect(spell(c.view).glow).toBeUndefined()
    expect(events('hint-stop')).toHaveLength(1)
    c.gesture({ type: 'drop', tile: 'f', box: 0 })
    const from = fakeAudio.said().length
    c.replay()
    await wait(50)
    expect(fakeAudio.said().slice(from)).toContain('w-fish')
    expect(events('replay')).toEqual([expect.objectContaining({ screen: 'spell', target: 'fish' })])
    await wait(8_050)
    expect(events('idle')).toEqual([expect.objectContaining({ screen: 'spell', target: 'fish' })])
    expect(spell(c.view).glow).toBeUndefined()
    await wait(8_000)
    expect(events('hint').map((x) => x.auto)).toEqual([false, true])
    expect(spell(c.view).glow).toBe('i')
    c.destroy()
  })

  it('a course with no spell round at this stage ends the visit at once (the English course until Task 25)', async () => {
    const c = new RunController({ course: ENGLISH, save: placed(), now: () => Date.now(), rng: seeded(7), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => !!v.over)
    expect(c.view.over).toMatchObject({ session: true, score: 0 })
    c.destroy()
  })
})
