// The placement check in the run (design Part 4): the first English run's tower plays the placement's rounds, each
// answer is walked and saved at once, and his level seeds the stage, the tallies and the stations. The tower's board is
// the first duel's controller, mounted here as Tower.tsx mounts it (its content from the course's placement), on the
// fake clock, with a duel audio that ends each line at once.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController } from '../duel2/controller'
import { DuelController, type DuelAudio } from '../utils/duel/controller'
import type { Round } from '../types/duel'
import { seeded } from '../duel2/testing/runHarness'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { memoryEnglishSavePort, type EnglishSavePort } from './savePort'
import type { EnglishSave } from './saveFormat'
import { PLACEMENT_ROUNDS } from './content/placementRounds'
import { askOf } from './logic/placement'
import { PLACEMENT_WALK_MS, choosePlacementRound, placementTower } from './logic/tower'
import { word } from './content/words'
import { unitsOfStage } from './content/units'
import { MEGA_MAX } from '../utils/duel/rules'
import { enScreensOfStage } from './logic/stages'
import { readLog } from '../shared/telemetry'

installFakeAudio()

const said: string[] = []
const duelAudio: DuelAudio = {
  playLine: (id) => { said.push(id); return new Promise((r) => setTimeout(r, 10)) },
  playSfx: () => Promise.resolve(),
  lineAsset: (id) => ({ id, file: `${id}.mp3`, url: null }),
  stopAllLines: () => {}, mute: () => {}, unlock: () => {}, setLog: () => {},
}

interface Board { save: EnglishSavePort; duel: DuelController | null; visit: number; ended: boolean }
const boards = new Map<RunController, Board>()

/** the tower's board for the run's tower visit, as Tower.tsx mounts it (the placement's rounds while it is due) */
function sync(run: RunController) {
  const b = boards.get(run)!
  const s = run.view.screen
  if (s?.screen !== 'tower' || !s.placement) {
    b.duel?.destroy()
    b.duel = null
    return
  }
  if (s.visit !== b.visit) {
    b.duel?.destroy()
    b.visit = s.visit
    b.ended = false
    const save = b.save
    const duel: DuelController = new DuelController({
      content: ENGLISH.placement!.tower(save), tallies: save.towerTallies(), audio: duelAudio, rng: seeded(5),
      walkOverride: ENGLISH.placement!.walkMs,
      embedded: () => ({
        wave: s.wave, waves: s.waves, boss: s.boss, seen: save.read().demosSeen, onSeen: (k) => save.markDemo(k), owed: [],
        onAnswer: (r, id) => run.towerAnswer(r, id), placement: true, onWaveEnd: (w) => run.towerWaveEnd(w), megaOff: true,
        onCharge: (m) => run.towerCharge(m),
        // the visit is over; once he is placed the run would go on at the broom, whose English rounds come later
        onDone: (w) => { b.ended = true; if (!save.read().placement.done) run.towerDone(w) },
      }),
      telemetry: ENGLISH.telemetry,
    })
    b.duel = duel
    duel.start()
  }
  if (run.view.paused) b.duel!.pause()
  else b.duel!.resume()
}

function startEnglishRun(save: EnglishSavePort = memoryEnglishSavePort()): RunController {
  const run = new RunController({ course: ENGLISH, save, now: () => Date.now(), rng: seeded(11) })
  boards.set(run, { save, duel: null, visit: -1, ended: false })
  run.subscribe(() => sync(run))
  run.start()
  sync(run)
  return run
}

/** the save as a reload finds it: its data, written and read back */
const reloaded = (save: EnglishSavePort) => memoryEnglishSavePort(JSON.parse(JSON.stringify(save.read())) as Partial<EnglishSave>)

async function until(pred: () => boolean, max = 120_000) {
  for (let t = 0; t < max && !pred(); t += 50) await vi.advanceTimersByTimeAsync(50)
  if (!pred()) throw new Error('condition not met')
}

const board = (run: RunController) => boards.get(run)!
const towerRound = (run: RunController): Round => board(run).duel!.getView().state.round!
/** a round waits for his tap */
const asking = (run: RunController) => {
  const d = board(run).duel
  const s = d?.getView().state
  return !!s && s.phase === 'playing' && !s.paused && !s.preview && !!s.round && !s.outcome
}

