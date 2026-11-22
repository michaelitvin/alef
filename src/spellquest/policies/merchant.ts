// The merchant's visit as a policy (spec: one duel, Part 2): the walk-in and his opening line, the first-visit demo, the
// ?'s walkthrough, the pay loop (coins, undo, the potion), the count and its verdict, the first undo, the purchase, the ✗
// and the walk-out. Pure: no store, no clock, no audio. `stepMerchant(state, event)` returns the next state and what the
// run must do (show, say, play, save, track, wait); the run (controller.ts) does it and sends back the events.
import { verdict as payVerdict } from '../logic/merchant'
import { HEARTS } from '../logic/run'

/** A merchant's visit at a checkpoint: drawn over the stage by `Merchant`. */
export interface MerchantView {
  phase: 'arrive' | 'pay' | 'count' | 'leave' | 'sold'
  price: number
  /** all his savings for this visit, as composed at arrival (the coins in the merchant's hand included) */
  coins: number[]
  /** the coins in the merchant's hand, in giving order */
  given: number[]
  /** while the merchant counts: how many of the given coins he has counted (the bubble shows their running total) */
  counted?: number
  verdict?: 'exact' | 'short' | 'over'
  /** he bought the potion: it flew to the wizard and the coins went into the merchant's pouch */
  bought?: boolean
  /** the tag lights after counting (both numbers seen together), and flashes when the payment was not right */
  tag?: 'lit' | 'flash'
  glow?: { tag?: boolean; hand?: boolean; potion?: boolean; decline?: boolean; piles?: boolean }
  /** the demo hand shows this step; `t` changes on every new demo move; `help`: the ? replays it while he pays (his coins
   * stay pickable, and a touch on them ends the replay) */
  demo?: { step: DemoStep; t: number; help?: boolean }
}
type DemoStep = 'price' | 'give' | 'potion' | 'decline' | 'undo'

/** the gestures of a merchant's visit */
export type MerchantGesture = { type: 'coin'; value: number } | { type: 'hand' } | { type: 'potion' } | { type: 'decline' }

/**
 * What the run tells the policy. `arrive`: the visit starts, or goes on after a pause (as it was, without a replay that
 * ran). `heard` / `slept`: the wait it asked for is over. `help`: the ? button. `touch`: he touched an answer (a replay
 * of the walkthrough ends). `idle`: the idle time it asked for has come. `at` = the run's clock.
 */
export type MerchantInput =
  | { type: 'arrive' } | MerchantGesture | { type: 'help' } | { type: 'touch' } | { type: 'idle' } | { type: 'heard' } | { type: 'slept' }
export type MerchantEvent = MerchantInput & { at: number }

/** the merchant walks in this long before his opening line */
export const MERCHANT_ARRIVE_MS = 1200
/** he counts one coin each this long */
export const COUNT_STEP_MS = 600
/** he walks away this long */
export const MERCHANT_LEAVE_MS = 1200
/** no tap for this long while he pays: the merchant asks once more (once per visit; there is no time limit) */
export const MERCHANT_IDLE_MS = 20000
/** the empty-hand line (first coins) is said at most once in this time */
export const MERCHANT_EMPTY_EVERY_MS = 4000
/** the demo hand's drag of a coin into the merchant's hand (Merchant.tsx draws it) */
export const MERCHANT_DEMO_DRAG_MS = 1800
/** the demo hand moves to the merchant's hand before the coin flies back */
export const UNDO_TAP_MS = 700
/** the potion's sound rings this long before he speaks (the run's SFX_RING_MS) */
export const POTION_RING_MS = 400

/** a line of his (the run picks its variation) */
export interface LineRequest { line: string }
export type MerchantSfx = 'coin' | 'count' | 'potion'
export type SaveOp =
  | { op: 'noteMerchant'; e: 'visit' | 'purchase' | 'decline' | 'short' | 'over' | 'hint' }
  | { op: 'setMerchantFlag'; k: 'demoSeen' | 'undoShown' }
  | { op: 'merchantPaid'; exactNoHint: boolean; hinted: boolean }
  | { op: 'spendCoins'; n: number }
