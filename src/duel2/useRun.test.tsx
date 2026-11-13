import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController, type BroomView, type View } from './controller'
import { useRun } from './useRun'
import { DEFAULT_SETTINGS, FRESH_MERCHANT, NEVER_VISITED, useDuel2Store } from './store'
import { hintCoins } from './logic/merchant'
import { useProgressStore } from '../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'
import { DUEL_MARKS } from '../utils/duel/marks'
import { CATCH_AT, ORB_JITTER, wavePos } from './logic/run'
import { BROOM_ORB, LANE_Y, flightPath, orbX } from './components/screens/Broom'
import { setVoicePlayer, stopVoice } from './audio/duel2Audio'
import { wavePos as wp } from './logic/run'

const { sfxLog } = vi.hoisted(() => ({ sfxLog: [] as string[] }))
vi.mock('./audio/duel2Audio', async (orig) => {
  const m = await orig<typeof import('./audio/duel2Audio')>()
  return { ...m, playSfx: (n: string) => { sfxLog.push(n); return Promise.resolve() } }
})
import { duel2Telemetry } from './telemetry'
import type { DrawView } from './controller'
import { strokesOf, type Pt } from './data/strokes'
import { bbox, markTargets, resample } from './logic/recognizer'

function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Force = NonNullable<ConstructorParameters<typeof RunController>[0]>['force']
let played: string[] = []
const allDemos = ['demo-broom', 'demo-broom-letter', 'demo-cauldron', 'demo-ladder', 'demo-ghosts-letter', 'demo-ghosts-syllable', 'demo-doors']
const ALL_DOTS = ['bet', 'kaf', 'pe', 'shin']

function make(opts: ConstructorParameters<typeof RunController>[0] = {}) {
  return new RunController({ rng: seeded(3), now: () => Date.now(), ...opts })
}
const tick = (ms = 100) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
/** the tower's board (the first duel's hook) is not mounted here: most tests let its visit end at once */
let towerAuto = true
function autoTower(c: RunController) {
  const s = c.view.screen
  if (towerAuto && s?.screen === 'tower' && !c.view.paused) c.towerDone(s.wave + s.waves - 1)
}
async function until(c: RunController, pred: (v: View) => boolean, max = 60_000) {
  for (let t = 0; t < max && !pred(c.view); t += 50) { autoTower(c); await tick(50) }
  if (!pred(c.view)) throw new Error(`condition not met; phase=${c.view.phase} screen=${c.view.screen?.screen}`)
}
function rightId(v: View): string {
  const s = v.screen!
  if (s.screen === 'cauldron') return s.target.mark!
  if (s.screen === 'doors') return s.word.id
  if (s.screen === 'broom' || s.screen === 'crystal' || s.screen === 'draw' || s.screen === 'tower') throw new Error('no pick here')
  return s.target.id
}
function wrongId(v: View): string {
  const s = v.screen!
  if (s.screen === 'cauldron') return s.orbs.find((m) => m !== s.target.mark)!
  if (s.screen === 'doors') return s.keys.find((k) => k.id !== s.word.id)!.id
  if (s.screen === 'ghosts') return s.signs.find((x) => x.id !== s.target.id && x.nearMissOf !== s.target.id)!.id
  if (s.screen === 'ladder') return s.plates.find((x) => x.id !== s.target.id && x.nearMissOf !== s.target.id)!.id
  throw new Error('no pick')
}
/** after a mistake he does the right move himself (the marked answer); an explanation still has next */
function proceed(c: RunController) {
  autoTower(c)
  if (c.view.fixing) c.gesture({ type: 'pick', id: (c.view.screen as { reveal: { right: string } }).reveal.right })
  else if (c.view.needNext) c.next()
}
/** does the fix and presses next through any explanation until the next answer phase */
async function drain(c: RunController) {
  for (let i = 0; i < 400 && !(c.view.phase === 'answer' && !c.view.needNext) && !c.view.over; i++) {
    proceed(c)
    await tick(50)
  }
}
/** the lane of the first open orb with the target's sound in the oldest open wave (two-orb waves have their own lanes) */
function targetLane(s: BroomView): number {
  const head = s.waves.find((w) => w.resolved.some((r) => !r))
  if (!head) return -1
  const j = head.choices.findIndex((x, k) => x.soundId === s.target.soundId && !head.resolved[k])
  return j < 0 ? -1 : (head.lanes?.[j] ?? j)
}
/** a careful player: always in the lane of the target of the oldest open wave */
function fly(c: RunController) {
  const s = c.view.screen
  if (s?.screen !== 'broom' || c.view.phase !== 'answer') return
  const k = targetLane(s)
  if (k >= 0) c.gesture({ type: 'lane', lane: k as 0 | 1 | 2 })
}
/** steer the broom into the target's lane (or away from it) for the head wave */
function steer(c: RunController, right: boolean) {
  const s = c.view.screen as BroomView
  const head = s.waves[0]
  if (!head) return
  const lane = head.choices.findIndex((x) => x.soundId === s.target.soundId)
  const pick = right ? lane : head.choices.findIndex((x, i) => i !== lane && x.nearMissOf !== s.target.id)
  c.gesture({ type: 'lane', lane: pick as 0 | 1 | 2 })
}

