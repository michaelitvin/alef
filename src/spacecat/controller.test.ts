// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { applySound } from '../shared/gameAudio/output'
import { instantSleeper } from '../shared/sleeper'
import { INTRO_TIMES } from './audio/intros'
import * as audio from './audio/spaceCatAudio'
import type { Engine, Hud, PodsWhen } from './canvas/engine'
import type { RoundContent } from './content'
import { MISSING_TIMES, PlayController, T1_POD_ROUNDS, T2_POD_ROUNDS, TIP_TIMES, type EndInfo, type LevelDoneInfo } from './controller'
import { LADDER_START, placementMode, type Ladder } from './logic/ladder/index'
import type { RoundResult } from './logic/round'
import { RUNGS, rungDef, type RungId } from './logic/rungs'
import { memorySavePort } from './savePort'
import { DEFAULT_SETTINGS, type SpaceCatSave } from './saveFormat'

const fake = installFakeAudio()

/** a canvas engine that draws nothing: the test ends each round by hand */
function fakeEngine() {
  const calls: string[] = []
  const e = {
    calls,
    content: null as RoundContent | null,
    plays: [] as RoundContent[],
    /** the pods option of each play */
    pods: [] as (PodsWhen | undefined)[],
    holdBox: false,
    boxDone: null as (() => void) | null,
    frozen: false,
    input: true,
    hud: { dots: 0, points: 0, hearts: 3 } as Hud,
    hands: [] as string[],
    handDone: null as (() => void) | null,
    setScreen() {}, setShip(n: number) { calls.push(`ship ${n}`) },
    setHud(h: Hud) { e.hud = h },
    /** the arrival time of each play */
    arrivals: [] as number[],
    play(c: RoundContent, ms: number, o?: { frozen?: boolean; pods?: PodsWhen }) { e.content = c; e.plays.push(c); e.arrivals.push(ms); e.pods.push(o?.pods); e.frozen = !!o?.frozen; calls.push('play') },
    cue(name: string, on: boolean) { calls.push(`cue ${name} ${on}`) },
    boxIn() { calls.push('boxIn'); return e.holdBox ? new Promise<void>((r) => { e.boxDone = r }) : Promise.resolve() },
    freeze() { e.frozen = true; calls.push('freeze') },
    resume() { e.frozen = false; calls.push('resume') },
    setInput(on: boolean) { e.input = on },
    demoHand(kind: 'drag' | 'flick') { e.hands.push(kind); return e.holdHand ? new Promise<void>((r) => { e.handDone = r }) : Promise.resolve() },
    holdHand: false,
    pulseRing(on: boolean) { calls.push(`ring ${on}`) },
    restart() { calls.push('restart'); if (e.content) e.play(e.content, 0, { frozen: true }) },
    onEnd: (_r: RoundResult) => {},
    onFirstParkedUnderRight: undefined as undefined | (() => void),
    onTouch: undefined as undefined | (() => void),
    destroy() { calls.push('destroy') },
  }
  return e
}
type FakeEngine = ReturnType<typeof fakeEngine>

const settle = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)) }

const live: PlayController[] = []
function setup(save: Partial<SpaceCatSave> = {}, rngSeed = 1) {
  const engine = fakeEngine()
  const port = memorySavePort(save)
  const events: [string, Record<string, unknown> | undefined][] = []
  const log = { runs: [] as number[], flushedAt: [] as number[] }
  const levels: LevelDoneInfo[] = []
  const ends: EndInfo[] = []
  let seed = rngSeed
  const ctl = new PlayController({
    engine: engine as unknown as Engine, audio, save: port, track: (ev, f) => events.push([ev, f]), sleeper: instantSleeper(),
    setRun: (n) => log.runs.push(n), flush: () => log.flushedAt.push(events.length),
    rng: () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 },
    onLevelDone: (i) => levels.push(i), onEnd: (i) => ends.push(i),
  })
  live.push(ctl)
  return { engine, port, events, log, levels, ends, ctl }
}
/** he works on rung 4: rungs 1 to 3 are placed, the placement is over */
const practiceAt4: Ladder = {
  ...LADDER_START, day: 1, checkedOn: 1, mode: { kind: 'practice' },
  rungs: Object.fromEntries((['1', '2', '3'] as const).map((r) => [r, { status: 'placed', recent: '', fastRun: 0, strikes: 0, holds: 0, probation: 0 }])),
}
/**
 * practice with every rung before `at` in the order passed (so `at` is the frontier), the range capped at `at`; his last
 * answer a minute ago (the run starts no play day, so no warm-up)
 */