export interface TrackRequest { e: string; data: Record<string, unknown> }
/** the run's view around the merchant (the run's phase, the ? button) */
export interface RunPatch {
  phase?: 'demo' | 'answer' | 'feedback' | 'celebrate'
  hintAvailable?: boolean
  hintGlow?: boolean
  overlay?: null
  needNext?: false
}
/**
 * What the run waits for before the next event: the step's lines (`heard`; with `min`, at least that long too), a time
 * (`slept`), or his gestures (nothing runs). A new wait replaces the one that runs (its end is not sent).
 */
export type Wait = { for: 'say'; min?: number } | { for: 'sleep'; ms: number } | { for: 'gesture' }

export interface MerchantStep {
  state: MerchantState
  /** the merchant's view after this step (undefined: as it was; null: he is gone) */
  view?: MerchantView | null
  run?: RunPatch
  /** stop the voice that plays, before this step's lines */
  hush?: boolean
  /** lines in order; the run waits for them when `wait` is `say`, otherwise they play on their own */
  say: LineRequest[]
  sfx: MerchantSfx[]
  save: SaveOp[]
  track: TrackRequest[]
  /** he bought the potion: a heart comes back (it flies to the top bar) and the price leaves the top bar's coins */
  bought?: { hearts: number; price: number }
  /** the idle line's time (the run's clock): arm a timer for it; null: no idle timer */
  idleAt?: number | null
  wait?: Wait
  /** the visit is over */
  end?: boolean
}

type Flow =
  | { k: 'walk-in' } | { k: 'opening' } | { k: 'demo'; i: number } | { k: 'pay' } | { k: 'empty' }
  | { k: 'count'; i: number; given: number[] } | { k: 'tag'; vd: 'exact' | 'short' | 'over' } | { k: 'wrong'; vd: 'short' | 'over' }
  | { k: 'undo-tap' } | { k: 'undo-line' } | { k: 'ring' } | { k: 'thanks' } | { k: 'bye' } | { k: 'walk-out' } | { k: 'gone' }

/** the visit's facts that the run knows at his arrival */
export interface MerchantCtx {
  price: number
  /** the child's coins for this visit, composed at arrival */
  coins: number[]
  /** he has bought from him before: the short offer, and no demo */
  knows: boolean
  /** the first-visit demo is due */
  demoDue: boolean
  /** the undo was shown to him before */
  undoShown: boolean
  /** the run's hearts now */
  hearts: number
  /** the demo hand's last move number (it only grows) */
  moves: number
  /** the run's clock */
  now: number
}

export interface MerchantState {
  price: number; coins: number[]; given: number[]
  knows: boolean; demoDue: boolean; undoShown: boolean; hearts: number
  view: MerchantView | null
  flow: Flow
  said: boolean; bought: boolean; declined: boolean; byeSaid: boolean
  /** the first-visit demo has played to its end in this visit */
  demoDone: boolean
  idleSaid: boolean
  /** his last tap (the run's clock) */
  lastTouch: number
  /** when the empty-hand line was last said: at most once per MERCHANT_EMPTY_EVERY_MS */
  emptySaidAt: number
  wrongTries: number
  /** wrong payments in a row in this visit (the ? glows after two) */
  wrongInRow: number
  hinted: boolean
  /** the ?'s walkthrough runs: its steps, the step now, the glow to put back when it ends */
  help: { steps: DemoStep[]; i: number; glow?: MerchantView['glow'] } | null
  moves: number
}

/** A visit as he arrives (the run sends `arrive` next). */
export function merchantVisit(c: MerchantCtx): MerchantState {
  return {
    price: c.price, coins: c.coins, given: [], knows: c.knows, demoDue: c.demoDue, undoShown: c.undoShown, hearts: c.hearts,
    view: null, flow: { k: 'walk-in' }, said: false, bought: false, declined: false, byeSaid: false, demoDone: false, idleSaid: false,
    lastTouch: c.now, emptySaidAt: -Infinity, wrongTries: 0, wrongInRow: 0, hinted: false, help: null, moves: c.moves,
  }
}

const LINE: Record<DemoStep, string> = { price: 'm-price', give: 'm-give', potion: 'm-tap', decline: 'm-decline', undo: 'm-undo' }
const GLOW: Record<DemoStep, MerchantView['glow']> = { price: { tag: true }, give: undefined, potion: { potion: true }, decline: { decline: true }, undo: { hand: true } }
const DEMO: DemoStep[] = ['price', 'give', 'potion', 'decline']

