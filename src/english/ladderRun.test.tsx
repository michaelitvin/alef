// The English ladder in the run (design Part 5, "word chains"): a seeded English session climbs its rungs to the top; he
// hears each new word, and the answer on a rung counts for the part that changed (its unit) in the English tallies and
// the stage pass. The changed place is marked at stages 1–3; from stage 5 a rung may come with a box more.
import { describe, expect, it, vi } from 'vitest'
import { alternate, recordSession, seeded, until } from '../duel2/testing/runHarness'
import { RunController } from '../duel2/controller'
import { CHAINS } from './content/chains'
import { ENGLISH } from './course'
import { memoryEnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'
import { unit } from './content/units'

/** an English save after its placement, the ladder's demo seen */
function englishSave(stage: number, more: Partial<EnglishSave> = {}) {
  return memoryEnglishSavePort({
    stage: { stage, newAnswers: '' }, demosSeen: ['demo-ladder'],
    placement: { state: null, requested: false, done: { level: stage, answers: 5, at: 1 }, runs: 1 }, ...more,
  })
}

const session = (save: ReturnType<typeof englishSave>, answer = alternate(3), seed = 7) =>
  recordSession({ course: ENGLISH, save, session: { screen: 'ladder' }, rng: seeded(seed) }, answer)

/** the rungs he was asked: `built|plates[|at[+grow][*]]` of each answer view */
const asked = (views: string[]) => [...new Set(views.filter((v) => v.startsWith('ladder:answer:')).map((v) => v.slice('ladder:answer:'.length)))]
  .map((v) => {
    const [built, plates, change] = v.split('|')
    const m = change ? /^(\d+)(\+1)?(\*)?$/.exec(change) : null
    return { built: built ? built.split(',') : [], plates: plates.split(','), at: m ? Number(m[1]) : undefined, grow: !!m?.[2], marked: !!m?.[3] }
  })

describe('the English ladder in the run', () => {
  it('a seeded English session climbs its rungs to the end, and each rung counts for its changed part', async () => {
    const save = englishSave(2)
    const log = await session(save)
    const rungs = asked(log.views)
    expect(rungs.length).toBeGreaterThanOrEqual(3)
    // the first rung asks the chain's first word; the rungs built are a chain's start
    expect(rungs[0].at).toBeUndefined()
    const top = rungs[rungs.length - 1].built
    expect(CHAINS.some((c) => c.words.slice(0, top.length).join() === top.join())).toBe(true)
    for (const r of rungs.slice(1)) {
      expect(r.at).toBeDefined()
      expect(r.marked).toBe(true)
      expect(r.plates).toHaveLength(3)
      for (const id of r.plates) expect(unit(id).stage).toBeLessThanOrEqual(2)
    }
    // he hears the word of each rung
    for (const w of top) expect(log.voice).toContain(`w-${w}`)
    const t = save.read().tallies
    expect(t['sc:ladder']?.seen ?? 0).toBeGreaterThanOrEqual(3)
    expect(t['sc:ladder']?.wrong ?? 0).toBeGreaterThan(0)
    // a wrong plate on a rung is a mix-up of the changed unit with it (the English confusions)
    expect(Object.keys(save.read().confusions.letters).length).toBeGreaterThan(0)
    // each later rung counted under one of its plates' units: the changed one
    for (const r of rungs.slice(1)) expect(r.plates.filter((id) => (t[id]?.seen ?? 0) > 0).length).toBeGreaterThan(0)
  })

  it('from stage 4 the place is not marked', async () => {
    const save = englishSave(4)
    const log = await session(save, () => 'right')
    const rungs = asked(log.views).slice(1)
    expect(rungs.length).toBeGreaterThan(0)
    for (const r of rungs) expect(r.marked).toBe(false)
  })

  it('at stage 5 a rung may come with a box more (lip → slip), and its answer counts for the added letter', async () => {
    let found = false
    for (let seed = 1; seed <= 12 && !found; seed++) {
      const save = englishSave(5)
      const log = await session(save, () => 'right', seed)
      if (!asked(log.views).some((r) => r.grow)) continue
      found = true
      expect(save.read().tallies.s?.seen ?? 0).toBeGreaterThan(0)
    }
    expect(found).toBe(true)
  })

  it('right answers on the stage-1 chain pass the stage', async () => {
    const save = englishSave(1)
    await session(save, () => 'right')
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
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })
})
