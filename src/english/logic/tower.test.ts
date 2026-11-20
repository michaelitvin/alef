// The English tower's letter and word rounds (design Part 5): what each round asks and shows, what is said, and that a
// tower run on the English course keeps its answers in the English save and goes on when a clip is missing.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MakeRoundOpts } from '../../utils/duel/rounds'
import type { Round } from '../../types/duel'
import type { FeedbackPlan } from '../../utils/duel/flow'
import { DuelController, type DuelAudio } from '../../utils/duel/controller'
import { instantSleeper } from '../../shared/sleeper'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { seeded } from '../../duel2/testing/runHarness'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'
import { memoryEnglishSavePort, englishSavePort, type EnglishSavePort } from '../savePort'
import { useEnglishStore } from '../store'
import { ENGLISH_FRESH } from '../saveFormat'
import { ENGLISH } from '../course'
import { englishDuelAudio } from '../audio'
import { EN_TOWER_LINE_IDS, enLine } from '../data/lines'
import { SOUND_KEYS, UNITS, unit } from '../content/units'
import { WORDS, word } from '../content/words'
import { PLACEMENT_ROUNDS } from '../content/placementRounds'
import { wordPicture } from '../assets/images'
import { EN_TOWER_OWN_LINES, choosePlacementRound, englishTower, enTowerRound, placementTower, towerFacts, type EnTowerDeps, type PictureOf } from './tower'

const FULL: FeedbackPlan = { say: 'full', banner: true, waitMs: 0, tailMs: 0 }
const SHORT: FeedbackPlan = { say: 'sound', banner: true, waitMs: 0, tailMs: 0 }

const at = (stage: number, over: Parameters<typeof memoryEnglishSavePort>[0] = {}) =>
  memoryEnglishSavePort({ stage: { stage, newAnswers: '' }, ...over })
/** (no sound clip by default: a unit with a picture is asked by its picture) */
const deps = (save: EnglishSavePort, picture: PictureOf = wordPicture, voice: (id: string) => boolean = () => false): EnTowerDeps =>
  ({ save: () => save, picture, voice })
/** every picture has a file */
const allPictures: PictureOf = (k) => `${k}.webp`
const opts = (o: Partial<MakeRoundOpts> = {}): MakeRoundOpts => ({ id: 1, wave: 1, kills: 1, boss: false, rng: seeded(3), lifetime: {}, ...o })
/** only fox has a picture file */
const onlyFox: PictureOf = (k) => (k === 'fox' ? 'fox.webp' : undefined)

/** many rounds of the English tower at a stage, at these waves */
function rounds(stage: number, waves: number[], n = 300, extra: Partial<MakeRoundOpts> = {}): Round[] {
  const t = englishTower(deps(at(stage)))
  const rng = seeded(stage * 31 + waves[0])
  return Array.from({ length: n }, (_, i) => t.makeRound(opts({ id: i + 1, wave: waves[i % waves.length], kills: i % 5, rng, ...extra })))
}
const texts = (r: Round) => r.runeTexts!.map((x) => x.text)

/** a voice id the English path has: a sound unit's sound, a word, a nonsense name, a heart word */
function isVoiceId(id: string): boolean {
  const [, kind, rest] = /^(snd|w|nw|hw)-(.+)$/.exec(id) ?? []
  if (kind === 'snd') return (SOUND_KEYS as readonly string[]).includes(rest)
  const w = WORDS.find((x) => x.text === rest)
  if (!w) return false
  return kind === 'nw' ? w.kind === 'nonsense' : kind === 'hw' ? w.kind === 'heart' : w.kind === 'real' || w.kind === 'picture-only'
}

/** awaits the flow until `done` (bounded: a microtask drain, with a macrotask every so often) */
async function settle(done: () => boolean, rounds = 4000) {
  for (let i = 0; i < rounds && !done(); i++) {
    for (let j = 0; j < 200 && !done(); j++) await null
    await new Promise((r) => setTimeout(r, 0))
  }
}

