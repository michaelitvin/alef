// The Hebrew spell book in the run (Task 26): a door word, its syllables in the boxes. Its instruction lines have no voice
// files yet: a missing file never stalls the visit. Each box's first drop is one answer on its syllable, by the Hebrew
// counting rules (the stage rule stops at 4).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController, type SpellView, type View } from './controller'
import { HEBREW } from './course/hebrew'
import { memorySavePort } from './savePort'
import { seeded, until } from './testing/runHarness'
import { fakeAudio } from '../shared/gameAudio/fakePlayer'

const spell = (v: View) => v.screen as SpellView

beforeEach(() => { vi.useFakeTimers(); HEBREW.telemetry.clear(); fakeAudio.reset() })
afterEach(() => { fakeAudio.onVoice(null); vi.useRealTimers() })

describe('the Hebrew spell book in the run', () => {
  it('with no voice files at all, a fresh save sees the demo once and plays the session to the end; each box counts on its syllable', async () => {
    // every clip missing: the player says so at once (not heard)
    fakeAudio.onVoice(() => Promise.resolve(false))
    const save = memorySavePort({ stage: { stage: 4, newAnswers: 'oox' }, bookOpen: true })
    const c = new RunController({ course: HEBREW, save, now: () => Date.now(), rng: seeded(3), session: { screen: 'spell' } })
    c.start()
    const words: string[] = []
    const syllables: string[] = []
    for (let round = 0; round < 6 && !c.view.over; round++) {
      await until(c, (v) => (v.screen?.screen === 'spell' && !spell(v).alive && v.phase === 'answer') || !!v.over)
      if (c.view.over) break
      const r = spell(c.view).round
      words.push(r.word)
      expect(r.tail).toBeDefined()
      for (let box = 0; box < r.boxes.length; box++) {
        await until(c, (v) => v.phase === 'answer')
        syllables.push(r.boxes[box].unit)
        c.gesture({ type: 'drop', tile: r.boxes[box].unit, box })
      }
      await until(c, (v) => spell(v).alive || !!v.over)
    }
    await until(c, (v) => !!v.over)
    expect(c.view.over).toMatchObject({ session: true })
    expect(words.length).toBeGreaterThan(0)
    const said = fakeAudio.said()
    // the demo was asked for once (its file is missing) and the visit went on
    expect(said.filter((id) => id.startsWith('demo-spell'))).toHaveLength(1)
    expect(save.read().demosSeen).toContain('demo-spell')
    for (const w of words) expect(said).toContain(`w-${w}`)
    // each box an answer on its syllable (its letter, vowel group and the spell book); the stage stays 4 (no answer at stage 4 is on new content)
    const st = save.read()
    for (const u of new Set(syllables)) {
      const [item, mark] = [u.slice(0, u.indexOf('-')), u.slice(u.indexOf('-') + 1)]
      expect(st.tallies[`l:${item}`]?.seen, u).toBeGreaterThan(0)
      expect(Object.keys(st.tallies).some((k) => k.startsWith(`s:${item}-`)), `${u} (${mark})`).toBe(true)
    }
    expect(st.tallies['sc:spell']?.seen).toBe(syllables.length)
    expect(st.stage).toEqual({ stage: 4, newAnswers: 'oox' })
    c.destroy()
  }, 60_000)
})