describe('run controller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    towerAuto = true
    useDuel2Store.getState().resetProgress()
    // drawing is on by default; these tests are about the other screens (the drawing tests turn it on)
    useDuel2Store.setState({ bookOpen: true, settings: { ...DEFAULT_SETTINGS, drawing: false }, demosSeen: allDemos, dotIntrosSeen: ALL_DOTS, hintsSeen: Object.fromEntries(['cauldron', 'ladder', 'ghosts'].flatMap((s) => [1, 2, 3, 4].map((n) => [`${s}:${n}`, 99])))  })
    played = []
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 10)) })
  })
  afterEach(() => {
    stopVoice()
    setVoicePlayer(null)
    vi.useRealTimers()
  })

  it('taps during the question line are ignored', async () => {
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.screen?.screen === 'ghosts' && v.phase === 'question')
    const before = useDuel2Store.getState().roundNo
    c.gesture({ type: 'pick', id: rightId(c.view) })
    await until(c, (v) => v.phase === 'answer')
    expect(useDuel2Store.getState().roundNo).toBe(before)
    c.destroy()
  })

  it('second tap during feedback is ignored', async () => {
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    const id = rightId(c.view)
    c.gesture({ type: 'pick', id })
    c.gesture({ type: 'pick', id })
    await tick(50)
    expect(useDuel2Store.getState().roundNo).toBe(1)
    c.destroy()
  })

  it('after a mistake he does the right move himself: no next button, only the marked answer goes on (the parent)', async () => {
    for (const force of [{ screen: 'ladder', stage: 2, fixed: 'letter' }, { screen: 'ghosts', stage: 2, kind: 'syllable' }, { screen: 'cauldron', stage: 2 }] as Force[]) {
      useDuel2Store.getState().resetProgress()
      const c = make({ force })
      c.start()
      await until(c, (v) => v.phase === 'answer')
      const wrong = wrongId(c.view)
      c.gesture({ type: 'pick', id: wrong })
      await until(c, (v) => v.phase === 'mistake' && !!v.fixing)
      await tick(60_000)
      expect(c.view.phase).toBe('mistake')
      expect(c.view.needNext).toBe(false)
      expect(c.view.hearts).toBe(2)
      const before = useDuel2Store.getState().roundNo
      c.gesture({ type: 'pick', id: wrong })
      await tick(500)
      expect(c.view.phase).toBe('mistake')
      const score = c.view.score
      c.gesture({ type: 'pick', id: (c.view.screen as { reveal: { right: string } }).reveal.right })
      await until(c, (v) => !v.fixing && v.phase !== 'mistake')
      // the right move does what a right answer does on that screen, but no star and no new answer recorded
      const s = c.view.screen!
      if (s.screen === 'ladder') expect(s.built.length).toBe(1)
      if (s.screen === 'ghosts') expect(s.zapped).toBeTruthy()
      if (s.screen === 'cauldron') expect(s.joined).toBe(true)
      expect(c.view.score).toBe(score)
      expect(useDuel2Store.getState().roundNo).toBe(before)
      await drain(c)
      expect(c.view.phase).toBe('answer')
      c.destroy()
    }
  })

  it('telemetry records his fix after a mistake, the replay button, a pause, and the flight speed (the parent: add what is missing)', async () => {
    duel2Telemetry.clear()
    const events = () => (JSON.parse(duel2Telemetry.exportJson()).events as { e: string; [k: string]: unknown }[])
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    c.replay()
    c.gesture({ type: 'pick', id: wrongId(c.view) })
    await until(c, (v) => !!v.fixing)
    await tick(1200)
    c.gesture({ type: 'pick', id: (c.view.screen as { reveal: { right: string } }).reveal.right })
    await until(c, (v) => !v.fixing)
    c.pause()
    c.resume()
    c.destroy()
    const ev = events()
    expect(ev.find((e) => e.e === 'replay')).toBeTruthy()
    const fix = ev.find((e) => e.e === 'fix')!
    expect(fix).toMatchObject({ screen: 'ghosts' })
    expect(fix.ms as number).toBeGreaterThanOrEqual(1000)
    expect(ev.find((e) => e.e === 'pause')).toBeTruthy()
    expect(ev.find((e) => e.e === 'resume')).toBeTruthy()
    const b = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    b.start()
    await until(b, (v) => v.phase === 'answer')
    b.destroy()
    expect(events().find((e) => e.e === 'flight')).toMatchObject({ kind: 'syllable' })
  })

  it('after a wrong key he drags the right key himself and the door opens', async () => {
    const c = make({ force: { screen: 'doors', stage: 2 } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    c.gesture({ type: 'pick', id: wrongId(c.view) })
    await until(c, (v) => !!v.fixing)
    expect(c.view.needNext).toBe(false)
    c.gesture({ type: 'pick', id: (c.view.screen as { reveal: { right: string } }).reveal.right })
    await until(c, (v) => (v.screen as { opening?: boolean }).opening === true)
    c.destroy()
  })

  it('explanation after the same mistake twice', async () => {
    useDuel2Store.setState({ mistakes: [], roundNo: 10 })
    const c = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' }, rng: () => 0.9 })
    c.start()
    for (let k = 0; k < 2; k++) {
      await until(c, (v) => v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => v.needNext || !!v.fixing)
      proceed(c)
      if (k === 0) await until(c, (v) => v.phase === 'question' || v.phase === 'answer')
    }
    await until(c, (v) => v.overlay?.kind === 'explain')
    const o = c.view.overlay as Extract<View['overlay'], { kind: 'explain' }>
    expect(o.parts.map((p) => p.id)[1]).toMatch(/^ln-/)
    expect(o.parts.map((p) => p.id)[2]).toMatch(/^vn-/)
    c.destroy()
  })

  it('the first round after a demo is the round the demo showed', async () => {
    // the parent: the demo showed one letter and the round then asked about another
    for (const force of [{ screen: 'cauldron', stage: 2, demo: true }, { screen: 'ghosts', stage: 2, kind: 'syllable', demo: true }] as Force[]) {
      useDuel2Store.setState({ demosSeen: [] })
      const c = make({ force })
      c.start()
      await until(c, (v) => v.overlay?.kind === 'demo')
      const shown = JSON.stringify(c.view.screen)
      c.next()
      await until(c, (v) => v.phase === 'answer')
      expect(JSON.stringify(c.view.screen)).toBe(shown)
      c.destroy()
    }
  })

  it('the sound to find plays again after a demo', async () => {
    useDuel2Store.setState({ demosSeen: [] })
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'syllable', demo: true } })
    c.start()
    await until(c, (v) => v.overlay?.kind === 'demo')
    expect(c.view.phase).toBe('demo')
    played = []
    c.next()
    await until(c, (v) => v.phase === 'answer')
    expect(played).toContain((c.view.screen as Extract<View['screen'], { screen: 'ghosts' }>).target.soundId)
    expect(useDuel2Store.getState().demosSeen).toContain('demo-ghosts-syllable')
    c.destroy()
  })

  it('near miss is forgiven once', async () => {
    const c = make({ force: { screen: 'ladder', stage: 3, fixed: 'dot' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    const s = c.view.screen as Extract<View['screen'], { screen: 'ladder' }>
    const near = s.plates.find((x) => x.nearMissOf === s.target.id)!
    c.gesture({ type: 'pick', id: near.id })
    await tick(200)
    expect(c.view.hearts).toBe(3)
    expect(played.some((id) => id.startsWith('almost-'))).toBe(true)
    await until(c, (v) => v.phase === 'answer')
    c.gesture({ type: 'pick', id: near.id })
    await until(c, (v) => v.phase === 'mistake')
    expect(c.view.hearts).toBe(2)
    c.destroy()
  })

  it('hearts last the whole run: a heart lost on the cauldron is still lost on the ladder', async () => {
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'broom' })
    const c = make()
    c.start()
    for (let k = 0; k < 2; k++) {
      await until(c, (v) => v.screen?.screen === 'cauldron' && v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => v.needNext || !!v.fixing)
      await drain(c)
    }
    expect(c.view.hearts).toBe(1)
    for (let guard = 0; guard < 20 && c.view.screen?.screen === 'cauldron'; guard++) {
      await until(c, (v) => v.phase === 'answer' || v.screen?.screen !== 'cauldron' || v.needNext || !!v.fixing)
      if (c.view.needNext || c.view.fixing) { proceed(c); continue }
      if (c.view.screen?.screen === 'cauldron') c.gesture({ type: 'pick', id: rightId(c.view) })
      await tick(100)
    }
    await until(c, (v) => v.screen?.screen === 'ladder')
    expect(c.view.hearts).toBe(1)
    c.destroy()
  })

  describe('the end of a pass', () => {
    const events = () => (JSON.parse(duel2Telemetry.exportJson()).events as { e: string; [k: string]: unknown }[])
    /** plays on (right answers, a careful flight, the fix and next when asked) until `pred` holds */
    async function playTo(c: RunController, pred: (v: View) => boolean, onTick?: () => void) {
      for (let guard = 0; guard < 8000 && !pred(c.view); guard++) {
        onTick?.()
        const s = c.view.screen
        // the merchant may come at a checkpoint: no thanks
        autoTower(c)
        if (c.view.merchant) c.gesture({ type: 'decline' })
        else if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && s && !['crystal', 'broom', 'draw', 'tower'].includes(s.screen)) c.gesture({ type: 'pick', id: rightId(c.view) })
        fly(c)
        await tick(50)
      }
      expect(pred(c.view)).toBe(true)
    }
    /** on a calm screen: a wrong pick, then he does the fix */
    async function loseHeart(c: RunController) {
      const before = c.view.hearts
      await playTo(c, (v) => v.phase === 'answer' && !!v.screen && !['crystal', 'broom', 'tower'].includes(v.screen.screen))
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => !!v.fixing)
      await drain(c)
      expect(c.view.hearts).toBe(before - 1)
    }
    /** to the crystal, then to the broom of the next cycle (the pass heart, if any, comes between) */
    async function toNextCycle(c: RunController, onTick?: () => void) {
      await playTo(c, (v) => v.screen?.screen === 'crystal', onTick)
      await playTo(c, (v) => v.screen?.screen === 'broom', onTick)
    }
    /** stage 4 (no stage passes during the test), drawing off: broom → cauldron → ladder → ghosts → doors, then the crystal */
    const fromStartOfCycle = () => useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'doors' })

    it('gives one heart back, once, at once: no line, no pause, the top bar’s hearts flash (the parent)', async () => {
      duel2Telemetry.clear()
      fromStartOfCycle()
      const c = make()
      c.start()
      await playTo(c, (v) => v.screen?.screen === 'cauldron')
      await loseHeart(c)
      await toNextCycle(c)
      expect(c.view.hearts).toBe(3)
      expect(c.view.passHeart).toBe(1)
      expect(c.view.heal).toBeDefined()
      expect(c.view.heartFlash).toBeGreaterThan(0)
      expect(played.some((id) => id.startsWith('pass-heart'))).toBe(false)
      expect(events().filter((e) => e.e === 'pass-heart')).toEqual([expect.objectContaining({ hearts: 3 })])
      c.destroy()
    }, 60_000)

    it('a lock just after the pass heart does not give it again', async () => {
      duel2Telemetry.clear()
      fromStartOfCycle()
      const c = make()
      c.start()
      // two hearts lost, so a second heart would show (with one lost, the cap of 3 would hide it)
      await playTo(c, (v) => v.screen?.screen === 'cauldron')
      await loseHeart(c)
      await loseHeart(c)
      let locked = false
      await toNextCycle(c, () => {
        if (!locked && c.view.passHeart === 1) { locked = true; c.pause(); c.resume() }
      })
      expect(locked).toBe(true)
      expect(c.view.hearts).toBe(2)
      expect(c.view.passHeart).toBe(1)
      expect(events().filter((e) => e.e === 'pass-heart').length).toBe(1)
      c.destroy()
    }, 60_000)

    it('a run that starts near the end of a cycle gets no heart there: a pass is a trip through every screen', async () => {
      duel2Telemetry.clear()
      // the last run ended on the ghosts: this one starts on the doors, the last screen of the cycle
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'ghosts' })
      const c = make()
      c.start()
      await playTo(c, (v) => v.screen?.screen === 'doors')
      await loseHeart(c)
      await toNextCycle(c)
      expect(c.view.hearts).toBe(2)
      expect(c.view.passHeart ?? 0).toBe(0)
      expect(events().some((e) => e.e === 'pass-heart')).toBe(false)
      // the next trip through the whole cycle is a pass: it gives the heart
      await toNextCycle(c)
      expect(c.view.hearts).toBe(3)
      expect(c.view.passHeart).toBe(1)
      c.destroy()
    }, 60_000)

    it('no heart when all three are there', async () => {
      duel2Telemetry.clear()
      fromStartOfCycle()
      const c = make()
      c.start()
      await playTo(c, (v) => v.screen?.screen === 'cauldron')
      await toNextCycle(c)
      expect(c.view.hearts).toBe(3)
      expect(c.view.passHeart ?? 0).toBe(0)
      expect(played.some((id) => id.startsWith('pass-heart'))).toBe(false)
      c.destroy()
    }, 60_000)

    it('the gallery still refills a forced screen and never gives a pass heart', async () => {
      duel2Telemetry.clear()
      const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'letter' } })
      c.start()
      await until(c, (v) => v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => !!v.fixing)
      await drain(c)
      expect(c.view.hearts).toBe(2)
      for (let guard = 0; guard < 2000 && c.view.hearts < 3; guard++) {
        if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer') c.gesture({ type: 'pick', id: rightId(c.view) })
        await tick(50)
      }
      expect(c.view.hearts).toBe(3)
      expect(c.view.passHeart ?? 0).toBe(0)
      expect(events().some((e) => e.e === 'pass-heart')).toBe(false)
      c.destroy()
    })
  })

  it('when the hearts run out in the flight, the orbs on the screen finish and no new wave starts', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (c.view.screen as BroomView).waves.length > 0)
    for (let i = 0; i < 20_000 && c.view.hearts > 0; i++) { steer(c, false); await tick(50) }
    expect(c.view.hearts).toBe(0)
    const bvw = () => c.view.screen as BroomView
    expect(c.view.over).toBeNull()
    expect(bvw().waves.length).toBeGreaterThan(0)
    const maxId = Math.max(...bvw().waves.map((w) => w.id))
    const score = c.view.score
    const stars = useDuel2Store.getState().totalStars
    const coins = useDuel2Store.getState().coins
    let wavesWhenOver = -1
    for (let i = 0; i < 2000 && !c.view.over; i++) {
      // he steers into the targets now: nothing counts any more
      steer(c, true)
      for (const w of bvw().waves) expect(w.id).toBeLessThanOrEqual(maxId)
      await tick(50)
      if (c.view.over) wavesWhenOver = bvw().waves.length
    }
    expect(c.view.over).not.toBeNull()
    expect(wavesWhenOver).toBe(0)
    expect(c.view.score).toBe(score)
    expect(useDuel2Store.getState().totalStars).toBe(stars)
    expect(useDuel2Store.getState().coins).toBe(coins)
    c.destroy()
  }, 60_000)

  it('run ends at 0 hearts and the next run starts after that screen', async () => {
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron' })
    const c = make()
    c.start()
    for (let k = 0; k < 3; k++) {
      await until(c, (v) => v.screen?.screen === 'ladder' && v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => v.needNext || !!v.fixing || v.over !== null)
      if (c.view.over) break
      await drain(c)
    }
    await until(c, (v) => v.over !== null)
    expect(useDuel2Store.getState().lastEnded).toBe('ladder')
    c.destroy()
    const c2 = make()
    c2.start()
    await until(c2, (v) => v.screen !== null)
    expect(c2.view.screen?.screen).toBe('ghosts')
    c2.destroy()
  })

  it('a full cycle completes with no audio files', async () => {
    // a missing file resolves at once (duel2Audio playFile): simulate every clip missing
    setVoicePlayer(() => Promise.resolve())
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'ghosts' })
    const c = make()
    c.start()
    for (let guard = 0; guard < 400 && c.view.screen?.screen !== 'crystal'; guard++) {
      await tick(50)
      if (c.view.needNext || c.view.fixing) proceed(c)
      else if (c.view.phase === 'answer' && c.view.screen && !['crystal', 'broom', 'tower'].includes(c.view.screen.screen as string)) c.gesture({ type: 'pick', id: rightId(c.view) })
    }
    expect(c.view.screen?.screen).toBe('crystal')
    await until(c, (v) => v.screen?.screen === 'broom')
    expect(useDuel2Store.getState().crystals).toBe(1)
    c.destroy()
  })

  it('the broom flight catches by lane, and a mistake does not stop it (arcade: the parent wants it fluent)', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    const before = useDuel2Store.getState().roundNo
    for (let i = 0; i < 2000 && useDuel2Store.getState().roundNo === before; i++) { steer(c, true); await tick(50) }
    expect(useDuel2Store.getState().tallies['sc:broom']?.wrong ?? 0).toBe(0)
    const phases = new Set<string>()
    for (let i = 0; i < 4000 && c.view.hearts === 3; i++) { steer(c, false); phases.add(c.view.phase); await tick(50) }
    expect(c.view.hearts).toBe(2)
    const lastWave = Math.max(...(c.view.screen as BroomView).waves.map((w) => w.id), 0)
    for (let i = 0; i < 120; i++) { phases.add(c.view.phase); await tick(50) }
    expect([...phases]).toEqual(['answer'])
    expect(c.view.needNext).toBe(false)
    // the flight goes on: new orbs keep coming
    expect(Math.max(...(c.view.screen as BroomView).waves.map((w) => w.id), 0)).toBeGreaterThan(lastWave)
    c.destroy()
  })

  it('hidden page pauses the flight and resume restarts the wave', async () => {
    function Probe({ out }: { out: { r?: ReturnType<typeof useRun> } }) {
      out.r = useRun({ force: { screen: 'broom', stage: 2, kind: 'syllable' }, rng: seeded(5), now: () => Date.now() })
      return null
    }
    const out: { r?: ReturnType<typeof useRun> } = {}
    render(<Probe out={out} />)
    for (let i = 0; i < 400 && !(out.r!.view.phase === 'answer' && (out.r!.view.screen as BroomView)?.waves.length); i++) await tick(50)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(out.r!.view.paused).toBe(true)
    const target = (out.r!.view.screen as BroomView).target.id
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    played = []
    await act(async () => { out.r!.resume() })
    await tick(5)
    expect((out.r!.view.screen as BroomView).waves.length).toBe(0)
    expect((out.r!.view.screen as BroomView).target.id).toBe(target)
    for (let i = 0; i < 200 && !played.includes((out.r!.view.screen as BroomView).target.soundId); i++) await tick(50)
    expect(played).toContain((out.r!.view.screen as BroomView).target.soundId)
  })

  it('sandbox writes nothing', async () => {
    const c = make({ sandbox: true, force: { screen: 'ghosts', stage: 2, kind: 'letter' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    c.gesture({ type: 'pick', id: rightId(c.view) })
    await tick(500)
    expect(useDuel2Store.getState().roundNo).toBe(0)
    expect(useDuel2Store.getState().tallies).toEqual({})
    c.destroy()
  })

  it('word link never twice in a row', async () => {
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'syllable' }, rng: () => 0.01 })
    c.start()
    let links = 0
    let lastWasLink = false
    let twice = false
    for (let r = 0; r < 4; r++) {
      await until(c, (v) => v.phase === 'answer')
      const n0 = played.filter((id) => id.startsWith('w-')).length
      c.gesture({ type: 'pick', id: rightId(c.view) })
      await tick(2000)
      const link = played.filter((id) => id.startsWith('w-')).length > n0
      if (link) links++
      if (link && lastWasLink) twice = true
      lastWasLink = link
    }
    expect(twice).toBe(false)
    c.destroy()
  })
  it('a lock during feedback does not replay the answered round (ladder)', async () => {
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 300)) })
    const c = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    c.gesture({ type: 'pick', id: rightId(c.view) })
    await tick(50)
    expect(c.view.phase).toBe('feedback')
    c.pause()
    c.resume()
    await until(c, (v) => v.phase === 'answer')
    const s = c.view.screen as Extract<View['screen'], { screen: 'ladder' }>
    expect(s.built.length).toBe(1)
    expect(s.plates.length).toBe(3)
    expect(useDuel2Store.getState().roundNo).toBe(1)
    c.destroy()
  })

  it('resume keeps the flight kind', async () => {
    let calls = 0
    useDuel2Store.setState({ stage: { stage: 2, newAnswers: '' }, lastEnded: 'ghosts', demosSeen: allDemos })
    const c = make({ rng: () => (calls++ === 0 ? 0.1 : 0.9) })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    expect((c.view.screen as BroomView).kind).toBe('letter')
    c.pause()
    c.resume()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    expect((c.view.screen as BroomView).kind).toBe('letter')
    c.destroy()
  })

  it('a lock while the run ends still shows the summary', async () => {
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron' })
    const c = make()
    c.start()
    for (let k = 0; k < 3; k++) {
      await until(c, (v) => v.screen?.screen === 'ladder' && v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      if (k < 2) { await until(c, (v) => v.needNext || !!v.fixing); await drain(c) }
    }
    await tick(5)
    c.pause()
    await until(c, (v) => v.over !== null, 5000)
    expect(useDuel2Store.getState().runs).toBe(1)
    c.destroy()
  })

  it('the run ends with the defeat scene, then the summary', async () => {
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron' })
    sfxLog.length = 0
    const c = make()
    c.start()
    for (let k = 0; k < 3; k++) {
      await until(c, (v) => v.screen?.screen === 'ladder' && v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      if (k < 2) { await until(c, (v) => v.needNext || !!v.fixing); await drain(c) }
    }
    await until(c, (v) => !!v.defeat)
    expect(c.view.over).toBeNull()
    await until(c, () => played.some((id) => id.startsWith('defeat-')))
    expect(c.view.over).toBeNull()
    await until(c, (v) => v.over !== null)
    expect(sfxLog.filter((n) => n === 'hit').length).toBeGreaterThanOrEqual(4)
    c.destroy()
  })

  it('closing the game while the run ends sends no abandon (the run-end was sent)', async () => {
    duel2Telemetry.clear()
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron' })
    const c = make()
    c.start()
    for (let k = 0; k < 3; k++) {
      await until(c, (v) => v.screen?.screen === 'ladder' && v.phase === 'answer')
      if (k === 0) c.gesture({ type: 'pick', id: rightId(c.view) })
      else c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => v.needNext || !!v.fixing || v.phase === 'feedback')
      await drain(c)
    }
    await until(c, (v) => v.screen?.screen === 'ladder' && v.phase === 'answer')
    c.gesture({ type: 'pick', id: wrongId(c.view) })
    await until(c, (v) => !!v.defeat)
    c.destroy()
    const ev = JSON.parse(duel2Telemetry.exportJson()).events as { e: string }[]
    expect(ev.some((e) => e.e === 'run-end')).toBe(true)
    expect(ev.some((e) => e.e === 'abandon')).toBe(false)
  })

  it('a lock during the defeat scene still shows the summary', async () => {
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron' })
    const c = make()
    c.start()
    for (let k = 0; k < 3; k++) {
      await until(c, (v) => v.screen?.screen === 'ladder' && v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      if (k < 2) { await until(c, (v) => v.needNext || !!v.fixing); await drain(c) }
    }
    await until(c, (v) => !!v.defeat)
    c.pause()
    expect(c.view.paused).toBe(false)
    await until(c, (v) => v.over !== null, 8000)
    expect(useDuel2Store.getState().runs).toBe(1)
    c.destroy()
  })

  it('a lock during the crystal gives one crystal', async () => {
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'ghosts' })
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 200)) })
    const c = make()
    c.start()
    for (let guard = 0; guard < 600 && c.view.screen?.screen !== 'crystal'; guard++) {
      await tick(50)
      if (c.view.needNext || c.view.fixing) proceed(c)
      else if (c.view.phase === 'answer' && c.view.screen?.screen === 'doors') c.gesture({ type: 'pick', id: rightId(c.view) })
    }
    await until(c, (v) => v.phase === 'celebrate')
    c.pause()
    c.resume()
    await until(c, (v) => v.screen?.screen === 'broom')
    expect(useDuel2Store.getState().crystals).toBe(1)
    c.destroy()
  })

  it('a tap during the cue answers at once', async () => {
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 1500)) })
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'letter' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    c.gesture({ type: 'pick', id: rightId(c.view) })
    await tick(100)
    expect(useDuel2Store.getState().roundNo).toBe(1)
    c.destroy()
  })

  it('after a mistake no hint plays: the right answer glows and its sound plays (Michael: hints too often)', async () => {
    const c = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' }, rng: () => 0.9 })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    const s = c.view.screen as Extract<View['screen'], { screen: 'ladder' }>
    const target = s.target
    played = []
    c.gesture({ type: 'pick', id: wrongId(c.view) })
    await until(c, (v) => v.needNext || !!v.fixing)
    await tick(1000)
    expect(played).toContain(target.soundId)
    expect(played).not.toContain(`vn-${target.mark}`)
    expect(c.view.overlay).toBeNull()
    c.destroy()
  })

  it('no hint at the start of a round, even on a new screen', async () => {
    useDuel2Store.setState({ hintsSeen: {} })
    const c = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' }, rng: () => 0.9 })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    await tick(3000)
    expect(c.view.overlay).toBeNull()
    expect(played.some((id) => id.startsWith('vn-'))).toBe(false)
    c.destroy()
  })

  it('the hint comes by itself only when he has not picked for a long time; a pick stops it and counts (he already knows)', async () => {
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 1500)) })
    const c = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' }, rng: () => 0.9 })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    await tick(10_000)
    expect(c.view.overlay?.kind).not.toBe('hint')
    await until(c, (v) => v.overlay?.kind === 'hint', 12_000)
    c.gesture({ type: 'pick', id: rightId(c.view) })
    await tick(100)
    expect(useDuel2Store.getState().roundNo).toBe(1)
    expect(c.view.overlay?.kind).not.toBe('hint')
    c.destroy()
  })

  it('the instruction plays only when he has not picked for a while (Michael: he gets it)', async () => {
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    expect(played.some((id) => id.startsWith('q-'))).toBe(false)
    await tick(9000)
    expect(played.some((id) => id.startsWith('q-ghosts'))).toBe(true)
    c.gesture({ type: 'pick', id: rightId(c.view) })
    await until(c, (v) => v.phase === 'feedback')
    played = []
    await until(c, (v) => v.phase === 'answer')
    c.gesture({ type: 'pick', id: wrongId(c.view) })
    await drain(c)
    expect(played.some((id) => id.startsWith('q-'))).toBe(false)
    c.destroy()
  })

  it('after a broom mistake the sound to catch plays again, with no question line and no stop', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    const mark = played.length
    for (let i = 0; i < 4000 && c.view.hearts === 3; i++) { steer(c, false); await tick(50) }
    await tick(1500)
    const after = played.slice(mark)
    expect(after).toContain((c.view.screen as BroomView).target.soundId)
    expect(after.some((id) => id.startsWith('q-'))).toBe(false)
    expect(c.view.needNext).toBe(false)
    c.destroy()
  })

  it('a new sound to catch comes only when the orbs on the screen are done, and the flight does not stop for it', async () => {
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 1200)) })
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    let target = (c.view.screen as BroomView).target.id
    let prevTarget: string | null = (c.view.screen as BroomView).target.soundId
    let changes = 0
    let changedAt = -1
    let lastWave = 0
    let firstNewWave = -1
    let prevMax = 0
    let cueAt = -1
    let spawnAt = -1
    const phases = new Set<string>()
    for (let i = 0; i < 6000 && (changes === 0 || (firstNewWave < 0 && Date.now() - changedAt < 8000)); i++) {
      const s = c.view.screen as BroomView
      if (s.target.id !== target) {
        changes++
        // no orb with the old sound may still be flying (other leftovers finish harmlessly)
        const old = prevTarget!
        expect(s.waves.some((w) => !w.spent && w.choices.some((x, j) => x.soundId === old && !w.resolved[j])), 'old-sound orbs still flying').toBe(false)
        target = s.target.id
        changedAt = Date.now()
        lastWave = prevMax
      }
      if (changedAt > 0 && cueAt < 0 && played.slice(-1)[0] === s.target.soundId) cueAt = Date.now()
      if (changedAt > 0 && firstNewWave < 0 && s.waves.some((w) => w.id > lastWave)) { firstNewWave = Date.now() - changedAt; spawnAt = Date.now() }
      prevTarget = s.target.soundId
      prevMax = Math.max(prevMax, 0, ...s.waves.map((w) => w.id))
      phases.add(c.view.phase)
      const head = s.waves.find((w) => w.resolved.some((r) => !r))
      const k = head ? head.choices.findIndex((x, j) => x.soundId === s.target.soundId && !head.resolved[j]) : -1
      if (k >= 0) c.gesture({ type: 'lane', lane: k as 0 | 1 | 2 })
      await tick(50)
    }
    expect(changes).toBe(1)
    expect([...phases]).toEqual(['answer'])
    // the new orbs set off when the new sound is said, not with "and now" (the parent: they were already close), and
    // with no long wait after it either
    expect(firstNewWave).toBeGreaterThanOrEqual(0)
    expect(cueAt).toBeGreaterThan(0)
    expect(spawnAt).toBeGreaterThanOrEqual(cueAt)
    expect(spawnAt - cueAt).toBeLessThan(300)
    c.destroy()
  })

  it('no two orbs on the screen ever overlap at the parent\'s sizes: a whole flight with mistakes and new sounds, and a boss', async () => {
    setVoicePlayer(() => new Promise((r) => setTimeout(r, 600)))
    const sizes = [[780, 360], [740, 360], [915, 412], [1024, 768], [1280, 800]].map(([w, h]) => flightPath({ w, h }))
    for (const force of [{ screen: 'broom', stage: 2, kind: 'syllable' }, { screen: 'broom', stage: 2, kind: 'syllable', boss: 'mimic' }] as Force[]) {
      const c = make({ force })
      c.start()
      await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
      let checked = 0
      let waves = 0
      for (let i = 0; i < 1600; i++) {
        const s = c.view.screen
        if (s?.screen !== 'broom' || s.finished || s.boss?.won) break
        const now = c.broomClock()
        const orbs = s.waves.flatMap((w) => w.choices.map((_, j) => ({ w: w.id, lane: w.lanes?.[j] ?? j, jitter: w.jitter[j], k: wavePos(w.startMs + w.offsets[j] * s.travelMs, now, s.travelMs) })).filter((_, j) => !w.resolved[j]))
        waves = Math.max(waves, ...s.waves.map((w) => w.id))
        for (const o of orbs) expect(Math.abs(o.jitter)).toBeLessThanOrEqual(ORB_JITTER)
        for (const p of sizes) {
          const xs = orbs.map((o) => ({ ...o, x: orbX(o.k, p) })).filter((o) => o.x - BROOM_ORB / 2 < p.view.left + p.view.width && o.x + BROOM_ORB / 2 > p.view.left)
          for (let a = 0; a < xs.length; a++) for (let b = a + 1; b < xs.length; b++) {
            const A = xs[a], B = xs[b]
            const dist = Math.hypot(A.x - B.x, LANE_Y[A.lane] + A.jitter - LANE_Y[B.lane] - B.jitter)
            expect(dist, `waves ${A.w}/${B.w} lanes ${A.lane}/${B.lane}`).toBeGreaterThanOrEqual(BROOM_ORB)
            checked++
          }
        }
        // a mix: mostly catches (new sounds come every few), some mistakes (spent waves)
        if (c.view.phase === 'answer') steer(c, i % 7 !== 3)
        await tick(50)
      }
      expect(checked).toBeGreaterThan(100)
      expect(waves).toBeGreaterThan(4)
      c.destroy()
    }
  }, 60_000)

  it('the flight ends only when every orb has arrived (the parent: "let me finish")', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    let prev: BroomView | null = null
    let prevClock = 0
    let ended = false
    for (let i = 0; i < 20000 && !ended; i++) {
      const s = c.view.screen as BroomView
      // the gallery starts the flight again: the moment the old flight ended
      if (prev && c.view.phase === 'question') {
        ended = true
        for (const w of prev.waves) w.choices.forEach((_, k) => {
          if (!w.resolved[k]) expect(wavePos(w.startMs + w.offsets[k] * prev!.travelMs, prevClock + 50, prev!.travelMs), 'an orb was still on its way').toBeLessThanOrEqual(CATCH_AT + 0.01)
        })
        break
      }
      if (c.view.phase === 'answer') { prev = s; prevClock = c.broomClock(); steer(c, true) }
      await tick(50)
    }
    expect(ended).toBe(true)
    c.destroy()
  })

  it('ghosts with letters ask for the letter when he waits', async () => {
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'letter' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    await tick(9000)
    expect(played.some((id) => id.startsWith('q-ghosts-letter-'))).toBe(true)
    c.destroy()
  })

  it('the dotted-letter introduction says "without a dot" before the soft sound and "with a dot" before the hard one', async () => {
    useDuel2Store.setState({ dotIntrosSeen: [] })
    const c = make({ force: { screen: 'dot', stage: 3, fixed: 'dot' } })
    c.start()
    await until(c, (v) => v.overlay?.kind === 'dot')
    const o = c.view.overlay as Extract<View['overlay'], { kind: 'dot' }>
    const ids = o.parts.map((p) => p.id)
    expect(ids[0]).toMatch(/^dot-without-/)
    expect(ids[1]).toMatch(/^syl-/)
    expect(ids[2]).toMatch(/^dot-with-/)
    expect(ids[3]).toMatch(/^syl-/)
    c.destroy()
  })

  it('a careful player catches every target: the flight is always winnable', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    let mistakes = 0
    let hearts = 3
    for (let i = 0; i < 1500; i++) {
      const s = c.view.screen as BroomView
      // the flight no longer stops at a mistake: count the hearts he loses
      if (c.view.hearts < hearts) mistakes++
      hearts = c.view.hearts
      if (c.view.needNext || c.view.fixing) proceed(c)
      if (c.view.phase === 'answer' && s?.waves?.length) {
        // he stays with the oldest wave until all of it has passed, then goes to the next target's lane
        const head = s.waves.find((w) => w.resolved.some((r) => !r))
        const k = head ? head.choices.findIndex((x, j) => x.soundId === s.target.soundId && !head.resolved[j]) : -1
        if (k >= 0) c.gesture({ type: 'lane', lane: k as 0 | 1 | 2 })
      }
      await tick(50)
    }
    expect(mistakes).toBe(0)
    c.destroy()
  })

  it('a quick player hears no instruction, round after round (only the sounds)', async () => {
    for (const force of [{ screen: 'ladder', stage: 2, fixed: 'letter' }, { screen: 'cauldron', stage: 2 }, { screen: 'ghosts', stage: 2, kind: 'letter' }, { screen: 'doors', stage: 4 }] as const) {
      played = []
      const c = make({ force })
      c.start()
      for (let r = 0; r < 3; r++) {
        await until(c, (v) => v.phase === 'answer' && !v.needNext)
        await tick(1500)
        c.gesture({ type: 'pick', id: rightId(c.view) })
        await until(c, (v) => v.phase !== 'answer')
      }
      expect(played.filter((id) => id.startsWith('q-')), force.screen).toEqual([])
      c.destroy()
    }
  })

  it('the points of the run go up with each right answer', async () => {
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    expect(c.view.score).toBe(0)
    c.gesture({ type: 'pick', id: rightId(c.view) })
    await until(c, (v) => v.phase === 'feedback')
    expect(c.view.score).toBe(1)
    c.destroy()
  })

  it('ghosts and cauldron never ask for the same sound two rounds in a row', async () => {
    // a weak "da" in the tallies used to win round after round
    useDuel2Store.setState({ tallies: { 's:dalet-a': { seen: 10, wrong: 3 }, 'l:dalet': { seen: 10, wrong: 3 } } })
    for (const force of [{ screen: 'ghosts', stage: 2, kind: 'syllable' }, { screen: 'cauldron', stage: 2 }] as const)
    for (const seed of [3, 5, 7, 11]) {
      const c = make({ force, rng: seeded(seed) })
      c.start()
      const sounds: string[] = []
      for (let r = 0; r < 12; r++) {
        await until(c, (v) => v.phase === 'answer' && !v.needNext)
        sounds.push((c.view.screen as { target: { soundId: string } }).target.soundId)
        c.gesture({ type: 'pick', id: rightId(c.view) })
        await until(c, (v) => v.phase !== 'answer')
      }
      for (let k = 1; k < sounds.length; k++) expect(sounds[k], `${force.screen}: ${sounds}`).not.toBe(sounds[k - 1])
      c.destroy()
    }
  })

  it('one wave costs at most one heart (a hit there and then its target flying past is one mistake)', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    const first = (c.view.screen as BroomView).waves[0].id
    // sit in a wrong lane of the first wave until it has gone by
    for (let i = 0; i < 400 && (c.view.screen as BroomView).waves.some((w) => w.id === first); i++) {
      const s = c.view.screen as BroomView
      const w = s.waves.find((x) => x.id === first)!
      const wrong = w.choices.findIndex((x) => x.soundId !== s.target.soundId && x.nearMissOf !== s.target.id)
      c.gesture({ type: 'lane', lane: wrong as 0 | 1 | 2 })
      await tick(50)
    }
    expect(c.view.hearts).toBe(2)
    c.destroy()
  })

  it('once he caught a wave\'s target, the rest of that wave flies past harmlessly (no heart, no mistake)', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' }, rng: seeded(7) })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    let tested = 0
    for (let i = 0; i < 6000 && tested < 3 && !c.view.over; i++) {
      const s = c.view.screen as BroomView
      if (s?.screen === 'broom' && c.view.phase === 'answer') {
        // a wave whose target he caught (resolved, not passed) while a wrong orb of it is still on its way
        const caught = s.waves.find((w) => w.choices.some((x, j) => x.soundId === s.target.soundId && w.resolved[j]) && w.choices.some((x, j) => x.soundId !== s.target.soundId && !w.resolved[j]))
        if (caught) {
          const j = caught.choices.findIndex((x, k) => x.soundId !== s.target.soundId && !caught.resolved[k])
          const hearts = c.view.hearts
          const wrong = useDuel2Store.getState().tallies['sc:broom']?.wrong ?? 0
          // sit in that wrong orb's lane until the wave has gone by
          for (let n = 0; n < 200 && (c.view.screen as BroomView).waves.some((w) => w.id === caught.id); n++) {
            c.gesture({ type: 'lane', lane: (caught.lanes?.[j] ?? j) as 0 | 1 | 2 })
            await tick(50)
          }
          expect(c.view.hearts).toBe(hearts)
          expect(useDuel2Store.getState().tallies['sc:broom']?.wrong ?? 0).toBe(wrong)
          tested++
          continue
        }
        fly(c)
      }
      await tick(50)
    }
    expect(tested).toBeGreaterThan(0)
    c.destroy()
  })

  it('the last door has the crystal behind it, the others a door', async () => {
    const c = make({ force: { screen: 'doors', stage: 4 } })
    c.start()
    const behind: string[] = []
    for (let r = 0; r < 3; r++) {
      await until(c, (v) => v.phase === 'answer' && !v.needNext)
      const s = c.view.screen as Extract<View['screen'], { screen: 'doors' }>
      behind.push(s.behind ? 'crystal' : 'door')
      c.gesture({ type: 'pick', id: rightId(c.view) })
      await until(c, (v) => v.phase !== 'answer')
    }
    expect(behind).toEqual(['door', 'door', 'crystal'])
    c.destroy()
  })

  it('the sound effect of a right answer rings a moment before the voice goes on (the parent: effects got cut)', async () => {
    const times: { id: string; at: number }[] = []
    setVoicePlayer((id) => { times.push({ id, at: Date.now() }); return new Promise((r) => setTimeout(r, 10)) })
    useDuel2Store.setState({ tallies: { 'sc:ghosts': { seen: 20, wrong: 10 } } }) // not a confident answer: the sound plays again
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    await tick(200)
    const picked = Date.now()
    c.gesture({ type: 'pick', id: rightId(c.view) })
    await tick(1500)
    const next = times.find((x) => x.at >= picked)
    expect(next, 'a voice after the answer').toBeDefined()
    expect(next!.at - picked).toBeGreaterThanOrEqual(380)
    c.destroy()
  })

  it('praise is spoken the first two times of each kind; after that only its sound (the parent: he knows it)', async () => {
    useDuel2Store.setState({ praiseHeard: { 'ladder-top': 2 } })
    const c = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' } })
    c.start()
    for (let r = 0; r < 5; r++) {
      await until(c, (v) => v.phase === 'answer' && !v.needNext)
      c.gesture({ type: 'pick', id: rightId(c.view) })
      await until(c, (v) => v.phase !== 'answer')
    }
    await tick(4000)
    expect(played.some((id) => id.startsWith('ladder-top-'))).toBe(false)
    useDuel2Store.setState({ praiseHeard: {} })
    c.destroy()
    played = []
    const c2 = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' } })
    c2.start()
    for (let r = 0; r < 5; r++) {
      await until(c2, (v) => v.phase === 'answer' && !v.needNext)
      c2.gesture({ type: 'pick', id: rightId(c2.view) })
      await until(c2, (v) => v.phase !== 'answer')
    }
    await tick(4000)
    expect(played.some((id) => id.startsWith('ladder-top-'))).toBe(true)
    expect(useDuel2Store.getState().praiseHeard['ladder-top']).toBe(1)
    c2.destroy()
  })

  it('the flight closes with a finale, after any mistake feedback, before the next screen (the parent: no closure)', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    let lastLoss = -1
    let hearts = 3
    let finaleAt = -1
    for (let i = 0; i < 20000; i++) {
      const s = c.view.screen as BroomView
      if (c.view.hearts < hearts) lastLoss = Date.now()
      hearts = c.view.hearts
      if (s.finished && finaleAt < 0) finaleAt = Date.now()
      // the gallery starts the flight again (its question phase can be shorter than one tick)
      if (finaleAt > 0 && (c.view.phase === 'question' || !s.finished)) break
      // a careful player who misses the very last target
      const head = s.waves.find((w) => w.resolved.some((r) => !r))
      const k = head ? head.choices.findIndex((x, j) => x.soundId === s.target.soundId && !head.resolved[j]) : -1
      if (k >= 0) c.gesture({ type: 'lane', lane: k as 0 | 1 | 2 })
      await tick(50)
    }
    expect(finaleAt).toBeGreaterThan(0)
    if (lastLoss > 0) expect(finaleAt - lastLoss).toBeGreaterThanOrEqual(1000)
    c.destroy()
  })

  describe('coins and the streak multiplier', () => {
    /** answers right on a calm screen until `n` right answers are recorded (the gallery starts the screen again) */
    async function rightAnswers(c: RunController, n: number) {
      for (let k = 0; k < n; k++) {
        await until(c, (v) => v.phase === 'answer' && !v.needNext && !v.fixing)
        const before = useDuel2Store.getState().roundNo
        c.gesture({ type: 'pick', id: rightId(c.view) })
        await until(c, () => useDuel2Store.getState().roundNo > before)
      }
    }

    it('each right answer pays coins by the streak: 1 each for the first four, 2 from the fifth, and a star', async () => {
      useDuel2Store.setState({ totalStars: 9 })
      const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'letter' } })
      c.start()
      await until(c, (v) => v.phase === 'answer')
      expect(c.view.mult).toBe(1)
      await rightAnswers(c, 4)
      expect(useDuel2Store.getState().coins).toBe(4)
      expect(c.view.mult).toBe(1)
      await rightAnswers(c, 2)
      expect(useDuel2Store.getState().coins).toBe(1 + 1 + 1 + 1 + 2 + 2)
      expect(useDuel2Store.getState().totalStars).toBe(15)
      await until(c, (v) => v.mult === 2 && played.includes('mult-up-1'))
      expect(played.some((id) => id.startsWith('streak-'))).toBe(false)
      expect(c.view.coinPop).toBe(6)
      c.destroy()
    })

    it('x3 from the tenth right answer, with its own line; the streak praise stays at 15', async () => {
      const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'letter' } })
      c.start()
      await rightAnswers(c, 10)
      await until(c, (v) => v.mult === 3 && played.includes('mult-up-2'))
      expect(useDuel2Store.getState().coins).toBe(4 + 5 * 2 + 3)
      await rightAnswers(c, 5)
      await until(c, () => played.some((id) => id.startsWith('streak-')))
      c.destroy()
    })

    it('a forgiven near miss keeps the multiplier; a lost heart resets it', async () => {
      const c = make({ force: { screen: 'ladder', stage: 3, fixed: 'dot' } })
      c.start()
      await rightAnswers(c, 5)
      await until(c, (v) => v.mult === 2 && v.phase === 'answer' && !v.needNext)
      const s = c.view.screen as Extract<View['screen'], { screen: 'ladder' }>
      const near = s.plates.find((x) => x.nearMissOf === s.target.id)!
      c.gesture({ type: 'pick', id: near.id })
      await until(c, () => played.some((id) => id.startsWith('almost-')))
      expect(c.view.mult).toBe(2)
      expect(c.view.hearts).toBe(3)
      await until(c, (v) => v.phase === 'answer')
      c.gesture({ type: 'pick', id: near.id })
      await until(c, (v) => v.phase === 'mistake')
      expect(c.view.hearts).toBe(2)
      expect(c.view.mult).toBe(1)
      c.destroy()
    })

    it('the multiplier carries to the next screen', async () => {
      useDuel2Store.setState({ stage: { stage: 1, newAnswers: '' }, lastEnded: 'broom', demosSeen: allDemos })
      const c = make()
      c.start()
      ;(c as unknown as { streak: number }).streak = 2
      for (let guard = 0; guard < 2000 && c.view.screen?.screen !== 'broom'; guard++) {
        autoTower(c)
        if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && c.view.screen?.screen === 'ghosts') c.gesture({ type: 'pick', id: rightId(c.view) })
        await tick(50)
      }
      expect(c.view.screen?.screen).toBe('broom')
      expect(c.view.mult).toBe(2)
      const coins = useDuel2Store.getState().coins
      for (let i = 0; i < 4000 && useDuel2Store.getState().coins === coins; i++) { fly(c); await tick(50) }
      expect(useDuel2Store.getState().coins - coins).toBe(2)
      c.destroy()
    })
  })

  describe('the first duel’s tower in the run (spec: one duel, Part 3)', () => {
    beforeEach(() => { towerAuto = false })
    const tv = (c: RunController) => c.view.screen as Extract<View['screen'], { screen: 'tower' }>
    /** stage 4, the last run ended on the doors: this one starts with the tower */
    function atTower(extra: Partial<ReturnType<typeof useDuel2Store.getState>> = {}) {
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'doors', ...extra })
      const c = make()
      c.start()
      return c
    }

    it('the tower comes first in the cycle: its answers move the shared hearts, stars and coins', async () => {
      const c = atTower({ coins: 0, totalStars: 0 })
      await until(c, (v) => v.screen?.screen === 'tower')
      expect(tv(c)).toMatchObject({ wave: 1, waves: 2, boss: false })
      expect(c.view.hintAvailable).toBe(false)
      expect(c.towerAnswer('right', 'kamatz')).toBe('on')
      expect(c.view.score).toBe(1)
      expect(useDuel2Store.getState()).toMatchObject({ totalStars: 1, coins: 1 })
      for (let k = 0; k < 4; k++) c.towerAnswer('right', 'kamatz')
      // the fifth right answer in a row: ×2
      expect(c.view.mult).toBe(2)
      expect(useDuel2Store.getState().coins).toBe(1 + 1 + 1 + 1 + 2)
      expect(c.towerAnswer('wrong', 'segol')).toBe('on')
      expect(c.view.hearts).toBe(2)
      expect(c.view.mult).toBe(1)
      // the tower's adaptive data stays in the first duel's save: Book 2's tallies are not touched
      expect(useDuel2Store.getState().tallies).toEqual({})
      c.destroy()
    })

    it('the tower visit is two waves, then the next screen; the next visit goes on from the wave after', async () => {
      const c = atTower()
      await until(c, (v) => v.screen?.screen === 'tower')
      c.towerDone(2)
      await until(c, (v) => v.screen?.screen === 'broom')
      expect(useDuel2Store.getState()).toMatchObject({ towerWave: 3, towerVisits: 1 })
      c.destroy()
      const d = atTower()
      await until(d, (v) => v.screen?.screen === 'tower')
      expect(tv(d)).toMatchObject({ wave: 3, boss: false })
      d.destroy()
    })

    it('every third tower visit is a boss, at the next multiple of 5; its defeat adds 3 coins; no trophy', async () => {
      const c = atTower({ towerVisits: 2, towerWave: 7, coins: 0, bossesBeaten: [] })
      await until(c, (v) => v.screen?.screen === 'tower')
      expect(tv(c)).toMatchObject({ boss: true, wave: 10 })
      c.towerDone(10)
      await until(c, (v) => v.screen?.screen === 'broom')
      expect(useDuel2Store.getState()).toMatchObject({ coins: 3, towerWave: 11, towerVisits: 3, bossesBeaten: [] })
      c.destroy()
    })

    it('a boss visit that jumps waves owes the skipped waves’ new monsters (introduced when they first appear)', async () => {
      const c = atTower({ towerVisits: 2, towerWave: 3, towerOwed: [] })
      await until(c, (v) => v.screen?.screen === 'tower')
      expect(tv(c)).toMatchObject({ boss: true, wave: 5 })
      expect(useDuel2Store.getState().towerOwed).toEqual(['ghost', 'bat'])
      c.destroy()
      // a boss visit with no jump owes nothing new
      useDuel2Store.setState({ towerOwed: [] })
      const d = atTower({ towerVisits: 2, towerWave: 5 })
      await until(d, (v) => v.screen?.screen === 'tower')
      expect(useDuel2Store.getState().towerOwed).toEqual([])
      d.destroy()
    })

    it('the last heart on the tower ends the run after that answer, with Book 2’s summary', async () => {
      const c = atTower()
      await until(c, (v) => v.screen?.screen === 'tower')
      c.towerAnswer('right', 'kamatz')
      c.towerAnswer('wrong', 'kamatz')
      c.towerAnswer('wrong', 'kamatz')
      expect(c.towerAnswer('wrong', 'kamatz')).toBe('over')
      expect(c.view.hearts).toBe(0)
      // the duel's feedback of that answer is still playing: no defeat yet, and a lock cannot cancel the end
      await tick(2000)
      expect(c.view.defeat).toBeFalsy()
      c.pause()
      expect(c.view.paused).toBe(false)
      const n = played.length
      c.towerDone(1)
      await until(c, (v) => v.over !== null)
      expect(c.view.defeat).toBe(true)
      expect(c.view.over).toMatchObject({ score: 1 })
      // no right answer is said again (the duel said the mark): only the defeat line
      expect(played.slice(n).every((id) => id.startsWith('defeat'))).toBe(true)
      expect(useDuel2Store.getState().lastEnded).toBe('tower')
      c.destroy()
    })

    it('a lock during the tower: Book 2’s pause holds, and resume goes on with the same visit', async () => {
      const c = atTower()
      await until(c, (v) => v.screen?.screen === 'tower')
      const visit = tv(c).visit
      c.towerAnswer('right', 'kamatz')
      c.pause()
      expect(c.view.paused).toBe(true)
      await tick(5000)
      c.resume()
      await until(c, (v) => !v.paused && v.screen?.screen === 'tower')
      expect(tv(c).visit).toBe(visit)
      expect(useDuel2Store.getState().towerVisits).toBe(1)
      c.towerDone(2)
      await until(c, (v) => v.screen?.screen === 'broom')
      expect(useDuel2Store.getState().towerWave).toBe(3)
      c.destroy()
    })

    describe('stage 0: the tower alone', () => {
      beforeEach(() => {
        useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
        useDuel2Store.setState({ bookOpen: false, stage: { stage: 1, newAnswers: '' }, lastEnded: null })
      })
      const mastered = () => Object.fromEntries(DUEL_MARKS.map((m) => [m.id, 'ooooo']))

      it('a new player starts with the tower; Book 2 opens when the tower is mastered, and the next screen is the broom', async () => {
        duel2Telemetry.clear()
        const c = make()
        c.start()
        await until(c, (v) => v.screen?.screen === 'tower')
        c.towerDone(2)
        // not mastered yet: the tower again (a cycle of one screen)
        await until(c, (v) => v.screen?.screen === 'tower' && tv(c).wave === 3)
        expect(useDuel2Store.getState().bookOpen).toBe(false)
        useProgressStore.setState({ duel: { ...useProgressStore.getState().duel, recent: mastered() } })
        c.towerDone(4)
        await until(c, (v) => v.screen?.screen === 'broom', 20_000)
        expect(useDuel2Store.getState().bookOpen).toBe(true)
        const ev = JSON.parse(duel2Telemetry.exportJson()).events as { e: string }[]
        expect(ev.filter((e) => e.e === 'book-open').length).toBe(1)
        expect(sfxLog).toContain('streak')
        c.destroy()
      })

      it('at stage 0 there is no pass heart and no merchant', async () => {
        useDuel2Store.setState({ coins: 50, checkpointsSinceVisit: NEVER_VISITED })
        const c = make()
        c.start()
        await until(c, (v) => v.screen?.screen === 'tower')
        c.towerAnswer('wrong', 'kamatz')
        c.towerAnswer('wrong', 'kamatz')
        expect(c.view.hearts).toBe(1)
        for (let k = 0; k < 4; k++) {
          const w = tv(c).wave
          c.towerDone(w + 1)
          await until(c, (v) => v.screen?.screen === 'tower' && tv(c).wave === w + 2)
          expect(c.view.merchant).toBeUndefined()
        }
        expect(c.view.hearts).toBe(1)
        expect(c.view.passHeart ?? 0).toBe(0)
        expect(c.view.heal).toBeUndefined()
        expect(useDuel2Store.getState().checkpointsSinceVisit).toBe(NEVER_VISITED)
        c.destroy()
      })

      it('a Book 2 player who never played the first duel: the tower first, nothing closes, nothing imported', async () => {
        useDuel2Store.setState({ bookOpen: true, stage: { stage: 3, newAnswers: '' }, lastEnded: 'ghosts', totalStars: 120, firstDuelImported: false })
        useDuel2Store.getState().importFirstDuel(useProgressStore.getState().duel)
        expect(useDuel2Store.getState()).toMatchObject({ totalStars: 120, bookOpen: true })
        const c = make()
        c.start()
        await until(c, (v) => v.screen?.screen === 'tower')
        c.towerDone(2)
        await until(c, (v) => v.screen?.screen === 'broom')
        expect(useDuel2Store.getState().bookOpen).toBe(true)
        c.destroy()
      })
    })

    it('the merchant comes before a tower boss when the hearts are low', async () => {
      useDuel2Store.setState({ merchant: { ...FRESH_MERCHANT, demoSeen: true, undoShown: true }, checkpointsSinceVisit: 0 })
      const c = atTower({ lastEnded: 'ghosts', towerVisits: 2, coins: 50 })
      ;(c as unknown as { hearts: { left: number; nearMissUsed: boolean } }).hearts = { left: 2, nearMissUsed: false }
      // the doors first, then the crystal; the checkpoint before the tower's boss has him
      for (let guard = 0; guard < 4000 && !c.view.merchant && c.view.screen?.screen !== 'tower'; guard++) {
        if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && c.view.screen?.screen === 'doors') c.gesture({ type: 'pick', id: rightId(c.view) })
        await tick(50)
      }
      expect(c.view.merchant).toBeDefined()
      c.destroy()
    }, 60_000)
  })

  describe('shorter visits and skips for mastered minigames (spec: one duel, Part 3)', () => {
    const O8 = 'o'.repeat(8)
    const O12 = 'o'.repeat(12)
    const sid = (c: RunController) => (c as unknown as { screenId: string }).screenId
    /** right answers on the calm screens; counts each screen's rounds (one per right pick) */
    async function playCounting(c: RunController, until_: (v: View) => boolean, counts: Record<string, number> = {}) {
      for (let guard = 0; guard < 8000 && !until_(c.view); guard++) {
        const s = c.view.screen
        autoTower(c)
        if (c.view.merchant) c.gesture({ type: 'decline' })
        else if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && s && !['crystal', 'broom', 'draw', 'tower'].includes(s.screen)) {
          counts[s.screen] = (counts[s.screen] ?? 0) + 1
          c.gesture({ type: 'pick', id: rightId(c.view) })
        }
        fly(c)
        await tick(50)
      }
      expect(until_(c.view)).toBe(true)
      return counts
    }

    it('a screen with no recent mistakes gets about half a visit', async () => {
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'ladder', recent: { 'sc:ghosts': O8 } })
      const c = make()
      c.start()
      const n = await playCounting(c, (v) => v.screen?.screen === 'doors')
      expect(n.ghosts).toBe(2)
      c.destroy()
    }, 60_000)

    it('a long-mastered screen is skipped every other cycle, never removed', async () => {
      for (const [cycleNo, seen] of [[1, false], [2, true]] as const) {
        useDuel2Store.getState().resetProgress()
        useDuel2Store.setState({ bookOpen: true, settings: { ...DEFAULT_SETTINGS, drawing: false }, demosSeen: allDemos, dotIntrosSeen: ALL_DOTS, stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron', recent: { 'sc:ghosts': O12 }, cycleNo })
        const c = make()
        c.start()
        const n = await playCounting(c, (v) => v.screen?.screen === 'doors')
        expect(!!n.ghosts).toBe(seen)
        // a visit after the skip is still a short one (no recent mistakes)
        if (seen) expect(n.ghosts).toBe(2)
        c.destroy()
      }
    }, 60_000)

    it('a skipped screen has no checkpoint: the merchant comes at the next real one', async () => {
      duel2Telemetry.clear()
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron', recent: { 'sc:ghosts': O12 }, cycleNo: 1, coins: 50,
        merchant: { ...FRESH_MERCHANT, demoSeen: true, undoShown: true } })
      const c = make()
      c.start()
      ;(c as unknown as { hearts: { left: number; nearMissUsed: boolean } }).hearts = { left: 1, nearMissUsed: false }
      await playCounting(c, (v) => v.screen?.screen === 'ladder')
      // the ladder ends: one checkpoint, and the screen after it is the doors (the ghosts are skipped this cycle)
      const before = useDuel2Store.getState().merchant.visits
      for (let guard = 0; guard < 4000 && !c.view.merchant; guard++) {
        if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && c.view.screen?.screen === 'ladder') c.gesture({ type: 'pick', id: rightId(c.view) })
        await tick(50)
      }
      expect(c.view.merchant).toBeDefined()
      expect(sid(c)).toBe('doors')
      expect(useDuel2Store.getState().merchant.visits).toBe(before + 1)
      const ev = JSON.parse(duel2Telemetry.exportJson()).events as { e: string; screen?: string }[]
      expect(ev.filter((e) => e.e === 'skip').map((e) => e.screen)).toEqual(['ghosts'])
      c.destroy()
    }, 60_000)

    it('a short ladder has as many rungs as its visit; short doors put the crystal behind the last of them', async () => {
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron', recent: { 'sc:ladder': O8, 'sc:doors': O8 } })
      const c = make()
      c.start()
      await until(c, (v) => v.screen?.screen === 'ladder')
      expect((c.view.screen as { rungs: number }).rungs).toBe(3)
      const n = await playCounting(c, (v) => v.screen?.screen === 'doors' && v.phase === 'answer')
      expect(n.ladder).toBe(3)
      expect((c.view.screen as { behind?: unknown }).behind).toBeUndefined()
      c.gesture({ type: 'pick', id: rightId(c.view) })
      await until(c, (v) => v.screen?.screen === 'doors' && v.phase === 'answer' && !!(v.screen as { behind?: unknown }).behind)
      c.gesture({ type: 'pick', id: rightId(c.view) })
      await until(c, (v) => v.screen?.screen === 'crystal')
      c.destroy()
    }, 60_000)

    it('when the doors are skipped the crystal still comes at the end of the cycle', async () => {
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'ladder', recent: { 'sc:doors': O12 }, cycleNo: 1, crystals: 0 })
      const c = make()
      c.start()
      const order: string[] = []
      await playCounting(c, (v) => {
        const k = v.screen?.screen
        if (k && order[order.length - 1] !== k) order.push(k)
        return k === 'tower'
      })
      expect(order).toEqual(['ghosts', 'crystal', 'tower'])
      expect(useDuel2Store.getState().crystals).toBe(1)
      c.destroy()
    }, 60_000)

    it('closing the game before the cycle ends still gives the crystal of the skipped doors, once', async () => {
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'ladder', recent: { 'sc:doors': O12 }, cycleNo: 1, crystals: 0,
        settings: { ...DEFAULT_SETTINGS, drawing: true } })
      const c = make()
      c.start()
      await playCounting(c, (v) => v.screen?.screen === 'draw')
      expect(useDuel2Store.getState().crystals).toBe(0)
      c.destroy()
      c.destroy()
      expect(useDuel2Store.getState().crystals).toBe(1)
    }, 60_000)

    it('a run that ends before the cycle’s end gives the owed crystal at its end, once', async () => {
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron', crystals: 0 })
      const c = make()
      c.start()
      await until(c, (v) => v.screen?.screen === 'ladder' && v.phase === 'answer')
      const priv = c as unknown as { hearts: { left: number; nearMissUsed: boolean }; crystalOwed: boolean }
      priv.hearts = { left: 1, nearMissUsed: true }
      priv.crystalOwed = true
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => v.over !== null)
      expect(c.view.over).toMatchObject({ crystals: 1 })
      c.destroy()
      expect(useDuel2Store.getState().crystals).toBe(1)
    }, 60_000)

    it('the tower is never skipped, and a one-screen cycle is never skipped; a mastered tower gets one wave', async () => {
      useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
      const recent = Object.fromEntries(DUEL_MARKS.map((m) => [m.id, O12]))
      useProgressStore.setState({ duel: { ...useProgressStore.getState().duel, recent: { ...recent, kamatz: 'oo' } } })
      // stage 0 (the tower is not mastered yet: one mark has fewer than 3 recent answers)
      useDuel2Store.setState({ bookOpen: false, stage: { stage: 1, newAnswers: '' }, lastEnded: null, cycleNo: 1 })
      towerAuto = false
      const c = make()
      c.start()
      await until(c, (v) => v.screen?.screen === 'tower')
      c.towerDone(2)
      await until(c, (v) => v.screen?.screen === 'tower' && (v.screen as { wave: number }).wave === 3)
      c.destroy()
      // every recent tower answer right: a shorter visit (one wave), still never skipped
      useProgressStore.setState({ duel: { ...useProgressStore.getState().duel, recent: Object.fromEntries(DUEL_MARKS.map((m) => [m.id, O12])) } })
      useDuel2Store.setState({ bookOpen: true, lastEnded: 'ghosts', cycleNo: 1 })
      const d = make()
      d.start()
      await until(d, (v) => v.screen?.screen === 'tower')
      expect((d.view.screen as { waves: number }).waves).toBe(1)
      d.destroy()
    }, 60_000)
  })

  it('a two-orb dot wave flies in two of the three lanes and is caught in its own lane (spec: two-orb dot waves)', async () => {
    const c = make({ force: { screen: 'broom', stage: 3, kind: 'syllable' }, rng: seeded(11) })
    useDuel2Store.setState({ stage: { stage: 3, newAnswers: '' } })
    c.start()
    const seen = new Set<number>()
    let done = 0
    let hearts = 3
    let lost = 0
    for (let i = 0; i < 8000 && done < 2; i++) {
      const s = c.view.screen as BroomView
      if (c.view.hearts < hearts) lost++
      hearts = c.view.hearts
      const ids = new Set((s?.waves ?? []).map((w) => w.id))
      for (const id of seen) if (!ids.has(id)) { seen.delete(id); done++ }
      for (const w of s?.waves ?? []) if (w.choices.length === 2) {
        expect(w.lanes && new Set(w.lanes).size).toBe(2)
        seen.add(w.id)
      }
      fly(c)
      await tick(50)
    }
    expect(done).toBeGreaterThanOrEqual(2)
    expect(lost).toBe(0)
    c.destroy()
  })

  describe('the merchant (spec: one duel, Part 2)', () => {
    const events = () => (JSON.parse(duel2Telemetry.exportJson()).events as { e: string; [k: string]: unknown }[])
    const mv = (c: RunController) => c.view.merchant!
    const coins = () => useDuel2Store.getState().coins
    beforeEach(() => {
      duel2Telemetry.clear()
      useDuel2Store.setState({ merchant: { ...FRESH_MERCHANT, demoSeen: true, undoShown: true } })
    })
    /** plays on (right answers, a careful flight, fixes) until `pred`; the merchant is declined unless `pred` waits for him */
    async function playTo(c: RunController, pred: (v: View) => boolean) {
      for (let guard = 0; guard < 8000 && !pred(c.view); guard++) {
        const s = c.view.screen
        autoTower(c)
        if (c.view.merchant) c.gesture({ type: 'decline' })
        else if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && s && !['crystal', 'broom', 'draw', 'tower'].includes(s.screen)) c.gesture({ type: 'pick', id: rightId(c.view) })
        fly(c)
        await tick(50)
      }
      expect(pred(c.view)).toBe(true)
    }
    async function loseHeart(c: RunController) {
      await playTo(c, (v) => v.phase === 'answer' && !v.merchant && !!v.screen && !['crystal', 'broom', 'tower'].includes(v.screen.screen))
      const before = c.view.hearts
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => !!v.fixing || v.over !== null || !!v.defeat)
      await drain(c)
      expect(c.view.hearts).toBe(before - 1)
    }
    /** stage 4, the run starts on the cauldron with `money` coins; he loses `lose` hearts there, then the merchant may come */
    async function cauldronThen(lose: number, money = 20) {
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'broom', coins: money })
      const c = make()
      c.start()
      for (let k = 0; k < lose; k++) await loseHeart(c)
      return c
    }
    const arrived = (v: View) => v.merchant?.phase === 'pay'
    /** on to the merchant's next visit, until it is his turn to pay */
    async function toMerchant(c: RunController) {
      await playTo(c, (v) => !!v.merchant)
      await until(c, arrived)
    }
    function give(c: RunController, values: number[]) { for (const value of values) c.gesture({ type: 'coin', value }) }

    it('with one heart and enough coins the merchant comes at the next checkpoint; paying the exact price buys a heart', async () => {
      const c = await cauldronThen(2)
      expect(c.view.hearts).toBe(1)
      await playTo(c, (v) => !!v.merchant)
      expect(c.view.screen?.screen).toBe('cauldron')
      expect(mv(c).phase).toBe('arrive')
      expect(mv(c).price).toBe(6)
      await until(c, arrived)
      expect(played.some((id) => id.startsWith('m-hello-'))).toBe(true)
      const before = coins()
      expect(mv(c).coins.reduce((a, b) => a + b, 0)).toBe(before)
      give(c, hintCoins(mv(c).coins, 6))
      // no total while he chooses
      expect(mv(c).counted).toBeUndefined()
      c.gesture({ type: 'potion' })
      await until(c, (v) => v.merchant?.phase === 'count')
      await until(c, (v) => v.merchant?.verdict === 'exact')
      await until(c, (v) => !v.merchant)
      expect(c.view.hearts).toBe(2)
      expect(coins()).toBe(before - 6)
      expect(c.view.heal).toBeDefined()
      expect(played.some((id) => id.startsWith('m-exact-'))).toBe(true)
      expect(useDuel2Store.getState().merchant.purchases).toBe(1)
      expect(useDuel2Store.getState().checkpointsSinceVisit).toBe(0)
      await until(c, (v) => v.screen?.screen === 'ladder')
      const ev = events()
      expect(ev.find((e) => e.e === 'merchant-arrive')).toMatchObject({ price: 6, hearts: 1 })
      expect(ev.find((e) => e.e === 'merchant-offer')).toMatchObject({ verdict: 'exact', price: 6, sum: 6 })
      expect(ev.find((e) => e.e === 'merchant-buy')).toMatchObject({ price: 6 })
      c.destroy()
    }, 60_000)

    it('not enough and too much leave the coins in his hand and cost nothing', async () => {
      const c = await cauldronThen(2)
      await toMerchant(c)
      const before = coins()
      const small = Math.min(...mv(c).coins)
      give(c, [small])
      c.gesture({ type: 'potion' })
      await until(c, (v) => v.merchant?.verdict === 'short')
      await until(c, arrived)
      expect(mv(c).given).toEqual([small])
      expect(played.some((id) => id.startsWith('m-short-'))).toBe(true)
      // then everything he has: too much
      const rest = [...mv(c).coins]
      rest.splice(rest.indexOf(small), 1)
      give(c, rest)
      c.gesture({ type: 'potion' })
      await until(c, (v) => v.merchant?.verdict === 'over')
      await until(c, arrived)
      expect(mv(c).given.length).toBe(mv(c).coins.length)
      expect(coins()).toBe(before)
      expect(c.view.hearts).toBe(1)
      expect(useDuel2Store.getState().merchant).toMatchObject({ short: 1, over: 1 })
      c.destroy()
    }, 60_000)

    it('a tap on the merchant’s hand sends back the last coin given', async () => {
      const c = await cauldronThen(2)
      await toMerchant(c)
      const [a, b] = mv(c).coins
      give(c, [a, b])
      expect(mv(c).given).toEqual([a, b])
      c.gesture({ type: 'hand' })
      expect(mv(c).given).toEqual([a])
      expect(events().some((e) => e.e === 'merchant-undo')).toBe(true)
      c.destroy()
    }, 60_000)

    it('a coin he no longer has cannot be given', async () => {
      const c = await cauldronThen(2)
      await toMerchant(c)
      const v = mv(c).coins[0]
      const n = mv(c).coins.filter((x) => x === v).length
      give(c, Array(n + 2).fill(v))
      expect(mv(c).given.length).toBe(n)
      c.destroy()
    }, 60_000)

    it('the potion with an empty hand makes the hand glow', async () => {
      const c = await cauldronThen(2)
      await toMerchant(c)
      c.gesture({ type: 'potion' })
      await until(c, (v) => !!v.merchant?.glow?.hand)
      await until(c, () => played.some((id) => id.startsWith('m-empty-')))
      c.destroy()
    }, 60_000)

    it('the potion with an empty hand says its line at most once per 4 seconds; the hand glows every time', async () => {
      const c = await cauldronThen(2)
      await toMerchant(c)
      const said = () => played.filter((id) => id.startsWith('m-empty-')).length
      /** a coin in and back out: his hand is empty again and its glow is gone */
      const clearGlow = async () => { give(c, [mv(c).coins[0]]); c.gesture({ type: 'hand' }); await tick(20); expect(mv(c).glow?.hand).toBeFalsy() }
      c.gesture({ type: 'potion' })
      await until(c, () => said() === 1)
      for (let i = 0; i < 5; i++) {
        await clearGlow()
        c.gesture({ type: 'potion' })
        await until(c, (v) => !!v.merchant?.glow?.hand)
        await tick(300)
      }
      expect(said()).toBe(1)
      await tick(4000)
      await clearGlow()
      c.gesture({ type: 'potion' })
      await until(c, (v) => !!v.merchant?.glow?.hand)
      await until(c, () => said() === 2)
      c.destroy()
    }, 60_000)

    it('the ✗ declines at any moment: his coins go back, the run goes on, the visit counts', async () => {
      setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, id.startsWith('m-hello') ? 3000 : 10)) })
      const c = await cauldronThen(2)
      await playTo(c, (v) => v.merchant?.phase === 'arrive')
      // even while he says his opening line
      await until(c, () => played.some((id) => id.startsWith('m-hello-')))
      expect(mv(c).phase).toBe('arrive')
      c.gesture({ type: 'decline' })
      await until(c, (v) => v.merchant?.phase === 'leave')
      expect(mv(c).given).toEqual([])
      await until(c, () => played.some((id) => id.startsWith('m-bye-')))
      await until(c, (v) => v.screen?.screen === 'ladder' && !v.merchant)
      expect(c.view.hearts).toBe(1)
      expect(useDuel2Store.getState().merchant.declines).toBe(1)
      expect(useDuel2Store.getState().checkpointsSinceVisit).toBe(0)
      expect(events().find((e) => e.e === 'merchant-decline')).toMatchObject({ phase: 'arrive' })
      c.destroy()
    }, 60_000)

    it('with coins in his hand the ✗ gives them back', async () => {
      const c = await cauldronThen(2)
      await toMerchant(c)
      const before = coins()
      give(c, [mv(c).coins[0]])
      c.gesture({ type: 'decline' })
      await until(c, (v) => v.merchant?.phase === 'leave')
      expect(mv(c).given).toEqual([])
      await until(c, (v) => !v.merchant)
      expect(coins()).toBe(before)
      c.destroy()
    }, 60_000)

    it('with 2 hearts he comes every other checkpoint: one checkpoint without him since his last visit is enough', async () => {
      // his last visit was one checkpoint ago (that checkpoint passed without him): this one is his
      useDuel2Store.setState({ checkpointsSinceVisit: 1 })
      const c = await cauldronThen(1)
      expect(c.view.hearts).toBe(2)
      await playTo(c, (v) => !!v.merchant || v.screen?.screen === 'ladder')
      expect(c.view.merchant).toBeDefined()
      c.destroy()
    }, 60_000)

    it('with 2 hearts he does not come at the checkpoint right after his visit', async () => {
      useDuel2Store.setState({ checkpointsSinceVisit: 0 })
      const c = await cauldronThen(1)
      let came = false
      for (let i = 0; i < 4000 && c.view.screen?.screen !== 'ladder'; i++) {
        if (c.view.merchant) came = true
        if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && c.view.screen?.screen === 'cauldron') c.gesture({ type: 'pick', id: rightId(c.view) })
        await tick(50)
      }
      expect(came).toBe(false)
      expect(useDuel2Store.getState().checkpointsSinceVisit).toBe(1)
      c.destroy()
    }, 60_000)

    it('a wrong try in an earlier visit does not count toward the wand glow in the next one', async () => {
      const c = await cauldronThen(2)
      await toMerchant(c)
      const small = Math.min(...mv(c).coins)
      give(c, [small])
      c.gesture({ type: 'potion' })
      await until(c, (v) => v.merchant?.verdict === 'short')
      await until(c, arrived)
      expect(c.view.hintGlow).toBeFalsy()
      c.gesture({ type: 'decline' })
      await until(c, (v) => !v.merchant)
      // on his last heart he comes again at the next checkpoint
      await toMerchant(c)
      give(c, [Math.min(...mv(c).coins)])
      c.gesture({ type: 'potion' })
      await until(c, (v) => v.merchant?.verdict === 'short')
      await until(c, arrived)
      expect(c.view.hintGlow).toBeFalsy()
      c.destroy()
    }, 60_000)

    it('the ✗ works while the hand shows the undo (it is on the screen then)', async () => {
      setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, id.startsWith('m-') ? 400 : 10)) })
      useDuel2Store.setState({ merchant: { ...FRESH_MERCHANT, demoSeen: true } })
      const c = await cauldronThen(2)
      await toMerchant(c)
      give(c, [...mv(c).coins])
      c.gesture({ type: 'potion' })
      await until(c, (v) => v.merchant?.demo?.step === 'undo')
      c.gesture({ type: 'decline' })
      await until(c, (v) => v.merchant?.phase === 'leave')
      expect(mv(c).given).toEqual([])
      c.destroy()
    }, 60_000)

    it('after a lock, the ✗ still lets him say goodbye in full before the run goes on', async () => {
      setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, id.startsWith('m-bye') ? 3000 : 10)) })
      const c = await cauldronThen(2)
      await toMerchant(c)
      c.pause()
      c.resume()
      await until(c, arrived)
      c.gesture({ type: 'decline' })
      await until(c, () => played.some((id) => id.startsWith('m-bye-')))
      // the goodbye takes 3 s: the merchant is still there after 2 s (the visit that the lock interrupted is over)
      await tick(2000)
      expect(c.view.merchant?.phase).toBe('leave')
      expect(played.filter((id) => id.startsWith('m-bye-')).length).toBe(1)
      await until(c, (v) => !v.merchant && v.screen?.screen === 'ladder')
      c.destroy()
    }, 60_000)

    it('with too few coins he never comes', async () => {
      const c = await cauldronThen(2, 0)
      // two right answers on the cauldron: 2 coins, less than the price
      let came = false
      for (let i = 0; i < 4000 && c.view.screen?.screen !== 'ladder'; i++) {
        if (c.view.merchant) came = true
        if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && c.view.screen?.screen === 'cauldron') c.gesture({ type: 'pick', id: rightId(c.view) })
        await tick(50)
      }
      expect(came).toBe(false)
      expect(useDuel2Store.getState().checkpointsSinceVisit).toBe(NEVER_VISITED)
      c.destroy()
    }, 60_000)

    it('with 3 hearts after the pass heart he does not come', async () => {
      // the run starts at the broom; he loses one heart on the doors, the last screen; after the crystal the pass heart
      // refills him to 3 at the same checkpoint, so the merchant does not come there
      useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'doors', coins: 100 })
      const c = make()
      c.start()
      await playTo(c, (v) => v.screen?.screen === 'doors' && v.phase === 'answer')
      await loseHeart(c)
      let came = false
      for (let i = 0; i < 4000 && c.view.screen?.screen !== 'broom'; i++) {
        if (c.view.merchant) came = true
        if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && c.view.screen?.screen === 'doors') c.gesture({ type: 'pick', id: rightId(c.view) })
        await tick(50)
      }
      expect(c.view.hearts).toBe(3)
      expect(c.view.passHeart).toBe(1)
      expect(came).toBe(false)
      c.destroy()
    }, 60_000)

    it('a lock during a visit keeps the coins in his hand and the piles; nothing is spent twice', async () => {
      const c = await cauldronThen(2)
      await toMerchant(c)
      const before = coins()
      const comp = [...mv(c).coins]
      const pay = hintCoins(comp, 6)
      give(c, pay.slice(0, 1))
      c.pause()
      c.resume()
      await until(c, arrived)
      expect(mv(c).given).toEqual(pay.slice(0, 1))
      expect(mv(c).coins).toEqual(comp)
      give(c, pay.slice(1))
      c.gesture({ type: 'potion' })
      // a lock while he counts: back to paying, the same coins in his hand
      await until(c, (v) => (v.merchant?.counted ?? 0) >= 1)
      c.pause()
      c.resume()
      await until(c, arrived)
      expect(mv(c).given).toEqual(pay)
      expect(coins()).toBe(before)
      c.gesture({ type: 'potion' })
      await until(c, (v) => v.merchant?.phase === 'sold')
      // a lock right after the purchase does not buy again
      c.pause()
      c.resume()
      await until(c, (v) => !v.merchant)
      expect(coins()).toBe(before - 6)
      expect(c.view.hearts).toBe(2)
      expect(events().filter((e) => e.e === 'merchant-buy').length).toBe(1)
      c.destroy()
    }, 60_000)

    it('the price grows with each purchase in a run and starts at 6 in the next run; coins spent stay spent', async () => {
      const c = await cauldronThen(2, 60)
      await toMerchant(c)
      expect(mv(c).price).toBe(6)
      give(c, hintCoins(mv(c).coins, 6))
      c.gesture({ type: 'potion' })
      await until(c, (v) => !v.merchant)
      expect(c.view.hearts).toBe(2)
      // a heart lost on the ladder: on his last heart he comes again, at a higher price
      await loseHeart(c)
      await toMerchant(c)
      expect(mv(c).price).toBe(9)
      give(c, hintCoins(mv(c).coins, 9))
      c.gesture({ type: 'potion' })
      await until(c, (v) => !v.merchant)
      const spent = coins()
      // he loses the run (two hearts left): the coins stay spent
      expect(c.view.hearts).toBe(2)
      await loseHeart(c)
      await playTo(c, (v) => v.phase === 'answer' && !v.merchant && !!v.screen && !['crystal', 'broom', 'tower'].includes(v.screen.screen))
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => v.over !== null)
      expect(coins()).toBeGreaterThanOrEqual(spent)
      expect(useDuel2Store.getState().merchant.purchases).toBe(2)
      c.destroy()
      // the next run: 6 again
      const c2 = make()
      c2.start()
      await loseHeart(c2)
      await loseHeart(c2)
      await playTo(c2, (v) => !!v.merchant)
      expect(mv(c2).price).toBe(6)
      c2.destroy()
    }, 60_000)

    it('the gallery’s merchant: 1 heart and 40 coins, his demo, a purchase that writes nothing; then the gallery', async () => {
      useDuel2Store.setState({ coins: 7, merchant: { ...FRESH_MERCHANT } })
      const c = make({ force: { screen: 'merchant', stage: 2, demo: true }, sandbox: true })
      c.start()
      await until(c, (v) => !!v.merchant)
      expect(c.view.hearts).toBe(1)
      expect(c.view.coins).toBe(40)
      expect(mv(c).coins.reduce((a, b) => a + b, 0)).toBe(40)
      await until(c, arrived)
      expect(played.some((id) => id.startsWith('m-decline-'))).toBe(true)
      give(c, hintCoins(mv(c).coins, mv(c).price))
      c.gesture({ type: 'potion' })
      await until(c, (v) => v.over !== null)
      expect(c.view.hearts).toBe(2)
      expect(c.view.coins).toBe(34)
      expect(useDuel2Store.getState().coins).toBe(7)
      expect(useDuel2Store.getState().merchant).toEqual(FRESH_MERCHANT)
      c.destroy()
    }, 60_000)

    it('in the gallery the merchant never comes', async () => {
      useDuel2Store.setState({ coins: 100 })
      const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'letter' }, sandbox: true })
      c.start()
      await loseHeart(c)
      await loseHeart(c)
      let came = false
      for (let i = 0; i < 2000 && c.view.hearts < 3; i++) {
        if (c.view.merchant) came = true
        if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer') c.gesture({ type: 'pick', id: rightId(c.view) })
        await tick(50)
      }
      expect(c.view.hearts).toBe(3)
      expect(came).toBe(false)
      c.destroy()
    }, 60_000)

    describe('the first-visit demo, the undo, the hint and the idle line', () => {
      /** the merchant's lines take a moment, so each demo step can be seen */
      const slowMerchant = () => setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, id.startsWith('m-') ? 400 : 10)) })
      it('the first visit shows price, giving, the potion and the ✗, then it is his turn with the same price', async () => {
        slowMerchant()
        useDuel2Store.setState({ merchant: { ...FRESH_MERCHANT } })
        const c = await cauldronThen(2)
        const steps: string[] = []
        let hidden = true
        await playTo(c, (v) => !!v.merchant)
        const price = mv(c).price
        const comp = [...mv(c).coins]
        for (let i = 0; i < 2000 && mv(c).phase !== 'pay'; i++) {
          const d = mv(c).demo
          if (d && steps[steps.length - 1] !== d.step) steps.push(d.step)
          // the ✗ cannot be used before the demo points it out
          if (d && d.step !== 'decline') { c.gesture({ type: 'decline' }); if (mv(c).phase === 'leave') hidden = false }
          await tick(50)
        }
        expect(hidden).toBe(true)
        expect(steps).toEqual(['price', 'give', 'potion', 'decline'])
        const ids = played.filter((id) => id.startsWith('m-'))
        expect(ids.map((id) => id.replace(/-\d+$/, ''))).toEqual(['m-hello', 'm-price', 'm-give', 'm-tap', 'm-decline'])
        expect(mv(c).demo).toBeUndefined()
        expect(mv(c).price).toBe(price)
        expect(mv(c).coins).toEqual(comp)
        expect(useDuel2Store.getState().merchant.demoSeen).toBe(true)
        c.destroy()
      }, 60_000)

      it('a lock during the demo shows it again from the start; it counts as seen only when it ends', async () => {
        slowMerchant()
        useDuel2Store.setState({ merchant: { ...FRESH_MERCHANT } })
        const c = await cauldronThen(2)
        await playTo(c, (v) => !!v.merchant)
        await until(c, (v) => v.merchant?.demo?.step === 'give')
        c.pause()
        expect(useDuel2Store.getState().merchant.demoSeen).toBe(false)
        c.resume()
        await until(c, (v) => v.merchant?.demo?.step === 'price')
        await until(c, arrived)
        expect(useDuel2Store.getState().merchant.demoSeen).toBe(true)
        c.destroy()
      }, 60_000)

      it('the first time he gives too much the hand shows the undo, once', async () => {
        useDuel2Store.setState({ merchant: { ...FRESH_MERCHANT, demoSeen: true } })
        const c = await cauldronThen(2)
        await toMerchant(c)
        const all = [...mv(c).coins]
        give(c, all)
        c.gesture({ type: 'potion' })
        await until(c, (v) => v.merchant?.demo?.step === 'undo')
        await until(c, arrived)
        // the hand took the last coin back
        expect(mv(c).given).toEqual(all.slice(0, -1))
        expect(played.filter((id) => id.startsWith('m-undo-')).length).toBe(1)
        expect(useDuel2Store.getState().merchant.undoShown).toBe(true)
        // a second too-much: no demo
        give(c, [all[all.length - 1]])
        c.gesture({ type: 'potion' })
        await until(c, (v) => v.merchant?.verdict === 'over')
        let demo = false
        for (let i = 0; i < 100 && !arrived(c.view); i++) { if (mv(c).demo) demo = true; await tick(50) }
        expect(demo).toBe(false)
        expect(played.filter((id) => id.startsWith('m-undo-')).length).toBe(1)
        c.destroy()
      }, 60_000)

      it('two wrong tries make the wand glow; it does not open the hint by itself', async () => {
        const c = await cauldronThen(2)
        await toMerchant(c)
        const small = Math.min(...mv(c).coins)
        give(c, [small])
        for (let k = 0; k < 2; k++) {
          c.gesture({ type: 'potion' })
          await until(c, (v) => v.merchant?.verdict === 'short')
          await until(c, arrived)
          // one wrong try is not enough
          if (k === 0) expect(c.view.hintGlow).toBeFalsy()
        }
        expect(c.view.hintGlow).toBe(true)
        expect(c.view.hintAvailable).toBe(true)
        await tick(30_000)
        expect(played.some((id) => id.startsWith('m-hint-'))).toBe(false)
        expect(mv(c).glow?.hint).toBeUndefined()
        c.destroy()
      }, 60_000)

      it('the hint sends his coins back and makes the right top coins glow', async () => {
        const c = await cauldronThen(2)
        await toMerchant(c)
        give(c, [mv(c).coins[0]])
        c.view.hintGlow = true
        c.hint()
        expect(mv(c).given).toEqual([])
        expect(mv(c).glow?.hint).toEqual(hintCoins(mv(c).coins, mv(c).price))
        expect(c.view.hintGlow).toBeFalsy()
        await until(c, () => played.some((id) => id.startsWith('m-hint-')))
        expect(useDuel2Store.getState().merchant.hints).toBe(1)
        expect(events().find((e) => e.e === 'merchant-hint')).toMatchObject({ auto: false })
        // he still gives them himself; each one he gives stops glowing
        const h = mv(c).glow!.hint!
        give(c, [h[0]])
        expect(mv(c).glow?.hint ?? []).toEqual(h.slice(1))
        give(c, h.slice(1))
        c.gesture({ type: 'potion' })
        await until(c, (v) => !v.merchant)
        // a purchase with the hint does not count as a clean one
        expect(useDuel2Store.getState().merchant.cleanRow).toBe(0)
        c.destroy()
      }, 60_000)

      it('a lock after the hint keeps the hint’s coins glowing green (and the wand’s glow)', async () => {
        const c = await cauldronThen(2)
        await toMerchant(c)
        c.hint()
        const h = mv(c).glow!.hint!
        expect(h.length).toBeGreaterThan(0)
        c.pause()
        c.resume()
        await until(c, arrived)
        expect(mv(c).glow?.hint).toEqual(h)
        c.destroy()
      }, 60_000)

      it('he waits 20 s: the merchant asks once more, only once', async () => {
        const c = await cauldronThen(2)
        await toMerchant(c)
        await tick(19_000)
        expect(played.some((id) => id.startsWith('m-again-'))).toBe(false)
        await tick(2_000)
        expect(played.filter((id) => id.startsWith('m-again-')).length).toBe(1)
        await tick(60_000)
        expect(played.filter((id) => id.startsWith('m-again-')).length).toBe(1)
        expect(c.view.merchant?.phase).toBe('pay')
        c.destroy()
      }, 60_000)

      it('a tap meanwhile starts the 20 s again', async () => {
        const c = await cauldronThen(2)
        await toMerchant(c)
        await tick(15_000)
        give(c, [mv(c).coins[0]])
        await tick(15_000)
        expect(played.some((id) => id.startsWith('m-again-'))).toBe(false)
        await tick(6_000)
        expect(played.filter((id) => id.startsWith('m-again-')).length).toBe(1)
        c.destroy()
      }, 60_000)
    })
  })

  describe('the flight boss', () => {
    const events = () => (JSON.parse(duel2Telemetry.exportJson()).events as { e: string; [k: string]: unknown }[])
    const bv = (c: RunController) => (c.view.screen?.screen === 'broom' ? c.view.screen : null)

    it('comes on the second broom visit of a run, never on the first', async () => {
      setVoicePlayer(() => Promise.resolve())
      useDuel2Store.setState({ stage: { stage: 2, newAnswers: '' }, lastEnded: 'ghosts' })
      const c = make()
      c.start()
      const visits: (string | null)[] = []
      let prev: string | undefined
      for (let i = 0; i < 40_000 && visits.length < 2; i++) {
        const s = c.view.screen
        if (s?.screen === 'broom' && prev !== 'broom') visits.push(null)
        if (s?.screen === 'broom' && s.boss) visits[visits.length - 1] = s.boss.kind
        prev = s?.screen
        autoTower(c)
        if (c.view.needNext || c.view.fixing) proceed(c)
        else if (c.view.phase === 'answer' && s && !['crystal', 'broom', 'tower'].includes(s.screen)) c.gesture({ type: 'pick', id: rightId(c.view) })
        fly(c)
        await tick(50)
      }
      // let the second visit show its boss
      for (let i = 0; i < 100 && !bv(c)?.boss; i++) await tick(50)
      visits[1] = bv(c)?.boss?.kind ?? null
      expect(visits[0]).toBeNull()
      expect(['mimic', 'bat']).toContain(visits[1])
      expect(useDuel2Store.getState().lastBoss).toBe(visits[1])
      c.destroy()
    }, 60_000)

    it('arrives, throws two-orb waves that fly slower, and 8 catches beat it: 3 bonus coins, the trophy, telemetry', async () => {
      duel2Telemetry.clear()
      useDuel2Store.setState({ totalStars: 0, bossesBeaten: [] })
      const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'mimic' } })
      c.start()
      await until(c, () => !!bv(c)?.boss)
      expect(bv(c)!.boss).toMatchObject({ kind: 'mimic', hitsLeft: 8, arrived: false })
      await until(c, (v) => v.phase === 'answer')
      const pace0 = useDuel2Store.getState().pace
      expect(played.some((id) => id.startsWith('boss-arrive-'))).toBe(true)
      expect(bv(c)!.boss!.arrived).toBe(true)
      let maxHit = 0
      for (let i = 0; i < 20_000 && !bv(c)?.boss?.won; i++) {
        const s = bv(c)!
        for (const w of s.waves) expect(w.choices.length).toBe(2)
        if (s.waves.length && maxHit === 0) expect(s.travelMs).toBeCloseTo(5800 * pace0 * 1.3, 0)
        maxHit = Math.max(maxHit, 8 - (s.boss?.hitsLeft ?? 8))
        fly(c)
        await tick(50)
      }
      expect(bv(c)!.boss).toMatchObject({ won: true, pose: 'down', first: true, hitsLeft: 0 })
      await until(c, () => !!bv(c)?.finished, 30_000)
      // 8 catches are 8 stars and 1+1+1+1+2+2+2+2 coins; the win adds 3 coins, not 30 stars
      expect(useDuel2Store.getState().totalStars).toBe(8)
      expect(useDuel2Store.getState().coins).toBe(12 + 3)
      expect(c.view.coinPop).toBeGreaterThanOrEqual(3)
      expect(useDuel2Store.getState().bossesBeaten).toEqual(['mimic'])
      expect(played.some((id) => id.startsWith('boss-win-'))).toBe(true)
      expect(played).toContain('boss-new-1')
      const ev = events()
      expect(ev.find((e) => e.e === 'boss-start')).toMatchObject({ kind: 'mimic' })
      expect(ev.filter((e) => e.e === 'boss-hit').length).toBe(8)
      expect(ev.find((e) => e.e === 'boss-win')).toMatchObject({ kind: 'mimic', first: true })
      expect(ev.find((e) => e.e === 'flight')).toMatchObject({ boss: 'mimic' })
      c.destroy()
    }, 60_000)

    it('a second win against the same kind is no new trophy (no golden frame, no new line)', async () => {
      // its announcement was heard before (the trophy alone does not use it up)
      useDuel2Store.setState({ bossesBeaten: ['bat'], bossNewHeard: ['bat'] })
      const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'bat' } })
      c.start()
      for (let i = 0; i < 20_000 && !bv(c)?.boss?.won; i++) { fly(c); await tick(50) }
      expect(bv(c)!.boss).toMatchObject({ won: true, first: false })
      await tick(6000)
      expect(played).not.toContain('boss-new-1')
      c.destroy()
    }, 60_000)

    it('a pause keeps the boss hits and his hearts; only the waves start again (no second arrival)', async () => {
      const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'mimic' } })
      c.start()
      await until(c, (v) => v.phase === 'answer')
      for (let i = 0; i < 20_000 && (bv(c)!.boss!.hitsLeft > 6); i++) { fly(c); await tick(50) }
      // and one mistake
      for (let i = 0; i < 4000 && c.view.hearts === 3; i++) { steer(c, false); await tick(50) }
      const left = bv(c)!.boss!.hitsLeft
      expect(c.view.hearts).toBe(2)
      c.pause()
      played = []
      c.resume()
      await until(c, (v) => v.phase === 'answer')
      expect(bv(c)!.boss!.hitsLeft).toBe(left)
      expect(c.view.hearts).toBe(2)
      expect(bv(c)!.waves.length).toBe(0)
      expect(played.some((id) => id.startsWith('boss-arrive-'))).toBe(false)
      c.destroy()
    }, 60_000)

    it('the boss can end the run (the parent decided)', async () => {
      duel2Telemetry.clear()
      const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'bat' } })
      c.start()
      await until(c, (v) => v.phase === 'answer')
      for (let i = 0; i < 20_000 && !c.view.over; i++) {
        const s = bv(c)
        // fly into the wrong orb of the head wave every time (and never take the potion)
        const head = s?.waves.find((w) => w.resolved.some((r) => !r))
        if (head) {
          const j = head.choices.findIndex((x) => x.soundId !== s!.target.soundId)
          c.gesture({ type: 'lane', lane: (head.lanes?.[j] ?? j) as 0 | 1 | 2 })
        }
        await tick(50)
      }
      expect(c.view.over).not.toBeNull()
      expect(events().find((e) => e.e === 'boss-lose')).toMatchObject({ kind: 'bat' })
      c.destroy()
    }, 60_000)
  })

  it('no potion flies in after a lost heart (a heart comes back only from the merchant or a pass)', async () => {
    duel2Telemetry.clear()
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && ((c.view.screen as BroomView).waves.length ?? 0) > 0)
    for (let i = 0; i < 4000 && c.view.hearts === 3; i++) { steer(c, false); await tick(50) }
    expect(c.view.hearts).toBe(2)
    // to the end of the flight (the gallery then starts it again with full hearts)
    for (let i = 0; i < 4000 && !(c.view.screen as BroomView).finished; i++) {
      const s = c.view.screen as BroomView & { potion?: unknown }
      expect(s.screen === 'broom' ? s.potion : undefined).toBeUndefined()
      expect(c.view.hearts).toBeLessThanOrEqual(2)
      fly(c)
      await tick(50)
    }
    expect((c.view.screen as BroomView).finished).toBe(true)
    const ev = JSON.parse(duel2Telemetry.exportJson()).events as { e: string }[]
    expect(ev.some((e) => e.e === 'potion-show')).toBe(false)
    c.destroy()
  }, 60_000)

  describe('review fixes: one-time moments, pauses, the win', () => {
    const bv = (c: RunController) => (c.view.screen?.screen === 'broom' ? c.view.screen : null)
    /** voice ids in `missing` have no file: the player says so */
    const withMissing = (missing: RegExp, ms = 10) => setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(() => r(!missing.test(id)), ms)) })

    it('a missing boss-new or boss-win file uses up neither the announcement nor the praise count; the trophy is kept', async () => {
      withMissing(/^boss-(new|win)/)
      useDuel2Store.setState({ bossesBeaten: [], bossNewHeard: [], praiseHeard: {} })
      const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'mimic' } })
      c.start()
      for (let i = 0; i < 20_000 && !bv(c)?.boss?.won; i++) { fly(c); await tick(50) }
      expect(bv(c)!.boss!.first).toBe(true)
      await until(c, () => !!bv(c)?.finished, 30_000)
      const st = useDuel2Store.getState()
      expect(st.bossesBeaten).toEqual(['mimic'])
      expect(st.bossNewHeard ?? []).toEqual([])
      expect(st.praiseHeard['boss-win'] ?? 0).toBe(0)
      // the next win against it is still its first announcement
      for (let i = 0; i < 20_000 && !(bv(c)?.boss?.won && c.view.phase === 'celebrate'); i++) { fly(c); await tick(50) }
      expect(bv(c)!.boss!.first).toBe(true)
      c.destroy()
      // heard: used up
      stopVoice()
      setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(() => r(true), 10)) })
      const d = make({ force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'mimic' } })
      d.start()
      for (let i = 0; i < 20_000 && !bv(d)?.finished; i++) { fly(d); await tick(50) }
      expect(useDuel2Store.getState().bossNewHeard).toEqual(['mimic'])
      expect(useDuel2Store.getState().praiseHeard['boss-win']).toBe(1)
      d.destroy()
    }, 120_000)

    it('a pause right after a hit does not leave the boss in its hit pose', async () => {
      const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'mimic' } })
      c.start()
      for (let i = 0; i < 20_000 && bv(c)?.boss?.pose !== 'hit'; i++) { fly(c); await tick(50) }
      c.pause()
      await tick(2000)
      c.resume()
      await until(c, (v) => v.phase === 'answer')
      await tick(1000)
      expect(bv(c)!.boss!.pose).toBe('fly')
      c.destroy()
    }, 60_000)

    it('the winning catch says no streak praise, and the win waits for a mistake effect to settle', async () => {
      useDuel2Store.setState({ praiseHeard: {} })
      const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'mimic' } })
      c.start()
      await until(c, (v) => v.phase === 'answer')
      // catches 3 and 8 are streaks 5 and 10: the first raises the multiplier with its line, the 8th is the win (no line)
      ;(c as unknown as { streak: number }).streak = 2
      let fxAt = -1
      let wonAt = -1
      for (let i = 0; i < 20_000 && wonAt < 0; i++) {
        const s = bv(c)!
        if (s.boss!.hitsLeft === 1 && fxAt < 0) {
          const head = s.waves.find((w) => w.resolved.some((r) => !r))
          const j = head ? head.choices.findIndex((x) => x.soundId === s.target.soundId) : -1
          if (head && j >= 0 && wp(head.startMs + head.offsets[j] * s.travelMs, c.broomClock(), s.travelMs) < 0.1) {
            fxAt = Date.now()
            ;(c as unknown as { setScreen: (p: object) => void }).setScreen({ fx: { id: 999, kind: 'hit', at: fxAt } })
          }
        }
        if (s.boss!.won && wonAt < 0) wonAt = Date.now()
        fly(c)
        await tick(50)
      }
      expect(fxAt).toBeGreaterThan(0)
      expect(wonAt - fxAt).toBeGreaterThanOrEqual(1300)
      expect(played.filter((id) => id.startsWith('streak-')).length).toBe(0)
      expect(played.filter((id) => id.startsWith('mult-up-'))).toEqual(['mult-up-1'])
      c.destroy()
    }, 60_000)

    it('a pause during the win does not play its celebration again', async () => {
      sfxLog.length = 0
      setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(() => r(true), 800)) })
      const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'bat' } })
      c.start()
      for (let i = 0; i < 20_000 && !bv(c)?.boss?.won; i++) { fly(c); await tick(50) }
      await tick(700)
      c.pause()
      c.resume()
      await until(c, () => !!bv(c)?.finished, 30_000)
      expect(sfxLog.filter((n) => n === 'boss-win').length).toBe(1)
      c.destroy()
    }, 60_000)

    it('a new boss never starts with the sound the boss before ended on', async () => {
      // שָׁ (sh-a) is the only sound near the target mistake rate: every pick it is allowed takes it
      const hard = { seen: 40, wrong: 30 }
      useDuel2Store.setState({ tallies: { 'l:shin': { seen: 40, wrong: 4 }, 'v:a': { seen: 40, wrong: 4 }, 'l:sin': hard, 'v:e': hard, 'v:i': hard, 'v:o': hard, 'v:u': hard } })
      const c = make({ sandbox: true, force: { screen: 'broom', stage: 3, kind: 'syllable', boss: 'shin' } })
      c.start()
      for (let i = 0; i < 20_000 && !bv(c)?.boss?.won; i++) { fly(c); await tick(50) }
      const last = bv(c)!.target.soundId
      expect(last).toBe('syl-sh-a')
      await until(c, () => !!bv(c)?.boss && !bv(c)!.boss!.won, 30_000)
      expect(bv(c)!.target.soundId).not.toBe(last)
      c.destroy()
    }, 60_000)
  })

})