describe('the English tower\'s rounds', () => {
  it('fox asks x by its last sound', () => {
    const t = englishTower(deps(at(3), onlyFox))
    const r = enTowerRound(deps(at(3), onlyFox), opts(), { kind: 'letter', unit: 'x' })
    expect(r).toMatchObject({ type: 'A', picture: 'fox.webp', word: { key: 'fox' }, target: { id: 'x' } })
    expect(t.howLine(r)).toMatchObject({ id: 'line-how-last', key: 'last' })
    expect(texts(r)).toHaveLength(4)
    expect(texts(r)).toContain('x')
    // the picture's other sounds are not on the board: only one rune is in the fox
    expect(texts(r)).not.toContain('f')
    expect(texts(r)).not.toContain('o')
    // a tap on the sign says the picture's word
    expect(t.questionParts(r)).toEqual(['w-fox'])
    // a first-sound picture keeps the first duel's explanation
    const m = enTowerRound(deps(at(3)), opts(), { kind: 'letter', unit: 'm' })
    expect(t.howLine(m)).toMatchObject({ id: 'line-how-A', key: 'A' })
  })

  it('a unit with no picture is asked by sound', () => {
    // th: no picture of a first th in the word lists
    const t = englishTower(deps(at(4)))
    const r = enTowerRound(deps(at(4)), opts(), { kind: 'letter', unit: 'th' })
    expect(r.type).toBe('B')
    expect(r.picture).toBeUndefined()
    expect(t.questionParts(r)).toEqual(['snd-th'])
    expect(t.howLine(r)).toMatchObject({ id: 'line-how-B', key: 'B' })
    // and a unit whose picture file is missing too: fox's x, with no file
    const x = enTowerRound(deps(at(3), () => undefined), opts(), { kind: 'letter', unit: 'x' })
    expect(x.type).toBe('B')
    expect(englishTower(deps(at(3), () => undefined)).feedbackParts(x, FULL)).toEqual(['snd-ks', 'w-fox'])
  })

  it('the feedback is the unit\'s sound then the word', () => {
    const t = englishTower(deps(at(3), onlyFox))
    const r = enTowerRound(deps(at(3), onlyFox), opts(), { kind: 'letter', unit: 'x' })
    expect(t.feedbackParts(r, FULL)).toEqual(['snd-ks', 'w-fox'])
    // a quick right answer on a strong unit (and a boss hit that goes on): the sound alone
    expect(t.feedbackParts(r, SHORT)).toEqual(['snd-ks'])
  })

  it('name rounds from stage 2 on, 3 runes', () => {
    expect(rounds(1, [1, 2, 3, 4]).some((r) => r.type === 'C')).toBe(false)
    const names = rounds(2, [1, 2, 3, 4]).filter((r) => r.type === 'C')
    expect(names.length).toBeGreaterThan(30)
    const t = englishTower(deps(at(2)))
    for (const r of names) {
      const w = word(r.target.id)
      expect(w.kind).toBe('nonsense')
      expect(w.stage).toBeLessThanOrEqual(2)
      expect(r.runeTexts).toHaveLength(3)
      expect(r.runeTexts!.every((x) => x.alphabet === 'latin')).toBe(true)
      expect(new Set(texts(r)).size).toBe(3)
      // every word shown is in the lists, of his stage or below
      for (const id of r.runes.map((m) => m.id)) expect(word(id).stage).toBeLessThanOrEqual(2)
      expect(t.questionParts(r)).toEqual([`nw-${w.text}`])
      expect(t.feedbackParts(r, FULL)).toEqual([`nw-${w.text}`])
      expect(t.howLine(r)).toMatchObject({ id: 'line-how-C', key: 'C' })
    }
  })

  it('4 letter runes at wave 3 and later', () => {
    for (const stage of [1, 3, 4, 9]) {
      const letters = rounds(stage, [3, 4, 6, 9, 12]).filter((r) => r.type !== 'C' && UNITS.some((u) => u.id === r.target.id))
      expect(letters.length).toBeGreaterThan(50)
      for (const r of letters) {
        expect(r.runes).toHaveLength(4)
        // no two runes with the same sound: only one is right, in a picture round as in a sound round
        expect(new Set(r.runes.map((m) => unit(m.id).sound)).size).toBe(4)
        // only units he has opened
        for (const m of r.runes) expect(unit(m.id).stage).toBeLessThanOrEqual(stage)
      }
    }
  })

  it('from stage 7 a picture carries three word runes (line-how-word)', () => {
    const t = englishTower(deps(at(7), allPictures))
    const r = enTowerRound(deps(at(7), allPictures), opts(), { kind: 'word', word: 'cats' })
    expect(r).toMatchObject({ type: 'A', picture: 'cats.webp' })
    expect(texts(r)).toHaveLength(3)
    expect(texts(r)).toContain('cats')
    expect(t.howLine(r)).toMatchObject({ id: 'line-how-word', key: 'word' })
    // the picture is the question: a tap on it never says the answer
    expect(t.questionParts(r)).toEqual([])
    expect(t.feedbackParts(r, FULL)).toEqual(['w-cats'])
    expect(rounds(5, [1, 2, 3]).every((x) => x.type !== 'A' || UNITS.some((u) => u.id === x.target.id))).toBe(true)
  })

  it('a picture with no file: a name round instead, and no picture-word round is made', () => {
    const none = deps(at(7), () => undefined)
    const r = enTowerRound(none, opts(), { kind: 'word', word: 'cats' })
    expect(r.type).toBe('C')
    expect(r.picture).toBeUndefined()
    expect(word(r.target.id).kind).toBe('nonsense')
    const t = englishTower(none)
    const rng = seeded(8)
    const made = Array.from({ length: 300 }, (_, i) => t.makeRound(opts({ id: i, rng })))
    expect(made.filter((x) => x.type === 'A')).toEqual([])
  })

  it('a unit with a picture and its sound clip is asked by its sound about half of the time', () => {
    const d = deps(at(3), onlyFox, () => true)
    const rng = seeded(6)
    const kinds = Array.from({ length: 400 }, (_, i) => enTowerRound(d, opts({ id: i, rng }), { kind: 'letter', unit: 'x' }).type)
    const bySound = kinds.filter((k) => k === 'B').length / kinds.length
    expect(bySound).toBeGreaterThan(0.35)
    expect(bySound).toBeLessThan(0.65)
    // with no sound clip, always by the picture
    expect(enTowerRound(deps(at(3), onlyFox), opts(), { kind: 'letter', unit: 'x' }).type).toBe('A')
  })

  it('the runes carry words more often at later stages', () => {
    const share = (stage: number) => rounds(stage, [1, 2, 3, 4], 600).filter((r) => !UNITS.some((u) => u.id === r.target.id)).length / 600
    expect(share(1)).toBe(0)
    expect(share(2)).toBeGreaterThan(0.1)
    expect(share(8)).toBeGreaterThan(share(2) + 0.2)
  })

  it('bosses carry a unit of his stage, or a word when his stage has none', () => {
    for (const r of rounds(3, [5, 10], 60, { boss: true })) {
      expect(r.boss).toBe(true)
      expect(unit(r.target.id).stage).toBe(3)
    }
    for (const r of rounds(5, [5, 10], 60, { boss: true })) expect(word(r.target.id).kind).toBe('nonsense')
  })

  it('every line id it names is in EN_TOWER_LINE_IDS or a voice id', () => {
    const save = at(1)
    const t = englishTower(deps(save))
    const ids = new Set<string>()
    for (let stage = 1; stage <= 9; stage++) {
      save.setStage(stage)
      for (const boss of [false, true]) {
        const rng = seeded(stage)
        for (let i = 0; i < 150; i++) {
          const r = t.makeRound(opts({ id: i, wave: 1 + (i % 12), kills: i % 5, boss, rng }))
          for (const id of [...t.questionParts(r), ...t.feedbackParts(r, FULL), ...t.feedbackParts(r, SHORT), t.howLine(r)!.id]) ids.add(id)
          for (const m of r.runes) for (const id of t.twinParts(r, { kind: 'rune', mark: m })) ids.add(id)
        }
      }
    }
    const tower = new Set<string>([...EN_TOWER_LINE_IDS, ...EN_TOWER_OWN_LINES])
    const bad = [...ids].filter((id) => !tower.has(id) && !isVoiceId(id))
    expect(bad).toEqual([])
    // the tower's own lines have English texts; no Hebrew duel line (wiz-*, mon-*) is ever named
    for (const id of EN_TOWER_OWN_LINES) expect(enLine(id)).toBeDefined()
    expect([...ids].filter((id) => /^(wiz|mon)-/.test(id))).toEqual([])
  })

  it('no unit id is the id of a word the tower or the placement asks (their tallies are kept apart)', () => {
    const asked = [...WORDS.filter((w) => w.kind === 'nonsense' || w.uses.includes('Tw')).map((w) => w.id), ...PLACEMENT_ROUNDS.map((r) => r.target)]
    expect(asked.filter((id) => UNITS.some((u) => u.id === id))).toEqual([])
  })

  it('the placement\'s word tallies leave the choice of letters as it was', () => {
    const lifetime = Object.fromEntries(PLACEMENT_ROUNDS.map((r) => [r.target, { seen: 4, wrong: 4 }]))
    const pick = (lt: MakeRoundOpts['lifetime']) => {
      const t = englishTower(deps(at(1)))
      const rng = seeded(9)
      return Array.from({ length: 80 }, (_, i) => t.makeRound(opts({ id: i, rng, lifetime: lt })).target.id)
    }
    expect(pick(lifetime)).toEqual(pick({}))
  })
})

