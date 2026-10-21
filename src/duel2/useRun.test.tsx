import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController, type BroomView, type View } from './controller'
import { useRun } from './useRun'
import { useDuel2Store } from './store'
import { PASS_AT, VISIT } from './logic/run'
import { setVoicePlayer, stopVoice } from './audio/duel2Audio'

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

let played: string[] = []
const allDemos = ['demo-broom', 'demo-broom-letter', 'demo-cauldron', 'demo-ladder', 'demo-ghosts-letter', 'demo-ghosts-syllable', 'demo-doors']
const ALL_DOTS = ['bet', 'kaf', 'pe', 'shin']

function make(opts: ConstructorParameters<typeof RunController>[0] = {}) {
  return new RunController({ rng: seeded(3), now: () => Date.now(), ...opts })
}
const tick = (ms = 100) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
async function until(c: RunController, pred: (v: View) => boolean, max = 60_000) {
  for (let t = 0; t < max && !pred(c.view); t += 50) await tick(50)
  if (!pred(c.view)) throw new Error(`condition not met; phase=${c.view.phase} screen=${c.view.screen?.screen}`)
}
function rightId(v: View): string {
  const s = v.screen!
  if (s.screen === 'cauldron') return s.target.mark!
  if (s.screen === 'doors') return s.word.id
  if (s.screen === 'broom' || s.screen === 'crystal') throw new Error('no pick here')
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
/** presses next through the mistake and any explanation until the next answer phase */
async function drain(c: RunController) {
  for (let i = 0; i < 400 && !(c.view.phase === 'answer' && !c.view.needNext) && !c.view.over; i++) {
    if (c.view.needNext) c.next()
    await tick(50)
  }
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
    useDuel2Store.getState().resetProgress()
    useDuel2Store.setState({ demosSeen: allDemos, dotIntrosSeen: ALL_DOTS, hintsSeen: Object.fromEntries(['cauldron', 'ladder', 'ghosts'].flatMap((s) => [1, 2, 3, 4].map((n) => [`${s}:${n}`, 99])))  })
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

  it('a mistake waits for next', async () => {
    const c = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' } })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    c.gesture({ type: 'pick', id: wrongId(c.view) })
    await until(c, (v) => v.phase === 'mistake' && v.needNext)
    await tick(60_000)
    expect(c.view.phase).toBe('mistake')
    expect(c.view.hearts).toBe(2)
    c.next()
    await until(c, (v) => v.phase === 'explain' || v.phase === 'question' || v.phase === 'answer')
    c.destroy()
  })

  it('explanation after the same mistake twice', async () => {
    useDuel2Store.setState({ mistakes: [], roundNo: 10 })
    const c = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' }, rng: () => 0.9 })
    c.start()
    for (let k = 0; k < 2; k++) {
      await until(c, (v) => v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => v.needNext)
      c.next()
      if (k === 0) await until(c, (v) => v.phase === 'question' || v.phase === 'answer')
    }
    await until(c, (v) => v.overlay?.kind === 'explain')
    const o = c.view.overlay as Extract<View['overlay'], { kind: 'explain' }>
    expect(o.parts.map((p) => p.id)[1]).toMatch(/^ln-/)
    expect(o.parts.map((p) => p.id)[2]).toMatch(/^vn-/)
    c.destroy()
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

  it('hearts refill on a new screen', async () => {
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'broom' })
    const c = make()
    c.start()
    for (let k = 0; k < 2; k++) {
      await until(c, (v) => v.screen?.screen === 'cauldron' && v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => v.needNext)
      await drain(c)
    }
    expect(c.view.hearts).toBe(1)
    for (let guard = 0; guard < 20 && c.view.screen?.screen === 'cauldron'; guard++) {
      await until(c, (v) => v.phase === 'answer' || v.screen?.screen !== 'cauldron' || v.needNext)
      if (c.view.needNext) { c.next(); continue }
      if (c.view.screen?.screen === 'cauldron') c.gesture({ type: 'pick', id: rightId(c.view) })
      await tick(100)
    }
    await until(c, (v) => v.screen?.screen === 'ladder')
    expect(c.view.hearts).toBe(3)
    c.destroy()
  })

  it('run ends at 0 hearts and the next run starts after that screen', async () => {
    useDuel2Store.setState({ stage: { stage: 4, newAnswers: '' }, lastEnded: 'cauldron' })
    const c = make()
    c.start()
    for (let k = 0; k < 3; k++) {
      await until(c, (v) => v.screen?.screen === 'ladder' && v.phase === 'answer')
      c.gesture({ type: 'pick', id: wrongId(c.view) })
      await until(c, (v) => v.needNext || v.over !== null)
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
      if (c.view.needNext) c.next()
      else if (c.view.phase === 'answer' && c.view.screen && !['crystal', 'broom'].includes(c.view.screen.screen as string)) c.gesture({ type: 'pick', id: rightId(c.view) })
    }
    expect(c.view.screen?.screen).toBe('crystal')
    await until(c, (v) => v.screen?.screen === 'broom')
    expect(useDuel2Store.getState().crystals).toBe(1)
    c.destroy()
  })

  it('the broom flight catches by lane and a wrong lane stops the flight', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    const before = useDuel2Store.getState().roundNo
    for (let i = 0; i < 2000 && useDuel2Store.getState().roundNo === before; i++) { steer(c, true); await tick(50) }
    expect(useDuel2Store.getState().tallies['sc:broom']?.wrong ?? 0).toBe(0)
    for (let i = 0; i < 4000 && c.view.phase !== 'mistake'; i++) { if (c.view.phase === 'answer') steer(c, false); await tick(50) }
    expect(c.view.phase).toBe('mistake')
    // only the wave of the mistake stays, so the right answer is marked once
    expect((c.view.screen as BroomView).waves.length).toBe(1)
    const frozen = JSON.stringify((c.view.screen as BroomView).waves)
    await tick(3000)
    expect(JSON.stringify((c.view.screen as BroomView).waves)).toBe(frozen)
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
      if (k < 2) { await until(c, (v) => v.needNext); await drain(c) }
    }
    await tick(5)
    c.pause()
    await until(c, (v) => v.over !== null, 5000)
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
      if (c.view.needNext) c.next()
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
    await until(c, (v) => v.needNext)
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

  it('after a mistake a tap on the right answer goes on at once: no hint wait, no next, no explanation', async () => {
    useDuel2Store.setState({ mistakes: [], roundNo: 10 })
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 1500)) })
    const c = make({ force: { screen: 'ladder', stage: 2, fixed: 'letter' }, rng: () => 0.9 })
    c.start()
    await until(c, (v) => v.phase === 'answer')
    c.gesture({ type: 'pick', id: wrongId(c.view) })
    await until(c, (v) => v.needNext)
    c.next()
    await until(c, (v) => v.phase === 'answer')
    // the same letter missed twice: an explanation is due after this mistake
    const right = rightId(c.view)
    c.gesture({ type: 'pick', id: wrongId(c.view) })
    await until(c, (v) => v.phase === 'mistake')
    played = []
    c.gesture({ type: 'pick', id: right })
    await until(c, (v) => v.phase === 'question' || v.phase === 'answer', 3000)
    expect(played).not.toContain('explain-lead-1')
    expect(c.view.overlay?.kind).not.toBe('explain')
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

  it('after a broom mistake the flight goes on with the sound only, no question line', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    for (let i = 0; i < 4000 && c.view.phase !== 'mistake'; i++) { if (c.view.phase === 'answer') steer(c, false); await tick(50) }
    played = []
    await drain(c)
    expect(played.some((id) => id.startsWith('q-'))).toBe(false)
    c.destroy()
  })

  it('the last broom round lets the orbs on the screen finish before the flight ends', async () => {
    const c = make({ force: { screen: 'broom', stage: 2, kind: 'syllable' } })
    c.start()
    await until(c, (v) => v.phase === 'answer' && (v.screen as BroomView).waves.length > 0)
    const before = useDuel2Store.getState().roundNo
    let doneBy = 0
    for (let i = 0; i < 20000; i++) {
      if (c.view.phase === 'mistake') break
      const caught = useDuel2Store.getState().roundNo - before
      const s = c.view.screen as BroomView
      if (caught >= VISIT.broom && !doneBy) {
        // the orbs on the screen at the last catch: the flight must go on until each has passed the wizard
        const now = c.broomClock()
        doneBy = Math.max(0, ...s.waves.flatMap((w) => w.choices.map((_, k) => w.resolved[k] ? 0 : w.startMs + w.offsets[k] * s.travelMs + s.travelMs * (1 - PASS_AT) - now)))
        break
      }
      if (c.view.phase === 'answer') steer(c, true)
      await tick(50)
    }
    expect(doneBy).toBeGreaterThan(300)
    // some orbs are still flying: the flight goes on (a hit on the way is fine) and does not move on to the next round
    await tick(doneBy - 250)
    expect(['answer', 'mistake']).toContain(c.view.phase)
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
    let phase = ''
    for (let i = 0; i < 1500; i++) {
      const s = c.view.screen as BroomView
      if (c.view.phase === 'mistake' && phase !== 'mistake') mistakes++
      phase = c.view.phase
      if (c.view.needNext) c.next()
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

})