async function inPlacement(save: EnglishSavePort = memoryEnglishSavePort()): Promise<RunController> {
  const run = startEnglishRun(save)
  await until(() => asking(run))
  return run
}

/** taps the right word, or a wrong one; then waits for the next round, or the end of the visit */
async function towerAnswer(run: RunController, a: 'right' | 'wrong') {
  await until(() => asking(run) || board(run).ended)
  if (board(run).ended) throw new Error('the placement is over')
  const d = board(run).duel!
  const r = towerRound(run)
  d.choose({ kind: 'rune', mark: a === 'right' ? r.target : r.runes.find((m) => m.id !== r.target.id)! })
  await until(() => board(run).ended || (asking(run) && towerRound(run).id !== r.id))
}

type Child = 'always-right' | 'always-wrong' | ((stage: number, target: string) => boolean)

/** plays the whole placement; returns the run and his answers (the round's target, right or not) */
async function placementWith(save: EnglishSavePort, child: Child) {
  const run = await inPlacement(save)
  const answers: { target: string; right: boolean }[] = []
  for (let i = 0; i < 40 && !board(run).ended; i++) {
    await until(() => asking(run) || board(run).ended)
    if (board(run).ended) break
    const target = towerRound(run).target.id
    const stage = PLACEMENT_ROUNDS.find((r) => r.target === target)!.stage
    const right = child === 'always-right' || (child !== 'always-wrong' && child(stage, target))
    answers.push({ target, right })
    await towerAnswer(run, right ? 'right' : 'wrong')
  }
  return Object.assign(run, { answers })
}

beforeEach(() => { vi.useFakeTimers(); said.length = 0; localStorage.clear(); ENGLISH.telemetry.clear() })
afterEach(() => {
  for (const [run, b] of boards) { b.duel?.destroy(); run.destroy() }
  boards.clear()
  vi.useRealTimers()
})