describe('introductions on the tower', () => {
  it('a new unit missed on its first ask is introduced after the feedback; right skips it', () => {
    const save = at(3)
    const t = englishTower(deps(save))
    const r = enTowerRound(deps(save), opts(), { kind: 'letter', unit: 'v' })
    expect(t.answered!(r, false)).toEqual(['intro-sound', 'snd-v', 'w-volcano'])
    expect(save.read().introSeen.v).toMatchObject({ asked: 1, skipped: false })
    const z = enTowerRound(deps(save), opts(), { kind: 'letter', unit: 'z' })
    expect(t.answered!(z, true)).toEqual([])
    expect(save.read().introSeen.z).toMatchObject({ asked: 1, skipped: true })
  })

  it('a unit the placement credited as right skips its introduction', () => {
    const save = at(3, { tallies: { v: { seen: 2, wrong: 0 } } })
    const t = englishTower(deps(save))
    const r = enTowerRound(deps(save), opts(), { kind: 'letter', unit: 'v' })
    expect(t.answered!(r, false)).toEqual([])
    expect(save.read().introSeen.v).toMatchObject({ known: true })
  })

  it('qu is no "two letters, one sound"; the first true digraph is', () => {
    const save = at(4)
    const t = englishTower(deps(save))
    expect(t.answered!(enTowerRound(deps(save), opts(), { kind: 'letter', unit: 'qu' }), false)).not.toContain('intro-team')
    expect(t.answered!(enTowerRound(deps(save), opts(), { kind: 'letter', unit: 'sh' }), false)[0]).toBe('intro-team')
    // the second digraph has the plain line
    expect(t.answered!(enTowerRound(deps(save), opts(), { kind: 'letter', unit: 'ch' }), false)[0]).toBe('intro-sound')
  })

  it('the stage\'s first blend word brings intro-blend, once, kept under "blend"', () => {
    const save = at(5)
    const t = englishTower(deps(save))
    const r = enTowerRound(deps(save), opts(), { kind: 'name', word: 'clim' })
    expect(t.answered!(r, false)).toEqual(['intro-blend', 'nw-clim'])
    expect(save.read().introSeen.blend).toMatchObject({ asked: 1 })
    expect(t.answered!(enTowerRound(deps(save), opts(), { kind: 'name', word: 'sluk' }), false)).toEqual([])
    // a word with no blend has no introduction
    expect(t.answered!(enTowerRound(deps(save), opts(), { kind: 'name', word: 'vap' }), false)).toEqual([])
  })
})