function practiceAt(at: RungId): Partial<SpaceCatSave> {
  const below = RUNGS.filter((r) => r.order < rungDef(at).order).map((r) => r.id)
  const ladder: Ladder = {
    ...LADDER_START, day: 1, checkedOn: 1, lastAt: Date.now() - 60_000, mode: { kind: 'practice' },
    rungs: Object.fromEntries(below.map((r) => [r, { status: 'passed', recent: '', fastRun: 0, strikes: 0, holds: 0 }])),
  }
  return { runs: 1, heard: { demo: 1 }, ladder, settings: { ...DEFAULT_SETTINGS, range: at }, intro: { day: 1, mistakes: {}, again: [] } }
}
/** a run that is not the first (no demo) */
const played = { runs: 1, heard: { demo: 1 } }

/** ends the round on the screen with this result (the engine's onEnd, after its mark); `label`: the wrong planet he flies to */
function finish(e: FakeEngine, result: 'right' | 'wrong' | 'timeout', points: 0 | 1 | 2 = result === 'right' ? 1 : 0, o: { label?: string; underMs?: number } = {}) {
  const c = e.content!
  const lane = result === 'right' ? c.rightLane : o.label !== undefined ? c.labels.indexOf(o.label) : (c.rightLane + 1) % c.labels.length
  const r: RoundResult = {
    result, end: points === 2 ? 'zoom' : 'arrival', lane, number: c.labels[lane], points, lastLaneMs: 1000, endMs: 3000,
    underMs: result === 'right' ? (o.underMs ?? 1000) : null, startedUnder: false,
  }
  e.onEnd(r)
}
/** the mirrored sign of a comparison's answer (none for =) */
const mirrorOf = (sign: string) => (sign === '<' ? '>' : sign === '>' ? '<' : undefined)
const rounds = (events: [string, Record<string, unknown> | undefined][]) => events.filter(([e, f]) => e === 'round' && !f?.cut).map(([, f]) => f!)
const playing = async (e: FakeEngine) => { await settle(); expect(e.frozen).toBe(false); expect(e.input).toBe(true) }

type Answer = { result: 'right' | 'wrong' | 'timeout'; label?: string; underMs?: number }
/** plays rounds until `stop()`: a level done goes on to the next, a run's end starts a new run (the same play day) */
async function drive(t: ReturnType<typeof setup>, answer: (c: RoundContent) => Answer, stop: () => boolean, max = 300) {
  for (let i = 0; i < max && !stop(); i++) {
    await playing(t.engine)
    const a = answer(t.engine.content!)
    const ends = t.ends.length
    finish(t.engine, a.result, a.result === 'right' ? 1 : 0, a)
    if (t.ctl.getView().phase === 'between') {
      if (t.ends.length > ends) t.ctl.start()
      else t.ctl.nextLevel()
    }
  }
  await settle()
}
const right: Answer = { result: 'right' }