describe('the placement in the run', () => {
  it('a fresh English save starts with the placement in the tower, with 3 runes and no hint', async () => {
    const run = startEnglishRun(memoryEnglishSavePort()); await until(() => run.view.screen?.screen === 'tower')
    expect(run.view.screen).toMatchObject({ screen: 'tower', placement: true }); expect(run.view.hintAvailable).toBe(false)
    await until(() => asking(run))
    expect(towerRound(run).runes).toHaveLength(3)
    // the walk starts at stage 4, with a picture round
    expect(PLACEMENT_ROUNDS.find((r) => r.target === towerRound(run).target.id)).toMatchObject({ stage: 4, kind: 'picture' })
  })

  it('a miss in the placement costs no heart and no streak; the right word is said', async () => {
    const run = await inPlacement(); await towerAnswer(run, 'right'); await towerAnswer(run, 'right')
    const r = towerRound(run); await towerAnswer(run, 'wrong')
    expect(run.view.hearts).toBe(3); expect(run.view.mult).toBe(1)
    expect(said.filter((id) => id.endsWith(`-${r.target.id}`)).length).toBeGreaterThan(0)
    // the streak went on: three right answers after the miss make it 5 → ×2
    await towerAnswer(run, 'right'); await towerAnswer(run, 'right'); await towerAnswer(run, 'right')
    expect(run.view.mult).toBe(2)
  })

  it('right answers earn stars and coins as usual', async () => {
    const save = memoryEnglishSavePort(); const run = await inPlacement(save); await towerAnswer(run, 'right')
    expect(save.read().totalStars).toBe(1); expect(save.read().coins).toBeGreaterThan(0); expect(run.view.score).toBe(1)
  })

  it('a child who reads everything leaves the placement at stage 9', async () => {
    const save = memoryEnglishSavePort(); const run = await placementWith(save, 'always-right')
    expect(save.read().stage.stage).toBe(9); expect(save.read().placement.done).toMatchObject({ level: 9, answers: 7 })
    expect(save.read().placement).toMatchObject({ state: null, requested: false, runs: 1 })
    // the units below his level are seeded as known, and every station open at his level is open
    expect(save.read().tallies['m']).toMatchObject({ seen: 3, wrong: 0 })
    expect([...save.read().openedStations].sort()).toEqual([...enScreensOfStage(9)].sort())
    // the visit ended after the last answer (the cycle goes on)
    expect(board(run).ended).toBe(true)
    const events = readLog(ENGLISH.log.key).map((e) => e.e)
    expect(events.filter((e) => e === 'placement-answer')).toHaveLength(7)
    expect(events).toContain('placement-done')
  })

  it('a child who misses everything is placed at stage 1, with all his hearts', async () => {
    const save = memoryEnglishSavePort(); const run = await placementWith(save, 'always-wrong')
    expect(save.read().placement.done).toMatchObject({ level: 1, answers: 8 }); expect(save.read().stage.stage).toBe(1)
    expect(run.view.hearts).toBe(3)
  })

  it('a pause in the middle resumes the walk where it was; a reload does too', async () => {   // Review Focus 3
    const save = memoryEnglishSavePort(); const run = await inPlacement(save); await towerAnswer(run, 'right'); await towerAnswer(run, 'right')
    const asked = save.read().placement.state!.asked
    expect(asked).toBe(2)
    run.pause(); run.resume(); expect(save.read().placement.state!.asked).toBe(asked)
    await towerAnswer(run, 'right'); expect(save.read().placement.state!.asked).toBe(asked + 1)
    const copy = reloaded(save)
    const again = startEnglishRun(copy)                         // a reload: a new run on the saved state
    await until(() => again.view.screen?.screen === 'tower'); expect(again.view.screen).toMatchObject({ placement: true })
    await until(() => asking(again))
    expect(copy.read().placement.state!.asked).toBe(asked + 1)
    // it asks the stage the saved walk asks next
    const next = askOf(copy.read().placement.state!).stage
    expect(PLACEMENT_ROUNDS.find((r) => r.target === towerRound(again).target.id)!.stage).toBe(next)
    await towerAnswer(again, 'right'); expect(copy.read().placement.state!.asked).toBe(asked + 2)
  })

  it('the placement never runs again on its own', async () => {
    const save = memoryEnglishSavePort(); await placementWith(save, 'always-right')
    const next = startEnglishRun(save); await until(() => next.view.screen?.screen === 'tower')
    expect(next.view.screen).not.toMatchObject({ placement: true })
  })

  it('the parent asks for it again: the next run starts with it', async () => {
    const save = memoryEnglishSavePort(); await placementWith(save, 'always-right')
    save.setPlacement({ ...save.read().placement, requested: true })
    const run = startEnglishRun(save); await until(() => run.view.screen?.screen === 'tower')
    expect(run.view.screen).toMatchObject({ placement: true })
  })
})

