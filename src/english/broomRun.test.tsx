// The English broom in the run (design Part 5): a seeded English session flies its waves to the end, its catches and
// mistakes count in the English tallies and the stage pass through the run's normal answer path, a new unit's
// introduction follows its sound, and the word orbs are drawn in Andika, small enough to stay inside the orb.
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { alternate, recordSession, seeded } from '../duel2/testing/runHarness'
import { Broom, BROOM_GLYPH_PX } from '../duel2/components/screens/Broom'
import type { Choice } from '../duel2/logic/rounds'
import { ENGLISH } from './course'
import { memoryEnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'
import { BLENDS, unit, unitsOfStage } from './content/units'
import { word, WORDS } from './content/words'

/** an English save after its placement (the run starts where the session says), the broom's demos seen */
function englishSave(stage: number, more: Partial<EnglishSave> = {}) {
  return memoryEnglishSavePort({
    stage: { stage, newAnswers: '' }, demosSeen: ['demo-broom', 'demo-broom-letter'],
    placement: { state: null, requested: false, done: { level: stage, answers: 5, at: 1 }, runs: 1 }, ...more,
  })
}

const session = (save: ReturnType<typeof englishSave>, answer = alternate(3), seed = 7) =>
  recordSession({ course: ENGLISH, save, session: { screen: 'broom' }, rng: seeded(seed) }, answer)

describe('the English broom in the run', () => {
  it('a seeded English session flies its waves to the end, and every answer counts in the English tallies', async () => {
    const save = englishSave(1)
    const log = await session(save)
    const flown = log.views.filter((v) => v.startsWith('broom:answer:') && v.length > 'broom:answer:'.length)
    expect(flown.length).toBeGreaterThanOrEqual(3)
    // every orb is a stage-1 unit; he hears its sound
    for (const v of flown) for (const id of v.slice('broom:answer:'.length).split(/[|,]/)) expect(unit(id).stage).toBe(1)
    expect(log.voice.some((id) => /^snd-/.test(id))).toBe(true)
    const t = save.read().tallies
    const answers = t['sc:broom']?.seen ?? 0
    expect(answers).toBeGreaterThanOrEqual(3)
    expect(t['sc:broom']?.wrong ?? 0).toBeGreaterThan(0)
    const units = unitsOfStage(1).reduce((n, u) => n + (t[u.id]?.seen ?? 0), 0)
    expect(units).toBe(answers)
  })

  it('right catches on new units pass the stage', async () => {
    const save = englishSave(1)
    await session(save, () => 'right')
    expect(save.read().stage.stage).toBe(2)
  })

  it('a new unit is asked once before its introduction, which follows its sound', async () => {
    const save = englishSave(1)
    const log = await session(save)
    const seen = save.read().introSeen
    expect(Object.keys(seen).length).toBeGreaterThan(0)
    for (const k of Object.keys(seen)) expect(unit(k).stage).toBe(1)
    const i = log.voice.findIndex((id) => /^intro-sound-\d$/.test(id))
    expect(i).toBeGreaterThan(0)
    expect(log.voice[i - 1]).toMatch(/^snd-/)
    expect(log.voice[i + 1]).toMatch(/^snd-/)
  })

  it('a unit the placement credited as right skips its introduction', async () => {
    const tallies = Object.fromEntries(unitsOfStage(1).map((u) => [u.id, { seen: 3, wrong: 0 }]))
    const save = englishSave(1, { tallies })
    const log = await session(save)
    expect(log.voice.filter((id) => id.startsWith('intro-'))).toEqual([])
    expect(Object.values(save.read().introSeen).every((s) => s.known)).toBe(true)
  })

  it('later, he catches words: they count by their units', async () => {
    const save = englishSave(4)
    const log = await session(save, () => 'right')
    const ids = log.views.filter((v) => v.startsWith('broom:answer:')).flatMap((v) => v.slice('broom:answer:'.length).split(/[|,]/)).filter(Boolean)
    const words = ids.filter((id) => WORDS.some((w) => w.id === id) && id.length > 2)
    expect(words.length).toBeGreaterThan(0)
    expect(log.voice.some((id) => /^(w|hw)-/.test(id))).toBe(true)
    const t = save.read().tallies
    // a word counts under its units (or a heart word under heart:<word>), never under its own id
    const blends = new Set(BLENDS.map((b) => b.id))
    for (const f of Object.keys(t)) if (f !== 'sc:broom' && !f.startsWith('heart:') && !blends.has(f)) expect(unit(f).stage).toBeLessThanOrEqual(4)
    const asked = words.filter((id) => word(id).kind === 'real')
    expect(asked.some((id) => word(id).units.every((u) => (t[u]?.seen ?? 0) > 0))).toBe(true)
    expect(t['sc:broom']?.seen ?? 0).toBeGreaterThanOrEqual(3)
  })
})

describe('the broom\'s word orbs', () => {
  const orb = (c: Choice, dir: 'ltr' | 'rtl') => render(
    <Broom waves={[{ id: 1, choices: [c], startMs: 0, offsets: [0], jitter: [0], resolved: [false] }]} travelMs={5000} lane={1}
      onLane={() => {}} phase="answer" clock={() => 2500} dir={dir} />,
  ).container.querySelector('[data-glyph]') as SVGTextElement

  it('a word is drawn in Andika, smaller than a letter, inside its orb', () => {
    const t = orb({ kind: 'word', id: 'fishing', text: 'fishing', soundId: 'w-fishing', itemId: 'fishing' }, 'ltr')
    expect(t.style.fontFamily).toContain('Andika')
    const px = Number(t.getAttribute('font-size'))
    expect(px).toBeLessThan(BROOM_GLYPH_PX)
    expect(px * 0.55 * 'fishing'.length).toBeLessThanOrEqual(221)
    // a unit keeps the letter's size
    expect(Number(orb({ kind: 'unit', id: 'sh', text: 'sh', soundId: 'snd-sh', itemId: 'sh' }, 'ltr').getAttribute('font-size'))).toBe(BROOM_GLYPH_PX)
  })

  it('a Hebrew syllable keeps its size', () => {
    const t = orb({ kind: 'syllable', id: 'mem-kamatz', text: 'מָ', soundId: 'syl-ma-a', itemId: 'mem' }, 'rtl')
    expect(Number(t.getAttribute('font-size'))).toBe(BROOM_GLYPH_PX)
  })
})
