// The English ladder in the run (design Part 5, "word chains"): a seeded English session climbs its rungs to the top; he
// sees the foot built and hears its word, then each new word; the answer on a rung counts for the part that changed (its
// unit) in the English tallies and the stage pass. The changed place is marked at stages 1–3; later he finds it (a drop
// elsewhere is almost); from stage 5 a rung may come with a box more.
import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { alternate, recordSession, seeded, until } from '../testing/runHarness'
import { ladderAnswerId, RunController } from '../controller'
import { CHAINS } from './content/chains'
import { ENGLISH } from './course'
import { memoryEnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'
import { unit } from './content/units'
import { word } from './content/words'
import { fakeAudio } from '../../shared/gameAudio/fakePlayer'

/** an English save after its placement, the ladder's demo seen */
function englishSave(stage: number, more: Partial<EnglishSave> = {}) {
  return memoryEnglishSavePort({
    stage: { stage, newAnswers: '' }, demosSeen: ['demo-ladder'],
    placement: { state: null, requested: false, done: { level: stage, answers: 5, at: 1 }, runs: 1 }, ...more,
  })
}

const session = (save: ReturnType<typeof englishSave>, answer = alternate(3), seed = 7) =>
  recordSession({ course: ENGLISH, save, session: { screen: 'ladder' }, rng: seeded(seed) }, answer)

/** the rungs he was asked: `built|plates|at[+grow][*]` of each answer view */
const asked = (views: string[]) => [...new Set(views.filter((v) => v.startsWith('ladder:answer:')).map((v) => v.slice('ladder:answer:'.length)))]
  .map((v) => {
    const [built, plates, change] = v.split('|')
    const m = /^(\d+)(\+1)?(\*)?$/.exec(change ?? '')
    return { built: built.split(','), plates: plates.split(','), at: m ? Number(m[1]) : undefined, grow: !!m?.[2], marked: !!m?.[3] }
  })

/** lets the fake clock run (the voice and the waits of a round) */
const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

/** the chain a ladder climbed: the one whose start its last asked rung's built words are */
const chainOf = (built: string[]) => CHAINS.find((c) => c.words.slice(0, built.length).join() === built.join())!

describe('the English ladder in the run', () => {
  it('a seeded English session climbs its rungs to the end, and each rung counts for its changed unit', async () => {
    const save = englishSave(2)
    const log = await session(save)
    const rungs = asked(log.views)
    expect(rungs.length).toBeGreaterThanOrEqual(3)
    // the foot (the chain's first word) is built already, and said before the first rung's word
    const chain = chainOf(rungs[rungs.length - 1].built)
    expect(chain.stage).toBe(2)
    expect(rungs[0].built).toEqual([chain.words[0]])
    expect(log.voice.indexOf(`w-${chain.words[0]}`)).toBeGreaterThanOrEqual(0)
    expect(log.voice.indexOf(`w-${chain.words[0]}`)).toBeLessThan(log.voice.indexOf(`w-${chain.words[1]}`))
    // a visit asks each change of the chain once (a 5-word chain: 4 rungs)
    expect(rungs).toHaveLength(chain.words.length - 1)
    const t = save.read().tallies
    rungs.forEach((r, i) => {
      expect(r.at).toBeDefined()
      expect(r.marked).toBe(true)
      expect(r.plates).toHaveLength(3)
      for (const id of r.plates) expect(unit(id).stage).toBeLessThanOrEqual(2)
      // he hears the rung's word, and the answer counts for the unit that changed
      const below = word(chain.words[i]).units
      const now = word(chain.words[i + 1])
      expect(log.voice).toContain(`w-${now.id}`)
      const changed = now.units[r.at!]
      expect(below[r.at!]).not.toBe(changed)
      expect(r.plates).toContain(changed)
      expect(t[changed]?.seen ?? 0).toBeGreaterThanOrEqual(rungs.filter((x, j) => word(chain.words[j + 1]).units[x.at!] === changed).length)
    })
    // every unit tally is a changed unit's (the foot asks nothing)
    const changedUnits = rungs.map((r, i) => word(chain.words[i + 1]).units[r.at!])
    for (const f of Object.keys(t)) if (f !== 'sc:ladder') expect(changedUnits).toContain(f)
    expect(t['sc:ladder']?.seen ?? 0).toBe(rungs.length)
    expect(t['sc:ladder']?.wrong ?? 0).toBeGreaterThan(0)
    expect(Object.keys(save.read().confusions.letters).length).toBeGreaterThan(0)
  })

  it('"And now" (target-new-1) comes right before the new word on every rung after the first, and not on the first', async () => {
    const log = await session(englishSave(2))
    const rungs = asked(log.views)
    const chain = chainOf(rungs[rungs.length - 1].built)
    const at = (id: string) => log.voice.indexOf(id)
    expect(rungs.length).toBeGreaterThanOrEqual(3)
    // the first rung: the foot word, then its word, with nothing between
    expect(log.voice[at(`w-${chain.words[1]}`) - 1]).not.toBe('target-new-1')
    for (let i = 2; i < chain.words.length; i++) expect(log.voice[at(`w-${chain.words[i]}`) - 1]).toBe('target-new-1')
  })

  it('from stage 4 the place is not marked, and the drop on the place counts', async () => {
    const save = englishSave(4)
    const log = await session(save, () => 'right')
    const rungs = asked(log.views)
    expect(rungs.length).toBeGreaterThan(0)
    for (const r of rungs) expect(r.marked).toBe(false)
    expect(save.read().tallies['sc:ladder']?.wrong ?? 0).toBe(0)
    expect(save.read().tallies['sc:ladder']?.seen ?? 0).toBe(rungs.length)
  })

  it('on an unmarked rung the right part dropped elsewhere is almost: no answer, and he tries again', async () => {
    vi.useFakeTimers()
    try {
      const save = englishSave(4)
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(5), session: { screen: 'ladder' } })
      c.start()
      await until(c, (v) => v.phase === 'answer' && v.screen?.screen === 'ladder')
      const s = c.view.screen
      if (s?.screen !== 'ladder') throw new Error('no ladder')
      expect(s.marked).toBe(false)
      const right = ladderAnswerId(s)
      const elsewhere = s.at === 0 ? 1 : 0
      const hearts = c.view.hearts
      c.gesture({ type: 'pick', id: right, box: elsewhere })
      await wait(3000)
      // nothing counted, no heart lost, the same rung again
      expect(save.read().tallies['sc:ladder']?.seen ?? 0).toBe(0)
      expect(c.view.hearts).toBe(hearts)
      expect((c.view.screen as typeof s).built).toEqual(s.built)
      // on its place it counts and the rung is built
      c.gesture({ type: 'pick', id: right, box: s.at })
      await until(c, (v) => (v.screen as typeof s).built.length === s.built.length + 1)
      expect(save.read().tallies['sc:ladder']).toMatchObject({ seen: 1 })
      expect(save.read().tallies['sc:ladder']?.wrong ?? 0).toBe(0)
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  /** an unmarked rung (stage 4) waiting for his answer */
  async function unmarked() {
    const save = englishSave(4)
    const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(5), session: { screen: 'ladder' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && v.screen?.screen === 'ladder')
    const s = c.view.screen
    if (s?.screen !== 'ladder' || s.marked !== false || s.at === undefined) throw new Error('no unmarked rung')
    const right = ladderAnswerId(s)
    const wrong = s.plates.find((p) => p.id !== right)!.id
    const view = () => c.view.screen as typeof s & { lifted?: string }
    return { c, save, s, right, wrong, elsewhere: s.at === 0 ? 1 : 0, view }
  }

  it('on an unmarked rung a tap on a plate only lifts it (the boxes glow); a tap alone never answers', async () => {
    vi.useFakeTimers()
    try {
      const { c, save, s, right, view } = await unmarked()
      c.gesture({ type: 'pick', id: right })
      await wait(3000)
      expect(view().lifted).toBe(right)
      expect(c.view.phase).toBe('answer')
      expect(save.read().tallies['sc:ladder']?.seen ?? 0).toBe(0)
      expect(view().built).toEqual(s.built)
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('tap the right plate, then tap its place: the rung is built', async () => {
    vi.useFakeTimers()
    try {
      const { c, save, s, right, view } = await unmarked()
      c.gesture({ type: 'pick', id: right })
      c.gesture({ type: 'pick', id: right, box: s.at })
      await until(c, (v) => (v.screen as typeof s).built.length === s.built.length + 1)
      expect(save.read().tallies['sc:ladder']).toMatchObject({ seen: 1 })
      expect(save.read().tallies['sc:ladder']?.wrong ?? 0).toBe(0)
      expect(view().lifted).toBeUndefined()
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('tap the right plate, then another place: almost (no answer, no heart), the plate goes back', async () => {
    vi.useFakeTimers()
    try {
      const { c, save, s, right, elsewhere, view } = await unmarked()
      const hearts = c.view.hearts
      c.gesture({ type: 'pick', id: right })
      c.gesture({ type: 'pick', id: right, box: elsewhere })
      await wait(3000)
      expect(save.read().tallies['sc:ladder']?.seen ?? 0).toBe(0)
      expect(c.view.hearts).toBe(hearts)
      expect(view().built).toEqual(s.built)
      expect(view().lifted).toBeUndefined()
      expect(c.view.phase).toBe('answer')
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('tap a wrong plate, then a place: wrong, as a wrong drop is', async () => {
    vi.useFakeTimers()
    try {
      const { c, save, s, wrong } = await unmarked()
      c.gesture({ type: 'pick', id: wrong })
      c.gesture({ type: 'pick', id: wrong, box: s.at })
      await until(c, () => (save.read().tallies['sc:ladder']?.wrong ?? 0) === 1)
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a tap on another plate lifts that one; a tap on the lifted plate puts it back', async () => {
    vi.useFakeTimers()
    try {
      const { c, right, wrong, view } = await unmarked()
      c.gesture({ type: 'pick', id: right })
      c.gesture({ type: 'pick', id: wrong })
      expect(view().lifted).toBe(wrong)
      c.gesture({ type: 'pick', id: wrong })
      expect(view().lifted).toBeUndefined()
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('on a marked rung a tap answers at once, as before', async () => {
    vi.useFakeTimers()
    try {
      const save = englishSave(2)
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(5), session: { screen: 'ladder' } })
      c.start()
      await until(c, (v) => v.phase === 'answer' && v.screen?.screen === 'ladder')
      const s = c.view.screen
      if (s?.screen !== 'ladder') throw new Error('no ladder')
      expect(s.marked).toBe(true)
      c.gesture({ type: 'pick', id: ladderAnswerId(s) })
      await until(c, (v) => (v.screen as typeof s).built.length === s.built.length + 1)
      expect(save.read().tallies['sc:ladder']).toMatchObject({ seen: 1 })
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  describe('the swap (design 2026-11-23 A)', () => {
    type LadderS = Extract<RunController['view']['screen'], { screen: 'ladder' }>
    /** the swap's view steps (`step:id:built`), the voice and the effects as they come */
    const record = (c: RunController) => {
      const log: string[] = []
      let n = 0
      let last = ''
      const flush = () => { const all = fakeAudio.log(); while (n < all.length) { const e = all[n++]; log.push(`${e.kind}:${e.id}`) } }
      c.subscribe(() => {
        flush()
        const s = c.view.screen
        if (s?.screen !== 'ladder') return
        const line = `${s.placing ? `${s.placing.step}:${s.placing.id}` : 'none'}:${s.built.length}`
        if (line !== last) { log.push(line); last = line }
      })
      return { log, flush }
    }
    const start = async (stage: number, seed = 5) => {
      const save = englishSave(stage)
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(seed), session: { screen: 'ladder' } })
      const r = record(c)
      c.start()
      await until(c, (v) => v.phase === 'answer' && v.screen?.screen === 'ladder')
      return { c, s: c.view.screen as LadderS, ...r }
    }

    it('a right answer: the plate flies into its box, the old letter drops out, then the rung is built as its word plays (every time)', async () => {
      vi.useFakeTimers()
      try {
        const { c, s, log, flush } = await start(2)
        const id = ladderAnswerId(s)
        const n = s.built.length
        log.length = 0
        c.gesture({ type: 'pick', id })
        await until(c, (v) => (v.screen as LadderS).built.length === n + 1)
        await wait(100)
        flush()
        const steps = log.filter((x) => !x.startsWith('voice:'))
        expect(steps.slice(0, 4)).toEqual([`fly:${id}:${n}`, expect.stringMatching(/^sfx:.*lock/), `swap:${id}:${n}`, `none:${n + 1}`])
        expect(log.slice(log.indexOf(`none:${n + 1}`)).find((x) => x.startsWith('voice:'))).toBe(`voice:${s.target.soundId}`)
        c.destroy()
      } finally {
        vi.useRealTimers()
      }
    })

    it('the fix after a mistake plays the same swap', async () => {
      vi.useFakeTimers()
      try {
        const { c, s, log, flush } = await start(2)
        const id = ladderAnswerId(s)
        const n = s.built.length
        c.gesture({ type: 'pick', id: s.plates.find((x) => x.id !== id)!.id })
        await until(c, (v) => !!v.fixing)
        log.length = 0
        c.gesture({ type: 'pick', id })
        await until(c, (v) => (v.screen as LadderS).built.length === n + 1)
        await wait(100)
        flush()
        const steps = log.filter((x) => !x.startsWith('voice:'))
        expect(steps.slice(0, 4)).toEqual([`fly:${id}:${n}`, expect.stringMatching(/^sfx:.*lock/), `swap:${id}:${n}`, `none:${n + 1}`])
        expect(log.slice(log.indexOf(`none:${n + 1}`)).find((x) => x.startsWith('voice:'))).toBe(`voice:${s.target.soundId}`)
        c.destroy()
      } finally {
        vi.useRealTimers()
      }
    })

    it('a pause in the swap builds the rung at once; the next rung asks as usual', async () => {
      vi.useFakeTimers()
      try {
        const { c, s } = await start(2)
        const n = s.built.length
        c.gesture({ type: 'pick', id: ladderAnswerId(s) })
        await wait(300)
        expect((c.view.screen as LadderS).placing?.step).toBe('swap')
        c.pause()
        expect((c.view.screen as LadderS).placing).toBeUndefined()
        expect((c.view.screen as LadderS).built.length).toBe(n + 1)
        c.resume()
        await until(c, (v) => v.phase === 'answer' && (v.screen as LadderS).plates.length === 3)
        expect((c.view.screen as LadderS).built.length).toBe(n + 1)
        c.destroy()
      } finally {
        vi.useRealTimers()
      }
    })
  })

  it('at stage 5 a rung may come with a box more (lip → slip), and its answer counts for the added letter', async () => {
    let found = false
    for (let seed = 1; seed <= 12 && !found; seed++) {
      const save = englishSave(5)
      const log = await session(save, () => 'right', seed)
      const rungs = asked(log.views)
      const grown = rungs.filter((r) => r.grow)
      if (!grown.length) continue
      found = true
      const chain = chainOf(rungs[rungs.length - 1].built)
      for (const r of grown) {
        const i = rungs.indexOf(r)
        const added = word(chain.words[i + 1]).units[r.at!]
        expect(word(chain.words[i + 1]).units).toHaveLength(word(chain.words[i]).units.length + 1)
        expect(save.read().tallies[added]?.seen ?? 0).toBeGreaterThan(0)
      }
    }
    expect(found).toBe(true)
  })

  it('right answers on stage-1 ladders pass the stage', async () => {
    const save = englishSave(1)
    // (a visit is a chain's changes: 4; the pass takes 5)
    await session(save, () => 'right')
    await session(save, () => 'right', 8)
    expect(save.read().stage.stage).toBe(2)
  })

  it('a new unit is asked once before its introduction, which follows the word', async () => {
    const save = englishSave(1)
    const log = await session(save, alternate(2))
    const i = log.voice.findIndex((id) => /^intro-sound-\d$/.test(id))
    expect(i).toBeGreaterThan(0)
    expect(log.voice[i - 1]).toMatch(/^w-/)
    for (const k of Object.keys(save.read().introSeen)) expect(unit(k).stage).toBe(1)
  })

  it('the first ladder demo has two beats, each lighting its part and waiting for its line (the old line is not used)', async () => {
    vi.useFakeTimers()
    try {
      const save = memoryEnglishSavePort({ stage: { stage: 1, newAnswers: '' }, placement: { state: null, requested: false, done: { level: 1, answers: 5, at: 1 }, runs: 1 } })
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(3), session: { screen: 'ladder' } })
      c.start()
      await until(c, (v) => v.overlay?.kind === 'demo')
      const s = c.view.screen
      if (s?.screen !== 'ladder') throw new Error('no ladder')
      const o = c.view.overlay
      if (o?.kind !== 'demo') throw new Error('no demo')
      // "This word is:" and the foot word (the foot rung glows), then "Find the letter that makes:" take 1 and the new word (the place glows)
      expect(o.parts).toEqual([
        { id: 'demo-ladder-look-1', highlight: 'foot' }, { id: s.built[0].soundId, highlight: 'foot' },
        { id: 'q-ladder-1', highlight: 'gap' }, { id: s.target.soundId, highlight: 'gap' },
      ])
      expect(o.parts!.map((x) => x.id)).not.toContain('demo-ladder-1')
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('the rung cues: the foot rung while the foot word plays, the new word names the place, then the soft pulse', async () => {
    vi.useFakeTimers()
    try {
      const c = new RunController({ course: ENGLISH, save: englishSave(1), now: () => Date.now(), rng: seeded(3), session: { screen: 'ladder' } })
      const cues: (string | undefined)[] = []
      const watch = () => { const s = c.view.screen; if (s?.screen === 'ladder' && cues[cues.length - 1] !== s.cue) cues.push(s.cue) }
      c.subscribe(watch)
      c.start()
      await wait(4000)
      expect(cues.filter((x) => x)).toEqual(['foot', 'box'])
      // then no voice names anything: the cue is off (the screen keeps its soft pulse while he can answer)
      expect(cues[cues.length - 1]).toBeUndefined()
      expect(c.view.phase).toBe('answer')
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a lift (a tap on a plate) is activity: the idle line comes 8 s after it, not 8 s after the cue', async () => {
    vi.useFakeTimers()
    try {
      const { c, right } = await unmarked()
      const say = vi.spyOn(ENGLISH.audio, 'sayParts')
      await wait(5000)
      c.gesture({ type: 'pick', id: right })
      await wait(5000)
      // 10 s after the cue, 5 s after the lift: no idle line yet
      expect(say.mock.calls.some((a) => a[0].some((x) => /^q-ladder-/.test(x.id)))).toBe(false)
      await wait(4000)
      expect(say.mock.calls.some((a) => a[0].some((x) => /^q-ladder-/.test(x.id)))).toBe(true)
      say.mockRestore()
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('after the demo the first round does not say the foot word and the new word again, and its answers are open', async () => {
    vi.useFakeTimers()
    try {
      const save = memoryEnglishSavePort({ stage: { stage: 1, newAnswers: '' }, placement: { state: null, requested: false, done: { level: 1, answers: 5, at: 1 }, runs: 1 } })
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(3), session: { screen: 'ladder' } })
      const say = vi.spyOn(ENGLISH.audio, 'sayParts')
      c.start()
      await until(c, (v) => v.overlay?.kind === 'demo')
      const o = c.view.overlay
      if (o?.kind !== 'demo') throw new Error('no demo')
      const words = [o.parts![1].id, o.parts![3].id]
      c.next()
      await until(c, (v) => v.phase === 'answer')
      await wait(3000)
      expect(say.mock.calls.some((a) => a[0].some((x) => words.includes(x.id)))).toBe(false)
      say.mockRestore()
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  describe('pause and resume', () => {
    /** pauses at the first view where `at` holds, resumes, lets the round start again */
    async function pausedAt(at: (s: { cue?: string; lifted?: string }) => boolean, setup?: 'unmarked') {
      const save = englishSave(setup === 'unmarked' ? 4 : 1)
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(setup ? 5 : 3), session: { screen: 'ladder' } })
      let done = false
      c.subscribe(() => {
        const s = c.view.screen
        if (!done && s?.screen === 'ladder' && at(s)) { done = true; c.pause() }
      })
      return { c, done: () => done }
    }
    it('paused while the foot word plays: no cue stays lit after the resume', async () => {
      vi.useFakeTimers()
      try {
        const { c, done } = await pausedAt((s) => s.cue === 'foot')
        c.start()
        await wait(2000)
        expect(done()).toBe(true)
        const after: (string | undefined)[] = []
        c.subscribe(() => { const s = c.view.screen; if (s?.screen === 'ladder') after.push(s.cue) })
        c.resume()
        await wait(5000)
        // the round starts again from its question with no cue lit (the foot is not said again; the new word names the place)
        expect(after[0]).toBeUndefined()
        expect(after).not.toContain('foot')
        expect(c.view.phase).toBe('answer')
        c.destroy()
      } finally {
        vi.useRealTimers()
      }
    })
    it('paused while the new word plays: no cue stays lit after the resume', async () => {
      vi.useFakeTimers()
      try {
        const { c, done } = await pausedAt((s) => s.cue === 'box')
        c.start()
        await wait(3000)
        expect(done()).toBe(true)
        const after: (string | undefined)[] = []
        c.subscribe(() => { const s = c.view.screen; if (s?.screen === 'ladder') after.push(s.cue) })
        c.resume()
        await wait(5000)
        expect(after[0]).toBeUndefined()
        c.destroy()
      } finally {
        vi.useRealTimers()
      }
    })
    it('a plate lifted before the pause is back after the resume', async () => {
      vi.useFakeTimers()
      try {
        const { c, right } = await unmarked()
        c.gesture({ type: 'pick', id: right })
        expect((c.view.screen as { lifted?: string }).lifted).toBe(right)
        c.pause()
        c.resume()
        await wait(5000)
        expect((c.view.screen as { lifted?: string }).lifted).toBeUndefined()
        c.destroy()
      } finally {
        vi.useRealTimers()
      }
    })
  })

  it('a lift resets the idle wait every time, also after the idle line played', async () => {
    vi.useFakeTimers()
    try {
      const { c, right } = await unmarked()
      const say = vi.spyOn(ENGLISH.audio, 'sayParts')
      const idleLines = () => say.mock.calls.filter((a) => a[0].some((x) => /^q-ladder-/.test(x.id))).length
      await wait(9000)
      expect(idleLines()).toBe(1)
      c.gesture({ type: 'pick', id: right })
      await wait(5000)
      expect(idleLines()).toBe(1)
      await wait(4000)
      expect(idleLines()).toBe(2)
      say.mockRestore()
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a fresh English ladder says its demo', async () => {
    vi.useFakeTimers()
    try {
      const save = memoryEnglishSavePort({ stage: { stage: 1, newAnswers: '' }, placement: { state: null, requested: false, done: { level: 1, answers: 5, at: 1 }, runs: 1 } })
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(3), session: { screen: 'ladder' } })
      c.start()
      await until(c, (v) => v.overlay?.kind === 'demo')
      expect(c.view.overlay).toMatchObject({ kind: 'demo', line: 'demo-ladder-1' })
      const s = c.view.screen
      expect(s?.screen === 'ladder' && s.plates.length).toBe(3)
      // the foot is built under the first rung to make
      expect(s?.screen === 'ladder' && s.built).toHaveLength(1)
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })
})
