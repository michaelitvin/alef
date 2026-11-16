import { describe, expect, it } from 'vitest'
import {
  COUNT_STEP_MS, MERCHANT_ARRIVE_MS, MERCHANT_DEMO_DRAG_MS, MERCHANT_IDLE_MS, MERCHANT_LEAVE_MS, POTION_RING_MS, UNDO_TAP_MS,
  merchantVisit, stepMerchant,
  type MerchantCtx, type MerchantInput, type MerchantState, type MerchantStep, type MerchantView, type RunPatch, type SaveOp, type Wait,
} from './merchant'

/** freezes a state deeply: a step that changed it would throw */
function freeze<T>(x: T): T {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) freeze(v) }
  return x
}

/**
 * Plays a visit as the run does, on a clock of its own: `send` steps the policy once; `settle` ends each wait it asks
 * for (a sleep after its time, lines after `min`) until it waits for him or the visit ends.
 */
function visit(ctx: Partial<MerchantCtx> = {}) {
  let st: MerchantState = merchantVisit({ price: 6, coins: [5, 2, 2, 1, 10], knows: false, demoDue: false, undoShown: true, hearts: 1, moves: 0, now: 0, ...ctx })
  let clock = 0
  let wait: Wait | undefined
  const d = {
    said: [] as string[], sfx: [] as string[], save: [] as SaveOp[], track: [] as { e: string; data: Record<string, unknown> }[],
    run: {} as RunPatch, view: null as MerchantView | null, idleAt: null as number | null, end: false, hushes: 0,
    bought: undefined as MerchantStep['bought'], steps: [] as string[],
  }
  const send = (e: MerchantInput) => {
    const r = stepMerchant(freeze(st), { ...e, at: clock })
    st = r.state
    if (r.hush) d.hushes++
    if (r.view !== undefined) d.view = r.view
    if (r.view?.demo && d.steps[d.steps.length - 1] !== r.view.demo.step) d.steps.push(r.view.demo.step)
    Object.assign(d.run, r.run)
    d.said.push(...r.say.map((l) => l.line))
    d.sfx.push(...r.sfx)
    d.save.push(...r.save)
    d.track.push(...r.track)
    if (r.bought) d.bought = r.bought
    if (r.idleAt !== undefined) d.idleAt = r.idleAt
    if (r.wait) wait = r.wait
    if (r.end) d.end = true
    return r
  }
  const settle = () => {
    for (let i = 0; i < 200 && wait && wait.for !== 'gesture' && !d.end; i++) {
      const w = wait
      wait = undefined
      clock += w.for === 'sleep' ? w.ms : w.min ?? 0
      send({ type: w.for === 'sleep' ? 'slept' : 'heard' })
    }
  }
  return {
    d, send, settle,
    get state() { return st },
    get wait() { return wait },
    get clock() { return clock },
    pass(ms: number) { clock += ms },
    /** arrives and plays on until it is his turn */
    open() { send({ type: 'arrive' }); settle(); return this },
    give(...values: number[]) { for (const value of values) send({ type: 'coin', value }) },
    saves(op: SaveOp['op']) { return d.save.filter((s) => s.op === op) },
  }
}