describe('drawing screen (spec: 2026-11-07 drawing)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    towerAuto = true
    useDuel2Store.getState().resetProgress()
    useDuel2Store.setState({ bookOpen: true, demosSeen: [...allDemos, 'demo-draw'], dotIntrosSeen: ALL_DOTS })
    played = []
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 10)) })
  })
  afterEach(() => {
    stopVoice()
    setVoicePlayer(null)
    vi.useRealTimers()
  })
  const dv = (c: RunController) => c.view.screen as DrawView
  const strokesFor = (c: RunController, tf = (p: Pt): Pt => p) => strokesOf(dv(c).letter, dv(c).script).variants[0].map((s) => resample(s.pts, 30).map(tf))
  const answering = (c: RunController) => until(c, (v) => v.phase === 'answer' && !dv(c).demo)
  async function drawLetter(c: RunController, tf?: (p: Pt) => Pt) {
    for (const s of strokesFor(c, tf)) {
      await answering(c)
      c.gesture({ type: 'stroke', pts: s })
      await tick(20)
    }
  }
  async function drawMarks(c: RunController) {
    await until(c, (v) => dv(c).mode === 'mark' && v.phase === 'answer')
    const v = dv(c)
    const ink = bbox(v.strokes.filter((x) => x.state === 'ok' || x.state === 'helped').flatMap((x) => x.pts))
    for (const m of markTargets(v.marks, { letter: ink, vav: v.layout.vav?.box })) { c.gesture({ type: 'stroke', pts: m }); await tick(20) }
  }

  it('a round: the word, the demo (a letter not drawn yet), he draws, each right stroke turns gold, the word again, a star', async () => {
    const c = make({ force: { screen: 'draw', stage: 1, script: 'print' } })
    c.start()
    await until(c, (v) => v.screen?.screen === 'draw')
    const id = dv(c).word.id
    await until(c, () => !!dv(c).demo)
    expect(played[0]).toBe(`w-${id}`)
    await answering(c)
    const hearts = c.view.hearts
    await drawLetter(c)
    expect(dv(c).strokes.every((s) => s.state === 'ok')).toBe(true)
    await until(c, () => dv(c).mode === 'done')
    expect(c.view.score).toBe(1)
    await until(c, () => played.filter((x) => x === `w-${id}`).length === 2)
    expect(c.view.hearts).toBe(hearts)
    c.destroy()
  })

  it('a wrong stroke fades, the hand shows that stroke (draw-again once), and he draws it again; no heart is lost', async () => {
    const c = make({ force: { screen: 'draw', stage: 1, script: 'print' } })
    c.start()
    await answering(c)
    const hearts = c.view.hearts
    const [first] = strokesFor(c)
    c.gesture({ type: 'stroke', pts: [...first].reverse() })
    await tick(20)
    expect(dv(c).strokes[0].state).toBe('wrong')
    expect(c.view.phase).toBe('feedback')
    await until(c, () => !!dv(c).demo)
    expect(dv(c).demo!.strokes.length).toBe(1)
    await until(c, () => played.some((x) => x.startsWith('draw-again')))
    await answering(c)
    expect(dv(c).strokes.length).toBe(0)
    c.gesture({ type: 'stroke', pts: [...first].reverse() })
    await tick(20)
    await answering(c)
    expect(played.filter((x) => x.startsWith('draw-again')).length).toBe(1)
    expect(c.view.hearts).toBe(hearts)
    c.destroy()
  })

  it('after 3 wrong tries of the same stroke the hand draws it for him and the round goes on', async () => {
    const c = make({ force: { screen: 'draw', stage: 1, script: 'print' } })
    c.start()
    await answering(c)
    const [first] = strokesFor(c)
    for (let i = 0; i < 3; i++) {
      await answering(c)
      c.gesture({ type: 'stroke', pts: [...first].reverse() })
      await tick(20)
    }
    await until(c, () => dv(c).strokes.some((s) => s.state === 'helped'))
    await answering(c)
    const rest = strokesFor(c).slice(1)
    for (const s of rest) { await answering(c); c.gesture({ type: 'stroke', pts: s }); await tick(20) }
    await until(c, () => dv(c).mode === 'done')
    c.destroy()
  })

  it('a letter above the lines is told (it glows, the voice says so) and still counts', async () => {
    const c = make({ force: { screen: 'draw', stage: 1, script: 'print' } })
    c.start()
    await answering(c)
    await drawLetter(c, ([x, y]) => [x * 1.6, y * 1.6 - 1.1])
    await until(c, () => !!dv(c).lineFx)
    expect(dv(c).lineFx!.kind).toBe('tall')
    await until(c, () => played.includes('line-tall-1'))
    await until(c, () => dv(c).mode === 'done')
    expect(c.view.score).toBe(1)
    c.destroy()
  })

  it('then the marks: the voice asks, the place glows, he draws them (judged by place and count)', async () => {
    const c = make({ force: { screen: 'draw', stage: 2, script: 'print' } })
    c.start()
    await answering(c)
    expect(dv(c).marks.length).toBeGreaterThan(0)
    await drawLetter(c)
    await until(c, () => dv(c).mode === 'mark')
    await until(c, () => played.includes('draw-mark-1'))
    expect(dv(c).glow).toBe('marks')
    // a dot far above the letter is wrong: it fades and the hand shows the marks
    c.gesture({ type: 'stroke', pts: [[0.5, -0.9], [0.5, -0.9]] })
    await until(c, () => !!dv(c).demo)
    await drawMarks(c)
    await until(c, () => dv(c).mode === 'done')
    c.destroy()
  })

  it('he waits: the instruction and the word after 8 s; the hint (the hand) after 16 s', async () => {
    const c = make({ force: { screen: 'draw', stage: 1, script: 'print' } })
    c.start()
    await answering(c)
    played = []
    await tick(8200)
    expect(played[0]).toMatch(/^q-draw-/)
    await tick(1000)
    expect(played[1]).toBe(`w-${dv(c).word.id}`)
    await tick(7300)
    expect(dv(c).demo).toBeTruthy()
    // a stroke stops the hint at once
    c.gesture({ type: 'stroke', pts: strokesFor(c)[0] })
    await tick(20)
    expect(dv(c).demo).toBeFalsy()
    c.destroy()
  })

  it('handwriting is shown in its own script; the gallery can force it', async () => {
    const c = make({ force: { screen: 'draw', stage: 3, script: 'hand' } })
    c.start()
    await answering(c)
    expect(dv(c).script).toBe('hand')
    expect(dv(c).layout.rest.font).toMatch(/Dana Yad/)
    c.destroy()
  })

  it('telemetry: draw-start, draw-stroke (with why), draw-done', async () => {
    duel2Telemetry.clear()
    const c = make({ force: { screen: 'draw', stage: 1, script: 'print' } })
    c.start()
    await answering(c)
    const [first] = strokesFor(c)
    c.gesture({ type: 'stroke', pts: [...first].reverse() })
    await tick(20)
    await drawLetter(c)
    await until(c, () => dv(c).mode === 'done')
    await tick(3000)
    c.destroy()
    const ev = JSON.parse(duel2Telemetry.exportJson()).events as { e: string; [k: string]: unknown }[]
    expect(ev.find((e) => e.e === 'draw-start')).toMatchObject({ script: 'print' })
    expect(ev.find((e) => e.e === 'draw-stroke' && e.ok === false)).toMatchObject({ why: 'direction', n: 1 })
    expect(ev.find((e) => e.e === 'draw-done')).toMatchObject({ wrongStrokes: 1, helped: false })
  })

  it('a lift inside a stroke: both pieces turn gold, no try is counted and the letter goes on', async () => {
    duel2Telemetry.clear()
    const c = make({ force: { screen: 'draw', stage: 1, script: 'print' } })
    c.start()
    await answering(c)
    const all = strokesFor(c)
    const k = Math.floor(all[0].length / 2)
    c.gesture({ type: 'stroke', pts: all[0].slice(0, k) })
    await tick(20)
    c.gesture({ type: 'stroke', pts: all[0].slice(k) })
    await tick(20)
    expect(dv(c).strokes.map((s) => s.state)).toEqual(['ok', 'ok'])
    for (const s of all.slice(1)) { await answering(c); c.gesture({ type: 'stroke', pts: s }); await tick(20) }
    await until(c, () => dv(c).mode === 'done')
    await tick(3000)
    c.destroy()
    expect(played.some((x) => x.startsWith('draw-again'))).toBe(false)
    const ev = JSON.parse(duel2Telemetry.exportJson()).events as { e: string; [k: string]: unknown }[]
    expect(ev.find((e) => e.e === 'draw-done')).toMatchObject({ wrongStrokes: 0 })
  })

  it('a piece that waits for the rest of its stroke is settled after a pause: it turns gold, or it is wrong and the hand shows it', async () => {
    const c = make({ force: { screen: 'draw', stage: 1, script: 'print' } })
    c.start()
    await answering(c)
    const [first] = strokesFor(c)
    const cx = first.reduce((a, q) => a + q[0], 0) / first.length
    const cy = first.reduce((a, q) => a + q[1], 0) / first.length
    c.gesture({ type: 'stroke', pts: first.map(([x, y]) => [cx + (x - cx) * 0.45, cy + (y - cy) * 0.45] as Pt) })
    await tick(20)
    expect(dv(c).strokes[0].state).toBe('pending')
    await tick(1300)
    const st = dv(c).strokes[0]?.state
    expect(st === 'ok' || st === 'wrong' || dv(c).strokes.length === 0).toBe(true)
    c.destroy()
  })

  it('in the lap only when drawing is on: after the doors', async () => {
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'doors', settings: { ...useDuel2Store.getState().settings, drawing: true } })
    const c = make()
    c.start()
    await until(c, (v) => !!v.screen)
    expect(c.view.screen!.screen).toBe('draw')
    c.destroy()
    useDuel2Store.setState({ lastEnded: 'doors', settings: { ...useDuel2Store.getState().settings, drawing: false } })
    const d = make()
    d.start()
    await until(d, (v) => !!v.screen)
    expect(d.view.screen!.screen).not.toBe('draw')
    d.destroy()
  })

  it('the print screen draws in print and the handwriting screen in handwriting, at any stage', async () => {
    setVoicePlayer(() => Promise.resolve())
    useDuel2Store.setState({ stage: { stage: 1, newAnswers: '' }, lastEnded: 'broom', settings: { ...useDuel2Store.getState().settings, drawing: true } })
    const c = make()
    c.start()
    const seen: { screen: string; script: string }[] = []
    for (let guard = 0; guard < 6000 && c.view.screen?.screen !== 'broom'; guard++) {
      const s = c.view.screen
      if (s?.screen === 'draw' && c.view.phase === 'answer' && !s.demo && s.mode === 'letter' && s.strokes.length === 0) {
        const id = (c as unknown as { screenId: string }).screenId
        seen.push({ screen: id, script: s.script })
        await drawLetter(c)
        if (dv(c).marks.length) await drawMarks(c)
        await until(c, () => dv(c).mode === 'done' || c.view.screen?.screen !== 'draw')
        continue
      }
      autoTower(c)
      if (c.view.needNext || c.view.fixing) proceed(c)
      else if (c.view.phase === 'answer' && s && s.screen === 'ghosts') c.gesture({ type: 'pick', id: rightId(c.view) })
      await tick(50)
    }
    expect(seen.map((x) => x.screen)).toEqual(['draw', 'draw', 'draw', 'draw-hand', 'draw-hand', 'draw-hand'])
    expect(seen.map((x) => x.script)).toEqual(['print', 'print', 'print', 'hand', 'hand', 'hand'])
    expect(c.view.screen?.screen).toBe('broom')
    c.destroy()
  }, 60_000)

  it('strokes are accepted on the handwriting screen, and a pause resumes it in handwriting', async () => {
    const c = make({ force: { screen: 'draw-hand', stage: 1 } })
    c.start()
    await answering(c)
    expect(dv(c).screen).toBe('draw')
    expect(dv(c).script).toBe('hand')
    const id = dv(c).word.id
    c.gesture({ type: 'stroke', pts: strokesFor(c)[0] })
    await tick(20)
    c.pause()
    c.resume()
    await answering(c)
    expect(dv(c).word.id).toBe(id)
    expect(dv(c).script).toBe('hand')
    await drawLetter(c)
    if (dv(c).marks.length) await drawMarks(c)
    await until(c, () => dv(c).mode === 'done')
    expect(useDuel2Store.getState().tallies['sc:draw-hand']?.seen).toBe(1)
    expect(useDuel2Store.getState().tallies['sc:draw']).toBeUndefined()
    c.destroy()
  })

  it('a pause restarts the same word from the start', async () => {
    const c = make({ force: { screen: 'draw', stage: 1, script: 'print' } })
    c.start()
    await answering(c)
    const id = dv(c).word.id
    c.gesture({ type: 'stroke', pts: strokesFor(c)[0] })
    await tick(20)
    c.pause()
    c.resume()
    await answering(c)
    expect(dv(c).word.id).toBe(id)
    expect(dv(c).strokes.length).toBe(0)
    c.destroy()
  })
})

