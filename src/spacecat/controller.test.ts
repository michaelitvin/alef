import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { applySound } from '../shared/gameAudio/output'
import { instantSleeper } from '../shared/sleeper'
import * as audio from './audio/spaceCatAudio'
import type { Engine, Hud } from './canvas/engine'
import type { RoundContent } from './content'
import { MISSING_TIMES, PlayController, TIP_TIMES, type EndInfo, type LevelDoneInfo } from './controller'
import type { RoundResult } from './logic/round'
import { memorySavePort } from './savePort'
import type { SpaceCatSave } from './saveFormat'

const fake = installFakeAudio()

/** a canvas engine that draws nothing: the test ends each round by hand */
function fakeEngine() {
  const calls: string[] = []
  const e = {
    calls,
    content: null as RoundContent | null,
    plays: [] as RoundContent[],
    frozen: false,
    input: true,
    hud: { dots: 0, points: 0, hearts: 3 } as Hud,
    hands: [] as string[],
    handDone: null as (() => void) | null,
    setLayout() {}, setShip(n: number) { calls.push(`ship ${n}`) },
    setHud(h: Hud) { e.hud = h },
    play(c: RoundContent, _ms: number, o?: { frozen?: boolean }) { e.content = c; e.plays.push(c); e.frozen = !!o?.frozen; calls.push('play') },
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
function setup(save: Partial<SpaceCatSave> = {}) {
  const engine = fakeEngine()
  const port = memorySavePort(save)
  const events: [string, Record<string, unknown> | undefined][] = []
  const levels: LevelDoneInfo[] = []
  const ends: EndInfo[] = []
  let seed = 1
  const ctl = new PlayController({
    engine: engine as unknown as Engine, audio, save: port, track: (ev, f) => events.push([ev, f]), sleeper: instantSleeper(),
    rng: () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 },
    onLevelDone: (i) => levels.push(i), onEnd: (i) => ends.push(i),
  })
  live.push(ctl)
  return { engine, port, events, levels, ends, ctl }
}
/** a run that is not the first (no demo) */
const played = { runs: 1, heard: { demo: 1 } }

/** ends the round on the screen with this result (the engine's onEnd, after its mark) */
function finish(e: FakeEngine, result: 'right' | 'wrong' | 'timeout', points: 0 | 1 | 2 = result === 'right' ? 1 : 0) {
  const c = e.content!
  const lane = result === 'right' ? c.rightLane : (c.rightLane + 1) % 4
  const r: RoundResult = { result, end: points === 2 ? 'zoom' : 'arrival', lane, number: Number(c.labels[lane]), points, lastLaneMs: 1000, endMs: 3000, underMs: result === 'right' ? 1000 : null, startedUnder: false }
  e.onEnd(r)
}
const playing = async (e: FakeEngine) => { await settle(); expect(e.frozen).toBe(false); expect(e.input).toBe(true) }

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

  it('input is off while the demo line plays', async () => {
    const { engine, ctl } = setup()
    fake.holdUntil(/^demo/)
    ctl.start()
    await settle()
    expect(fake.said()).toEqual(['demo-1'])
    expect(engine.input).toBe(false)
    expect(engine.frozen).toBe(true)
    expect(ctl.getView().phase).toBe('demo')
    fake.release()
    await playing(engine)
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
    const { engine, ctl } = setup({ ...played, ladder: { top: 4, topRecent: '', topMistake: false, streak: 0 } })
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

  it('pagehide during a run tracks abandon', async () => {
    const { engine, ctl, events } = setup(played)
    ctl.start()
    await playing(engine)
    finish(engine, 'right')
    ctl.pageHide()
    expect(events).toContainEqual(['abandon', { level: 1, points: 1 }])
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
    expect(events).toContainEqual(['abandon', { level: 1, points: 0 }])
    expect(engine.input).toBe(false)
    // nothing counts after he left
    finish(engine, 'wrong')
    expect(ctl.getView().hud.hearts).toBe(3)
  })

  it('music during flight follows the setting', async () => {
    applySound({ sfx: true, music: true, volume: 0.8 })
    const a = setup({ ...played, settings: { range: 'auto', times: false, divide: false, arrival: 'auto', flightMusic: true } })
    a.ctl.start()
    expect(fake.live().some((e) => e.kind === 'music')).toBe(true)
    a.ctl.destroy()
    audio.stopTune()
  })
})