describe('the merchant policy', () => {
  it('a first visit: he walks in, says hello, shows price, giving, the potion and the ✗, then it is his turn', () => {
    const v = visit({ demoDue: true })
    const r = v.send({ type: 'arrive' })
    expect(r.view).toMatchObject({ phase: 'arrive', price: 6, given: [], glow: { piles: true } })
    expect(r.run).toMatchObject({ phase: 'feedback', hintAvailable: false })
    expect(r.wait).toEqual({ for: 'sleep', ms: MERCHANT_ARRIVE_MS })
    expect(v.send({ type: 'slept' }).say).toEqual([{ line: 'm-hello' }])
    const demo = v.send({ type: 'heard' })
    expect(demo.run).toMatchObject({ phase: 'demo', hintAvailable: false })
    expect(demo.track).toEqual([{ e: 'merchant-demo', data: {} }])
    v.settle()
    expect(v.d.steps).toEqual(['price', 'give', 'potion', 'decline'])
    expect(v.d.said).toEqual(['m-hello', 'm-price', 'm-give', 'm-tap', 'm-decline'])
    expect(v.saves('setMerchantFlag')).toEqual([{ op: 'setMerchantFlag', k: 'demoSeen' }])
    expect(v.d.view).toMatchObject({ phase: 'pay', price: 6, coins: [5, 2, 2, 1, 10], given: [] })
    expect(v.d.view?.demo).toBeUndefined()
    expect(v.d.run).toMatchObject({ phase: 'answer', hintAvailable: true })
    expect(v.wait).toEqual({ for: 'gesture' })
    expect(v.d.idleAt).toBe(v.clock + MERCHANT_IDLE_MS)
  })

  it('the demo hand drags a coin for at least its drag time; each move has a new number', () => {
    const v = visit({ demoDue: true, moves: 41 })
    v.send({ type: 'arrive' })
    v.send({ type: 'slept' })
    v.send({ type: 'heard' })
    expect(v.d.view?.demo).toEqual({ step: 'price', t: 42 })
    const give = v.send({ type: 'heard' })
    expect(give.wait).toEqual({ for: 'say', min: MERCHANT_DEMO_DRAG_MS })
    expect(give.view?.demo).toEqual({ step: 'give', t: 43 })
    expect(v.state.moves).toBe(43)
  })

  it('a child who knows him hears only the short offer, and no demo', () => {
    const v = visit({ demoDue: true, knows: true }).open()
    expect(v.d.said).toEqual(['m-offer'])
    expect(v.d.steps).toEqual([])
    expect(v.d.view?.phase).toBe('pay')
  })

  it('the ✗ is hidden during the demo until its step; on arrival it works at once', () => {
    const v = visit({ demoDue: true })
    v.send({ type: 'arrive' })
    v.send({ type: 'slept' })
    v.send({ type: 'heard' })
    expect(v.d.view?.demo?.step).toBe('price')
    expect(v.send({ type: 'decline' }).track).toEqual([])
    for (let i = 0; i < 3; i++) v.send({ type: 'heard' })
    expect(v.d.view?.demo?.step).toBe('decline')
    expect(v.send({ type: 'decline' }).track).toEqual([{ e: 'merchant-decline', data: { phase: 'arrive' } }])

    const w = visit()
    w.send({ type: 'arrive' })
    const r = w.send({ type: 'decline' })
    expect(r.hush).toBe(true)
    expect(r.view).toMatchObject({ phase: 'leave', given: [] })
    expect(r.say).toEqual([{ line: 'm-bye' }])
    expect(w.saves('noteMerchant')).toEqual([{ op: 'noteMerchant', e: 'decline' }])
    w.settle()
    expect(w.d.end).toBe(true)
    expect(w.d.view).toBeNull()
  })

  it('the ✗ while he pays: his coins go back; a second ✗ and gestures after it do nothing', () => {
    const v = visit().open()
    v.give(5)
    v.send({ type: 'decline' })
    expect(v.d.view?.given).toEqual([])
    expect(v.d.idleAt).toBeNull()
    expect(v.send({ type: 'decline' }).track).toEqual([])
    expect(v.send({ type: 'coin', value: 1 }).view).toBeUndefined()
    v.settle()
    expect(v.d.said.filter((l) => l === 'm-bye')).toHaveLength(1)
    expect(v.d.end).toBe(true)
  })

  it('coins go into his hand from the piles, never one he no longer has; the hand sends back the last one', () => {
    const v = visit().open()
    v.give(2, 2, 2)
    expect(v.d.view?.given).toEqual([2, 2])
    expect(v.d.sfx).toEqual(['coin', 'coin'])
    const r = v.send({ type: 'hand' })
    expect(r.view?.given).toEqual([2])
    expect(r.track).toEqual([{ e: 'merchant-undo', data: {} }])
    v.send({ type: 'hand' })
    expect(v.send({ type: 'hand' }).track).toEqual([])
  })

  it('the potion with an empty hand: the hand glows every time, the line at most once per 4 seconds', () => {
    const v = visit().open()
    const r = v.send({ type: 'potion' })
    expect(r.view?.glow).toEqual({ hand: true })
    expect(r.say).toEqual([{ line: 'm-empty' }])
    expect(r.idleAt).toBeNull()
    v.settle()
    v.pass(1000)
    const again = v.send({ type: 'potion' })
    expect(again.view?.glow).toEqual({ hand: true })
    expect(again.say).toEqual([])
    expect(again.wait).toEqual({ for: 'gesture' })
    v.pass(4000)
    expect(v.send({ type: 'potion' }).say).toEqual([{ line: 'm-empty' }])
  })

  it('he counts the coins one by one, then the tag; the exact price buys a heart', () => {
    const v = visit({ hearts: 1 }).open()
    v.give(5, 1)
    const r = v.send({ type: 'potion' })
    expect(r.view).toMatchObject({ phase: 'count', counted: 0 })
    expect(r.run).toMatchObject({ phase: 'feedback' })
    expect(r.wait).toEqual({ for: 'sleep', ms: COUNT_STEP_MS })
    expect(v.send({ type: 'slept' }).view?.counted).toBe(1)
    const tag = v.send({ type: 'slept' })
    expect(tag.view).toMatchObject({ counted: 2, verdict: 'exact', tag: 'lit' })
    expect(tag.track).toEqual([{ e: 'merchant-offer', data: { sum: 6, price: 6, verdict: 'exact', coins: [5, 1] } }])
    const buy = v.send({ type: 'slept' })
    expect(buy.bought).toEqual({ hearts: 2, price: 6 })
    expect(buy.save).toEqual([
      { op: 'spendCoins', n: 6 }, { op: 'noteMerchant', e: 'purchase' }, { op: 'merchantPaid', exactNoHint: true, hinted: false },
    ])
    expect(buy.track).toEqual([{ e: 'merchant-buy', data: { price: 6, coins: [5, 1], hearts: 2 } }])
    expect(buy.view).toMatchObject({ phase: 'sold', bought: true })
    expect(buy.run).toMatchObject({ phase: 'celebrate', hintGlow: false })
    expect(buy.sfx).toEqual(['potion'])
    expect(buy.wait).toEqual({ for: 'sleep', ms: POTION_RING_MS })
    v.settle()
    expect(v.d.said.slice(-2)).toEqual(['m-exact', 'm-heart'])
    expect(v.d.sfx).toEqual(['coin', 'coin', 'count', 'count', 'potion'])
    expect(v.d.end).toBe(true)
    // gestures after the purchase do nothing
    expect(v.send({ type: 'decline' }).track).toEqual([])
  })

  it('the heart never goes above 3', () => {
    const v = visit({ hearts: 3 }).open()
    v.give(5, 1)
    v.send({ type: 'potion' })
    v.settle()
    expect(v.d.bought?.hearts).toBe(3)
  })

  it('not enough and too much cost nothing; the coins stay; two wrong tries in a row make the ? glow', () => {
    const v = visit().open()
    v.give(1)
    v.send({ type: 'potion' })
    v.settle()
    expect(v.d.said[v.d.said.length - 1]).toBe('m-short')
    expect(v.d.view).toMatchObject({ phase: 'pay', given: [1] })
    expect(v.d.view?.verdict).toBeUndefined()
    expect(v.d.run.hintGlow).toBeUndefined()
    v.give(10)
    v.send({ type: 'potion' })
    v.settle()
    expect(v.d.said[v.d.said.length - 1]).toBe('m-over')
    expect(v.d.run.hintGlow).toBe(true)
    expect(v.saves('noteMerchant')).toEqual([{ op: 'noteMerchant', e: 'short' }, { op: 'noteMerchant', e: 'over' }])
    expect(v.d.view?.given).toEqual([1, 10])
  })

  it('the first too-much ever: the hand taps his hand and the last coin flies back, once', () => {
    const v = visit({ undoShown: false }).open()
    v.give(5, 2)
    v.send({ type: 'potion' })
    v.settle()
    expect(v.d.steps).toEqual(['undo'])
    expect(v.d.said.slice(-2)).toEqual(['m-over', 'm-undo'])
    expect(v.d.view?.given).toEqual([5])
    expect(v.saves('setMerchantFlag')).toEqual([{ op: 'setMerchantFlag', k: 'undoShown' }])
    expect(v.state.undoShown).toBe(true)
    v.give(10)
    v.send({ type: 'potion' })
    v.settle()
    expect(v.d.said.filter((l) => l === 'm-undo')).toHaveLength(1)
    expect(v.d.view?.given).toEqual([5, 10])
  })

  it('the undo tap waits its time before the coin flies back', () => {
    const v = visit({ undoShown: false }).open()
    v.give(5, 2)
    v.send({ type: 'potion' })
    for (let i = 0; i < 3; i++) v.send({ type: 'slept' })
    const tap = v.send({ type: 'heard' })
    expect(tap.view?.demo?.step).toBe('undo')
    expect(tap.wait).toEqual({ for: 'sleep', ms: UNDO_TAP_MS })
    expect(v.send({ type: 'slept' }).sfx).toEqual(['coin'])
  })

  it('the ✗ works while the hand shows the undo', () => {
    const v = visit({ undoShown: false }).open()
    v.give(5, 2)
    v.send({ type: 'potion' })
    for (let i = 0; i < 3; i++) v.send({ type: 'slept' })
    v.send({ type: 'heard' })
    expect(v.send({ type: 'decline' }).view).toMatchObject({ phase: 'leave', given: [] })
  })

  it('the ? replays the walkthrough (the undo too once shown) and leaves the deal as it was; it counts as a hint', () => {
    const v = visit().open()
    v.give(5)
    const r = v.send({ type: 'help' })
    expect(r.view?.demo).toMatchObject({ step: 'price', help: true })
    expect(r.view?.phase).toBe('pay')
    expect(r.run).toMatchObject({ hintAvailable: false, hintGlow: false })
    expect(r.track).toEqual([{ e: 'merchant-help', data: { undo: true, given: 1 } }])
    expect(r.save).toEqual([{ op: 'noteMerchant', e: 'hint' }])
    // a second tap does nothing while it runs
    expect(v.send({ type: 'help' }).say).toEqual([])
    v.settle()
    expect(v.d.steps).toEqual(['price', 'give', 'potion', 'decline', 'undo'])
    expect(v.d.view).toMatchObject({ phase: 'pay', given: [5] })
    expect(v.d.view?.demo).toBeUndefined()
    expect(v.d.run.hintAvailable).toBe(true)
    expect(v.wait).toEqual({ for: 'gesture' })
    // the purchase after a hint is not a clean one for the coins' level
    v.give(1)
    v.send({ type: 'potion' })
    v.settle()
    expect(v.saves('merchantPaid')).toEqual([{ op: 'merchantPaid', exactNoHint: false, hinted: true }])
  })

  it('the ? leaves out the undo before he needed it; it does not run while he counts', () => {
    const v = visit({ undoShown: false }).open()
    v.send({ type: 'help' })
    v.settle()
    expect(v.d.steps).toEqual(['price', 'give', 'potion', 'decline'])
    const w = visit().open()
    w.give(1)
    w.send({ type: 'potion' })
    expect(w.send({ type: 'help' }).track).toEqual([])
  })

  it('a touch or a coin during the replay ends it at once; the coin is given', () => {
    const v = visit().open()
    v.send({ type: 'help' })
    v.send({ type: 'heard' })
    const touch = v.send({ type: 'touch' })
    expect(touch.hush).toBe(true)
    expect(touch.view?.demo).toBeUndefined()
    expect(touch.wait).toEqual({ for: 'gesture' })
    expect(touch.run).toMatchObject({ hintAvailable: true })
    expect(v.send({ type: 'touch' }).hush).toBeUndefined()

    const w = visit().open()
    w.send({ type: 'help' })
    const coin = w.send({ type: 'coin', value: 5 })
    expect(coin.view).toMatchObject({ given: [5] })
    expect(coin.view?.demo).toBeUndefined()
    expect(coin.wait).toEqual({ for: 'gesture' })
  })

  it('a wrong payment then a clean one: not a clean purchase', () => {
    const v = visit().open()
    v.give(1)
    v.send({ type: 'potion' })
    v.settle()
    v.give(5)
    v.send({ type: 'potion' })
    v.settle()
    expect(v.saves('merchantPaid')).toEqual([{ op: 'merchantPaid', exactNoHint: false, hinted: false }])
  })

  it('no tap for 20 s: he asks once more, once; a tap meanwhile starts the time again', () => {
    const v = visit().open()
    const t0 = v.clock
    expect(v.d.idleAt).toBe(t0 + MERCHANT_IDLE_MS)
    v.pass(15_000)
    v.give(5)
    v.pass(5_000)
    const early = v.send({ type: 'idle' })
    expect(early.say).toEqual([])
    expect(early.idleAt).toBe(t0 + 15_000 + MERCHANT_IDLE_MS)
    v.pass(15_000)
    const r = v.send({ type: 'idle' })
    expect(r.say).toEqual([{ line: 'm-again' }])
    expect(r.wait).toBeUndefined()
    expect(r.track).toEqual([{ e: 'merchant-idle', data: {} }])
    v.pass(60_000)
    expect(v.send({ type: 'idle' }).say).toEqual([])
  })

  it('after a pause: the visit as it was (coins in his hand), without the replay; a purchase or a goodbye is not repeated', () => {
    const v = visit().open()
    v.give(5)
    v.send({ type: 'help' })
    const back = v.send({ type: 'arrive' })
    expect(back.view).toMatchObject({ phase: 'pay', given: [5] })
    expect(back.view?.demo).toBeUndefined()
    expect(v.state.help).toBeNull()
    expect(back.say).toEqual([])

    // a pause during the demo shows it again from the start; it is seen only at its end
    const d = visit({ demoDue: true })
    d.send({ type: 'arrive' })
    d.send({ type: 'slept' })
    d.send({ type: 'heard' })
    d.send({ type: 'heard' })
    d.d.steps.length = 0
    d.send({ type: 'arrive' })
    expect(d.saves('setMerchantFlag')).toEqual([])
    d.settle()
    expect(d.d.steps).toEqual(['price', 'give', 'potion', 'decline'])
    expect(d.saves('setMerchantFlag')).toHaveLength(1)

    const b = visit().open()
    b.give(5, 1)
    b.send({ type: 'potion' })
    for (let i = 0; i < 3; i++) b.send({ type: 'slept' })
    expect(b.state.bought).toBe(true)
    const after = b.send({ type: 'arrive' })
    expect(after.view?.phase).toBe('leave')
    expect(after.wait).toEqual({ for: 'sleep', ms: MERCHANT_LEAVE_MS })
    b.settle()
    expect(b.saves('spendCoins')).toHaveLength(1)

    const x = visit().open()
    x.send({ type: 'decline' })
    expect(x.send({ type: 'arrive' }).say).toEqual([])
    x.settle()
    expect(x.d.said.filter((l) => l === 'm-bye')).toHaveLength(1)
    expect(x.d.end).toBe(true)
  })

  it('a pause while he walks in: he walks in again', () => {
    const v = visit()
    v.send({ type: 'arrive' })
    const again = v.send({ type: 'arrive' })
    expect(again.view?.phase).toBe('arrive')
    expect(again.wait).toEqual({ for: 'sleep', ms: MERCHANT_ARRIVE_MS })
  })
})
