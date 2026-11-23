// The spell book in the run (Task 24): the visit runs the spell policy (policies/spell.ts). The English rounds come in
// Task 25, so the course here gives the gallery's fixture round (fish: f · i · sh). A right tile fills its box, the last
// casts the spell (a star when no mistake came on the way); a wrong tile costs a heart, as on the calm screens, and he
// fixes it himself; a fresh save sees the demo once.
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController, type SpellView, type View } from '../controller'
import type { Course } from '../course/types'
import { spellFixture } from '../data/spellFixtures'
import { seeded, until } from '../testing/runHarness'
import { fakeAudio } from '../../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { memoryEnglishSavePort } from './savePort'
import type { SpellBox, SpellRound } from '../policies/spell'
import { unit } from './content/units'
import { word } from './content/words'
import { partOf } from './logic/rounds/cauldron'
import type { EnglishSave } from './saveFormat'
import { resample, splitMarks } from '../logic/recognizer'
import { isMark, latinStrokesOf } from './data/strokes'

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

describe('a pause in the spell book', () => {
  it('the same round again after a pause counts its answered box once', async () => {
    const save = placed({ demosSeen: ['demo-spell'] })
    const c = new RunController({ course: oneRound(SHOP), save, now: () => Date.now(), rng: seeded(1), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    drop(c, 'sh', 0)
    await until(c, (v) => spell(v).filled[0] === 'sh')
    expect(save.read().stage.newAnswers).toBe('o')
    c.pause()
    c.resume()
    // the round starts again, its boxes empty
    await until(c, (v) => v.phase === 'answer' && spell(v).filled.every((x) => x === null))
    expect(spell(c.view).round.word).toBe('shop')
    await playRound(c, false)
    await until(c, (v) => !!v.over)
    expect(tally(save, 'sh')).toMatchObject({ seen: 1, wrong: 0 })
    expect(tally(save, 'o')).toMatchObject({ seen: 1 })
    expect(save.read().stage.newAnswers).toBe('o')
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

describe('the spell book\'s written words in the run (stage 4 on)', () => {
  /** every letter written alone on the drawing screen: the course's rounds from stage 4 are written */
  const alone = Object.fromEntries([...'abcdefghijklmnopqrstuvwxyz'].map((l) => [`dr:${l}:print`, { seen: 1 }]))
  const tick = () => act(async () => { await vi.advanceTimersByTimeAsync(50) })
  /** he writes each letter in its box as the data has it, then the marks still missing where his letters put them */
  function writeOne(c: RunController) {
    const v = c.view
    const s = v.screen as SpellView | null
    if (s?.screen !== 'spell' || !s.write || s.alive) return
    if (!(v.phase === 'answer' || (v.phase === 'mistake' && v.fixing))) return
    const W = s.write
    if (W.strokes.some((x) => x.state === 'live' || x.state === 'pending')) return
    if (W.mode === 'mark') { c.gesture({ type: 'stroke', pts: W.owed![0] }); return }
    if (W.mode !== 'letter') return
    const dx = W.layout.boxes![W.at].dx
    const body = splitMarks(latinStrokesOf(W.letters[W.at]), isMark).body.variants[0]
    const done = W.strokes.filter((x) => x.box === W.at && !x.mark && (x.state === 'ok' || x.state === 'helped')).length
    if (done < body.length) c.gesture({ type: 'stroke', pts: resample(body[done].pts, 30).map(([x, y]) => [x + dx, y] as [number, number]) })
  }
  async function play(c: RunController) { for (let g = 0; g < 6000 && !c.view.over; g++) { writeOne(c); await tick() } }

  it('a seeded session writes the course\'s words letter by letter; every unit counts once, also a unit of two letters', async () => {
    const save = placed({ demosSeen: ['demo-spell', 'demo-spell-write'], tallies: alone })
    const course: Course = { ...ENGLISH, stages: { ...ENGLISH.stages, sessionLength: { ...ENGLISH.stages.sessionLength, spell: 3 } } }
    const c = new RunController({ course, save, now: () => Date.now(), rng: seeded(12), session: { screen: 'spell' } })
    c.start()
    await play(c)
    expect(c.view.over).toMatchObject({ session: true, score: 3 })
    const casts = events('spell-cast')
    expect(casts.map((x) => x.mode)).toEqual(['write', 'write', 'write'])
    expect(casts.every((x) => x.mistakes === 0)).toBe(true)
    const words = casts.map((x) => word(x.word as string))
    const boxes = words.flatMap((w) => w.units)
    // one answer per unit (sh: two letters, one answer), on the screen's tally and the unit's
    expect(tally(save, 'sc:spell')).toMatchObject({ seen: boxes.length, wrong: 0 })
    for (const u of new Set(boxes)) expect(tally(save, u)).toMatchObject({ seen: boxes.filter((x) => x === u).length, wrong: 0 })
    expect(save.read().stage.newAnswers).toBe('o'.repeat(boxes.filter((u) => unit(u).stage === 4).length))
    for (const w of words) expect(tally(save, `spell:${w.id}`)).toMatchObject({ seen: 1, wrong: 0 })
    expect(tally(save, 'sc:spell-write')).toMatchObject({ seen: 3 })
    c.destroy()
  }, 120_000)

  it('a two-letter unit (sh of shop) is answered once, when its second letter is written; a wrong stroke is its miss', async () => {
    const shop: SpellRound = { ...SHOP, tiles: [], mode: 'write' }
    const save = placed({ demosSeen: ['demo-spell', 'demo-spell-write'], tallies: alone })
    const c = new RunController({ course: oneRound(shop), save, now: () => Date.now(), rng: seeded(2), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    expect(spell(c.view).write!.letters).toEqual(['s', 'h', 'o', 'p'])
    // s, then a flat line where h goes: the miss is sh's
    for (let g = 0; g < 200 && spell(c.view).write!.at === 0; g++) { writeOne(c); await tick() }
    expect(tally(save, 'sh')).toBeUndefined()
    const dx = spell(c.view).write!.layout.boxes![1].dx
    c.gesture({ type: 'stroke', pts: [[dx + 0.05, 0.7], [dx + 0.3, 0.7], [dx + 0.6, 0.7]] })
    await until(c, (v) => !!v.fixing)
    expect(tally(save, 'sh')).toMatchObject({ seen: 1, wrong: 1 })
    await play(c)
    expect(tally(save, 'sh')).toMatchObject({ seen: 1, wrong: 1 })
    expect(tally(save, 'o')).toMatchObject({ seen: 1, wrong: 0 })
    expect(events('spell-drop').filter((x) => x.ok === false)).toEqual([expect.objectContaining({ unit: 'sh', box: 0, letter: 'h', mode: 'write' })])
    expect(events('spell-cast')).toEqual([expect.objectContaining({ word: 'shop', mode: 'write', mistakes: 1 })])
    c.destroy()
  }, 60_000)

  it('a hint on a written word, then the pen down (a real touch): the hand goes, the unit still counts as helped', async () => {
    const save = placed({ demosSeen: ['demo-spell', 'demo-spell-write'], tallies: alone })
    const c = new RunController({ course: oneRound({ ...SHOP, tiles: [], mode: 'write' }), save, now: () => Date.now(), rng: seeded(4), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    c.hint()
    expect(spell(c.view).write!.demo?.hint).toBe(true)
    c.gesture({ type: 'touch', by: 'pen' })
    expect(spell(c.view).write!.demo).toBeUndefined()
    expect(events('hint-stop')).toHaveLength(1)
    await play(c)
    expect(tally(save, 'sh')).toMatchObject({ seen: 1, helped: 1 })
    expect(tally(save, 'o')?.helped ?? 0).toBe(0)
    expect(tally(save, 'p')?.helped ?? 0).toBe(0)
    c.destroy()
  }, 60_000)

  it('a hint in tiles mode, then the finger down on the tile (a real touch), then the drop: helped', async () => {
    const save = placed({ demosSeen: ['demo-spell'] })
    const c = new RunController({ course: oneRound(SHOP), save, now: () => Date.now(), rng: seeded(5), session: { screen: 'spell' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    c.hint()
    c.gesture({ type: 'touch', by: 'answer' })
    drop(c, 'sh', 0)
    expect(tally(save, 'sh')).toMatchObject({ seen: 1, helped: 1 })
    c.destroy()
  })

  it('the first written word plays demo-spell-write once (a save that saw the tiles\' demo too)', async () => {
    const save = placed({ demosSeen: ['demo-spell'], tallies: alone })
    const c = new RunController({ course: oneRound({ ...SHOP, tiles: [], mode: 'write' }), save, now: () => Date.now(), rng: seeded(3), session: { screen: 'spell' } })
    // the demo's line plays until the test lets it end
    fakeAudio.holdUntil(/^demo-spell-write/)
    try {
      c.start()
      await until(c, (v) => v.phase === 'demo')
      // the hand writes the first letter, s
      expect(spell(c.view).write!.demo?.strokes).toHaveLength(splitMarks(latinStrokesOf('s'), isMark).body.variants[0].length)
      fakeAudio.release()
      await until(c, (v) => v.phase === 'answer')
    } finally { fakeAudio.holdUntil(null) }
    expect(spell(c.view).write!.demo).toBeUndefined()
    expect(fakeAudio.said().filter((id) => id === 'demo-spell-write-1')).toHaveLength(1)
    expect(save.read().demosSeen).toContain('demo-spell-write')
    expect(fakeAudio.said()).not.toContain('demo-spell-1')
    c.destroy()
  })
})
