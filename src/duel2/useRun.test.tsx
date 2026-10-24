import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController, type BroomView, type View } from './controller'
import { useRun } from './useRun'
import { useDuel2Store } from './store'
import { CATCH_AT, wavePos } from './logic/run'
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
      if (changedAt > 0 && firstNewWave < 0 && s.waves.some((w) => w.id > lastWave)) firstNewWave = Date.now() - changedAt
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
    // the new orbs come while the new sound is said: no long wait (the parent)
    expect(firstNewWave).toBeGreaterThanOrEqual(0)
    expect(firstNewWave).toBeLessThan(300)
    c.destroy()
  })

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
      if (finaleAt > 0 && c.view.phase === 'question') break
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

})