describe('an English tower run', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
    useEnglishStore.setState({ ...ENGLISH_FRESH } as never)
  })
  afterEach(() => { vi.useRealTimers() })

  it('an English tower run writes its tallies into alef-english, not alef-progress', async () => {
    englishSavePort().setStage(2)
    const progressBefore = localStorage.getItem('alef-progress')
    const duelBefore = structuredClone(useProgressStore.getState().duel)
    const said: string[] = []
    const audio: DuelAudio = {
      playLine: (id) => { said.push(id); return Promise.resolve() }, playSfx: () => Promise.resolve(),
      lineAsset: (id) => ({ id, file: id, url: null }), stopAllLines: () => {}, mute: () => {}, unlock: () => {}, setLog: () => {},
    }
    const done: number[] = []
    const c = new DuelController({
      embedded: { wave: 1, waves: 1, boss: false, seen: [], onSeen: () => {}, onAnswer: () => 'on', onDone: (w) => { done.push(w) } },
      telemetry: { track: () => {}, flush: () => {} },
      content: ENGLISH.tower.content, tallies: ENGLISH.tower.tallies(), audio, sleeper: instantSleeper(), rng: seeded(4),
    })
    let last = -1
    const stop = c.subscribe(() => {
      const s = c.getView().state
      const r = s.round
      if (!r || s.outcome || s.preview || s.paused || r.id === last) return
      last = r.id
      queueMicrotask(() => c.choose({ kind: 'rune', mark: r.target }))
    })
    c.start()
    await settle(() => done.length > 0)
    stop()
    c.destroy()
    expect(done).toEqual([1])
    const saved = JSON.parse(localStorage.getItem('alef-english')!).state
    const seen = Object.values(saved.tower.byMark as Record<string, { seen: number }>).reduce((n, t) => n + t.seen, 0)
    expect(seen).toBe(5)
    expect(localStorage.getItem('alef-progress')).toBe(progressBefore)
    expect(useProgressStore.getState().duel).toEqual(duelBefore)
    // it spoke English: no Hebrew duel line
    expect(said.filter((id) => /^(wiz|mon)-/.test(id))).toEqual([])
  })

  it('the introduction follows the feedback on the board', async () => {
    const save = at(3)
    const d = deps(save)
    const said: string[] = []
    const audio: DuelAudio = {
      playLine: (id) => { said.push(id); return Promise.resolve() }, playSfx: () => Promise.resolve(),
      lineAsset: (id) => ({ id, file: id, url: null }), stopAllLines: () => {}, mute: () => {}, unlock: () => {}, setLog: () => {},
    }
    let answers = 0
    const c = new DuelController({
      embedded: { wave: 1, waves: 1, boss: false, seen: ['tower-intro'], onSeen: () => {}, onAnswer: () => { answers++; return 'over' }, onDone: () => {} },
      telemetry: { track: () => {}, flush: () => {} },
      content: englishTower(d), makeRound: (o) => enTowerRound(d, o, { kind: 'letter', unit: 'v' }), tallies: save.towerTallies(),
      audio, sleeper: instantSleeper(), rng: seeded(4),
    })
    let tapped = false
    const stop = c.subscribe(() => {
      const s = c.getView().state
      const r = s.round
      if (!r || s.outcome || s.preview || s.paused || tapped) return
      tapped = true
      queueMicrotask(() => c.choose({ kind: 'rune', mark: r.runes.find((m) => m.id !== 'v')! }))
    })
    c.start()
    await settle(() => said.includes('w-volcano') && said.lastIndexOf('w-volcano') > said.indexOf('intro-sound'))
    stop()
    c.destroy()
    expect(answers).toBe(1)
    const fb = said.indexOf('snd-v')
    expect(fb).toBeGreaterThan(-1)
    expect(said.slice(said.indexOf('intro-sound'))).toEqual(['intro-sound', 'snd-v', 'w-volcano'])
    expect(said.indexOf('intro-sound')).toBeGreaterThan(fb)
  })

  describe('on the English audio', () => {
    const player = installFakeAudio()

    it('a missing word clip: the feedback still ends and the next monster comes', async () => {
      vi.useFakeTimers()
      player.voiceMs = 300
      player.missing = (id) => id === 'w-fox'
      const save = at(3)
      const d = deps(save, onlyFox)
      const content = englishTower(d)
      const events: { e: string; data?: Record<string, unknown> }[] = []
      const c = new DuelController({
        embedded: { wave: 1, waves: 1, boss: false, seen: ['tower-intro', 'tower-screen-last'], onSeen: () => {}, onAnswer: () => 'on', onDone: () => {} },
        telemetry: { track: (e, data) => { events.push({ e, data }) }, flush: () => {} },
        content, makeRound: (o) => enTowerRound(d, o, { kind: 'letter', unit: 'x' }), tallies: save.towerTallies(),
        audio: englishDuelAudio, rng: seeded(2),
      })
      const roundsShown = () => events.filter((x) => x.e === 'round').length
      c.start()
      for (let i = 0; i < 100 && roundsShown() < 1; i++) await vi.advanceTimersByTimeAsync(100)
      const r = c.getView().state.round!
      c.choose({ kind: 'rune', mark: r.target })
      for (let i = 0; i < 200 && roundsShown() < 2; i++) await vi.advanceTimersByTimeAsync(100)
      c.destroy()
      expect(roundsShown()).toBe(2)
      // the sound was said, the word was asked for and had no file
      expect(player.said()).toContain('snd-ks')
      expect(player.said()).not.toContain('w-fox')
      expect(events.filter((x) => x.e === 'line').map((x) => x.data!.id)).toEqual(expect.arrayContaining(['snd-ks', 'w-fox']))
    })
  })
})

