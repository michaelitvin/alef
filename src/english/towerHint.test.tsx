// The hint on the English tower's word rounds (design Part 5, "Which word"): a word round (a nonsense name, a picture's
// word) shows the `?`, which blends each word on the runes, left to right; the right answer after it is helped (its tally,
// its event, the stage pass). A letter round, the placement tower and the Hebrew tower have no `?`.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DuelController, type DuelAudio, type DuelEmbedded } from '../spellquest/tower/logic/controller'
import { HEBREW_TOWER, type TowerContent } from '../spellquest/tower/logic/content'
import { seeded } from '../spellquest/testing/runHarness'
import { RunController } from '../spellquest/controller'
import { ENGLISH } from './course'
import { englishTelemetry } from './telemetry'
import { useProgressStore } from '../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'
import { Tower } from '../spellquest/components/screens/Tower'
import { memoryEnglishSavePort, type EnglishSavePort } from './savePort'
import { WORDS, word } from './content/words'
import { blendOf } from './logic/blend'
import { enTowerRound, englishTower, placementTower, towerFacts, type EnTowerDeps } from './logic/tower'
import { READY_STAGES } from './readyStages'
import { wordVoice } from './content/voiceIds'
import type { Round } from '../spellquest/tower/types'

const at = (stage: number) => memoryEnglishSavePort({ stage: { stage, newAnswers: '' } })
const deps = (save: EnglishSavePort): EnTowerDeps => ({ save: () => save, picture: () => undefined, voice: () => false, blend: blendOf })
const NAME = WORDS.find((w) => w.kind === 'nonsense' && w.stage <= 3)!.id

/** a line player that says every clip is 600 ms long, and lists what it said */
function fakeAudio(said: string[]): DuelAudio {
  return {
    playLine: (id, _cue, onHeard) => { said.push(id); onHeard?.(600); return Promise.resolve() },
    playSfx: () => Promise.resolve(), lineAsset: (id) => ({ id, file: id, url: null }),
    stopAllLines: () => {}, mute: () => {}, unlock: () => {}, setLog: () => {},
  }
}

/** the fake clock goes on until `done` */
async function settle(done: () => boolean, max = 60_000) {
  for (let t = 0; t < max && !done(); t += 50) await vi.advanceTimersByTimeAsync(50)
  if (!done()) throw new Error('condition not met')
}

interface Played { c: DuelController; round: Round; said: string[]; events: { e: string; data: Record<string, unknown> }[]; answers: unknown[][]; save: EnglishSavePort }

/** a tower visit on `content` whose first round is `make`'s, up to its walking monster (the first round only) */
async function walking(content: TowerContent, make: (save: EnglishSavePort) => ((o: Parameters<TowerContent['makeRound']>[0]) => Round) | undefined, save = at(3)): Promise<Played> {
  const said: string[] = []
  const events: Played['events'] = []
  const answers: unknown[][] = []
  const embedded: DuelEmbedded = {
    wave: 1, waves: 1, boss: false, seen: ['tower-intro', 'tower-screen-C', 'tower-screen-word', 'tower-screen-B'], onSeen: () => {}, onDone: () => {},
    onAnswer: () => 'on',
    onAnswerRound: (...a) => { answers.push(a); return 'on' },
  }
  const c = new DuelController({
    embedded, telemetry: { track: (e, data = {}) => { events.push({ e, data }) }, flush: () => {} }, content, makeRound: make(save),
    tallies: save.towerTallies(), audio: fakeAudio(said), rng: seeded(4),
  })
  c.start()
  await settle(() => !!c.getView().state.walking)
  return { c, round: c.getView().state.round!, said, events, answers, save }
}

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); useProgressStore.setState({ ...INITIAL_PROGRESS_STATE }) })
afterEach(() => vi.useRealTimers())

