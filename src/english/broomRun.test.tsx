// The English broom in the run (design Part 5): a seeded English session flies its waves to the end, its catches and
// mistakes count in the English tallies and the stage pass through the run's normal answer path, a new unit's
// introduction follows its sound, and the word orbs are drawn in Andika, small enough to stay inside the orb.
import { describe, expect, it, vi } from 'vitest'
import { measureText } from '../shared/latinMeasure'
import { act, render } from '@testing-library/react'
import { alternate, recordSession, seeded, until } from '../spellquest/testing/runHarness'
import { RunController, type BroomView } from '../spellquest/controller'
import { fakeAudio } from '../shared/gameAudio/fakePlayer'
import { enLine } from './data/lines'
import { Broom, BROOM_GLYPH_PX } from '../spellquest/components/screens/Broom'
import type { Choice } from '../spellquest/logic/rounds'
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
    // a word counts under its units (or a heart word under heart:<word>) and, apart from the picks, under w:<word> for the parent's words view
    const blends = new Set(BLENDS.map((b) => b.id))
    for (const f of Object.keys(t)) if (f !== 'sc:broom' && !f.startsWith('heart:') && !f.startsWith('w:') && !blends.has(f)) expect(unit(f).stage).toBeLessThanOrEqual(4)
    const asked = words.filter((id) => word(id).kind === 'real')
    expect(asked.some((id) => word(id).units.every((u) => (t[u]?.seen ?? 0) > 0))).toBe(true)
    expect(t['sc:broom']?.seen ?? 0).toBeGreaterThanOrEqual(3)
  })
})

describe('the English flight boss', () => {
  it('a seeded English run meets a flight boss on its second broom session, flies its two-orb waves and beats it', async () => {
    const save = englishSave(2, { broomSessions: 1 })
    const log = await session(save, () => 'right')
    const kind = save.read().bossesBeaten?.[0]
    expect(kind).toBeDefined()
    expect(['mimic', 'bat', 'dot']).toContain(kind)
    // its waves: two orbs each
    const waves = log.views.filter((v) => v.startsWith('broom:answer:') && v.length > 'broom:answer:'.length)
      .flatMap((v) => v.slice('broom:answer:'.length).split('|'))
    expect(waves.length).toBeGreaterThan(0)
    for (const w of waves) expect(w.split(',')).toHaveLength(2)
    // its English lines: it arrives, and the first win of a kind puts it on the shelf
    expect(log.voice.some((id) => /^boss-arrive-\d$/.test(id))).toBe(true)
    expect(log.voice).toContain('boss-new-1')
    // its catches count as the flight's do
    expect(save.read().tallies['sc:broom']?.seen ?? 0).toBeGreaterThanOrEqual(8)
  })

  it('a boss visit of every kind ends at every stage that opens it (no spin, no throw in the round\'s pick)', async () => {
    const beaten = new Set<string>()
    for (const stage of [2, 4, 5]) for (const seed of [1, 2, 3, 4, 5, 6]) {
      const save = englishSave(stage, { broomSessions: 1 })
      await session(save, () => 'right', seed)
      const k = save.read().bossesBeaten?.[0]
      expect(k, `stage ${stage} seed ${seed}`).toBeDefined()
      beaten.add(k!)
    }
    expect(beaten.size).toBeGreaterThanOrEqual(2)
  }, 120_000)

  it('a forced screen the course lacks, or a boss kind not open at the forced stage, is refused rather than spun on', () => {
    expect(() => new RunController({ course: ENGLISH, save: englishSave(2), force: { screen: 'draw-hand', stage: 3 }, sandbox: true })).toThrow(/no draw-hand screen/)
    expect(() => new RunController({ course: ENGLISH, save: englishSave(3), force: { screen: 'broom', stage: 3, boss: 'shin' }, sandbox: true })).toThrow(/not open at stage 3/)
    expect(() => new RunController({ course: ENGLISH, save: englishSave(4), force: { screen: 'broom', stage: 4, boss: 'shin' }, sandbox: true })).not.toThrow()
  })
})

