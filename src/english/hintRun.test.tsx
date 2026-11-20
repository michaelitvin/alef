// The hint that blends a word, in the English run (design Part 5; the method is units then word, the parent's choice of
// 2026-11-20, and lightsOnNormalWord is its fallback for a missing unit clip): the `?` blends the words of the screen, and the answer after it counts as helped; after
// every second miss on a word round the right word blends too; a missing clip never stalls it. The cauldron's made word
// blends, a thrown e's turn says the short word and then the long one, and a thrown e never counts towards the stage.
import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { recordSession, seeded, until } from '../duel2/testing/runHarness'
import { RunController, type ScreenView, type View } from '../duel2/controller'
import type { Course } from '../duel2/course/types'
import { fakeAudio } from '../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { blendOf } from './logic/blend'
import { wordChoice } from './logic/rounds/broom'
import { word } from './content/words'
import { unit } from './content/units'
import { memoryEnglishSavePort } from './savePort'
import { englishTelemetry } from './telemetry'
import type { EnglishSave } from './saveFormat'

type Save = ReturnType<typeof memoryEnglishSavePort>
type Run = { c: RunController; save: Save; views: View[] }

/** an English save after its placement, the screens' demos seen */
function englishSave(stage: number, more: Partial<EnglishSave> = {}): Save {
  return memoryEnglishSavePort({
    stage: { stage, newAnswers: '' }, demosSeen: ['demo-cauldron', 'demo-doors', 'demo-ghosts-sound', 'demo-ghosts-word', 'demo-ladder', 'demo-broom-sound', 'demo-broom', 'demo-ghosts-letter', 'demo-ghosts-syllable', 'demo-broom-letter'],
    placement: { state: null, requested: false, done: { level: stage, answers: 5, at: 1 }, runs: 1 }, ...more,
  })
}

const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const answering = (v: View) => (v.phase === 'answer' && !v.fixing && !v.needNext) || !!v.over

/** a session of `screen` on the fake clock, at its first answer; every view is kept */
async function englishSession(save: Save, screen: 'cauldron' | 'doors' | 'ghosts', course: Course = ENGLISH, seed = 7): Promise<Run> {
  const c = new RunController({ course, save, now: () => Date.now(), rng: seeded(seed), session: { screen } })
  const views: View[] = []
  c.subscribe(() => views.push(c.view))
  c.start()
  await until(c, answering)
  return { c, save, views }
}

/** the `?`, and the blend plays to its end */
async function hint(run: Run) {
  const from = run.views.length
  run.c.hint()
  await until(run.c, (v) => run.views.slice(from).some((x) => x.overlay?.kind === 'blend') && v.overlay?.kind !== 'blend')
}

/** the cauldron's missing unit */
const targetUnit = (run: Run) => { const s = run.c.view.screen!; if (s.screen !== 'cauldron') throw new Error('not the cauldron'); return s.boxes![s.gap!].id }

/** he picks the right tile, or a wrong one and then the marked right one himself; then on to the next answer */
async function answer(run: Run, how: 'right' | 'wrong') {
  const s = run.c.view.screen!
  if (s.screen !== 'cauldron') throw new Error('not the cauldron')
  const right = s.boxes![s.gap!].id
  run.c.gesture({ type: 'pick', id: how === 'right' ? right : s.tiles!.find((x) => x.id !== right)!.id })
  if (how === 'wrong') {
    await until(run.c, (v) => !!v.fixing || !!v.over)
    if (run.c.view.fixing) run.c.gesture({ type: 'pick', id: right })
  }
  await until(run.c, (v) => v.phase !== 'answer' || !!v.over)
  await until(run.c, (v) => { if (v.needNext) run.c.next(); return answering(v) })
}

/** `n` misses in a row on `screen`: after each, did the right word blend? */
async function missTimes(n: number, screen: 'cauldron') {
  vi.useFakeTimers()
  const run = await englishSession(englishSave(2), screen)
  const blends: boolean[] = []
  try {
    for (let i = 0; i < n; i++) {
      const from = run.views.length
      await answer(run, 'wrong')
      blends.push(run.views.slice(from).some((v) => v.overlay?.kind === 'blend'))
    }
  } finally {
    run.c.destroy()
    vi.useRealTimers()
  }
  return { blends }
}