describe('the English tower\'s hint', () => {
  it('a word round of the English tower shows the ? and plans each rune\'s word', async () => {
    const save = at(3)
    const d = deps(save)
    const content = englishTower(d)
    const p = await walking(content, () => (o) => enTowerRound(d, o, { kind: 'name', word: NAME }), save)
    expect(p.round.ask).toBe('name')
    expect(p.c.getView().canHint).toBe(true)
    // one plan per rune, left to right: the word on each, said in turn
    const plans = content.hint!(p.round)
    expect(plans).toEqual(p.round.runes.map((m) => blendOf(word(m.id))))
    expect(plans).toHaveLength(3)
    const before = p.said.length
    p.c.hint()
    // each word: its units' own sounds in turn, then the word
    const want = p.round.runes.flatMap((m) => [...(blendOf(word(m.id)).steps ?? []).map((x) => x.audio), wordVoice(word(m.id).text)])
    await settle(() => p.said.length - before >= want.length && p.c.getView().blend === null)
    expect(p.said.slice(before)).toEqual(want)
    expect(p.events.find((x) => x.e === 'blend-hint')?.data).toMatchObject({ words: 3, by: 'button' })
    p.c.destroy()
  })

  it('the lights go word by word: each word shows, its units light in turn, and the card goes away at the end', async () => {
    const save = at(3)
    const d = deps(save)
    const p = await walking(englishTower(d), () => (o) => enTowerRound(d, o, { kind: 'name', word: NAME }), save)
    const seen: string[] = []
    const stop = p.c.subscribe(() => { const b = p.c.getView().blend; if (b) seen.push(`${b.parts.map((x) => x.text).join('')}:${b.lit.join(',')}`) })
    p.c.hint()
    await settle(() => p.c.getView().blend === null && seen.length > 0)
    stop()
    for (const m of p.round.runes) expect(seen.some((s) => s.startsWith(`${word(m.id).text}:`))).toBe(true)
    const w = blendOf(word(p.round.runes[0].id))
    expect(seen).toContain(`${word(p.round.runes[0].id).text}:${w.lights.map((l) => l.unit).join(',')}`)
    p.c.destroy()
  })

  it('the right answer after the hint is helped: its tally, its event, not in the recent answers', async () => {
    const save = at(3)
    const d = deps(save)
    const p = await walking(englishTower(d), () => (o) => enTowerRound(d, o, { kind: 'name', word: NAME }), save)
    p.c.hint()
    await settle(() => p.c.getView().blend !== null)
    p.c.choose({ kind: 'rune', mark: p.round.target })
    await settle(() => p.answers.length > 0)
    expect(p.answers).toEqual([['right', p.round, true]])
    const t = save.towerTallies().read()
    expect(t.byMark[NAME]).toMatchObject({ seen: 1, helped: 1, correct: 0, wrong: 0 })
    expect(t.recent[NAME]).toBeUndefined()
    expect(p.events.find((x) => x.e === 'outcome')?.data).toMatchObject({ result: 'helped' })
    // a touch on an answer ended the blend
    expect(p.c.getView().blend).toBeNull()
    p.c.destroy()
  })

  it('an answer with no hint is right, as before; a miss after the hint is wrong', async () => {
    const save = at(3)
    const d = deps(save)
    const p = await walking(englishTower(d), () => (o) => enTowerRound(d, o, { kind: 'name', word: NAME }), save)
    p.c.choose({ kind: 'rune', mark: p.round.target })
    await settle(() => p.answers.length > 0)
    expect(p.answers).toEqual([['right', p.round]])
    expect(save.towerTallies().read().byMark[NAME]).toMatchObject({ seen: 1, correct: 1 })
    expect(save.towerTallies().read().byMark[NAME].helped).toBeUndefined()
    p.c.destroy()
    const q = await walking(englishTower(d), () => (o) => enTowerRound(d, o, { kind: 'name', word: NAME }), save)
    q.c.hint()
    await settle(() => q.c.getView().blend !== null)
    q.c.choose({ kind: 'rune', mark: q.round.runes.find((m) => m.id !== NAME)! })
    await settle(() => q.answers.length > 0)
    expect(q.answers).toEqual([['wrong', q.round]])
    q.c.destroy()
  })

  it('a helped answer counts as helped in the run: the tally, the event, the stage pass (x), the star', async () => {
    const save = memoryEnglishSavePort({
      stage: { stage: 3, newAnswers: '' }, placement: { state: null, requested: false, done: { level: 3, answers: 5, at: 1 }, runs: 1 },
      demosSeen: ['tower-intro', 'tower-screen-C'],
    })
    const d = deps(save)
    const run = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(11), session: { screen: 'tower' } })
    let duel: DuelController | null = null
    const mount = () => {
      const s = run.view.screen
      if (s?.screen !== 'tower' || duel) return
      duel = new DuelController({
        content: englishTower(d), makeRound: (o) => enTowerRound(d, o, { kind: 'name', word: NAME }), tallies: save.towerTallies(), audio: fakeAudio([]), rng: seeded(5),
        embedded: {
          wave: s.wave, waves: s.waves, boss: s.boss, seen: save.read().demosSeen, onSeen: (k) => save.markDemo(k), owed: [], onDone: (w) => run.towerDone(w),
          onAnswer: (r, id) => run.towerAnswer(r, id),
          onAnswerRound: (r, round, helped) => (helped ? run.towerAnswer(r, round.target.id, round, helped) : run.towerAnswer(r, round.target.id, round)),
        },
        telemetry: englishTelemetry,
      })
      duel.start()
    }
    run.subscribe(mount)
    run.start()
    mount()
    const asking = () => { const s = duel?.getView().state; return !!s && s.phase === 'playing' && !s.paused && !s.preview && !!s.round && !s.outcome && s.walking }
    await settle(asking)
    const round = duel!.getView().state.round!
    const features = towerFacts(round, 3).features
    const before = save.read().tallies
    const recentBefore = { ...save.read().recent }
    englishTelemetry.clear()
    duel!.hint()
    await settle(() => !!duel!.getView().blend)
    duel!.choose({ kind: 'rune', mark: round.target })
    await settle(() => (englishTelemetry.events() as { e: string }[]).some((x) => x.e === 'answer'))
    const after = save.read()
    for (const f of features) expect(after.tallies[f]).toMatchObject({ seen: (before[f]?.seen ?? 0) + 1, helped: (before[f]?.helped ?? 0) + 1, wrong: before[f]?.wrong ?? 0 })
    // (a helped answer is neither right nor wrong: not in the recent answers)
    for (const f of features) expect(after.recent[f]).toBe(recentBefore[f])
    expect((englishTelemetry.events() as { e: string; result?: string; screen?: string }[]).find((x) => x.e === 'answer' && x.screen === 'tower')).toMatchObject({ result: 'helped' })
    // the tower's own events (via: 'tower', its hint's `{round, words, by}`) and the run's answer all carry g
    const all = englishTelemetry.events() as { e: string; g?: string; via?: string; round?: unknown }[]
    expect(all.some((x) => x.e === 'blend-hint' && x.via === 'tower' && x.round !== undefined)).toBe(true)
    expect(all.some((x) => x.e === 'answer' && x.via === undefined)).toBe(true)
    expect(all.every((x) => x.g === 'english')).toBe(true)
    duel!.destroy()
    run.destroy()
  })

  it('the walk is held while the blend plays: no timeout in it, and it goes on with the time it had left', async () => {
    const save = at(3)
    const d = deps(save)
    // a short walk (2 s) that the blend (about 2.4 s) outlasts
    const p = await walking(englishTower(d), () => (o) => ({ ...enTowerRound(d, o, { kind: 'name', word: NAME }), walkMs: 2000 }), save)
    const round = p.round
    await vi.advanceTimersByTimeAsync(1000)
    p.c.hint()
    expect(p.c.getView().held).toBe(true)
    await settle(() => p.c.getView().blend === null && p.c.getView().held === false, 10_000)
    // the blend lasted longer than the whole walk, and the monster is still on the field
    expect(p.c.getView().state.outcome).toBeNull()
    expect(p.c.getView().state.round).toBe(round)
    // about a second was left of the walk
    await vi.advanceTimersByTimeAsync(800)
    expect(p.c.getView().state.outcome).toBeNull()
    await vi.advanceTimersByTimeAsync(400)
    expect(p.c.getView().state.outcome).not.toBeNull()
    expect(p.c.getView().state.outcome!.kind).toBe('miss')
    p.c.destroy()
  })

  it('a tap during the blend answers at once and the walk is no longer held', async () => {
    const save = at(3)
    const d = deps(save)
    const p = await walking(englishTower(d), () => (o) => enTowerRound(d, o, { kind: 'name', word: NAME }), save)
    p.c.hint()
    await settle(() => !!p.c.getView().blend)
    p.c.choose({ kind: 'rune', mark: p.round.target })
    expect(p.c.getView().held).toBe(false)
    expect(p.c.getView().state.outcome!.kind).toBe('hit')
    p.c.destroy()
  })

  it('after every second word miss of the visit the feedback blends the right word', async () => {
    const save = at(3)
    const d = deps(save)
    const p = await walking(englishTower(d), () => (o) => enTowerRound(d, o, { kind: 'name', word: NAME }), save)
    const missBlends = () => p.events.filter((x) => x.e === 'blend-hint' && x.data.by === 'miss').length
    const blends: string[] = []
    p.c.subscribe(() => { const b = p.c.getView().blend; if (b) blends.push(b.parts.map((x) => x.text).join('')) })
    const wrongOnce = async (round: Round) => {
      p.c.choose({ kind: 'rune', mark: round.runes.find((m) => m.id !== round.target.id)! })
      await settle(() => p.events.filter((x) => x.e === 'outcome').length > 0 && p.c.getView().state.outcome === null && !!p.c.getView().state.round && p.c.getView().state.walking)
    }
    const ids = () => p.events.filter((x) => x.e === 'outcome').length
    // the first miss: the plain word; the second: the right word blends
    await wrongOnce(p.round)
    expect(ids()).toBe(1)
    expect(missBlends()).toBe(0)
    expect(blends).toEqual([])
    const second = p.c.getView().state.round!
    p.c.choose({ kind: 'rune', mark: second.runes.find((m) => m.id !== second.target.id)! })
    await settle(() => missBlends() === 1 && p.c.getView().blend === null && blends.length > 0)
    expect(blends[0]).toBe(word(second.target.id).text)
    expect(new Set(blends).size).toBe(1)
    p.c.destroy()
  })

  it('a letter round has no ?', async () => {
    const save = at(3)
    const d = deps(save)
    const p = await walking(englishTower(d), () => (o) => enTowerRound(d, o, { kind: 'letter', unit: 'v' }), save)
    expect(p.round.ask).toBe('letter')
    expect(p.c.getView().canHint).toBe(false)
    p.c.hint()
    expect(p.c.getView().blend).toBeNull()
    expect(p.events.some((x) => x.e === 'blend-hint')).toBe(false)
    p.c.destroy()
  })

  it('the placement tower has no ?', async () => {
    const save = memoryEnglishSavePort({ placement: { state: null, requested: true, done: null, runs: 0 } })
    const content = placementTower(save, READY_STAGES, (k) => k)
    expect(content.hint).toBeUndefined()
    const p = await walking(content, () => undefined, save)
    expect(p.round.ask).toBeUndefined()
    expect(p.c.getView().canHint).toBe(false)
    p.c.hint()
    expect(p.c.getView().blend).toBeNull()
    p.c.destroy()
  })

  it('the English course\'s tower has the hint, and the Hebrew course\'s has none', async () => {
    const { HEBREW } = await import('../spellquest/course/hebrew')
    expect(ENGLISH.tower.content.hint).toBeDefined()
    expect(HEBREW.tower.content.hint).toBeUndefined()
  })

  it('the Hebrew tower has no ?', async () => {
    expect(HEBREW_TOWER.hint).toBeUndefined()
    const p = await walking(HEBREW_TOWER, () => undefined, at(3))
    expect(p.c.getView().canHint).toBe(false)
    p.c.hint()
    expect(p.c.getView().blend).toBeNull()
    p.c.destroy()
  })
})

