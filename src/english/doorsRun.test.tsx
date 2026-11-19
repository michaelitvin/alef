// The English doors in the run (design Part 5, "reading words"): a seeded English session opens its doors to the end;
// a door holds a word, from stage 4 also a phrase; he takes the key with its picture, and the answer counts for the
// key's word in the English tallies (and toward the stage from stage 4). The door never says its word before he picks:
// "What does the door say?" (on a phrase "What do the words say?") plays only when he waits.
import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { alternate, recordSession, seeded, until } from '../duel2/testing/runHarness'
import { RunController, type View } from '../duel2/controller'
import type { SavePort } from '../duel2/savePort'
import { Doors } from '../duel2/components/screens/Doors'
import { fakeAudio } from '../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { PHRASES } from './content/phrases'
import { word } from './content/words'
import { memoryEnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'

/** an English save after its placement, the doors' demo seen */
function englishSave(stage: number, more: Partial<EnglishSave> = {}) {
  return memoryEnglishSavePort({
    stage: { stage, newAnswers: '' }, demosSeen: ['demo-doors'],
    placement: { state: null, requested: false, done: { level: stage, answers: 5, at: 1 }, runs: 1 }, ...more,
  })
}

const session = (save: SavePort, answer: Parameters<typeof recordSession>[1] = alternate(3), seed = 7) =>
  recordSession({ course: ENGLISH, save, session: { screen: 'doors' }, rng: seeded(seed) }, answer)

/** the doors he was asked: `plate=key:keys` of each answer view */
const asked = (views: string[]) => [...new Set(views.filter((v) => v.startsWith('doors:answer:')).map((v) => v.slice('doors:answer:'.length)))]
  .map((v) => {
    const [plate, rest] = v.split('=')
    const [key, keys] = rest.split(':')
    return { plate: plate.split(' '), key, keys: keys.split(',') }
  })

/** lets the fake clock run */
const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

describe('the English doors in the run', () => {
  it('a seeded English session opens its doors to the end, and each answer counts for its key\'s word', async () => {
    const save = englishSave(2)
    const log = await session(save)
    const doors = asked(log.views)
    expect(doors.length).toBeGreaterThanOrEqual(3)
    for (const d of doors) {
      // stages 1–3: one word on the door, its own picture the right key
      expect(d.plate).toEqual([d.key])
      expect(word(d.key).stage).toBeLessThanOrEqual(2)
      expect(d.keys).toHaveLength(3)
      expect(d.keys).toContain(d.key)
      for (const k of d.keys) expect(word(k).kind).toBe('real')
      // he hears the word when the door opens
      expect(log.voice).toContain(`w-${d.key}`)
    }
    const t = save.read().tallies
    expect(t['sc:doors']?.seen ?? 0).toBeGreaterThanOrEqual(3)
    expect(t['sc:doors']?.wrong ?? 0).toBeGreaterThan(0)
    // the English features: the key word's units (never a Book 2 word feature)
    for (const u of word(doors[0].key).units) expect(t[u]?.seen ?? 0).toBeGreaterThan(0)
    expect(Object.keys(t).some((f) => f.startsWith('w:'))).toBe(false)
  })

  it('from stage 4 a door may hold a phrase: its noun is the key, and its own clip plays when it opens', async () => {
    let phrases = 0
    for (let seed = 1; seed <= 6; seed++) {
      const log = await session(englishSave(6), () => 'right', seed)
      for (const d of asked(log.views).filter((x) => x.plate.length > 1)) {
        phrases++
        const p = PHRASES.find((x) => x.words.join() === d.plate.join())!
        expect(p.stage).toBeLessThanOrEqual(6)
        expect(d.key).toBe(p.noun)
        for (const k of d.keys.filter((x) => x !== d.key)) expect(p.words).not.toContain(k)
        expect(log.voice).toContain(`ph-${p.id}`)
      }
    }
    expect(phrases).toBeGreaterThan(0)
  })

  it('door answers count toward the stage from stage 4 only', async () => {
    const flagsAt = async (stage: number) => {
      const port = englishSave(stage)
      const flags: boolean[] = []
      const save: SavePort = { ...port, recordAnswer: (a) => { flags.push(!!a.newStage); return port.recordAnswer(a) } }
      await session(save, () => 'right')
      return { flags, stage: port.read().stage.stage }
    }
    const low = await flagsAt(2)
    expect(low.flags.length).toBeGreaterThanOrEqual(3)
    expect(low.flags.every((f) => !f)).toBe(true)
    const high = await flagsAt(5)
    expect(high.flags.slice(0, 5)).toEqual([true, true, true, true, true])
    // five right answers pass stage 5
    expect(high.stage).toBe(6)
  }, 60_000)

  it('the door never says its word before he picks; the question plays only when he waits', async () => {
    vi.useFakeTimers()
    try {
      const seen = { word: 0, phrase: 0 }
      for (let seed = 1; seed <= 6 && !(seen.word && seen.phrase); seed++) {
        const c = new RunController({ course: ENGLISH, save: englishSave(6), now: () => Date.now(), rng: seeded(seed), session: { screen: 'doors' } })
        c.start()
        for (let n = 0; n < 6 && !c.view.over; n++) {
          await until(c, (v) => (v.phase === 'answer' && !v.fixing) || !!v.over)
          const s = c.view.screen
          if (s?.screen !== 'doors' || !s.plate) break
          const own = s.plate.length > 1 ? `ph-${PHRASES.find((p) => p.words.join() === s.plate!.map((x) => x.id).join())!.id}` : `w-${s.word.id}`
          const from = fakeAudio.said().length
          // at once: nothing is said; after a wait: the question, never the door's word
          await wait(500)
          expect(fakeAudio.said().slice(from)).toEqual([])
          await wait(9_000)
          const said = fakeAudio.said().slice(from)
          expect(said.some((id) => id.startsWith(s.plate.length > 1 ? 'q-door-words-' : 'q-door-'))).toBe(true)
          if (s.plate.length === 1) expect(said.some((id) => id.startsWith('q-door-words'))).toBe(false)
          expect(said).not.toContain(own)
          seen[s.plate.length > 1 ? 'phrase' : 'word']++
          c.gesture({ type: 'pick', id: s.word.id })
          await until(c, (v) => v.phase !== 'answer' || !!v.over)
          // it is said when the door opens
          await until(c, (v) => fakeAudio.said().slice(from).includes(own) || !!v.over)
        }
        c.destroy()
      }
      expect(seen.word).toBeGreaterThan(0)
      expect(seen.phrase).toBeGreaterThan(0)
    } finally {
      vi.useRealTimers()
    }
  }, 60_000)

  it('a first miss on a blend word brings its introduction after the door opens', async () => {
    let played = 0
    for (let seed = 1; seed <= 12 && !played; seed++) {
      const save = englishSave(5)
      const log = await session(save, (v: View) => (v.screen?.screen === 'doors' && v.screen.word.id === 'tent' ? 'wrong' : 'right'), seed)
      if (!asked(log.views).some((d) => d.key === 'tent')) continue
      const i = log.voice.findIndex((id) => id.startsWith('intro-blend'))
      expect(i).toBeGreaterThan(0)
      expect(save.read().introSeen.blend).toBeDefined()
      // after the door's word, as on the other screens
      expect(log.voice.slice(0, i)).toContain('w-tent')
      played++
    }
    expect(played).toBe(1)
  }, 60_000)

  it('a fresh save says the doors\' demo line over an English door', async () => {
    vi.useFakeTimers()
    try {
      const save = memoryEnglishSavePort({ stage: { stage: 2, newAnswers: '' }, placement: { state: null, requested: false, done: { level: 2, answers: 5, at: 1 }, runs: 1 } })
      const c = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(3), session: { screen: 'doors' } })
      c.start()
      await until(c, (v) => v.overlay?.kind === 'demo')
      const o = c.view.overlay
      expect(o?.kind === 'demo' && o.line).toBe('demo-doors-1')
      const s = c.view.screen
      expect(s?.screen === 'doors' && s.plate).toHaveLength(1)
      expect(s?.screen === 'doors' && s.keys).toHaveLength(3)
      c.destroy()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the doors\' plate on the English path', () => {
  const w = (id: string) => ({ kind: 'word' as const, id, text: id, soundId: `w-${id}`, itemId: id })

  it('a phrase sits on the plate left to right in Andika, its words lit one at a time; the keys show their files', () => {
    const plate = [w('a'), w('big'), w('duck')]
    const keys = [{ id: 'duck', picture: '/duck.png' }, { id: 'dog', picture: '/dog.png' }, { id: 'cat', picture: '/cat.png' }]
    const { container } = render(<Doors word={keys[0]} plate={plate} lit={2} keys={keys} onPick={() => {}} phase="answer" opening={false} zooming={false} dir="ltr" />)
    const parts = [...container.querySelectorAll('[data-syl]')]
    expect(parts.map((g) => g.textContent)).toEqual(['a', 'big', 'duck'])
    const cx = parts.map((g) => Number(g.getAttribute('data-cx')))
    expect(cx[0]).toBeLessThan(cx[1])
    expect(cx[1]).toBeLessThan(cx[2])
    expect(parts.map((g) => g.getAttribute('data-lit'))).toEqual(['1', '1', '0'])
    expect((container.querySelector('[data-glyph]') as SVGTextElement).style.fontFamily).toContain('Andika')
    expect([...container.querySelectorAll('[data-key-picture]')].map((x) => x.getAttribute('href'))).toEqual(['/duck.png', '/dog.png', '/cat.png'])
  })
})