describe('the English course', () => {
  it('reads its lines\' takes from the English lines, the Hebrew course from Book 2\'s', async () => {
    const { HEBREW } = await import('../../duel2/course/hebrew')
    const { lineById } = await import('../../duel2/data/lines')
    expect(ENGLISH.lineVariations('q-ghosts-sound')).toBe(enLine('q-ghosts-sound')!.variations)
    expect(ENGLISH.lineVariations('q-ghosts-sound')).toBe(3)
    expect(HEBREW.lineVariations('q-ghosts-sound')).toBe(1)
    expect(HEBREW.lineVariations('q-ladder')).toBe(lineById('q-ladder')!.variations)
    expect(HEBREW.lineVariations('q-ladder')).toBe(3)
  })

  it('the tower plays the English tower on the English audio', () => {
    expect(ENGLISH.tower.audio).toBe(englishDuelAudio)
    const r = ENGLISH.tower.content.makeRound(opts())
    expect(r.runeTexts!.every((x) => x.alphabet === 'latin')).toBe(true)
  })
})

describe('the tower\'s answers count as any screen\'s', () => {
  const placed = (stage: number) => memoryEnglishSavePort({
    stage: { stage, newAnswers: '' },
    placement: { state: null, requested: false, done: { level: stage, answers: 10, at: 1 }, runs: 1 },
  })
  async function towerRun(save: EnglishSavePort) {
    const { RunController } = await import('../../duel2/controller')
    const run = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(11) })
    run.start()
    for (let i = 0; i < 200 && run.view.screen?.screen !== 'tower'; i++) await null
    return run
  }

  it('an English tower answer on a new-stage unit counts toward the pass', async () => {
    const save = placed(3)
    const run = await towerRun(save)
    expect(run.view.screen?.screen).toBe('tower')
    const v = enTowerRound(deps(save), opts(), { kind: 'letter', unit: 'v' })
    for (let i = 0; i < 5; i++) run.towerAnswer('right', 'v', v)
    expect(save.read().tallies.v).toMatchObject({ seen: 5, wrong: 0 })
    expect(save.read().tallies['sc:tower']).toMatchObject({ seen: 5 })
    // five right first answers on his stage's new items pass stage 3
    expect(save.read().stage.stage).toBe(4)
    // an old unit counts for its tallies, not for the pass
    run.towerAnswer('wrong', 'm', enTowerRound(deps(save), opts(), { kind: 'letter', unit: 'm' }))
    expect(save.read().tallies.m).toMatchObject({ seen: 1, wrong: 1 })
    expect(save.read().stage).toEqual({ stage: 4, newAnswers: '' })
    run.destroy()
  })

  it('a tower word round at stage 5 counts its units', async () => {
    const save = placed(5)
    const run = await towerRun(save)
    run.towerAnswer('wrong', 'clim', enTowerRound(deps(save), opts(), { kind: 'name', word: 'clim' }))
    for (const f of ['c', 'l', 'i', 'm', 'cl-']) expect(save.read().tallies[f]).toMatchObject({ seen: 1, wrong: 1 })
    expect(save.read().stage.newAnswers).toBe('x')
    run.destroy()
  })

  it('the round\'s kind decides what an answer counts for: the unit a, or the heart word a', () => {
    const letter = enTowerRound(deps(at(1)), opts(), { kind: 'letter', unit: 'a' })
    expect(towerFacts(letter, 1)).toEqual({ features: ['a', 'sc:tower'], newStage: true })
    // a word round on the heart word a (same id): its heart feature, never the unit's
    const heart: Round = { ...letter, type: 'C', ask: 'name', target: { id: 'a', name: 'a', group: 'a' } }
    expect(towerFacts(heart, 1)).toEqual({ features: ['heart:a', 'sc:tower'], newStage: true })
    expect(englishTower(deps(at(1))).feedbackParts(heart, FULL)).toEqual(['hw-a'])
  })

  it('the Hebrew tower\'s answers stay the first duel\'s', async () => {
    const { HEBREW } = await import('../../duel2/course/hebrew')
    expect(HEBREW.tower.facts).toBeUndefined()
  })
})