describe('the ? on the board', () => {
  function board(kind: 'name' | 'letter') {
    const save = at(3)
    save.markDemo('tower-intro')
    save.markDemo('tower-screen-C')
    save.markDemo('tower-screen-B')
    save.markDemo('tower-screen-A')
    const d = deps(save)
    const content: TowerContent = { ...englishTower(d), makeRound: (o) => enTowerRound(d, o, kind === 'name' ? { kind: 'name', word: NAME } : { kind: 'letter', unit: 'v', by: 'sound' }) }
    const said: string[] = []
    const answers: unknown[][] = []
    const course = {
      tower: { content, tallies: () => save.towerTallies(), audio: fakeAudio(said), facts: towerFacts },
      dir: 'ltr' as const, save: () => save, telemetry: { track: () => {}, flush: () => {} } as never, placement: undefined,
    }
    const ui = render(<Tower view={{ screen: 'tower', wave: 1, waves: 1, boss: false, visit: 1 }} paused={false} course={course}
      onAnswer={(...a) => { answers.push(a); return 'on' }} onDone={() => {}} />)
    return { ...ui, said, answers }
  }

  it('a word round shows the ? button, and a tap on it blends the words (the BlendWord card)', async () => {
    const { container, said } = board('name')
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    const btn = container.querySelector('.nd-hint-btn')!
    expect(btn).not.toBeNull()
    fireEvent.click(btn)
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    expect(container.querySelector('[data-blend]')).not.toBeNull()
    await act(async () => { await vi.advanceTimersByTimeAsync(8000) })
    expect(container.querySelector('[data-blend]')).toBeNull()
    expect(said.filter((id) => id.startsWith('w-')).length).toBe(3)
  })

  it('the English tower\'s pad runs left to right; the Hebrew tower\'s has no direction of its own', async () => {
    const en = board('name')
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(en.container.querySelector('.nd-pad-area')!.getAttribute('dir')).toBe('ltr')
    en.unmount()
    const he = render(<Tower view={{ screen: 'tower', wave: 1, waves: 1, boss: false, visit: 1 }} paused={false} onAnswer={() => 'on'} onDone={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(he.container.querySelector('.nd-pad-area')!.hasAttribute('dir')).toBe(false)
    he.unmount()
  })

  it('the ? sits right of the tower, so it never covers the door (the tower\'s size follows the screen: it is measured)', async () => {
    const rect = (left: number, right: number) => ({ left, right, top: 0, bottom: 0, width: right - left, height: 0, x: left, y: 0, toJSON: () => ({}) })
    const real = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function (this: Element) {
      return this.classList.contains('nd-tower') ? rect(20, 128) : this.classList.contains('nd-pad-area') ? rect(0, 740) : real.call(this)
    }
    try {
      const { container } = board('name')
      await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
      expect((container.querySelector('.nd-hint-btn') as HTMLElement).style.left).toBe('140px')
    } finally {
      Element.prototype.getBoundingClientRect = real
    }
  })

  it('a letter round shows no ?', async () => {
    const { container } = board('letter')
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(container.querySelector('.nd-pad')).not.toBeNull()
    expect(container.querySelector('.nd-hint-btn')).toBeNull()
  })
})
