// The English ladder in the run (design Part 5, "word chains"): a seeded English session climbs its rungs to the top; he
// sees the foot built and hears its word, then each new word; the answer on a rung counts for the part that changed (its
// unit) in the English tallies and the stage pass. The changed place is marked at stages 1–3; later he finds it (a drop
// elsewhere is almost); from stage 5 a rung may come with a box more.
import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { alternate, recordSession, seeded, until } from '../duel2/testing/runHarness'
import { ladderAnswerId, RunController } from '../duel2/controller'
import { CHAINS } from './content/chains'
import { ENGLISH } from './course'
import { memoryEnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'
import { unit } from './content/units'
import { word } from './content/words'

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

  it('on an unmarked rung a TAP on the right part counts like the drop on its place (a tap names no place; it is never "almost")', async () => {
    vi.useFakeTimers()
    try {
      const save = englishSave(4)
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(5), session: { screen: 'ladder' } })
      c.start()
      await until(c, (v) => v.phase === 'answer' && v.screen?.screen === 'ladder')
      const s = c.view.screen
      if (s?.screen !== 'ladder') throw new Error('no ladder')
      expect(s.marked).toBe(false)
      c.gesture({ type: 'pick', id: ladderAnswerId(s) })
      await until(c, (v) => (v.screen as typeof s).built.length === s.built.length + 1)
      expect(save.read().tallies['sc:ladder']).toMatchObject({ seen: 1 })
      expect(save.read().tallies['sc:ladder']?.wrong ?? 0).toBe(0)
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
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