describe('the placement and the boss', () => {
  it('a placement picture round needs its picture file: with none, its name round', () => {
    const r = choosePlacementRound(1, 'picture', () => 0, seeded(1), () => undefined)
    expect(r.kind).toBe('name')
    const t = placementTower(at(1), [1, 2, 3, 4, 5, 6, 7, 8, 9], () => undefined)
    const rng = seeded(2)
    for (let i = 0; i < 40; i++) expect(t.makeRound(opts({ id: i, rng })).type).toBe('C')
    // with its file, the picture round shows it
    const dog = choosePlacementRound(2, 'picture', () => 0, seeded(1), (k) => (k === 'dog' ? 'dog.webp' : undefined))
    expect(dog.target).toBe('dog')
  })

  it('a boss fight is heard once, at the hit that beats the boss', async () => {
    const save = at(3)
    const d = deps(save)
    const inner = englishTower(d)
    const heard: string[] = []
    const content = { ...inner, answered: (r: Round, right: boolean) => { heard.push(r.target.id); return inner.answered!(r, right) } }
    const audio: DuelAudio = {
      playLine: () => Promise.resolve(), playSfx: () => Promise.resolve(),
      lineAsset: (id) => ({ id, file: id, url: null }), stopAllLines: () => {}, mute: () => {}, unlock: () => {}, setLog: () => {},
    }
    const done: number[] = []
    let hits = 0
    const c = new DuelController({
      embedded: { wave: 5, waves: 1, boss: true, seen: ['tower-intro'], onSeen: () => {}, onAnswer: () => { hits++; return 'on' }, onDone: (w) => { done.push(w) } },
      telemetry: { track: () => {}, flush: () => {} },
      content, tallies: save.towerTallies(), audio, sleeper: instantSleeper(), rng: seeded(4),
    })
    let last = -1
    const stop = c.subscribe(() => {
      const s = c.getView().state
      const r = s.round
      if (!r || s.outcome || s.preview || s.paused || r.id === last) return
      last = r.id
      queueMicrotask(() => c.choose({ kind: 'rune', mark: r.target }))
    })
    c.start()
    await settle(() => done.length > 0)
    stop()
    c.destroy()
    expect(hits).toBeGreaterThan(1)
    expect(heard).toHaveLength(1)
  })
})