describe('the placement check, its credit, walk and spell', () => {
  it('a unit he read right at his level\'s stage is known after it; the unit he missed is not; one never asked is new', async () => {
    // reads stages 1-6; at stage 7 he misses, reads one, misses (level 7); stage 8 and up he misses
    let at7 = 0
    const save = memoryEnglishSavePort()
    const run = await placementWith(save, (stage) => (stage <= 6 ? true : stage === 7 ? at7++ % 2 === 1 : false))
    expect(save.read().placement.done).toMatchObject({ level: 7 })
    const tallies = save.read().tallies
    const rounds = run.answers.map((a) => ({ ...a, round: PLACEMENT_ROUNDS.find((r) => r.target === a.target)! }))
    const readAt7 = rounds.find((a) => a.round.stage === 7 && a.right)!
    const missedAt7 = rounds.filter((a) => a.round.stage === 7 && !a.right)
    const missedUnits = new Set(missedAt7.map((a) => a.round.stageUnit))
    for (const u of word(readAt7.target).units) {
      if (missedUnits.has(u)) continue
      expect(tallies[u], u).toMatchObject({ wrong: 0 }); expect(tallies[u]!.seen, u).toBeGreaterThan(0)
    }
    for (const u of missedUnits) expect(tallies[u]!.wrong, u).toBeGreaterThan(0)
    // a stage-7 ending in none of his words was never asked: it is still new
    const asked = new Set(rounds.flatMap((a) => word(a.target).units))
    const fresh = unitsOfStage(7).filter((u) => !asked.has(u.id))
    expect(fresh.length).toBeGreaterThan(0)
    for (const u of fresh) expect(tallies[u.id], u.id).toBeUndefined()
  })

  it('a re-run adds to his tallies: nothing is wiped', async () => {
    const save = memoryEnglishSavePort(); await placementWith(save, 'always-right')
    const before = save.read().tallies
    save.setPlacement({ ...save.read().placement, requested: true })
    await placementWith(save, 'always-right')
    for (const [k, t] of Object.entries(before)) expect(save.read().tallies[k]!.seen!, k).toBeGreaterThanOrEqual(t.seen!)
  })

  it('every round walks the same time: monsters that reach the tower do not slow it', async () => {
    const run = await inPlacement()
    for (let i = 0; i < 3; i++) {
      const r = towerRound(run)
      expect(r.walkMs).toBe(PLACEMENT_WALK_MS)
      // no tap: the monster reaches the tower (a miss)
      await until(() => board(run).ended || (asking(run) && towerRound(run).id !== r.id))
    }
    expect(towerRound(run).walkMs).toBe(PLACEMENT_WALK_MS)
    expect(run.view.hearts).toBe(3)
  })

  it('the spell is never offered: no line, and a tap on it does nothing', async () => {
    const save = memoryEnglishSavePort()
    const run = await inPlacement(save)
    // he misses the first ask of each stage and reads the rest: a long walk, with enough hits to charge the spell
    const seen = new Set<number>()
    let hits = 0
    while (hits < MEGA_MAX) {
      const stage = PLACEMENT_ROUNDS.find((r) => r.target === towerRound(run).target.id)!.stage
      const right = seen.has(stage)
      seen.add(stage)
      await towerAnswer(run, right ? 'right' : 'wrong')
      if (right) hits++
    }
    expect(board(run).ended).toBe(false)
    expect(board(run).duel!.getView().state.mega).toBe(MEGA_MAX)
    expect(said).not.toContain('line-mega')
    const asked = save.read().placement.state!.asked
    board(run).duel!.megaCast()
    await vi.advanceTimersByTimeAsync(3000)
    expect(board(run).duel!.getView().state.outcome).toBeNull()
    expect(save.read().placement.state!.asked).toBe(asked)
  })
})

describe('the placement rounds', () => {
  const rng = seeded(1)
  it('stage 1 has two picture rounds: once both were asked, a picture ask gets a name round', () => {
    const seen: Record<string, number> = {}
    const kinds: string[] = []
    for (let i = 0; i < 4; i++) {
      const r = choosePlacementRound(1, 'picture', (t) => seen[t] ?? 0, rng)
      seen[r.target] = (seen[r.target] ?? 0) + 1
      kinds.push(r.kind)
    }
    expect(kinds).toEqual(['picture', 'picture', 'name', 'name'])
    expect(new Set(Object.keys(seen)).size).toBe(4)
  })

  it('a round of a stage is not asked twice while another of its kind is new', () => {
    for (const stage of [2, 5, 9]) {
      const seen: Record<string, number> = {}
      for (let i = 0; i < 3; i++) {
        const r = choosePlacementRound(stage, 'name', (t) => seen[t] ?? 0, rng)
        expect(seen[r.target]).toBeUndefined()
        seen[r.target] = 1
      }
    }
  })

  it('a placement round shows its words, says a name round\'s name, and says the right word after the tap', () => {
    const save = memoryEnglishSavePort()
    const t = placementTower(save, [1, 2, 3, 4, 5, 6, 7, 8, 9])
    const r = t.makeRound({ id: 1, wave: 1, kills: 1, boss: false, rng, lifetime: { duck: { seen: 1 }, ring: { seen: 1 }, fish: { seen: 1 } } })
    // every picture round of stage 4 was seen: its name round instead
    expect(r.type).toBe('C')
    expect(r.runeTexts!.map((x) => x.text)).toContain(r.target.name)
    expect(t.questionParts(r)).toEqual([`nw-${r.target.id}`])
    expect(t.feedbackParts(r, { say: 'sound', banner: true, waitMs: 0, tailMs: 0 })).toEqual([`nw-${r.target.id}`])
    expect(t.isCorrect(r, { kind: 'rune', mark: r.target })).toBe(true)
    expect(t.isCorrect(r, { kind: 'rune', mark: r.runes.find((m) => m.id !== r.target.id)! })).toBe(false)
  })
})
