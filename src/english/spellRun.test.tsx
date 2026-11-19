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
import type { SpellBox, SpellRound } from '../duel2/policies/spell'
import { unit } from './content/units'
import { word } from './content/words'
import { partOf } from './logic/rounds/cauldron'
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

  it('a course with no spell round at this stage ends the visit at once', async () => {
    const none: Course = { ...ENGLISH, rounds: { ...ENGLISH.rounds, spellRound: () => null } }
    const c = new RunController({ course: none, save: placed(), now: () => Date.now(), rng: seeded(7), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => !!v.over)
    expect(c.view.over).toMatchObject({ session: true, score: 0 })
    c.destroy()
  })
})

/** a unit as the English rounds make its box or tile: with the choice its answer counts on */
const box = (id: string): SpellBox => { const c = partOf(unit(id)); return { unit: id, text: c.text, soundId: c.soundId, choice: c } }
/** shop (sh · o · p) at stage 4: only sh is the stage's own unit */
const SHOP: SpellRound = { word: 'shop', wordVoice: 'w-shop', boxes: ['sh', 'o', 'p'].map(box), tiles: ['m', 'sh', 'p', 'ch', 'o'].map(box), mode: 'tiles' }
/** feet (f · ee · t) at stage 9, with ea as the near tile of ee */
const FEET: SpellRound = { word: 'feet', wordVoice: 'w-feet', boxes: ['f', 'ee', 't'].map(box), tiles: ['ea', 't', 'f', 'm', 'ee'].map(box), mode: 'tiles', near: { ea: 'ee' } }
const oneRound = (round: SpellRound): Course => ({
  ...ENGLISH, rounds: { ...ENGLISH.rounds, spellRound: () => round }, stages: { ...ENGLISH.stages, sessionLength: { ...ENGLISH.stages.sessionLength, spell: 1 } },
})
const tally = (save: ReturnType<typeof placed>, f: string) => save.read().tallies[f]
const drop = (c: RunController, tile: string, b: number) => c.gesture({ type: 'drop', tile, box: b })

describe('the spell book\'s answers count, box by box', () => {
  it('a seeded English session plays three of the course\'s own rounds; every box counts on its unit', async () => {
    const save = placed({ demosSeen: ['demo-spell'] })
    const course: Course = { ...ENGLISH, stages: { ...ENGLISH.stages, sessionLength: { ...ENGLISH.stages.sessionLength, spell: 3 } } }
    const c = new RunController({ course, save, now: () => Date.now(), rng: seeded(11), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.screen?.screen === 'spell')
    for (let k = 0; k < 3; k++) await playRound(c, false)
    await until(c, (v) => !!v.over)
    expect(c.view.over).toMatchObject({ session: true, score: 3 })
    const words = events('spell-cast').map((x) => word(x.word as string))
    expect(words).toHaveLength(3)
    const boxes = words.flatMap((w) => w.units)
    expect(tally(save, 'sc:spell')).toMatchObject({ seen: boxes.length, wrong: 0 })
    for (const u of new Set(boxes)) expect(tally(save, u)).toMatchObject({ seen: boxes.filter((x) => x === u).length, wrong: 0 })
    // the stage's own units count toward the stage pass, all right
    const own = boxes.filter((u) => unit(u).stage === 4).length
    expect(save.read().stage.newAnswers).toBe('o'.repeat(own))
    c.destroy()
  }, 60_000)

  it('a right tile is a right answer on its unit; a unit of his stage counts toward the stage pass', async () => {
    const save = placed({ demosSeen: ['demo-spell'] })
    const c = new RunController({ course: oneRound(SHOP), save, now: () => Date.now(), rng: seeded(1), session: { screen: 'spell' } })
    c.start()
    await playRound(c, false)
    await until(c, (v) => !!v.over)
    for (const u of ['sh', 'o', 'p']) expect(tally(save, u)).toMatchObject({ seen: 1, wrong: 0 })
    expect(tally(save, 'sc:spell')).toMatchObject({ seen: 3, wrong: 0 })
    expect(save.read().stage.newAnswers).toBe('o')
    c.destroy()
  }, 60_000)

  it('a wrong tile is a miss on that box\'s unit (his mix-up is kept); the fix after it is no second answer', async () => {
    const save = placed({ demosSeen: ['demo-spell'] })
    const c = new RunController({ course: oneRound(SHOP), save, now: () => Date.now(), rng: seeded(1), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    drop(c, 'ch', 0)
    await until(c, (v) => !!v.fixing)
    expect(tally(save, 'sh')).toMatchObject({ seen: 1, wrong: 1 })
    expect(save.read().stage.newAnswers).toBe('x')
    expect(save.read().confusions.letters.sh).toEqual({ ch: 1 })
    drop(c, 'sh', 0)
    await playRound(c, false)
    await until(c, (v) => !!v.over)
    expect(tally(save, 'sh')).toMatchObject({ seen: 1, wrong: 1 })
    expect(tally(save, 'o')).toMatchObject({ seen: 1, wrong: 0 })
    expect(save.read().stage.newAnswers).toBe('x')
    c.destroy()
  }, 60_000)

  it('a forgiven near tile is a right answer on its box\'s unit (once: the right tile after it is no second answer)', async () => {
    const save = placed({ demosSeen: ['demo-spell'], stage: { stage: 9, newAnswers: '' } })
    const c = new RunController({ course: oneRound(FEET), save, now: () => Date.now(), rng: seeded(1), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    drop(c, 'f', 0)
    await wait(50)
    drop(c, 'ea', 1)
    await until(c, (v) => spell(v).glow === 'ee')
    expect(tally(save, 'ee')).toMatchObject({ seen: 1, wrong: 0 })
    expect(tally(save, 'ea')).toBeUndefined()
    expect(save.read().stage.newAnswers).toBe('o')
    expect(events('spell-near')).toHaveLength(1)
    await playRound(c, false)
    await until(c, (v) => !!v.over)
    expect(tally(save, 'ee')).toMatchObject({ seen: 1, wrong: 0 })
    expect(tally(save, 't')).toMatchObject({ seen: 1, wrong: 0 })
    expect(save.read().stage.newAnswers).toBe('o')
    // a clean cast: the near tile was no mistake
    expect(events('spell-cast')).toEqual([expect.objectContaining({ mistakes: 0 })])
    c.destroy()
  }, 60_000)
})

describe('an empty spell visit', () => {
  it('is no checkpoint: the screen after it comes with no merchant\'s checkpoint between', async () => {
    const none: Course = { ...ENGLISH, rounds: { ...ENGLISH.rounds, spellRound: () => null } }
    // a run that starts after the doors: the spell book, which has no round, then the next screen (the drawing off: the tower)
    const settings = { ...memoryEnglishSavePort().read().settings, drawing: false }
    const save = placed({ lastEnded: 'doors', demosSeen: ['demo-spell'], settings })
    const checkpoints = vi.spyOn(save, 'noteCheckpoint')
    const c = new RunController({ course: none, save, now: () => Date.now(), rng: seeded(3) })
    c.start()
    await until(c, (v) => !!v.screen && v.screen.screen !== 'spell')
    expect(c.view.screen?.screen).toBe('tower')
    expect(checkpoints).not.toHaveBeenCalled()
    expect(events('merchant-arrive')).toEqual([])
    c.destroy()
  }, 60_000)
})