describe('the broom\'s introductions and demo in the run', () => {
  it('a miss that ends the run leaves the introduction due (its step is not saved)', async () => {
    // a run (not a session from the path): its hearts end it; it goes on at the broom, after the tower
    const save = englishSave(1, { lastEnded: 'tower' })
    const log = await recordSession({ course: ENGLISH, save, rng: seeded(7) }, () => 'wrong')
    expect(log.views.some((v) => v.startsWith('broom:'))).toBe(true)
    const seen = Object.entries(save.read().introSeen)
    // one target, all misses: the first brings the introduction, each next one is a step, the last ends the run
    const misses = save.read().tallies['sc:broom']!.wrong!
    expect(misses).toBeGreaterThanOrEqual(3)
    expect(seen).toHaveLength(1)
    expect(seen[0][1].asked).toBe(misses - 1)
    expect(log.voice.filter((id) => id.startsWith('intro-sound-'))).toHaveLength(1)
  })

  it('a fresh stage-1 English broom says its sound demo', async () => {
    vi.useFakeTimers()
    try {
      const save = memoryEnglishSavePort({ stage: { stage: 1, newAnswers: '' }, placement: { state: null, requested: false, done: { level: 1, answers: 5, at: 1 }, runs: 1 } })
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(3), session: { screen: 'broom' } })
      c.start()
      await until(c, (v) => v.overlay?.kind === 'demo')
      expect(c.view.overlay).toMatchObject({ kind: 'demo', line: 'demo-broom-sound-1' })
      expect(ENGLISH.lineVariations('demo-broom-letter')).toBe(enLine('demo-broom-sound')!.variations)
      expect(ENGLISH.lineAudioId('demo-ghosts-letter', 2)).toBe('demo-ghosts-sound-2')
      expect(ENGLISH.lineAudioId('demo-ghosts-syllable')).toBe('demo-ghosts-word-1')
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('no new wave sets off while an introduction plays; the orbs already flying go on', async () => {
    vi.useFakeTimers()
    let playing: string | null = null
    fakeAudio.onVoice((id) => {
      playing = id
      return new Promise((r) => setTimeout(() => { playing = null; r() }, id.startsWith('intro-') ? 8000 : 10))
    })
    const save = englishSave(1)
    const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(5), session: { screen: 'broom' } })
    try {
      c.start()
      const seenWaves = new Set<number>()
      let spawnedInIntro = 0
      let movedInIntro = false
      let introTicks = 0
      let lastPos = ''
      let missed = false
      for (let i = 0; i < 4000 && !c.view.over; i++) {
        const s = c.view.screen as BroomView | undefined
        if (s?.screen === 'broom') {
          const inIntro = !!playing && (playing as string).startsWith('intro-')
          for (const w of s.waves) {
            if (!seenWaves.has(w.id) && inIntro) spawnedInIntro++
            seenWaves.add(w.id)
          }
          if (inIntro) {
            introTicks++
            const pos = s.waves.map((w) => `${w.id}:${w.resolved.join()}`).join('|')
            if (lastPos && pos !== lastPos) movedInIntro = true
            lastPos = pos
          }
          // miss the first wave (the new unit's first ask brings its introduction), then catch
          const head = s.waves.find((w) => w.resolved.some((r) => !r))
          if (head && c.view.phase === 'answer') {
            const j = head.choices.findIndex((x) => x.soundId === s.target.soundId)
            const k = missed ? j : head.choices.findIndex((x) => x.soundId !== s.target.soundId)
            const lane = (head.lanes?.[k] ?? k) as 0 | 1 | 2
            if (k >= 0) c.gesture({ type: 'lane', lane })
          }
          if (s.reveal?.wrong) missed = true
        }
        if (c.view.needNext) c.next()
        if (introTicks > 40 && !playing) break
        await act(async () => { await vi.advanceTimersByTimeAsync(50) })
      }
      expect(introTicks).toBeGreaterThan(40)
      expect(spawnedInIntro).toBe(0)
      // the orbs on the screen flew on (they resolved) while it played
      expect(movedInIntro).toBe(true)
    } finally {
      c.destroy()
      fakeAudio.onVoice(null)
      vi.useRealTimers()
    }
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
    expect(measureText('fishing', px)).toBeLessThanOrEqual(221)
    // a letter keeps the letter's size; a two-letter unit as wide as sh is a little smaller, inside the orb's gold ring
    expect(Number(orb({ kind: 'unit', id: 'm', text: 'm', soundId: 'snd-m', itemId: 'm' }, 'ltr').getAttribute('font-size'))).toBe(BROOM_GLYPH_PX)
    const sh = Number(orb({ kind: 'unit', id: 'sh', text: 'sh', soundId: 'snd-sh', itemId: 'sh' }, 'ltr').getAttribute('font-size'))
    expect(sh).toBeLessThan(BROOM_GLYPH_PX)
    expect(sh).toBeGreaterThan(BROOM_GLYPH_PX * 0.9)
  })

  it('a Hebrew syllable keeps its size', () => {
    const t = orb({ kind: 'syllable', id: 'mem-kamatz', text: 'מָ', soundId: 'syl-ma-a', itemId: 'mem' }, 'rtl')
    expect(Number(t.getAttribute('font-size'))).toBe(BROOM_GLYPH_PX)
  })
})