describe('path sessions (spec: one duel, Part 3 and Part 4)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    towerAuto = true
    useDuel2Store.getState().resetProgress()
    useDuel2Store.setState({ bookOpen: true, settings: { ...DEFAULT_SETTINGS, drawing: false }, demosSeen: allDemos, dotIntrosSeen: ALL_DOTS, hintsSeen: Object.fromEntries(['cauldron', 'ladder', 'ghosts'].flatMap((s) => [1, 2, 3, 4].map((n) => [`${s}:${n}`, 99]))), stage: { stage: 4, newAnswers: '' } })
    played = []
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 10)) })
  })
  afterEach(() => {
    stopVoice()
    setVoicePlayer(null)
    vi.useRealTimers()
  })
  /** right answers (or wrong ones while `wrong()` says so) on the calm screens; counts the rounds */
  async function play(c: RunController, wrong: () => boolean = () => false) {
    const seen: string[] = []
    for (let guard = 0; guard < 8000 && !c.view.over; guard++) {
      const s = c.view.screen
      autoTower(c)
      if (s && seen[seen.length - 1] !== s.screen) seen.push(s.screen)
      if (c.view.needNext || c.view.fixing) proceed(c)
      else if (c.view.phase === 'answer' && s && !['crystal', 'broom', 'draw', 'tower'].includes(s.screen)) c.gesture({ type: 'pick', id: wrong() ? wrongId(c.view) : rightId(c.view) })
      fly(c)
      await tick(50)
    }
    return seen
  }

  it('a ghosts session is ten rounds, then over with session: true', async () => {
    const c = make({ session: { screen: 'ghosts' } })
    c.start()
    let rounds = 0
    for (let guard = 0; guard < 8000 && !c.view.over; guard++) {
      if (c.view.needNext || c.view.fixing) proceed(c)
      else if (c.view.phase === 'answer' && c.view.screen?.screen === 'ghosts') { rounds++; c.gesture({ type: 'pick', id: rightId(c.view) }) }
      await tick(50)
    }
    expect(rounds).toBe(10)
    expect(c.view.over).toMatchObject({ session: true, score: 10, crystals: 0, best: false })
    expect(c.view.defeat).toBeFalsy()
    c.destroy()
  }, 60_000)

  it('mistakes in a session cost no heart, only the streak', async () => {
    const c = make({ session: { screen: 'ghosts' } })
    c.start()
    let n = 0
    for (let guard = 0; guard < 8000 && n < 6; guard++) {
      if (c.view.needNext || c.view.fixing) proceed(c)
      else if (c.view.phase === 'answer' && c.view.screen?.screen === 'ghosts') { n++; c.gesture({ type: 'pick', id: n === 6 ? wrongId(c.view) : rightId(c.view) }) }
      await tick(50)
    }
    await until(c, (v) => v.phase === 'mistake' || !!v.fixing)
    expect(c.view.hearts).toBe(3)
    expect(c.view.mult).toBe(1)
    // three more mistakes: still three hearts, the session goes on
    const seen = await play(c, () => true)
    expect(seen).toEqual(['ghosts'])
    expect(c.view.over).toMatchObject({ session: true })
    expect(c.view.hearts).toBe(3)
    expect(c.view.defeat).toBeFalsy()
    // the mistakes were recorded (the adaptive data)
    expect(useDuel2Store.getState().recent['sc:ghosts']).toContain('x')
    c.destroy()
  }, 60_000)

  it('a session earns stars and coins but changes neither lastEnded nor bestRun', async () => {
    useDuel2Store.setState({ lastEnded: 'ladder', bestRun: 4, totalStars: 0, coins: 0, runs: 2 })
    const c = make({ session: { screen: 'cauldron' } })
    c.start()
    await play(c)
    expect(c.view.over).toMatchObject({ session: true, score: 10, best: false })
    expect(useDuel2Store.getState()).toMatchObject({ lastEnded: 'ladder', bestRun: 4, totalStars: 10, runs: 2 })
    expect(useDuel2Store.getState().coins).toBeGreaterThanOrEqual(10)
    c.destroy()
  }, 60_000)

  it('no merchant, no pass heart and no crystal in a session', async () => {
    useDuel2Store.setState({ coins: 500, crystals: 0, checkpointsSinceVisit: NEVER_VISITED, merchant: { ...FRESH_MERCHANT, demoSeen: true, undoShown: true } })
    const c = make({ session: { screen: 'doors' } })
    c.start()
    let k = 0
    const seen: string[] = []
    for (let guard = 0; guard < 8000 && !c.view.over; guard++) {
      const s = c.view.screen
      expect(c.view.merchant).toBeUndefined()
      if (s && seen[seen.length - 1] !== s.screen) seen.push(s.screen)
      if (c.view.needNext || c.view.fixing) proceed(c)
      else if (c.view.phase === 'answer' && s?.screen === 'doors') { k++; c.gesture({ type: 'pick', id: k % 2 ? wrongId(c.view) : rightId(c.view) }) }
      await tick(50)
    }
    expect(seen).toEqual(['doors'])
    expect(useDuel2Store.getState().crystals).toBe(0)
    expect(c.view.passHeart ?? 0).toBe(0)
    expect(c.view.heal).toBeUndefined()
    expect(useDuel2Store.getState().merchant.visits).toBe(0)
    c.destroy()
  }, 60_000)

  it('every second broom session is a boss fight', async () => {
    useDuel2Store.setState({ broomSessions: 0 })
    const a = make({ session: { screen: 'broom' } })
    a.start()
    await until(a, (v) => v.screen?.screen === 'broom')
    expect((a.view.screen as BroomView).boss).toBeUndefined()
    a.destroy()
    expect(useDuel2Store.getState().broomSessions).toBe(1)
    const b = make({ session: { screen: 'broom' } })
    b.start()
    await until(b, (v) => v.screen?.screen === 'broom')
    expect((b.view.screen as BroomView).boss).toBeDefined()
    // the boss lasts until it is beaten (no hearts to lose)
    await play(b)
    expect(b.view.over).toMatchObject({ session: true })
    expect(b.view.over!.bosses!.length).toBe(1)
    b.destroy()
    expect(useDuel2Store.getState().broomSessions).toBe(2)
  }, 120_000)

  it('a ladder session has 5 rungs and a doors session has no crystal behind its last door', async () => {
    const c = make({ session: { screen: 'ladder' } })
    c.start()
    await until(c, (v) => v.screen?.screen === 'ladder')
    expect((c.view.screen as { rungs: number }).rungs).toBe(5)
    c.destroy()
    const d = make({ session: { screen: 'doors' } })
    d.start()
    let doors = 0
    for (let guard = 0; guard < 8000 && !d.view.over; guard++) {
      const s = d.view.screen
      if (s?.screen === 'doors') expect(s.behind).toBeUndefined()
      if (d.view.needNext || d.view.fixing) proceed(d)
      else if (d.view.phase === 'answer' && s?.screen === 'doors') { doors++; d.gesture({ type: 'pick', id: rightId(d.view) }) }
      await tick(50)
    }
    expect(doors).toBe(6)
    d.destroy()
  }, 60_000)

  it('a tower session is two waves, then over; its mistakes cost no heart', async () => {
    const c = make({ session: { screen: 'tower' } })
    c.start()
    await until(c, (v) => v.screen?.screen === 'tower')
    expect(c.view.screen).toMatchObject({ waves: 2 })
    for (let k = 0; k < 4; k++) expect(c.towerAnswer('wrong', 'kamatz')).toBe('on')
    expect(c.view.hearts).toBe(3)
    await until(c, (v) => v.over !== null)
    expect(c.view.over).toMatchObject({ session: true })
    c.destroy()
  }, 60_000)
})