/**
 * the units lit as `w` blends on the `?`, whether the blend ended, and when each unit lit and the blend ended (ms from
 * the voice's start, or from the first light when the clip is missing)
 */
async function playBlend(w: ReturnType<typeof word>) {
  const course: Course = { ...ENGLISH, hint: { plan: () => [blendOf(w)], of: () => null } }
  const run = await englishSession(englishSave(2), 'cauldron', course)
  let lit: number[] = []
  let voiceAt: number | null = null
  const at: number[] = []
  let endAt = 0
  fakeAudio.onPlay = (e) => { if (e.id === wordChoice(w).soundId) voiceAt = Date.now() }
  run.c.subscribe(() => {
    const o = run.c.view.overlay
    if (o?.kind === 'blend' && o.lit.length > lit.length) at.push(Date.now())
    if (o?.kind === 'blend') lit = o.lit
    else if (lit.length && !endAt) endAt = Date.now()
  })
  try {
    await hint(run)
    const from = voiceAt ?? at[0]
    return { lit, ended: run.c.view.overlay === null, at: at.map((x) => x - from), endMs: endAt - from }
  } finally {
    run.c.destroy()
  }
}

/** the times, each within a ms of the ones expected (a timer's tick, the rounding of a stretched light) */
const near = (got: number[], want: number[]) => {
  expect(got).toHaveLength(want.length)
  got.forEach((x, i) => expect(Math.abs(x - want[i])).toBeLessThanOrEqual(1))
}

/** a doors view with these words on the plate */
const doorsView = (words: string[]): ScreenView => ({
  screen: 'doors', lit: words.length, opening: false, zooming: false, plate: words.map((id) => wordChoice(word(id))),
  word: { id: words[words.length - 1], picture: '' }, keys: [],
})

