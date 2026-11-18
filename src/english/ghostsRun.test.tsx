// The English ghosts in the run (design Part 5, "look-alikes"): a seeded English session picks its ghosts to the end; a
// visit keeps one look-alike set; the answers count in the English tallies and the stage pass; after a mistake on a
// look-alike letter the explanation names the letter and says its sound; the signs are drawn in Andika, inside the sign.
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { alternate, recordSession, seeded, until } from '../duel2/testing/runHarness'
import { RunController } from '../duel2/controller'
import { Ghosts, GHOST_GLYPH_PX } from '../duel2/components/screens/Ghosts'
import { ExplainOverlay } from '../duel2/screens/Overlays'
import type { Choice } from '../duel2/logic/rounds'
import { ENGLISH } from './course'
import { ghostSets } from './logic/rounds/ghosts'
import { memoryEnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'
import { unit } from './content/units'
import { word } from './content/words'

/** an English save after its placement, the ghosts' demos seen */
function englishSave(stage: number, more: Partial<EnglishSave> = {}) {
  return memoryEnglishSavePort({
    stage: { stage, newAnswers: '' }, demosSeen: ['demo-ghosts-letter', 'demo-ghosts-syllable'],
    placement: { state: null, requested: false, done: { level: stage, answers: 5, at: 1 }, runs: 1 }, ...more,
  })
}

const session = (save: ReturnType<typeof englishSave>, answer: Parameters<typeof recordSession>[1] = alternate(3), seed = 7) =>
  recordSession({ course: ENGLISH, save, session: { screen: 'ghosts' }, rng: seeded(seed) }, answer)

/** the signs of each round he was asked */
const asked = (views: string[]) => [...new Set(views.filter((v) => v.startsWith('ghosts:answer:')).map((v) => v.slice('ghosts:answer:'.length)))]
  .map((v) => v.split(','))

/** the first seeded sessions at `stage` whose visit is of letters and of words */
async function visits(stage: number, answer = alternate(3)) {
  const out: { letters?: { save: ReturnType<typeof englishSave>; log: Awaited<ReturnType<typeof session>> }; words?: typeof out.letters } = {}
  for (let seed = 1; seed <= 20 && !(out.letters && out.words); seed++) {
    const save = englishSave(stage)
    const log = await session(save, answer, seed)
    const signs = asked(log.views)
    const k = signs.flat().some((id) => id.length > 1) ? 'words' : 'letters'
    out[k] ??= { save, log }
  }
  return out
}

describe('the English ghosts in the run', () => {
  it('a seeded English session picks its ghosts to the end, one look-alike set a visit, and the answers count', async () => {
    const { letters, words } = await visits(2)
    for (const v of [letters, words]) {
      expect(v).toBeDefined()
      const signs = asked(v!.log.views)
      expect(signs.length).toBeGreaterThanOrEqual(3)
      for (const s of signs) expect(s).toHaveLength(3)
      // every round shows the same set of the table
      const kept = signs.reduce((a, s) => a.filter((id) => s.includes(id)))
      const kind = v === letters ? 'letter' : 'syllable'
      expect(ghostSets(2, kind).some((set) => set.every((id) => kept.includes(id)))).toBe(true)
      const t = v!.save.read().tallies
      const answers = t['sc:ghosts']?.seen ?? 0
      expect(answers).toBeGreaterThanOrEqual(3)
      expect(t['sc:ghosts']?.wrong ?? 0).toBeGreaterThan(0)
      expect(Object.keys(v!.save.read().confusions.letters).length).toBeGreaterThan(0)
    }
    // letters: he hears the sound, and each answer counts for its unit
    for (const id of asked(letters!.log.views).flat()) expect(unit(id).stage).toBeLessThanOrEqual(2)
    expect(letters!.log.voice.some((id) => /^snd-/.test(id))).toBe(true)
    const lt = letters!.save.read().tallies
    const unitSeen = Object.entries(lt).filter(([f]) => f !== 'sc:ghosts').reduce((n, [, x]) => n + (x.seen ?? 0), 0)
    expect(unitSeen).toBe(lt['sc:ghosts']!.seen)
    // words: he hears the word, and it counts by its units (never by its own id)
    expect(words!.log.voice.some((id) => /^(w|hw)-/.test(id))).toBe(true)
    const wt = words!.save.read().tallies
    for (const id of asked(words!.log.views).flat()) {
      const w = word(id)
      expect(w.stage).toBeLessThanOrEqual(2)
      if (w.kind === 'real' && w.units.length > 1) expect(wt[id]).toBeUndefined()
    }
  })

  it('right answers on new items pass the stage', async () => {
    const save = englishSave(2)
    for (let seed = 1; seed <= 6 && save.read().stage.stage === 2; seed++) await session(save, () => 'right', seed)
    expect(save.read().stage.stage).toBe(3)
  })

  it('after a mistake on a look-alike letter the explanation says "This is the letter", its name, then its sound', async () => {
    vi.useFakeTimers()
    try {
      let found = false
      for (let seed = 1; seed <= 20 && !found; seed++) {
        const c = new RunController({ course: ENGLISH, save: englishSave(2), now: () => Date.now(), rng: seeded(seed), session: { screen: 'ghosts' } })
        c.start()
        // wrong picks until an explanation comes, or the visit ends
        for (let round = 0; round < 8 && !found && !c.view.over; round++) {
          await until(c, (v) => (v.phase === 'answer' && !v.fixing) || v.overlay?.kind === 'explain' || !!v.over)
          const o = c.view.overlay
          if (o?.kind === 'explain') {
            found = true
            const target = o.target
            expect(target.kind).toBe('unit')
            expect(o.parts).toEqual([
              { id: 'explain-letter-1', highlight: 'none' }, { id: `ln-${target.id}`, highlight: 'letter' },
              { id: `snd-${unit(target.id).sound}`, highlight: 'all' },
            ])
            break
          }
          const s = c.view.screen
          if (s?.screen !== 'ghosts' || c.view.over) break
          if (s.target.kind !== 'unit') break
          c.gesture({ type: 'pick', id: s.signs.find((x) => x.id !== s.target.id)!.id })
          await until(c, (v) => !!v.fixing || !!v.over)
          if (c.view.fixing) c.gesture({ type: 'pick', id: s.target.id })
          await until(c, (v) => v.phase !== 'mistake')
        }
        c.destroy()
      }
      expect(found).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('an introduction plays on the ghosts, after the sound or word he heard', async () => {
    // (all right, a new unit is known and its introduction skipped; with mistakes it plays)
    let played = 0
    for (let seed = 1; seed <= 6; seed++) {
      const save = englishSave(2)
      const log = await session(save, alternate(2), seed)
      expect(Object.keys(save.read().introSeen).length).toBeGreaterThan(0)
      const i = log.voice.findIndex((id) => /^intro-/.test(id))
      if (i < 0) continue
      played++
      expect(log.voice[i - 1]).toMatch(/^(snd|w|hw)-/)
    }
    expect(played).toBeGreaterThan(0)
  })

  it('a fresh save says the ghosts\' demo line, by sound or by word', async () => {
    vi.useFakeTimers()
    try {
      const lines = new Set<string>()
      for (let seed = 1; seed <= 12; seed++) {
        const save = memoryEnglishSavePort({ stage: { stage: 2, newAnswers: '' }, placement: { state: null, requested: false, done: { level: 2, answers: 5, at: 1 }, runs: 1 } })
        const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(seed), session: { screen: 'ghosts' } })
        c.start()
        await until(c, (v) => v.overlay?.kind === 'demo')
        const o = c.view.overlay
        if (o?.kind === 'demo') lines.add(o.line)
        expect(c.view.screen?.screen === 'ghosts' && c.view.screen.signs).toHaveLength(3)
        c.destroy()
      }
      expect([...lines].sort()).toEqual(['demo-ghosts-sound-1', 'demo-ghosts-word-1'])
      // the question when he waits: by sound on a letter visit
      expect(ENGLISH.lineAudioId('q-ghosts-letter', 1)).toBe('q-ghosts-sound-1')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the ghosts\' signs on the English path', () => {
  const sign = (c: Choice, dir: 'ltr' | 'rtl') => render(<Ghosts signs={[c]} onPick={() => {}} phase="answer" dir={dir} />)
    .container.querySelector('[data-glyph]') as SVGTextElement

  it('a look-alike word is drawn in Andika, smaller than a letter, inside its sign', () => {
    const t = sign({ kind: 'word', id: 'stop', text: 'stop', soundId: 'w-stop', itemId: 'stop' }, 'ltr')
    expect(t.style.fontFamily).toContain('Andika')
    const px = Number(t.getAttribute('font-size'))
    expect(px).toBeLessThan(GHOST_GLYPH_PX)
    expect(px * 0.55 * 'stop'.length).toBeLessThanOrEqual(160 * 0.8)
    expect(Number(sign({ kind: 'unit', id: 'b', text: 'b', soundId: 'snd-b', itemId: 'b' }, 'ltr').getAttribute('font-size'))).toBe(GHOST_GLYPH_PX)
  })
  it('the look-alike explanation shows the letter in Andika, lit while its name and its sound play', () => {
    const b: Choice = { kind: 'unit', id: 'b', text: 'b', soundId: 'snd-b', itemId: 'b' }
    for (const [h, glow] of [['none', false], ['letter', true], ['all', true]] as const) {
      const { container, unmount } = render(<ExplainOverlay target={b} h={h} />)
      const t = container.querySelector('[data-glyph]') as SVGTextElement
      expect(t.textContent).toBe('b')
      expect(t.style.fontFamily).toContain('Andika')
      expect(t.style.filter.includes('d2-glow-hit')).toBe(glow)
      unmount()
    }
  })
})