describe('the board hands the answered round on', () => {
  it('with onAnswerRound, the run gets the round (its kind), not only its target id', async () => {
    const save = at(3)
    const d = deps(save)
    const audio: DuelAudio = {
      playLine: () => Promise.resolve(), playSfx: () => Promise.resolve(),
      lineAsset: (id) => ({ id, file: id, url: null }), stopAllLines: () => {}, mute: () => {}, unlock: () => {}, setLog: () => {},
    }
    const got: { r: string; ask?: string; id: string }[] = []
    let plain = 0
    const c = new DuelController({
      embedded: {
        wave: 1, waves: 1, boss: false, seen: ['tower-intro'], onSeen: () => {}, onDone: () => {},
        onAnswer: () => { plain++; return 'on' },
        onAnswerRound: (r, round) => { got.push({ r, ask: round.ask, id: round.target.id }); return 'over' },
      },
      telemetry: { track: () => {}, flush: () => {} },
      content: englishTower(d), makeRound: (o) => enTowerRound(d, o, { kind: 'letter', unit: 'v' }), tallies: save.towerTallies(),
      audio, sleeper: instantSleeper(), rng: seeded(4),
    })
    let tapped = false
    const stop = c.subscribe(() => {
      const s = c.getView().state
      if (!s.round || s.outcome || s.preview || s.paused || tapped) return
      tapped = true
      queueMicrotask(() => c.choose({ kind: 'rune', mark: s.round!.target }))
    })
    c.start()
    await settle(() => got.length > 0)
    stop()
    c.destroy()
    expect(got).toEqual([{ r: 'right', ask: 'letter', id: 'v' }])
    expect(plain).toBe(0)
  })

  it('a new unit right on its first ask is skipped, not taken as known, when the run records the answer first', async () => {
    const save = at(3)
    const d = deps(save)
    const audio: DuelAudio = {
      playLine: () => Promise.resolve(), playSfx: () => Promise.resolve(),
      lineAsset: (id) => ({ id, file: id, url: null }), stopAllLines: () => {}, mute: () => {}, unlock: () => {}, setLog: () => {},
    }
    let answered = false
    const c = new DuelController({
      embedded: {
        wave: 1, waves: 1, boss: false, seen: ['tower-intro'], onSeen: () => {}, onDone: () => {}, onAnswer: () => 'on',
        // as the run does (RunController.towerAnswer): the answer goes into the same English tallies
        onAnswerRound: (res, round) => {
          save.recordAnswer({ features: towerFacts(round, 3).features, miss: res !== 'right', newStage: false })
          answered = true
          return 'over'
        },
      },
      telemetry: { track: () => {}, flush: () => {} },
      content: englishTower(d), makeRound: (o) => enTowerRound(d, o, { kind: 'letter', unit: 'v' }), tallies: save.towerTallies(),
      audio, sleeper: instantSleeper(), rng: seeded(4),
    })
    let tapped = false
    const stop = c.subscribe(() => {
      const s = c.getView().state
      if (!s.round || s.outcome || s.preview || s.paused || tapped) return
      tapped = true
      queueMicrotask(() => c.choose({ kind: 'rune', mark: s.round!.target }))
    })
    c.start()
    await settle(() => answered && !!save.read().introSeen.v)
    stop()
    c.destroy()
    expect(save.read().tallies.v).toMatchObject({ seen: 1, wrong: 0 })
    expect(save.read().introSeen.v).toMatchObject({ asked: 1, skipped: true, known: false })
  })
})