describe('the hint that blends a word', () => {
  it('the doors\' hint plans every word on the door, left to right', () => {
    expect(ENGLISH.hint!.plan(doorsView(['a', 'red', 'bus'])).map((p) => p.audio[0])).toEqual(['hw-a', 'w-red', 'w-bus'])
  })

  it('a word after a hint counts as helped', async () => {
    vi.useFakeTimers()
    englishTelemetry.clear()
    // (stage 1: every unit is new, so each answer counts towards the stage)
    const save = englishSave(1)
    const run = await englishSession(save, 'cauldron')
    try {
      expect(run.c.view.hintAvailable).toBe(true)
      const u = targetUnit(run)
      expect(unit(u).stage).toBe(1)
      expect(save.read().stage.newAnswers).toBe('')
      await hint(run)
      await answer(run, 'right')
      expect(save.read().tallies[u]).toMatchObject({ helped: 1 })
      expect(save.read().tallies[u].wrong ?? 0).toBe(0)
      expect(save.read().tallies['sc:cauldron']).toMatchObject({ seen: 1, helped: 1 })
      const events = englishTelemetry.events() as { e: string; result?: string; by?: string }[]
      expect(events.find((e) => e.e === 'blend-hint')).toMatchObject({ by: 'button', words: 1 })
      expect(events.find((e) => e.e === 'answer')).toMatchObject({ result: 'helped' })
      // the answer names its word beside the unit it asked, and every English event carries g
      expect(events.find((e) => e.e === 'answer')).toHaveProperty('word', expect.any(String))
      expect(events.length).toBeGreaterThan(1)
      expect((events as { g?: string }[]).every((e) => e.g === 'english')).toBe(true)
      // on the stage pass it is not a right answer
      expect(save.read().stage.newAnswers).toBe('x')
      // the next answer, with no hint, is right again
      const next = targetUnit(run)
      await answer(run, 'right')
      expect(unit(next).stage).toBe(1)
      expect(save.read().stage.newAnswers).toBe('xo')
      expect((englishTelemetry.events() as { e: string; result?: string }[]).filter((e) => e.e === 'answer').map((e) => e.result)).toEqual(['helped', 'right'])
    } finally {
      run.c.destroy()
      vi.useRealTimers()
    }
  })

  it('a touch on an answer stops the hint', async () => {
    vi.useFakeTimers()
    englishTelemetry.clear()
    fakeAudio.voiceMs = 2000
    const run = await englishSession(englishSave(2), 'cauldron')
    try {
      run.c.hint()
      await until(run.c, (v) => v.overlay?.kind === 'blend')
      run.c.gesture({ type: 'touch', by: 'answer' })
      expect(run.c.view.overlay).toBeNull()
      expect((englishTelemetry.events() as { e: string }[]).some((e) => e.e === 'hint-stop')).toBe(true)
      await wait(3000)
      expect(run.c.view.overlay).toBeNull()
    } finally {
      run.c.destroy()
      vi.useRealTimers()
    }
  })

  it('the blend plays after every second miss, not every miss', async () => {
    const { blends } = await missTimes(4, 'cauldron')
    expect(blends).toEqual([false, true, false, true])
  })

  it('units then word: each unit says its own sound and lights as it plays, then the word with all lit', async () => {
    vi.useFakeTimers()
    try {
      const r = await playBlend(word('fish'))
      expect(fakeAudio.said().filter((id) => id.startsWith('snd-') || id === 'w-fish')).toEqual(['snd-f', 'snd-ih', 'snd-sh', 'w-fish'])
      expect(r.lit).toEqual([0, 1, 2])
      expect(r.ended).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a magic-e unit says its long sound and lights both its letters', async () => {
    vi.useFakeTimers()
    try {
      const w = word('cake')
      const r = await playBlend(w)
      expect(fakeAudio.said().filter((id) => id.startsWith('snd-') || id === 'w-cake')).toEqual(['snd-k', 'snd-ay', 'snd-k', 'w-cake'])
      expect(r.lit).toEqual([0, 1, 2])
      expect(blendOf(w).parts.filter((x) => x.unit === 1).map((x) => x.text)).toEqual(['a', 'e'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('a heart word plays just the word', async () => {
    vi.useFakeTimers()
    try {
      const r = await playBlend(word('a'))
      expect(fakeAudio.said().filter((id) => id.startsWith('snd-') || id.endsWith('-a'))).toEqual(['hw-a'])
      expect(r.lit).toEqual([0])
      expect(r.ended).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a missing unit clip falls back to the units lighting while the normal word plays, and never stalls', async () => {
    vi.useFakeTimers()
    try {
      fakeAudio.missing = (id) => id === 'snd-ih'
      const r = await playBlend(word('fish'))
      expect(fakeAudio.said()).toContain('w-fish')
      expect(r.lit).toEqual([0, 1, 2])
      expect(r.ended).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a missing word clip still lights the units and ends', async () => {     // Review Focus 1
    vi.useFakeTimers()
    try {
      fakeAudio.missing = (id) => id === 'w-fish' || id.startsWith('snd-')
      const r = await playBlend(word('fish'))
      expect(r.lit).toEqual([0, 1, 2])
      expect(r.ended).toBe(true)
      // (on the fallback length, 700 ms)
      expect(r.at).toEqual([0, 233, 467])
      expect(r.endMs).toBe(700)
    } finally {
      vi.useRealTimers()
    }
  })

  it('with no timing, the lights split the clip\'s real length from its real start: a 1.4 s clip', async () => {
    vi.useFakeTimers()
    try {
      fakeAudio.missing = (id) => id.startsWith('snd-')
      fakeAudio.durationOf = (id) => (id === 'w-fish' ? 1400 : null)
      fakeAudio.onVoice((id) => new Promise((r) => setTimeout(r, id === 'w-fish' ? 1400 : 10)))
      const r = await playBlend(word('fish'))
      expect(r.lit).toEqual([0, 1, 2])
      near(r.at, [0, 467, 933])
      expect(r.endMs).toBe(1400)
    } finally {
      fakeAudio.onVoice(null)
      vi.useRealTimers()
    }
  })

  it('the lights start when the clip is really heard (its file loaded), not when it is asked for', async () => {
    vi.useFakeTimers()
    try {
      fakeAudio.missing = (id) => id.startsWith('snd-')
      fakeAudio.loadMs = 300
      fakeAudio.durationOf = (id) => (id === 'w-fish' ? 1400 : null)
      fakeAudio.onVoice((id) => new Promise((r) => setTimeout(r, id === 'w-fish' ? 1700 : 10)))
      const r = await playBlend(word('fish'))
      expect(r.lit).toEqual([0, 1, 2])
      near(r.at, [300, 766, 1234])
      expect(r.endMs).toBe(1700)
    } finally {
      fakeAudio.onVoice(null)
      vi.useRealTimers()
    }
  })

  it('the misses are counted per visit: one miss on a visit and one on the next bring no blend', async () => {
    englishTelemetry.clear()
    let cauldron = 0
    // a run: one miss on the cauldron's visit, then misses on the ladder's (the third ends the run); the merchant (whom
    // the harness does not serve) is kept away: his last visit is put far enough back that no checkpoint of this run is his
    const save = englishSave(2, { checkpointsSinceVisit: -10 })
    const log = await recordSession({ course: ENGLISH, save, rng: seeded(7) }, (v) =>
      v.screen?.screen === 'cauldron' ? (cauldron++ === 0 ? 'wrong' : 'right') : v.screen?.screen === 'ladder' ? 'wrong' : 'right')
    const events = englishTelemetry.events() as { e: string; screen?: string; result?: string; by?: string }[]
    const wrong = events.filter((e) => e.e === 'answer' && e.result === 'wrong').map((e) => e.screen)
    expect(wrong).toEqual(['cauldron', 'ladder', 'ladder'])
    expect(log.views.some((v) => v.startsWith('ladder:'))).toBe(true)
    expect(events.filter((e) => e.e === 'blend-hint' && e.by === 'miss')).toEqual([])
  })

  it('the cauldron\'s made word blends after a right answer', async () => {
    vi.useFakeTimers()
    const run = await englishSession(englishSave(2), 'cauldron')
    try {
      const from = run.views.length
      await answer(run, 'right')
      const blend = run.views.slice(from).find((v) => v.overlay?.kind === 'blend')
      expect(blend?.overlay?.kind === 'blend' && blend.overlay.parts.length).toBeGreaterThan(1)
    } finally {
      run.c.destroy()
      vi.useRealTimers()
    }
  })

  it('a thrown e: the turn says the short word, then the long one, and the answer never counts towards the stage', async () => {
    vi.useFakeTimers()
    let throws = 0
    try {
      for (let seed = 1; seed <= 8 && throws < 2; seed++) {
        const save = englishSave(6)
        const run = await englishSession(save, 'cauldron', ENGLISH, seed)
        for (let round = 0; round < 6 && !run.c.view.over; round++) {
          const s = run.c.view.screen!
          if (s.screen !== 'cauldron') break
          const stage = save.read().stage
          const said = fakeAudio.said().length
          await answer(run, round % 2 ? 'wrong' : 'right')
          if (!s.shown) continue
          throws++
          const heard = fakeAudio.said().slice(said)
          const short = heard.lastIndexOf(s.shown.soundId)
          expect(short).toBeGreaterThanOrEqual(0)
          expect(heard.indexOf(s.target.soundId, short)).toBeGreaterThan(short)
          // (it does not count: the stage and its answers stay as they were)
          expect(save.read().stage).toEqual(stage)
        }
        run.c.destroy()
      }
      expect(throws).toBeGreaterThanOrEqual(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('no `?` on a round with no word: a ghosts visit of sounds', async () => {
    vi.useFakeTimers()
    try {
      let found = false
      for (let seed = 1; seed <= 10 && !found; seed++) {
        const run = await englishSession(englishSave(2), 'ghosts', ENGLISH, seed)
        const s = run.c.view.screen!
        if (s.screen === 'ghosts') {
          const words = s.signs.every((x) => x.kind === 'word')
          expect(run.c.view.hintAvailable).toBe(words)
          if (!words) found = true
        }
        run.c.destroy()
      }
      expect(found).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
