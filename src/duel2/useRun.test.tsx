import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController, type BroomView, type View } from './controller'
import { useRun } from './useRun'
import { useDuel2Store } from './store'
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

  it('the question plays again after a demo', async () => {
    useDuel2Store.setState({ demosSeen: [] })
    const c = make({ force: { screen: 'ghosts', stage: 2, kind: 'syllable', demo: true } })
    c.start()
    await until(c, (v) => v.overlay?.kind === 'demo')
    expect(c.view.phase).toBe('demo')
    c.next()
    await until(c, (v) => v.phase === 'answer')
    expect(played.some((id) => id.startsWith('q-ghosts-'))).toBe(true)
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
    setVoicePlayer(null)
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
    await tick(100)
    expect((out.r!.view.screen as BroomView).waves.length).toBe(0)
    expect((out.r!.view.screen as BroomView).target.id).toBe(target)
    for (let i = 0; i < 200 && !played.some((id) => id.startsWith('q-broom')); i++) await tick(50)
    expect(played.some((id) => id.startsWith('q-broom'))).toBe(true)
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
})