describe('the play controller', () => {
  // the effects a test left playing end on their own timers: the next test starts quiet
  afterEach(async () => { live.forEach((c) => c.destroy()); live.length = 0; audio.stopAll(); await new Promise((r) => setTimeout(r, 80)) })
  it('the first round of the first run is the demo with 1 + 1', async () => {
    const { engine, ctl } = setup()
    ctl.start()
    expect(engine.content!.box).toEqual(['1', '+', '1', '=', null])
    expect(engine.frozen).toBe(true)
    await settle()
    expect(engine.hands).toEqual(['drag'])
    expect(fake.said()).toEqual(['demo-1'])
    expect(engine.frozen).toBe(false)
  })

  it('the demo round gives points but no tally', async () => {
    const { engine, port, ctl } = setup()
    ctl.start()
    await settle()
    finish(engine, 'right')
    expect(ctl.getView().hud).toEqual({ dots: 1, points: 1, hearts: 3 })
    expect(port.get().items).toEqual({})
    expect(port.get().heard.demo).toBe(1)
    expect(port.get().lastFact).toBe('+1,1')
    await settle()
    expect(engine.content!.fact).not.toBe('+1,1')
  })

  it('input is on and the planets move while the demo line plays; the line is not cut', async () => {
    const { engine, ctl } = setup()
    fake.holdUntil(/^demo/)
    ctl.start()
    await settle()
    expect(fake.said()).toEqual(['demo-1'])
    expect(engine.input).toBe(true)
    expect(engine.frozen).toBe(false)
    expect(ctl.getView().phase).toBe('demo')
    finish(engine, 'right')
    await settle()
    expect(fake.live().filter((s) => s.kind === 'voice')).toHaveLength(1)
    fake.release()
    await playing(engine)
  })

  it('the missing-number line is spoken while he plays and is not cut', async () => {
    const { engine, port, ctl } = setup({ ...played, ladder: practiceAt4 })
    fake.holdUntil(/^missing/)
    ctl.start()
    for (let i = 0; i < 20; i++) {
      await settle()
      if (fake.said().some((s) => s.startsWith('missing'))) break
      finish(engine, 'right')
      if (ctl.getView().phase === 'between') ctl.nextLevel()
    }
    expect(fake.said().some((s) => s.startsWith('missing'))).toBe(true)
    expect(engine.input).toBe(true)
    expect(engine.frozen).toBe(false)
    expect(port.get().heard.missing ?? 0).toBe(0)
    expect(fake.live().filter((s) => s.kind === 'voice')).toHaveLength(1)
    fake.release()
    await settle()
    expect(port.get().heard.missing).toBe(1)
  })

  it('the zoom tip shows at most two times', async () => {
    const { engine, port, ctl } = setup(played)
    ctl.start()
    for (let i = 0; i < 4; i++) {
      await playing(engine)
      engine.onFirstParkedUnderRight!()
      await settle()
      finish(engine, 'right')
    }
    expect(engine.hands.filter((h) => h === 'flick')).toHaveLength(TIP_TIMES)
    expect(fake.said().filter((s) => s.startsWith('zoom-tip'))).toHaveLength(TIP_TIMES)
    expect(port.get().heard['zoom-tip']).toBe(TIP_TIMES)
  })

  it('a flick during the zoom tip stops the line and counts', async () => {
    const { engine, port, ctl } = setup(played)
    ctl.start()
    await playing(engine)
    fake.holdUntil(/^zoom-tip/)
    engine.holdHand = true
    engine.onFirstParkedUnderRight!()
    await settle()
    expect(engine.frozen).toBe(true)
    expect(ctl.getView().phase).toBe('tip')
    const line = fake.live().find((s) => s.kind === 'voice')!
    engine.onTouch!() // the flick: the engine sends touch first, then zooms
    expect(line.stopped).toBe(true)
    expect(engine.frozen).toBe(false)
    expect(ctl.getView().phase).toBe('flight')
    finish(engine, 'right', 2)
    expect(ctl.getView().hud.points).toBe(2)
    expect(port.get().heard['zoom-tip']).toBe(1)
  })

  it('a touch during the zoom tip ends it at once', async () => {
    const { engine, ctl } = setup(played)
    ctl.start()
    await playing(engine)
    engine.holdHand = true
    fake.holdUntil(/^zoom-tip/)
    engine.onFirstParkedUnderRight!()
    await settle()
    engine.onTouch!()
    expect(ctl.getView().phase).toBe('flight')
    expect(engine.frozen).toBe(false)
    expect(fake.live().filter((s) => s.kind === 'voice')).toEqual([])
  })

  it('the missing-number line plays the first two times only', async () => {
    // only rung 4 open in range: every item has its ring not at the end
    const { engine, ctl } = setup({ ...played, ladder: practiceAt4 })
    ctl.start()
    let n = 0
    for (let i = 0; i < 30 && n < 4; i++) {
      await playing(engine)
      if (engine.content!.box[4] !== null) n++
      finish(engine, 'right')
      if (ctl.getView().phase === 'between') ctl.nextLevel()
    }
    expect(n).toBeGreaterThanOrEqual(3)
    expect(fake.said().filter((s) => s.startsWith('missing'))).toHaveLength(MISSING_TIMES)
    expect(engine.calls.filter((c) => c === 'ring true')).toHaveLength(MISSING_TIMES)
  })

  it('7 right call onLevelDone with the new ships', async () => {
    const { engine, levels, ctl, events } = setup(played)
    ctl.start()
    for (let level = 1; level <= 3; level++) {
      for (let i = 0; i < 7; i++) { await playing(engine); finish(engine, 'right') }
      expect(ctl.getView().phase).toBe('between')
      ctl.nextLevel()
    }
    expect(levels.map((l) => l.level)).toEqual([1, 2, 3])
    expect(levels.map((l) => l.newShips)).toEqual([[], [], [2]])
    expect(levels[0].points).toBe(7)
    expect(events.filter(([e]) => e === 'ship')).toEqual([['ship', { ship: 2 }]])
    await settle()
    expect(ctl.getView().hud).toEqual({ dots: 0, points: 21, hearts: 3 })
  })

  it('three mistakes call onEnd', async () => {
    const { engine, ends, ctl, port, events } = setup({ ...played, best: 1 })
    ctl.start()
    await playing(engine); finish(engine, 'right')
    await playing(engine); finish(engine, 'right')
    await playing(engine); finish(engine, 'wrong')
    await playing(engine); finish(engine, 'timeout')
    await playing(engine); finish(engine, 'wrong')
    expect(ends).toEqual([{ points: 2, newBest: true, best: 2, level: 1 }])
    expect(port.get().runs).toBe(2)
    expect(events[events.length - 1]).toEqual(['run-end', { points: 2, levels: 1, best: 2 }])
  })

  it('a pause during a zoom restarts the same sum and costs no heart', async () => {
    const { engine, port, ctl, events } = setup(played)
    ctl.start()
    await playing(engine)
    const sum = engine.content!
    ctl.pause()
    expect(engine.frozen).toBe(true)
    expect(ctl.getView().paused).toBe(true)
    expect(events[events.length - 1][0]).toBe('pause')
    // the engine would end the round late (its mark ran out): it is cut, nothing counts
    ctl.resume()
    expect(engine.calls[engine.calls.length - 1]).toBe('play')
    expect(engine.content).toBe(sum)
    expect(events.some(([e, f]) => e === 'round' && f?.cut === true)).toBe(true)
    await playing(engine)
    expect(ctl.getView().hud.hearts).toBe(3)
    expect(port.get().items).toEqual({})
  })

  it('a pause during the demo replays the demo', async () => {
    const { engine, ctl } = setup()
    fake.holdUntil(/^demo/)
    ctl.start()
    await settle()
    ctl.pause()
    expect(fake.live()).toEqual([])
    fake.holdUntil(null)
    ctl.resume()
    await settle()
    expect(fake.said()).toEqual(['demo-1', 'demo-1'])
    expect(engine.hands).toEqual(['drag', 'drag'])
    expect(engine.content!.box).toEqual(['1', '+', '1', '=', null])
    await playing(engine)
  })

  it('pagehide during a run tracks abandon and writes the log at once', async () => {
    const { engine, ctl, events, log } = setup(played)
    ctl.start()
    await playing(engine)
    finish(engine, 'right')
    ctl.pageHide()
    expect(events).toContainEqual(['abandon', { level: 1, points: 1, phase: 'flight' }])
    // the page may go away now: the last flush comes after the abandon and the pause
    expect(log.flushedAt[log.flushedAt.length - 1]).toBe(events.length)
  })

  it('a pause is written to the log at once', async () => {
    const { engine, ctl, events, log } = setup(played)
    ctl.start()
    await playing(engine)
    ctl.pause()
    expect(events[events.length - 1]).toEqual(['pause', { phase: 'flight' }])
    expect(log.flushedAt).toEqual([events.length])
  })

  it('each run carries its run number: the save\'s runs + 1', async () => {
    const { engine, ctl, log } = setup({ ...played, runs: 4 })
    ctl.start()
    await playing(engine)
    expect(log.runs).toEqual([5])
  })

  it('a whole level plays with no audio files', async () => {
    fake.missing = () => true
    const { engine, levels, ctl } = setup()
    ctl.start()
    for (let i = 0; i < 7; i++) { await playing(engine); finish(engine, 'right') }
    expect(levels).toHaveLength(1)
  })

  it('the arrival sound never starts before the voice and the last effect end', async () => {
    applySound({ sfx: true, music: true, volume: 0.8 })
    fake.voiceMs = 30
    fake.sfxMs = 40
    const touching: string[] = []
    fake.onPlay = (e) => {
      if (e.id === 'new-sum') for (const o of fake.live()) if (o !== e && o.kind !== 'music') touching.push(o.id)
    }
    const { engine, ctl } = setup()
    ctl.start()
    for (let i = 0; i < 5; i++) {
      await vi.waitFor(() => expect(engine.input).toBe(true), { timeout: 2000 })
      void audio.playSfx('right') // the engine's sound at the round's mark
      finish(engine, 'right')
    }
    expect(fake.log().filter((e) => e.id === 'new-sum').length).toBeGreaterThanOrEqual(5)
    expect(touching).toEqual([])
  })

  it('the held house leaves the run and tracks abandon during a run', async () => {
    const { engine, ctl, events } = setup(played)
    ctl.start()
    await playing(engine)
    ctl.leave()
    expect(events).toContainEqual(['abandon', { level: 1, points: 0, phase: 'flight' }])
    expect(engine.input).toBe(false)
    // nothing counts after he left
    finish(engine, 'wrong')
    expect(ctl.getView().hud.hearts).toBe(3)
  })

  it('music during flight follows the setting', async () => {
    applySound({ sfx: true, music: true, volume: 0.8 })
    const a = setup({ ...played, settings: { ...DEFAULT_SETTINGS, flightMusic: true } })
    a.ctl.start()
    expect(fake.live().some((e) => e.kind === 'music')).toBe(true)
    a.ctl.destroy()
    audio.stopTune()
  })
  it('pins its numbers', () => {
    expect([TIP_TIMES, MISSING_TIMES, T1_POD_ROUNDS, T2_POD_ROUNDS]).toEqual([2, 2, 5, 2])
  })

  it('a fresh save: the demo, then the placement\'s probes', async () => {
    const { engine, ctl, events } = setup()
    ctl.start()
    await playing(engine)
    finish(engine, 'right')
    await playing(engine)
    finish(engine, 'right')
    const r = rounds(events)
    expect(r[0]).toMatchObject({ item: '1+1=2/c', demo: true })
    expect(r[1]).toMatchObject({ part: 'probe', rung: '1' })
    expect(events).toContainEqual(['placement', { phase: 'start', kind: 'first', probes: 0, mistakes: 0, frontier: '1' }])
  })

  it('the round event has the rung, kind, part and fast', async () => {
    const t = setup({ ...played, ladder: practiceAt4 })
    t.ctl.start()
    await playing(t.engine)
    finish(t.engine, 'right')
    await playing(t.engine)
    finish(t.engine, 'right', 1, { underMs: 7000 })
    const [a, b] = rounds(t.events)
    expect(a).toMatchObject({ kind: 'sum', fast: true, arrivalMs: 8000 })
    expect(typeof a.rung).toBe('string')
    expect(['frontier', 'below', 'review', 'warmup', 'guard']).toContain(a.part)
    expect(b.fast).toBe(false)
    expect(a).not.toHaveProperty('demo')
  })

  it('a comparison round\'s number is the sign', async () => {
    const t = setup(practiceAt('C1'))
    t.ctl.start()
    await drive(t, (c) => (c.kind === 'compare' ? { result: 'wrong' } : right), () => rounds(t.events).some((r) => r.kind === 'compare'))
    const r = rounds(t.events).find((x) => x.kind === 'compare')!
    expect(r.rung).toBe('C1')
    expect(['<', '=', '>']).toContain(r.number)
    expect(r.labels).toHaveLength(3)
  })

  it('ladder, placement and warmup events are tracked', async () => {
    // a warm-up of rung 1 in a ladder at rung 2: three fast rights on it bring it back
    const save = practiceAt('2')
    const t = setup({ ...save, ladder: { ...save.ladder!, mode: { kind: 'warmup', rung: '1', recent: '', fastRun: 0, strikes: 0, rounds: 0, reviewLeft: 0 } } })
    t.ctl.start()
    await drive(t, () => right, () => t.events.some(([e]) => e === 'warmup'), 40)
    expect(t.events.find(([e]) => e === 'warmup')).toEqual(['warmup', { rung: '1', how: 'fast', rounds: 3 }])
    // then rung 2 is the frontier: it passes (slow by now: the band has his own median, and every answer is as quick)
    await drive(t, () => right, () => t.events.some(([e]) => e === 'ladder'), 60)
    expect(t.events.find(([e]) => e === 'ladder')).toEqual(['ladder', { rung: '2', change: 'passed', by: 'slow' }])
    // a placement: its start and its end (2 mistakes in a row stop it)
    const p = setup(played)
    p.ctl.start()
    await drive(p, () => ({ result: 'wrong' }), () => p.events.some(([e, f]) => e === 'placement' && f?.phase === 'end'), 10)
    expect(p.events.filter(([e]) => e === 'placement').map(([, f]) => f!.phase)).toEqual(['start', 'end'])
  })

  it('run-start has the frontier and playDay, and the probe rung only during a placement', async () => {
    const a = setup({ ...played, ladder: { ...practiceAt4, lastAt: undefined } })
    a.ctl.start()
    expect(a.events[0]).toEqual(['run-start', { ship: 1, frontier: '4', playDay: true }])
    const b = setup({ ...played, ladder: { ...practiceAt4, lastAt: Date.now() - 1000 } })
    b.ctl.start()
    expect(b.events[0]).toEqual(['run-start', { ship: 1, frontier: '4', playDay: false }])
    const mode = placementMode('migration', '12', 4, 10)
    const c = setup({ ...played, ladder: { ...practiceAt4, mode, lastAt: undefined } })
    c.ctl.start()
    expect(c.events[0]).toEqual(['run-start', { ship: 1, rung: '12', frontier: '4', playDay: true }])
  })

  it('the compare intro plays twice, then again after 3 mirrored picks in a play day, once', async () => {
    const t = setup(practiceAt('C1'))
    const intros = () => fake.said().filter((x) => x === 'compare-1').length
    const compares = () => rounds(t.events).filter((r) => r.kind === 'compare').length
    t.ctl.start()
    // the first two comparison rounds say it; the third does not
    await drive(t, () => right, () => compares() >= 3)
    expect(intros()).toBe(INTRO_TIMES)
    expect(t.port.get().heard.compare).toBe(INTRO_TIMES)
    // 3 mirrored picks: the next comparison round says it again
    let mirrored = 0
    const mirror = (c: RoundContent): Answer => {
      const m = c.kind === 'compare' ? mirrorOf(c.flyNumber) : undefined
      if (!m) return right
      mirrored++
      return { result: 'wrong', label: m }
    }
    await drive(t, mirror, () => mirrored >= 3)
    expect(t.port.get().intro.mistakes.compare).toBe(3)
    const before = compares()
    await drive(t, () => right, () => compares() > before)
    expect(intros()).toBe(INTRO_TIMES + 1)
    expect(t.port.get().intro.again).toEqual(['compare'])
    // 3 more on the same play day: not again
    mirrored = 0
    await drive(t, mirror, () => mirrored >= 3)
    const after = compares()
    await drive(t, () => right, () => compares() > after + 1)
    expect(intros()).toBe(INTRO_TIMES + 1)
  })

  it('an intro plays before the planets move: the round stays still until the line and all its cues are done (a fixed 4 s)', async () => {
    const base = practiceAt('C1')
    const t = setup({ ...base, settings: { ...base.settings!, arrival: 4000 } })
    fake.holdUntil(/^compare-/)
    t.ctl.start()
    await drive(t, () => right, () => t.engine.content?.kind === 'compare', 60)
    await settle(20)
    expect(t.engine.arrivals[t.engine.arrivals.length - 1]).toBe(4000)
    expect(fake.said()).toContain('compare-1')
    // the line plays (held): every cue has had its time on the virtual clock, but the round has not started
    expect(t.ctl.getView().phase).toBe('intro')
    expect(t.engine.frozen).toBe(true)
    expect(t.engine.input).toBe(false)
    const from = t.engine.calls.lastIndexOf('play')
    expect(t.engine.calls.slice(from)).not.toContain('resume')
    expect(fake.log().filter((x) => x.id === 'new-sum').length).toBe(rounds(t.events).length)
    fake.release()
    await playing(t.engine)
    const after = t.engine.calls.slice(from)
    const resume = after.indexOf('resume')
    for (const c of ['signs', 'open', 'bigger', 'equal']) {
      expect(after.indexOf(`cue ${c} true`)).toBeGreaterThan(-1)
      expect(after.indexOf(`cue ${c} true`)).toBeLessThan(resume)
    }
    expect(after.indexOf('cue equal false')).toBeLessThan(resume)
    expect(t.ctl.getView().phase).toBe('flight')
  })

  it('an intro whose line ends early (its voice cut short) still shows every cue before the round moves', async () => {
    const t = setup(practiceAt('C1'))
    // the take ends at once (voiceMs 0): the cues still run on the take's timeline
    t.ctl.start()
    await drive(t, () => right, () => t.engine.content?.kind === 'compare', 60)
    await playing(t.engine)
    const after = t.engine.calls.slice(t.engine.calls.lastIndexOf('play'))
    const resume = after.indexOf('resume')
    expect(after.indexOf('cue equal true')).toBeGreaterThan(-1)
    expect(after.indexOf('cue equal true')).toBeLessThan(resume)
  })

  it('a silent intro still cues its glows, counts nothing and plays at most twice a run', async () => {
    fake.missing = (id) => id === 'compare-1'
    const t = setup(practiceAt('C1'))
    const cueRuns = () => t.engine.calls.filter((c) => c === 'cue signs true').length
    t.ctl.start()
    await drive(t, () => right, () => rounds(t.events).filter((r) => r.kind === 'compare').length >= 4)
    expect(cueRuns()).toBe(INTRO_TIMES)
    const first = t.engine.calls.indexOf('cue signs true')
    expect(t.engine.calls.slice(first, first + 8)).toEqual([
      'cue signs true', 'cue signs false', 'cue open true', 'cue open false', 'cue bigger true', 'cue bigger false', 'cue equal true', 'cue equal false',
    ])
    expect(fake.said()).not.toContain('compare-1')
    expect(t.port.get().heard.compare ?? 0).toBe(0)
    // a new run: the glows again, twice
    t.ctl.leave()
    t.ctl.start()
    const c0 = rounds(t.events).filter((r) => r.kind === 'compare').length
    await drive(t, () => right, () => rounds(t.events).filter((r) => r.kind === 'compare').length >= c0 + 4)
    expect(cueRuns()).toBe(2 * INTRO_TIMES)
  })

  it('pods start for T1\'s first 5 rounds', async () => {
    const t = setup(practiceAt('T1'))
    const t1 = () => t.engine.plays.flatMap((c, i) => (c.rung === 'T1' ? [t.engine.pods[i]] : []))
    t.ctl.start()
    await drive(t, () => ({ result: 'right', underMs: 7000 }), () => t1().length > T1_POD_ROUNDS + 1)
    expect(t1().slice(0, T1_POD_ROUNDS)).toEqual(Array(T1_POD_ROUNDS).fill('start'))
    expect(t1()[T1_POD_ROUNDS]).toBe('mistake')
  })

  it('the times intro shows its pods on the cue; T2\'s first rounds show them from the start', async () => {
    const t = setup(practiceAt('T2'))
    t.ctl.start()
    await drive(t, () => ({ result: 'right', underMs: 7000 }), () => t.engine.plays.filter((c) => c.rung === 'T2').length > 4)
    const t2 = t.engine.plays.flatMap((c, i) => (c.rung === 'T2' ? [t.engine.pods[i]] : []))
    // the first two: the intro (on the cue); the next two: the first T2_POD_ROUNDS tallied are over
    expect(t2.slice(0, INTRO_TIMES)).toEqual(['cue', 'cue'])
    expect(fake.said().filter((x) => x === 'times-1')).toHaveLength(INTRO_TIMES)
    // the intro's two rounds are T2's first T2_POD_ROUNDS tallied ones: after them, pods only in a mistake's mark
    expect(T2_POD_ROUNDS).toBe(INTRO_TIMES)
    expect(t2[INTRO_TIMES]).toBe('mistake')
  })

  it('a times or divide intro round is a fact whose groups fit (at most 36 dots), of the same rung', async () => {
    for (const at of ['T2', 'T4b'] as const) {
      for (let seed = 1; seed <= 12; seed++) {
        const t = setup(practiceAt(at), seed * 7919)
        t.ctl.start()
        await drive(t, () => ({ result: 'right', underMs: 7000 }), () => t.engine.pods.filter((p) => p === 'cue').length >= INTRO_TIMES, 40)
        const intro = t.engine.plays.filter((_, i) => t.engine.pods[i] === 'cue')
        expect(intro.length, `${at} seed ${seed}: ${t.engine.plays.map((c) => c.itemId).join(' ')}`).toBe(INTRO_TIMES)
        for (const c of intro) {
          expect(c.pods, `${at} seed ${seed}: ${c.itemId}`).toBeDefined()
          expect(c.pods!.groups * c.pods!.each).toBeLessThanOrEqual(36)
          expect(c.rung).toMatch(/^T/)
        }
        t.ctl.destroy()
      }
    }
  })

  it('a jump round waits for the hop before the arrival sound', async () => {
    applySound({ sfx: true, music: false, volume: 0.8 })
    const t = setup(practiceAt('S1'))
    t.ctl.start()
    await drive(t, () => right, () => t.engine.content?.kind === 'jumps', 60)
    if (t.engine.content?.kind !== 'jumps') throw new Error('no jump round')
    t.engine.holdBox = true
    finish(t.engine, 'right')
    if (t.ctl.getView().phase === 'between') t.ctl.nextLevel()
    await drive(t, () => right, () => t.engine.content?.kind === 'jumps', 60)
    // the round before was answered while it waited: hold the next jump round's hop
    await settle()
    expect(t.engine.calls[t.engine.calls.length - 1]).toBe('boxIn')
    const sounds = fake.log().filter((x) => x.id === 'new-sum').length
    expect(t.engine.frozen).toBe(true)
    expect(t.engine.input).toBe(false)
    t.engine.boxDone!()
    await playing(t.engine)
    expect(fake.log().filter((x) => x.id === 'new-sum').length).toBe(sounds + 1)
  })

  it('a jump row with the ring not last says the missing-number line, its first two times, on its own count', async () => {
    const t = setup({ ...practiceAt('S2'), heard: { demo: 1, missing: 2, jumps: 2 } })
    let middle = 0
    t.ctl.start()
    await drive(t, (c) => {
      if (c.kind === 'jumps' && c.box[3] !== null) middle++
      return right
    }, () => middle >= 3)
    expect(fake.said().filter((x) => x === 'missing-1')).toHaveLength(MISSING_TIMES)
    expect(t.port.get().heard['missing-jumps']).toBe(MISSING_TIMES)
    expect(t.port.get().heard.missing).toBe(2)
  })

  it('a jump row with its ring not last plays the jumps intro on first sight, before the missing-number line', async () => {
    // some seed starts its first jump round with the ring not last
    let found = false
    for (let seed = 1; seed <= 40 && !found; seed++) {
      const t = setup({ ...practiceAt('S2'), heard: { demo: 1, missing: 2 } }, seed)
      let seen: { middle: boolean; intro: number; missing: number } | undefined
      t.ctl.start()
      await drive(t, (c) => {
        if (c.kind === 'jumps' && !seen) seen = { middle: c.box[3] !== null, intro: t.port.get().heard.jumps ?? 0, missing: t.port.get().heard['missing-jumps'] ?? 0 }
        return right
      }, () => seen !== undefined)
      if (seen!.middle) {
        found = true
        expect(seen).toEqual({ middle: true, intro: 1, missing: 0 })
      }
      t.ctl.destroy()
    }
    expect(found).toBe(true)
  })
})