/** One step of the visit. Never changes `state`. */
export function stepMerchant(state: MerchantState, ev: MerchantEvent): MerchantStep {
  const s: MerchantState = { ...state }
  const r: MerchantStep = { state: s, say: [], sfx: [], save: [], track: [] }
  const now = ev.at
  const show = (v: MerchantView | null) => { s.view = v; r.view = v }
  const mv = (p: Partial<MerchantView>) => { if (s.view) show({ ...s.view, ...p }) }
  const run = (p: RunPatch) => { r.run = { ...r.run, ...p } }
  const say = (...lines: string[]) => { for (const line of lines) r.say.push({ line }) }
  const go = (flow: Flow, wait: Wait) => { s.flow = flow; r.wait = wait }

  /** his turn: he gives coins, takes them back, taps the potion (a glow stays until he gives a coin) */
  const payTop = () => {
    mv({ phase: 'pay', counted: undefined, verdict: undefined, tag: undefined, demo: undefined, given: [...s.given] })
    run({ phase: 'answer', hintAvailable: true })
    s.lastTouch = Math.max(s.lastTouch, now)
    go({ k: 'pay' }, { for: 'gesture' })
    if (!s.idleSaid) r.idleAt = s.lastTouch + MERCHANT_IDLE_MS
  }
  /** a step of the walkthrough: the first-visit demo, or the ?'s replay while he pays */
  const demoStep = (step: DemoStep, help: boolean) => {
    mv({ phase: help ? 'pay' : 'arrive', demo: { step, t: ++s.moves, ...(help ? { help: true } : {}) }, glow: GLOW[step] })
    say(LINE[step])
    r.wait = { for: 'say', ...(step === 'give' ? { min: MERCHANT_DEMO_DRAG_MS } : {}) }
  }
  /** after his opening line (or a pause): the first-visit demo when it is due, then his turn */
  const afterOpening = () => {
    if (!s.demoDone && !s.knows && s.demoDue) {
      run({ phase: 'demo', hintAvailable: false })
      r.track.push({ e: 'merchant-demo', data: {} })
      s.flow = { k: 'demo', i: 0 }
      demoStep(DEMO[0], false)
      return
    }
    s.demoDone = true
    payTop()
  }
  /** the ?'s replay ends (its last step, or he acted): the deal as it was, his turn again */
  const endHelp = () => {
    const h = s.help
    if (!h) return
    s.help = null
    s.lastTouch = now
    mv({ demo: undefined, glow: h.glow })
    if (s.view?.phase === 'pay') run({ hintAvailable: true })
  }
  /** he walks away (after the ✗: his coins go back to their piles and he says goodbye) */
  const visitEnd = () => {
    run({ phase: 'feedback', hintAvailable: false, hintGlow: false })
    r.idleAt = null
    if (s.declined) {
      s.given = []
      mv({ phase: 'leave', given: [], glow: undefined, demo: undefined, tag: undefined, counted: undefined, verdict: undefined })
      if (!s.byeSaid) {
        s.byeSaid = true
        say('m-bye')
        go({ k: 'bye' }, { for: 'say' })
        return
      }
    } else mv({ phase: 'leave', glow: undefined })
    go({ k: 'walk-out' }, { for: 'sleep', ms: MERCHANT_LEAVE_MS })
  }
  /** the exact price: the coins are spent, the potion flies to the wizard and a heart to the top bar */
  const buy = () => {
    s.bought = true
    r.save.push({ op: 'spendCoins', n: s.price }, { op: 'noteMerchant', e: 'purchase' },
      { op: 'merchantPaid', exactNoHint: s.wrongTries === 0 && !s.hinted, hinted: s.hinted })
    s.wrongInRow = 0
    s.hearts = Math.min(HEARTS, s.hearts + 1)
    r.track.push({ e: 'merchant-buy', data: { price: s.price, coins: [...s.given], hearts: s.hearts } })
    mv({ phase: 'sold', glow: undefined, bought: true })
    run({ hintGlow: false, phase: 'celebrate' })
    r.bought = { hearts: s.hearts, price: s.price }
    r.sfx.push('potion')
    go({ k: 'ring' }, { for: 'sleep', ms: POTION_RING_MS })
  }
  /** he taps the potion: the merchant counts the coins in his hand (or asks for coins) */
  const potion = () => {
    r.idleAt = null
    if (!s.given.length) {
      // the hand glows at every tap; the line only once in a while (a child taps the potion again and again)
      mv({ glow: { hand: true } })
      if (now - s.emptySaidAt < MERCHANT_EMPTY_EVERY_MS) { payTop(); return }
      s.emptySaidAt = now
      run({ phase: 'feedback' })
      say('m-empty')
      go({ k: 'empty' }, { for: 'say' })
      return
    }
    const given = [...s.given]
    run({ phase: 'feedback' })
    mv({ phase: 'count', counted: 0, glow: undefined })
    go({ k: 'count', i: 0, given }, { for: 'sleep', ms: COUNT_STEP_MS })
  }

  const f = s.flow
  switch (ev.type) {
    case 'arrive': {
      if (s.bought || s.declined) { visitEnd(); break }
      if (!s.said) {
        show({ phase: 'arrive', price: s.price, coins: s.coins, given: s.given, glow: { piles: true } })
        run({ phase: 'feedback', overlay: null, needNext: false, hintAvailable: false })
        go({ k: 'walk-in' }, { for: 'sleep', ms: MERCHANT_ARRIVE_MS })
        break
      }
      // after a pause: the visit as it was, the coins in his hand included (a walkthrough replay is not resumed)
      s.help = null
      show({ phase: 'pay', price: s.price, coins: s.coins, given: s.given })
      run({ overlay: null, needNext: false, hintAvailable: false })
      afterOpening()
      break
    }
    case 'decline': {
      // the ✗, at any moment of the visit; it is hidden while the first-visit demo plays (the undo's hand shows while the
      // ✗ is on the screen: it works then too)
      const v = s.view
      if (!v || s.bought || s.declined) break
      if (v.phase === 'leave' || v.phase === 'sold' || (v.demo && !v.demo.help && v.demo.step !== 'decline' && v.demo.step !== 'undo')) break
      s.declined = true
      s.help = null
      r.track.push({ e: 'merchant-decline', data: { phase: v.phase } })
      r.save.push({ op: 'noteMerchant', e: 'decline' })
      r.hush = true
      visitEnd()
      break
    }
    case 'coin': case 'hand': case 'potion': {
      if (!s.view || s.bought || s.declined || s.view.phase !== 'pay') break
      // he acts during the ?'s walkthrough: it ends at once, and his move counts
      if (s.help) { r.hush = true; endHelp(); r.wait = { for: 'gesture' } }
      s.lastTouch = now
      if (ev.type === 'coin') {
        // the top coin of that pile jumps into his hand (a coin he no longer has cannot be given)
        const left = [...s.coins]
        for (const x of s.given) left.splice(left.indexOf(x), 1)
        if (!left.includes(ev.value)) break
        s.given = [...s.given, ev.value]
        r.sfx.push('coin')
        mv({ given: [...s.given], glow: undefined })
      } else if (ev.type === 'hand') {
        // undo: the last coin given goes back to its pile
        if (!s.given.length) break
        s.given = s.given.slice(0, -1)
        r.track.push({ e: 'merchant-undo', data: {} })
        r.sfx.push('coin')
        mv({ given: [...s.given] })
      } else if (f.k === 'pay') potion()
      break
    }
    case 'help': {
      // the ? while he pays and nothing else plays: the walkthrough again (the undo too once it was shown to him). It
      // counts as a hint for the parent's money section and the coins' level; the button is hidden while it runs.
      const v = s.view
      if (!v || v.phase !== 'pay' || v.demo || s.bought || s.declined || s.help || f.k !== 'pay') break
      s.help = { steps: s.undoShown ? [...DEMO, 'undo'] : DEMO, i: 0, glow: v.glow }
      s.hinted = true
      s.lastTouch = now
      s.wrongInRow = 0
      run({ hintGlow: false, hintAvailable: false })
      r.save.push({ op: 'noteMerchant', e: 'hint' })
      r.track.push({ e: 'merchant-help', data: { undo: s.undoShown, given: s.given.length } })
      r.hush = true
      demoStep(s.help.steps[0], true)
      break
    }
    case 'touch': {
      if (!s.help) break
      r.hush = true
      endHelp()
      r.wait = { for: 'gesture' }
      break
    }
    case 'idle': {
      // no tap for MERCHANT_IDLE_MS: he asks once more, once per visit (coins given meanwhile count as taps)
      if (f.k !== 'pay' || s.view?.phase !== 'pay' || s.idleSaid) break
      if (now - s.lastTouch < MERCHANT_IDLE_MS) { r.idleAt = s.lastTouch + MERCHANT_IDLE_MS; break }
      s.idleSaid = true
      r.track.push({ e: 'merchant-idle', data: {} })
      say('m-again')
      break
    }
    case 'heard': case 'slept': {
      switch (f.k) {
        case 'walk-in':
          // a child who knows the merchant (he bought from him before) hears only the short offer, and no demo (the parent)
          say(s.knows ? 'm-offer' : 'm-hello')
          go({ k: 'opening' }, { for: 'say' })
          break
        case 'opening':
          s.said = true
          mv({ glow: undefined })
          afterOpening()
          break
        case 'demo':
          if (f.i + 1 < DEMO.length) { s.flow = { k: 'demo', i: f.i + 1 }; demoStep(DEMO[f.i + 1], false); break }
          mv({ demo: undefined, glow: undefined })
          r.save.push({ op: 'setMerchantFlag', k: 'demoSeen' })
          s.demoDone = true
          payTop()
          break
        case 'pay': {
          const h = s.help
          if (!h) break
          if (h.i + 1 < h.steps.length) { s.help = { ...h, i: h.i + 1 }; demoStep(h.steps[h.i + 1], true); break }
          endHelp()
          r.wait = { for: 'gesture' }
          break
        }
        case 'empty':
          payTop()
          break
        case 'count': {
          mv({ counted: f.i + 1 })
          r.sfx.push('count')
          if (f.i + 1 < f.given.length) { go({ ...f, i: f.i + 1 }, { for: 'sleep', ms: COUNT_STEP_MS }); break }
          const sum = f.given.reduce((a, b) => a + b, 0)
          const vd = payVerdict(sum, s.price)
          mv({ verdict: vd, tag: vd === 'exact' ? 'lit' : 'flash' })
          r.track.push({ e: 'merchant-offer', data: { sum, price: s.price, verdict: vd, coins: f.given } })
          go({ k: 'tag', vd }, { for: 'sleep', ms: COUNT_STEP_MS })
          break
        }
        case 'tag': {
          if (f.vd === 'exact') { buy(); break }
          // wrong tries cost nothing; the coins stay in his hand
          s.wrongTries++
          s.wrongInRow++
          r.save.push({ op: 'noteMerchant', e: f.vd })
          // two wrong tries in a row: the ? glows (it does not open by itself)
          if (s.wrongInRow >= 2) run({ hintGlow: true })
          say(f.vd === 'short' ? 'm-short' : 'm-over')
          go({ k: 'wrong', vd: f.vd }, { for: 'say' })
          break
        }
        case 'wrong':
          if (f.vd === 'over' && !s.undoShown) {
            // the first time ever he gives too much: the hand taps the merchant's hand and the last coin flies back (rule:
            // explain a move when he first needs it)
            mv({ demo: { step: 'undo', t: ++s.moves } })
            go({ k: 'undo-tap' }, { for: 'sleep', ms: UNDO_TAP_MS })
            break
          }
          payTop()
          break
        case 'undo-tap':
          s.given = s.given.slice(0, -1)
          r.sfx.push('coin')
          mv({ given: [...s.given] })
          say('m-undo')
          go({ k: 'undo-line' }, { for: 'say' })
          break
        case 'undo-line':
          mv({ demo: undefined })
          r.save.push({ op: 'setMerchantFlag', k: 'undoShown' })
          s.undoShown = true
          payTop()
          break
        case 'ring':
          // then he says that he has a heart back (the parent)
          say('m-exact', 'm-heart')
          go({ k: 'thanks' }, { for: 'say' })
          break
        case 'thanks':
          visitEnd()
          break
        case 'bye':
          go({ k: 'walk-out' }, { for: 'sleep', ms: MERCHANT_LEAVE_MS })
          break
        case 'walk-out':
          show(null)
          s.flow = { k: 'gone' }
          r.end = true
          break
        case 'gone':
          break
      }
      break
    }
  }
  return r
}
