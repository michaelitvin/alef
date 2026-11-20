// The English cauldron in the run (design Part 5, "the missing sound"): a seeded English session plays its rounds to the
// end; he hears the word, and each answer counts for the missing part (its unit) in the English tallies and the stage
// pass; a new unit's introduction follows the word; at stage 6 a thrown e makes the word he heard.
import { describe, expect, it, vi } from 'vitest'
import { alternate, recordSession, seeded, until } from '../duel2/testing/runHarness'
import { RunController } from '../duel2/controller'
import { ENGLISH } from './course'
import { memoryEnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'
import { unit } from './content/units'
import { word } from './content/words'

/** an English save after its placement, the cauldron's demo seen */
function englishSave(stage: number, more: Partial<EnglishSave> = {}) {
  return memoryEnglishSavePort({
    stage: { stage, newAnswers: '' }, demosSeen: ['demo-cauldron'],
    placement: { state: null, requested: false, done: { level: stage, answers: 5, at: 1 }, runs: 1 }, ...more,
  })
}

const session = (save: ReturnType<typeof englishSave>, answer = alternate(3), seed = 7) =>
  recordSession({ course: ENGLISH, save, session: { screen: 'cauldron' }, rng: seeded(seed) }, answer)

/** the rounds he was asked: `boxes/gap:tiles` of each answer view */
const asked = (views: string[]) => [...new Set(views.filter((v) => /^cauldron:answer:.+\/\d+:/.test(v)).map((v) => v.slice('cauldron:answer:'.length)))]
  .map((v) => { const [b, rest] = v.split('/'); const [gap, tiles] = rest.split(':'); return { boxes: b.split(','), gap: Number(gap), tiles: tiles.split(',') } })

describe('the English cauldron in the run', () => {
  it('a seeded English session plays three rounds to the end, and each answer counts for its missing unit', async () => {
    const save = englishSave(2)
    const log = await session(save)
    const rounds = asked(log.views)
    expect(rounds.length).toBeGreaterThanOrEqual(3)
    for (const r of rounds) {
      expect(r.tiles).toHaveLength(4)
      expect(r.tiles).toContain(r.boxes[r.gap])
      // (opened units only: the stage may pass during the session)
      for (const id of [...r.boxes, ...r.tiles]) expect(unit(id).stage).toBeLessThanOrEqual(save.read().stage.stage)
    }
    // he hears the word (a unit's own sound comes only in its introduction)
    expect(log.voice.find((id) => /^(w|snd)-/.test(id))).toMatch(/^w-/)
    const t = save.read().tallies
    const answers = t['sc:cauldron']?.seen ?? 0
    expect(answers).toBeGreaterThanOrEqual(3)
    expect(t['sc:cauldron']?.wrong ?? 0).toBeGreaterThan(0)
    // every answer counted under exactly one unit: the missing one
    const units = Object.entries(t).filter(([f]) => f !== 'sc:cauldron').reduce((n, [, x]) => n + (x.seen ?? 0), 0)
    expect(units).toBe(answers)
    for (const f of Object.keys(t)) if (f !== 'sc:cauldron') expect(rounds.some((r) => r.boxes[r.gap] === f)).toBe(true)
    // a wrong tile is a mix-up of the missing unit with it (the English confusions)
    expect(Object.keys(save.read().confusions.letters).length).toBeGreaterThan(0)
  })

  it('right answers on new units pass the stage', async () => {
    const save = englishSave(1)
    await session(save, () => 'right')
    expect(save.read().stage.stage).toBe(2)
  })

  it('a new unit is asked once before its introduction, which follows the word', async () => {
    const save = englishSave(1)
    const log = await session(save)
    const seen = save.read().introSeen
    expect(Object.keys(seen).length).toBeGreaterThan(0)
    for (const k of Object.keys(seen)) expect(unit(k).stage).toBe(1)
    const i = log.voice.findIndex((id) => /^intro-sound-\d$/.test(id))
    expect(i).toBeGreaterThan(0)
    expect(log.voice[i - 1]).toMatch(/^w-/)
  })

  it('at stage 6 he throws an e in: he hears the word it makes, and the answer counts for its silent e', async () => {
    let found = false
    for (let seed = 1; seed <= 6 && !found; seed++) {
      const save = englishSave(6)
      const log = await session(save, () => 'right', seed)
      const thrown = asked(log.views).filter((r) => unit(r.boxes[r.gap]).kind === 'magic-e')
      if (!thrown.length) continue
      found = true
      for (const r of thrown) {
        expect(r.gap).toBe(r.boxes.length - 1)
        const short = r.boxes.slice(0, -1).join('')
        const long = word(short + 'e')
        expect(long.units).toContain(r.boxes[r.gap])
        expect(log.voice).toContain(`w-${long.id}`)
        expect(save.read().tallies[r.boxes[r.gap]]?.seen ?? 0).toBeGreaterThan(0)
      }
    }
    expect(found).toBe(true)
  })

  it('a fresh English cauldron says its demo', async () => {
    vi.useFakeTimers()
    try {
      const save = memoryEnglishSavePort({ stage: { stage: 1, newAnswers: '' }, placement: { state: null, requested: false, done: { level: 1, answers: 5, at: 1 }, runs: 1 } })
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(3), session: { screen: 'cauldron' } })
      c.start()
      await until(c, (v) => v.overlay?.kind === 'demo')
      expect(c.view.overlay).toMatchObject({ kind: 'demo', line: 'demo-cauldron-1' })
      const s = c.view.screen
      expect(s?.screen === 'cauldron' && s.tiles?.length).toBe(4)
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })
})
