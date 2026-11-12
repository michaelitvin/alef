// The run controller (spec: Run, Screens). One async flow per screen: question → cue → answer → feedback, with mistakes
// that wait for next, explanations, hints, demos, the dotted-letter introduction, the word link, celebrations, the hearts
// (for the whole run; one comes back at the end of each pass) and the run's end. React reads `view` through subscribe(); gestures come in through gesture().
// Pausing aborts the flow at its next await; resume restarts the same round from the start.
import type { Rng } from '../shared/adaptive'
import { item as itemOf, mark as markOf, syllable, type MarkId, type Stage } from './logic/content'
import { features, predict, type ScreenId } from './logic/predict'
import {
  broomTarget, broomWave, cauldronRound, ghostRound, isNewStageChoice, ladderPlan, letterChoice,
  type Choice, type Kind, type LadderStep, type RoundCtx,
} from './logic/rounds'
import {
  TARGET_EVERY, orbEvents, wavePos, VISIT, HEARTS, cycleOf, heartsAtRunStart, newRound, flightPace, coinsFor, multiplierOf, nextScreen, onAnswer, passEndHeart, runStart, travelMs,
  type Hearts,
} from './logic/run'
import { WORDS, wordLinkFor, type Word } from './data/words'
import { dotIntroFor, dotIntroParts } from './logic/dotIntro'
import { ZOOM_MS } from './components/screens/Doors'
import { lineAudioId, lineById } from './data/lines'
import { playSfx, sayParts, startMusic, stopMusic, stopVoice, type Duel2Sfx } from './audio/duel2Audio'
import { useDuel2Store } from './store'
import { BOSS_COINS, BOSS_HITS, BOSS_SLOW, bossTarget, bossWave, chooseBoss, isBossVisit, type BossKind } from './logic/boss'
import { duel2Telemetry } from './telemetry'
import type { Highlight } from './components/ExplainPanel'
import { strokesOf, type Pt, type Script } from './data/strokes'
import { LetterChecker, bbox, type Verdict, judgeMarks, lineFeedback, markTargets, pathLength, type Box, type LineKind, type MarkBoxes, type MarkSpec } from './logic/recognizer'
import { drawFeature, drawWords, marksFor, needsDemo, scriptOf, splitWord } from './logic/draw'
import { drawLayout, strokeTiming, type DrawLayout } from './logic/drawLayout'
import { composeCoins, hintCoins, merchantDue, priceAt, verdict as payVerdict } from './logic/merchant'
import { NEVER_VISITED } from './store'
import { SHORT_AFTER, screenRecent, skipInCycle, towerMastered, visitScale } from './logic/mastery'
import { DUEL_MARKS } from '../utils/duel/marks'
import { skippedMonsters } from '../utils/duel/rules'
import { useProgressStore } from '../stores/progressStore'

export type Phase = 'demo' | 'question' | 'answer' | 'feedback' | 'mistake' | 'explain' | 'celebrate'
export type Reveal = { right: string; wrong?: string }
export interface BroomWave {
  id: number; choices: Choice[]; startMs: number; offsets: number[]; jitter: number[]; resolved: boolean[]
  /** each orb's lane (a two-orb wave uses two of the three lanes); by default an orb's lane is its index */
  lanes?: number[]
  /** a mistake happened in this wave: its other orbs no longer count */
  spent?: boolean
}
export type BossPose = 'fly' | 'hit' | 'down'
export interface BossView {
  kind: BossKind
  /** segments of its health bar still lit */
  hitsLeft: number
  pose: BossPose
  /** it has swooped in (after a pause it is simply there) */
  arrived: boolean
  /** the last spell bolt from the wizard to the boss (the lane it left from) */
  bolt?: { id: number; lane: number }
  won?: boolean
  /** his first win against this kind: the boss falls into a golden frame that flies to the trophy shelf */
  first?: boolean
}
export interface BroomView {
  screen: 'broom'; kind: Kind; waves: BroomWave[]; travelMs: number; lane: 0 | 1 | 2; target: Choice; reveal?: Reveal; missed?: boolean
  /** a boss visit (every second broom visit of a run) */
  boss?: BossView
  /** the last hit or miss during the flight (the flight does not stop): drives the flash, the shake and the dizzy wizard */
  fx?: { id: number; kind: 'hit' | 'miss'; at: number }
  /** the flight is over: its finale (the wizard swoops away) */
  finished?: boolean
}
export interface CauldronView { screen: 'cauldron'; letterId: string; orbs: MarkId[]; target: Choice; joined?: boolean; reveal?: { right: MarkId; wrong?: MarkId } }
export interface LadderView { screen: 'ladder'; built: Choice[]; plates: Choice[]; rungs: number; target: Choice; reveal?: Reveal }
export interface GhostsView { screen: 'ghosts'; signs: Choice[]; target: Choice; zapped?: string; reveal?: Reveal }
export interface DoorsView {
  screen: 'doors'; word: Word; lit: 0 | 1 | 2; keys: Word[]; opening: boolean; zooming: boolean; reveal?: Reveal
  /** the last door: the crystal (its kind) waits behind it */
  behind?: { crystal: number }
}
export interface CrystalView { screen: 'crystal'; kind: number }
/** one of his strokes on the drawing screen (letter units of the slot): live while judged, gold when right */
export interface DrawStroke { id: number; pts: Pt[]; state: 'live' | 'pending' | 'ok' | 'wrong' | 'helped' | 'mark' }
export interface DrawView {
  screen: 'draw'; word: Word; script: Script; letter: string; layout: DrawLayout; marks: MarkSpec[]
  strokes: DrawStroke[]
  mode: 'letter' | 'mark' | 'done'
  /** the glowing hand draws these strokes (a one-point stroke is a tap); a hint's demo stops at his next stroke */
  demo?: { id: number; strokes: Pt[][]; hint?: boolean }
  /** the letter left the lines: the part outside glows orange for a moment (it still counts) */
  lineFx?: { kind: LineKind; outside?: { from: number; to: number } }
  /** what the voice names glows: the marks' places */
  glow?: 'marks'
}
/** The first duel's tower (spec: one duel, Part 3): drawn by `Tower` (the duel's own board), which reports each answer
 * (towerAnswer) and the end of the visit (towerDone). `visit` changes with each new visit (a pause keeps it). */
export interface TowerView { screen: 'tower'; wave: number; waves: number; boss: boolean; visit: number }
export type ScreenView = BroomView | CauldronView | LadderView | GhostsView | DoorsView | CrystalView | DrawView | TowerView

/** A merchant's visit at a checkpoint (spec: one duel, Part 2): drawn over the stage by `Merchant`. */
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
  glow?: { tag?: boolean; hand?: boolean; potion?: boolean; decline?: boolean; piles?: boolean; hint?: number[] }
  /** the demo hand shows this step; `t` changes on every new demo move */
  demo?: { step: 'price' | 'give' | 'potion' | 'decline' | 'undo'; t: number }
}

export type Overlay =
  | { kind: 'demo'; line: string; demo: string }
  | { kind: 'explain'; parts: { id: string; highlight: Highlight }[]; target: Choice }
  | { kind: 'dot'; parts: { id: string; highlight: Highlight }[]; soft: string; hard: string }
  | { kind: 'hint'; target: Choice; glow: Highlight | null }
  | { kind: 'word'; word: Word }

export interface View {
  phase: Phase
  hearts: number
  screen: ScreenView | null
  overlay: Overlay | null
  /** an explanation or a demo waits for this */
  needNext: boolean
  /** after a mistake: the right answer is marked and the round waits for him to do the right move himself (the parent) */
  fixing?: boolean
  hintAvailable: boolean
  paused: boolean
  over: { score: number; crystals: number; best: boolean; bosses?: BossKind[]; startStars?: number } | null
  /** the points of this run (right answers) */
  score: number
  /** counts the coins he earned this run (a coin pops in the top bar) */
  coinPop?: number
  /** the streak multiplier of the coins, shown in the top bar (spec: one duel) */
  mult: 1 | 2 | 3
  /** a heart flies to the top bar (the end of a pass, the merchant's potion; over any screen); `at` = the controller's
   * clock; `from` = where it rises (stage units; the middle by default) */
  heal?: { id: number; at: number; from?: { x: number; y: number } }
  /** the hearts given back at the ends of passes in this run */
  passHeart?: number
  /** the hearts ran out: the short defeat scene plays (the dizzy wizard spins and falls), then `over` */
  defeat?: boolean
  /** the merchant's visit at a checkpoint (drawn instead of the screen) */
  merchant?: MerchantView
  /** the wand glows: two wrong payments in a row (it does not open the hint by itself) */
  hintGlow?: boolean
  /** the coins the top bar shows instead of his balance (the gallery's merchant visit) */
  coins?: number
}
/** the gestures of a merchant's visit */
export type MerchantGesture = { type: 'coin'; value: number } | { type: 'hand' } | { type: 'potion' } | { type: 'decline' }

export interface RunOpts {
  sandbox?: boolean
  force?: {
    /** 'merchant': the gallery's merchant visit (1 heart, 40 coins); the visit ends the gallery screen */
    screen: ScreenId | 'crystal' | 'dot' | 'merchant'; stage: Stage; kind?: Kind; demo?: boolean; fixed?: 'letter' | 'vowel' | 'dot'; script?: Script
    /** the gallery: a boss of this kind on the broom flight */
    boss?: BossKind
    /** the gallery: the tower's boss visit */
    towerBoss?: boolean
  }
  /** a single minigame from the path (Plan 4): no merchant */
  session?: { screen: ScreenId }
  rng?: Rng
  now?: () => number
}

class Aborted extends Error {}
/** the ✗ ended the visit (it can come at any moment of a visit) */
class Declined extends Error {}
/** the merchant walks in this long before his opening line */
const MERCHANT_ARRIVE_MS = 1200
/** he counts one coin each this long */
const COUNT_STEP_MS = 600
/** he walks away this long */
const MERCHANT_LEAVE_MS = 1200
/** no tap for this long while he pays: the merchant asks once more (once per visit; there is no time limit) */
const MERCHANT_IDLE_MS = 20000
/** the demo hand's drag of a coin into the merchant's hand (Merchant.tsx draws it) */
export const MERCHANT_DEMO_DRAG_MS = 1800
/** the demo hand moves to the merchant's hand before the coin flies back */
const UNDO_TAP_MS = 700
/** where the potion's heart rises: the wizard (Merchant.tsx WIZARD) */
const WIZARD_AT = { x: 260, y: 520 }
/** no pick for this long: the instruction and the sound play once */
/** an effect rings this long before the voice goes on (fluent, but not cut) */
const SFX_RING_MS = 400
/** after his fixing move: the effect plays before the next round */
const FIX_DONE_MS = 700
/** a mistake's feedback (flash, glow, its sound) plays out this long before the flight's finale */
const FLIGHT_SETTLE_MS = 1400
/** the flight's finale: the wizard swoops away */
const FINALE_MS = 2500
/** the defeat scene: the dizzy wizard spins and falls (spec: one duel, a short and funny end) */
const DEFEAT_MS = 1800
/** praise is spoken this many times per kind, then only its sound plays */
const PRAISE_SPOKEN = 2
/** how long a praise with no words lets its sound play */
const PRAISE_SOUND_MS = 900
const IDLE_MS = 8000
/** no pick for this long: the hint shows by itself */
const IDLE_HINT_MS = 16000
const STREAK_EVERY = 5
const WORD_LINK_CHANCE = 0.25
const CONFIDENT_MS = 3000
const WAVE_EVERY = 0.55
/** the boss swoops in this long before its line */
const BOSS_ARRIVE_MS = 1300
/** its hit pose shows this long */
const BOSS_HIT_MS = 600
/** a bonus coin pops this long after the one before */
const COIN_POP_MS = 550
/** the most an orb starts late in its wave (fraction of the travel): popcorn, not a column */
const POPCORN = 0.28
/** drawing: wrong tries of one stroke (or of the marks) before the hand draws it for him (no dead end) */
const DRAW_TRIES = 3
/** a stroke shorter than this (letter units) is a tap, not a stroke of the letter */
const TAP_LEN = 0.06
/** a piece that waits for the rest of its stroke is settled after this pause */
const SETTLE_MS = 1000

const sylFeatures = (c: Choice, screen: ScreenId) => {
  const it = itemOf(c.itemId)
  return features(c.mark ? { item: it, mark: markOf(c.mark) } : { item: it }, screen)
}

export class RunController {
  view: View = { phase: 'question', hearts: HEARTS, screen: null, overlay: null, needNext: false, hintAvailable: false, paused: false, over: null, score: 0, mult: 1 }
  private listeners = new Set<() => void>()
  private token = 0
  private rng: Rng
  private now: () => number
  private pausedAt: number | null = null
  private pausedTotal = 0
  private hearts: Hearts = heartsAtRunStart()
  private screenId: ScreenId | 'crystal' = 'broom'
  private stage: Stage
  private roundInScreen = 0
  private score = 0
  private streak = 0
  private crystalsThisRun = 0
  private lastWordLink = false
  private lastLine: Record<string, number> = {}
  private pickWaiter: ((g: string) => void) | null = null
  private nextWaiter: (() => void) | null = null
  private cueStarted = 0
  private spokenTargets = new Set<string>()
  private fixWaiter: ((id: string) => void) | null = null
  /** the round the demo showed is the first round he plays (the parent: the letter changed after the demo) */
  private demoRound = false
  private fxId = 0
  private ladder: { fixed: 'letter' | 'vowel' | 'dot'; steps: LadderStep[]; built: Choice[] } | null = null
  private doorWords: Word[] = []
  private broomTimer: number | undefined
  private waveId = 0
  private running = false
  private resuming = false
  /** the current round was answered (right or wrong): a resume must not replay it */
  private answered = false
  /** a broom/ghost visit keeps its kind (letters or syllables) across a pause */
  private visitKind: Kind | null = null
  /** the run is ending: a pause no longer cancels the summary */
  private ending = false
  /** the crystal of this cycle was given (a pause during it must not give it twice) */
  private crystalAwarded = false
  /** a pass has ended: its heart moment is due before the next screen */
  private passDue = false
  /** the heart of this pass end was given (a pause during its moment must not give it twice) */
  private passHeartGiven = false
  private passHearts = 0
  /** this pass went through every screen of the cycle: the run started at the cycle's first screen, or a pass ended
   * since (spec: "a pass is one trip through all his open minigames"; a run resumed near the end gets no heart there) */
  private passFull = false
  private demoShown = false
  private assets: string[] = []
  /** broom visits in this run: every second one is a boss visit */
  private broomVisits = 0
  /** this visit's boss kind (null: a normal flight; undefined: not decided yet) */
  private visitBoss: BossKind | null | undefined = undefined
  /** this visit has started: its hearts were filled (a pause keeps them) */
  private visitStarted = false
  /** the boss of this visit: its hits survive a pause (rule: losing them is the "gives up" problem again) */
  private boss: { kind: BossKind; hitsLeft: number; arrived: boolean; startedAt: number; won?: boolean; first?: boolean; celebrated?: boolean; praised?: boolean; coins: number; newSaid?: boolean } | null = null
  private bossesWon: BossKind[] = []
  private startStars = 0
  private drawPlan: Word[] | null = null
  private drawState: { checker: LetterChecker; boxes?: MarkBoxes } | null = null
  private strokeWaiter: ((pts: Pt[]) => void) | null = null
  private strokeNo = 0
  private demoNo = 0
  /** a screen has ended: the checkpoint (maybe the merchant) comes before the next one */
  private checkpointDue = false
  /** the merchant's visit in progress: it survives a pause (coins in his hand included) */
  private visit: {
    price: number; coins: number[]; given: number[]; said: boolean; bought: boolean; declined: boolean; byeSaid: boolean
    wrongTries: number; hinted: boolean; lastLine: string | null; decline: Promise<void>; declineNow: () => void
    /** the first-visit demo has played to its end in this visit; the idle line was said; his last tap (controller clock) */
    demoDone: boolean; idleSaid: boolean; lastTouch: number
  } | null = null
  private demoMove = 0
  private mWaiter: ((g: MerchantGesture) => void) | null = null
  /** the tower's visit in progress (it survives a pause: the same visit goes on); `done` = its last wave, once over */
  private tower: { wave: number; waves: number; boss: boolean; visit: number; done: number | null; coins: number; ended?: boolean } | null = null
  private towerNo = 0
  private towerWaiter: ((lastWave: number) => void) | null = null
  /** this visit's length (rounds, waves, rungs, doors or words), decided when it starts */
  private visitLen = 0
  /** the doors were skipped in this cycle: their crystal comes at the cycle's end */
  private crystalOwed = false
  /** the next screen after a crystal that came at the cycle's end */
  private afterCrystal: { screen: ScreenId; newCycle: boolean } | null = null
  private purchasesThisRun = 0
  /** wrong payments in a row in this visit (the wand glows after two) */
  private wrongInRow = 0

  constructor(private opts: RunOpts = {}) {
    this.rng = opts.rng ?? Math.random
    this.now = opts.now ?? (() => performance.now())
    this.stage = opts.force?.stage ?? useDuel2Store.getState().stage.stage
  }

  // ---- React bridge
  subscribe = (f: () => void) => { this.listeners.add(f); return () => { this.listeners.delete(f) } }
  getView = () => this.view
  private set(p: Partial<View>) { this.view = { ...this.view, ...p }; this.listeners.forEach((f) => f()) }
  private setScreen(p: Partial<ScreenView>) { if (this.view.screen) this.set({ screen: { ...this.view.screen, ...p } as ScreenView }) }
  /** the broom's clock: stops while paused */
  broomClock = () => (this.pausedAt ?? this.now()) - this.pausedTotal

  // ---- input
  gesture(g: { type: 'pick'; id: string } | { type: 'lane'; lane: 0 | 1 | 2 } | { type: 'stroke'; pts: Pt[] } | MerchantGesture) {
    if (this.view.paused) return
    if (g.type === 'coin' || g.type === 'hand' || g.type === 'potion' || g.type === 'decline') { this.merchantGesture(g); return }
    if (g.type === 'stroke') {
      if (this.view.phase !== 'answer' || !this.strokeWaiter || this.view.screen?.screen !== 'draw') return
      // a stroke stops a hint's hand at once (he shows that he knows)
      if (this.view.screen.demo?.hint) this.setScreen({ demo: undefined } as Partial<DrawView>)
      const w = this.strokeWaiter
      this.strokeWaiter = null
      w(g.pts)
      return
    }
    if (g.type === 'lane') {
      if (this.view.screen?.screen === 'broom') this.setScreen({ lane: g.lane } as Partial<BroomView>)
      return
    }
    if (this.view.phase === 'mistake') {
      // after a mistake only the marked right answer goes on: he does the right move himself (the parent)
      const right = (this.view.screen as { reveal?: { right: string } } | null)?.reveal?.right
      if (!this.ending && this.fixWaiter && right && g.id === right) {
        const w = this.fixWaiter
        this.fixWaiter = null
        w(g.id)
      }
      return
    }
    if (this.view.phase !== 'answer' || !this.pickWaiter) return
    const w = this.pickWaiter
    this.pickWaiter = null
    w(g.id)
  }
  next() {
    const w = this.nextWaiter
    this.nextWaiter = null
    this.set({ needNext: false })
    w?.()
  }
  replay() {
    if (this.view.merchant) {
      // the speaker says the merchant's last line again
      if (this.visit?.lastLine) { stopVoice(); void sayParts([{ id: this.visit.lastLine }]) }
      return
    }
    if (this.view.screen?.screen === 'draw') {
      this.track('replay', { screen: 'draw', target: this.view.screen.word.id, phase: this.view.phase })
      stopVoice()
      void sayParts([{ id: `w-${this.view.screen.word.id}` }])
      return
    }
    const t = this.currentTarget()
    if (!t) return
    this.track('replay', { screen: this.screenId, target: t.id, phase: this.view.phase })
    stopVoice()
    void sayParts([{ id: this.cueId(t) }])
  }
  hint() {
    if (this.view.merchant) { this.merchantHint(); return }
    const s = this.view.screen
    if (s?.screen === 'doors' && this.view.phase === 'answer') {
      // the door's hint: the syllables light again one at a time, slower, with no voice (he reads it)
      const t = this.token
      this.setScreen({ lit: 0 } as Partial<DoorsView>)
      void this.sleep(t, 600).then(() => this.setScreen({ lit: 1 } as Partial<DoorsView>))
        .then(() => this.sleep(t, 1400)).then(() => this.setScreen({ lit: 2 } as Partial<DoorsView>)).catch(() => {})
      return
    }
    if (s?.screen === 'draw') { if (this.view.phase === 'answer') this.drawHint(false); return }
    const t = this.currentTarget()
    if (!t || this.view.overlay) return
    void this.playHint(t, false).catch(() => {})
  }

  // ---- lifecycle
  start() {
    if (this.running) return
    this.running = true
    const st = useDuel2Store.getState()
    this.startStars = st.totalStars ?? 0
    // the hearts last the whole run (spec: one duel, Part 1)
    this.hearts = heartsAtRunStart()
    if (!this.opts.sandbox) duel2Telemetry.track('run-start', { stage: this.stage })
    const f = this.opts.force
    this.screenId = f ? (f.screen === 'dot' ? 'ladder' : f.screen === 'merchant' ? 'broom' : f.screen) : runStart(this.stage, st.lastEnded, this.drawOn(), this.bookOpen())
    this.passFull = !f && this.screenId === cycleOf(this.stage, this.drawOn(), this.bookOpen())[0]
    void this.loop()
  }
  destroy() {
    this.token++
    this.running = false
    this.stopBroom()
    stopVoice()
    stopMusic()
    // closing the game before the cycle's end: the crystal the skipped doors owe him is still his
    if (!this.view.over && !this.ending) this.payOwedCrystal()
    // the run is already ending (its run-end was sent): closing now is no abandon
    if (this.visit && !this.visit.bought && !this.visit.declined) this.track('merchant-decline', { phase: 'closed' })
    if (!this.view.over && !this.ending && !this.opts.sandbox && this.score > 0) duel2Telemetry.track('abandon', { screen: this.screenId, score: this.score })
  }
  pause() {
    if (this.view.paused || this.view.over || this.ending) return
    this.token++
    this.pausedAt = this.now()
    this.stopBroom()
    stopVoice()
    this.pickWaiter = null
    this.nextWaiter = null
    this.strokeWaiter = null
    this.mWaiter = null
    this.resuming = true
    this.set({ paused: true, overlay: null, needNext: false })
    this.track('pause', { screen: this.screenId, phase: this.view.phase })
  }
  resume() {
    if (!this.view.paused) return
    this.track('resume', { ms: this.pausedAt !== null ? Math.round(this.now() - this.pausedAt) : null })
    if (this.pausedAt !== null) this.pausedTotal += this.now() - this.pausedAt
    this.pausedAt = null
    this.set({ paused: false })
    void this.loop()
  }

  /** the drawing screen is in the lap only when the parent turned it on (off until the strokes are reviewed) */
  private drawOn() { return !!useDuel2Store.getState().settings.drawing }
  /** Book 2's minigames are open (before: stage 0, the tower alone); the gallery plays any screen */
  private bookOpen() { return !!this.opts.force || useDuel2Store.getState().bookOpen !== false }

  // ---- helpers
  /** a telemetry event (never in the gallery) */
  private track(e: string, data: Record<string, unknown>) { if (!this.opts.sandbox) duel2Telemetry.track(e, data) }
  private guard<T>(t: number, p: Promise<T>): Promise<T> {
    return p.then((v) => { if (t !== this.token) throw new Aborted(); return v })
  }
  private sleep(t: number, ms: number) { return this.guard(t, new Promise<void>((r) => window.setTimeout(r, ms))) }
  private say(t: number, parts: { id: string; onStart?: () => void }[]) {
    for (const p of parts) this.assets.push(p.id)
    return this.guard(t, sayParts(parts))
  }
  private variation(id: string): string {
    const n = lineById(id)?.variations ?? 1
    let k = 1 + Math.floor(this.rng() * n)
    if (n > 1 && k === this.lastLine[id]) k = (k % n) + 1
    this.lastLine[id] = k
    return lineAudioId(id, k)
  }
  private waitPick(t: number) { return this.guard(t, new Promise<string>((r) => { this.pickWaiter = r })) }
  private waitNext(t: number) {
    this.set({ needNext: true })
    return this.guard(t, new Promise<void>((r) => { this.nextWaiter = r }))
  }
  private sfx(name: Duel2Sfx) { void playSfx(name) }
  private cueId(c: Choice) { return c.soundId }
  private ctx(): RoundCtx {
    const s = useDuel2Store.getState()
    return { rng: this.rng, stage: this.stage, tallies: s.tallies, recent: s.recent, confusions: { letters: s.confusions.letters, syllables: s.confusions.syllables } }
  }
  private currentTarget(): Choice | null {
    const s = this.view.screen
    if (!s || s.screen === 'crystal' || s.screen === 'doors' || s.screen === 'draw' || s.screen === 'tower') return null
    return s.target
  }
  private kindFor(screen: ScreenId): Kind {
    if (this.opts.force?.kind) return this.opts.force.kind
    if (this.stage === 1) return 'letter'
    if (screen === 'ghosts') return this.rng() < 0.35 ? 'letter' : 'syllable'
    if (screen === 'broom') return this.rng() < 0.2 ? 'letter' : 'syllable'
    return 'syllable'
  }
  private demoKey(screen: ScreenId, kind: Kind) {
    return screen === 'broom' ? (kind === 'letter' ? 'demo-broom-letter' : 'demo-broom')
      : screen === 'ghosts' ? (kind === 'letter' ? 'demo-ghosts-letter' : 'demo-ghosts-syllable') : `demo-${screen}`
  }

  // ---- the loop: screens in their cycle until the hearts run out
  private async loop() {
    const t = this.token
    try {
      if (this.opts.force?.screen === 'merchant') return await this.galleryMerchant(t)
      for (;;) {
        if (this.passDue) await this.runPassHeart(t)
        if (this.checkpointDue) await this.runCheckpoint(t)
        if (this.screenId === 'crystal') await this.runCrystal(t)
        else await this.runScreen(t, this.screenId)
        if (this.opts.force) {
          // the gallery plays one screen, then starts it again
          this.roundInScreen = 0
          this.ladder = null
          this.doorWords = []
          this.drawPlan = null
          this.visitKind = null
          this.crystalAwarded = false
          this.hearts = heartsAtRunStart()
          this.newVisit()
          continue
        }
        if (this.screenId === 'doors') { this.screenId = 'crystal'; continue }
        const nx = this.screenId === 'crystal' ? (this.afterCrystal ?? this.nextOf('doors')) : this.nextOf(this.screenId)
        this.afterCrystal = null
        if (this.screenId !== 'crystal' && nx.newCycle && this.crystalOwed) {
          // the doors were skipped in this cycle: their crystal still comes, at the cycle's end (then the pass heart)
          this.crystalOwed = false
          this.afterCrystal = nx
          this.screenId = 'crystal'
          continue
        }
        this.crystalAwarded = false
        // stage 0 (the tower alone) has no pass heart
        if (nx.newCycle) {
          this.passDue = this.passFull && this.bookOpen()
          this.passFull = true
          if (!this.opts.sandbox) useDuel2Store.getState().nextCycle()
        }
        this.screenId = nx.screen
        this.roundInScreen = 0
        this.ladder = null
        this.doorWords = []
        this.drawPlan = null
        this.visitKind = null
        this.newVisit()
        // between two screens (never between the doors and their crystal): the checkpoint, after the pass heart
        this.checkpointDue = true
      }
    } catch (e) {
      if (!(e instanceof Aborted)) throw e
    }
  }

  /**
   * The screen after `from` in the cycle, passing over the screens he has long mastered in this cycle (every other cycle;
   * never the tower, never the only screen): a skipped screen has no visit and no checkpoint of its own.
   */
  private nextOf(from: ScreenId): { screen: ScreenId; newCycle: boolean } {
    const open = this.bookOpen()
    let nx = nextScreen(this.stage, from, this.drawOn(), open)
    const len = cycleOf(this.stage, this.drawOn(), open).length
    const st = useDuel2Store.getState()
    const duelRecent = useProgressStore.getState().duel?.recent ?? {}
    for (let k = 0; k < len && !this.opts.session; k++) {
      // a new cycle starts at the tower, which is never skipped
      if (nx.newCycle || !skipInCycle(nx.screen, screenRecent(nx.screen, st.recent, duelRecent), st.cycleNo ?? 0, len)) break
      if (nx.screen === 'doors') this.crystalOwed = true
      this.track('skip', { screen: nx.screen, cycle: st.cycleNo ?? 0 })
      const n2 = nextScreen(this.stage, nx.screen, this.drawOn(), open)
      nx = { screen: n2.screen, newCycle: n2.newCycle }
    }
    return nx
  }

  /**
   * The length of a visit, decided when it starts: about half for a screen with no recent mistakes (at least 2 rounds;
   * the tower at least 1 wave). The gallery plays the full visit.
   */
  private lenFor(screen: ScreenId): number {
    const full = VISIT[screen]
    if (this.opts.force) return full
    const r = screenRecent(screen, useDuel2Store.getState().recent, useProgressStore.getState().duel?.recent ?? {})
    // the tower's recent answers are every mark's, side by side (not in time order): none of them may be a mistake
    const scale = screen === 'tower' ? (r.length >= SHORT_AFTER && !r.includes('x') ? 0.5 : 1) : visitScale(r)
    if (scale === 1) return full
    return Math.max(screen === 'tower' ? 1 : 2, Math.round(full * scale))
  }

  /** The end of a pass: one heart comes back (up to HEARTS), in its own moment with a sound. Once, even across a pause. */
  private async runPassHeart(t: number) {
    if (!this.passHeartGiven) {
      this.passHeartGiven = true
      const r = passEndHeart(this.hearts)
      if (!r.gained) { this.passDue = false; this.passHeartGiven = false; return }
      this.hearts = r.hearts
      this.passHearts++
      this.set({ hearts: this.hearts.left, passHeart: this.passHearts, heal: { id: ++this.fxId, at: this.now() } })
      this.track('pass-heart', { hearts: this.hearts.left })
    }
    this.set({ phase: 'celebrate', overlay: null, needNext: false, hintAvailable: false })
    this.sfx('potion')
    await this.sleep(t, SFX_RING_MS)
    await this.say(t, [{ id: this.variation('pass-heart') }])
    this.passDue = false
    this.passHeartGiven = false
  }

  // ---- the merchant (spec: one duel, Part 2)
  /**
   * A checkpoint between two screens: the merchant comes when the rules say so (merchantDue). Decided once; a visit in
   * progress goes on after a pause as it was.
   */
  private async runCheckpoint(t: number) {
    if (!this.visit) {
      const adventure = !this.opts.force && !this.opts.session
      // no merchant at stage 0 (the tower alone)
      if (!adventure || !this.bookOpen()) { this.checkpointDue = false; return }
      // the next screen's boss is decided here, once (runScreen does not decide again): he always comes before a boss
      if (this.screenId === 'broom' && this.visitBoss === undefined) this.visitBoss = this.decideBoss()
      const st = useDuel2Store.getState()
      const range = st.settings.range ?? 100
      const price = priceAt(this.purchasesThisRun, range)
      // the checkpoints since his last visit, this one included (the save counts the ones passed without him): with 2
      // hearts he comes at every other checkpoint
      const since = st.checkpointsSinceVisit ?? NEVER_VISITED
      const due = merchantDue({
        adventure, hearts: this.hearts.left, coins: st.coins ?? 0, price, sinceVisit: since >= NEVER_VISITED ? Infinity : since + 1,
        bossNext: this.screenId === 'tower' ? this.towerBossNext() : !!this.visitBoss,
      })
      if (!this.opts.sandbox) st.noteCheckpoint(due)
      if (!due) { this.checkpointDue = false; return }
      // the composition is made once, at his arrival (never during a visit)
      this.newMerchantVisit(price, composeCoins(st.coins ?? 0, price, range, st.merchant?.level ?? 0, this.rng))
      const coins = this.visit!.coins
      if (!this.opts.sandbox) st.noteMerchant('visit')
      this.track('merchant-arrive', { price, coins: st.coins ?? 0, hearts: this.hearts.left, composition: coins })
    }
    await this.runVisit(t)
    this.visit = null
    this.checkpointDue = false
    // the next screen starts fresh (a pause during the visit is not a pause of that screen)
    this.resuming = false
  }

  private newMerchantVisit(price: number, coins: number[]) {
    let declineNow = () => {}
    const decline = new Promise<void>((r) => { declineNow = r })
    // "two wrong tries in a row" are counted within one visit (the wand's glow ends with the visit too)
    this.wrongInRow = 0
    this.visit = {
      price, coins, given: [], said: false, bought: false, declined: false, byeSaid: false, wrongTries: 0, hinted: false, lastLine: null, decline, declineNow,
      demoDone: false, idleSaid: false, lastTouch: this.now(),
    }
  }

  /** The gallery's merchant (the parent reviews him): a visit with 1 heart and 40 coins, its demo first; then the gallery. */
  private async galleryMerchant(t: number) {
    const GALLERY_COINS = 40
    if (!this.visit) {
      this.hearts = { left: 1, nearMissUsed: false }
      const range = useDuel2Store.getState().settings.range ?? 100
      const price = priceAt(0, range)
      this.newMerchantVisit(price, composeCoins(GALLERY_COINS, price, range, useDuel2Store.getState().merchant?.level ?? 0, this.rng))
    }
    this.set({ hearts: this.hearts.left, coins: GALLERY_COINS - (this.visit!.bought ? this.visit!.price : 0) })
    await this.runVisit(t)
    this.visit = null
    this.set({ over: { score: 0, crystals: 0, best: false } })
  }

  private mv(p: Partial<MerchantView>) { if (this.view.merchant) this.set({ merchant: { ...this.view.merchant, ...p } }) }
  /** a merchant's line: a variation, kept for the speaker button */
  private mLine(id: string) {
    const v = this.variation(id)
    if (this.visit) this.visit.lastLine = v
    return v
  }
  /** say or wait during a visit; the ✗ cuts it at any moment (only in the loop that is current: a pause replaces it) */
  private async vsay(t: number, parts: { id: string; onStart?: () => void }[]) {
    await this.guard(t, Promise.race([this.say(t, parts), this.visit!.decline]))
    if (this.visit!.declined) throw new Declined()
  }
  private async vsleep(t: number, ms: number) {
    await this.guard(t, Promise.race([this.sleep(t, ms), this.visit!.decline]))
    if (this.visit!.declined) throw new Declined()
  }
  /** his next gesture of the visit (the ✗ ends the wait) */
  private async waitMerchant(t: number): Promise<MerchantGesture> {
    const v = this.visit!
    v.lastTouch = Math.max(v.lastTouch, this.now())
    // no tap for MERCHANT_IDLE_MS: he asks once more, once per visit (coins given meanwhile count as taps)
    let timer: number | undefined
    const arm = (ms: number) => {
      timer = window.setTimeout(() => {
        if (t !== this.token || this.view.paused || this.view.merchant?.phase !== 'pay' || v.idleSaid) return
        const idle = this.now() - v.lastTouch
        if (idle < MERCHANT_IDLE_MS) { arm(MERCHANT_IDLE_MS - idle); return }
        v.idleSaid = true
        this.track('merchant-idle', {})
        void sayParts([{ id: this.mLine('m-again') }])
      }, ms)
    }
    if (!v.idleSaid) arm(MERCHANT_IDLE_MS - (this.now() - v.lastTouch))
    try {
      // a wait that a pause left behind ends as aborted, never as a decline (the loop after the pause ends the visit)
      const g = await this.guard(t, Promise.race([new Promise<MerchantGesture>((r) => { this.mWaiter = r }), v.decline.then(() => null)]))
      if (!g || v.declined) throw new Declined()
      return g
    } finally {
      this.mWaiter = null
      window.clearTimeout(timer)
    }
  }

  /** the first-visit demo: on his first visit ever (the gallery: when it asks for the demo) */
  private merchantDemoDue() {
    if (this.opts.force) return !!this.opts.force.demo
    return !useDuel2Store.getState().merchant?.demoSeen
  }

  /**
   * The first visit: everything else dims and the game's pointing hand shows each step while he says it — the price tag,
   * a coin dragged into his hand (and back), the potion, the ✗. Then it is his turn, with the same price and piles. The
   * ✗ is hidden until its step; the demo counts as seen only when it ends (a pause shows it again).
   */
  private async merchantDemo(t: number) {
    const step = (at: NonNullable<MerchantView['demo']>['step'], glow: MerchantView['glow']) =>
      this.mv({ phase: 'arrive', demo: { step: at, t: ++this.demoMove }, glow })
    this.set({ phase: 'demo', hintAvailable: false })
    this.track('merchant-demo', {})
    step('price', { tag: true })
    await this.vsay(t, [{ id: this.mLine('m-price') }])
    step('give', undefined)
    await Promise.all([this.vsleep(t, MERCHANT_DEMO_DRAG_MS), this.vsay(t, [{ id: this.mLine('m-give') }])])
    step('potion', { potion: true })
    await this.vsay(t, [{ id: this.mLine('m-tap') }])
    step('decline', { decline: true })
    await this.vsay(t, [{ id: this.mLine('m-decline') }])
    this.mv({ demo: undefined, glow: undefined })
    if (!this.opts.sandbox) useDuel2Store.getState().setMerchantFlag('demoSeen')
  }

  /**
   * The wand during a visit: the coins in the merchant's hand go back, and the top coins of the piles that make the price
   * glow green (he still gives them himself). It shows the answer, which is fine: he asked for it.
   */
  private merchantHint() {
    const v = this.visit
    const mv = this.view.merchant
    if (!v || !mv || mv.phase !== 'pay' || v.bought || v.declined) return
    v.lastTouch = this.now()
    v.given = []
    v.hinted = true
    this.wrongInRow = 0
    this.mv({ given: [], glow: { hint: hintCoins(v.coins, v.price) } })
    this.set({ hintGlow: false })
    if (!this.opts.sandbox) useDuel2Store.getState().noteMerchant('hint')
    this.track('merchant-hint', { auto: false })
    stopVoice()
    void sayParts([{ id: this.variation('m-hint') }])
  }

  private merchantGesture(g: MerchantGesture) {
    const v = this.visit
    const mv = this.view.merchant
    if (!v || !mv || v.bought || v.declined) return
    if (g.type === 'decline') {
      // the ✗, at any moment of the visit (it is hidden while the first-visit demo plays)
      // (the undo's hand shows while the ✗ is on the screen: it works then too)
    if (mv.phase === 'leave' || mv.phase === 'sold' || (mv.demo && mv.demo.step !== 'decline' && mv.demo.step !== 'undo')) return
      v.declined = true
      this.track('merchant-decline', { phase: mv.phase })
      if (!this.opts.sandbox) useDuel2Store.getState().noteMerchant('decline')
      stopVoice()
      v.declineNow()
      return
    }
    if (mv.phase !== 'pay') return
    v.lastTouch = this.now()
    if (g.type === 'coin') {
      // the top coin of that pile jumps into his hand (a coin he no longer has cannot be given)
      const left = [...v.coins]
      for (const x of v.given) left.splice(left.indexOf(x), 1)
      if (!left.includes(g.value)) return
      v.given.push(g.value)
      this.sfx('coin')
      // the hint's coins keep glowing until he has given each of them himself
      const hint = [...(mv.glow?.hint ?? [])]
      const k = hint.indexOf(g.value)
      if (k >= 0) hint.splice(k, 1)
      this.mv({ given: [...v.given], glow: hint.length ? { hint } : undefined })
      return
    }
    if (g.type === 'hand') {
      // undo: the last coin given goes back to its pile
      if (!v.given.length) return
      v.given.pop()
      this.track('merchant-undo', {})
      this.sfx('coin')
      this.mv({ given: [...v.given] })
      return
    }
    // the potion: the merchant counts (the visit's flow goes on)
    const w = this.mWaiter
    this.mWaiter = null
    w?.(g)
  }

  /** The visit: he walks in and offers the potion; the child pays from his piles, or declines with the ✗. */
  private async runVisit(t: number) {
    const v = this.visit!
    try {
      if (!v.bought && !v.declined) {
        if (!v.said) {
          this.set({ merchant: { phase: 'arrive', price: v.price, coins: v.coins, given: v.given, glow: { piles: true } }, phase: 'feedback', overlay: null, needNext: false, hintAvailable: false })
          await this.vsleep(t, MERCHANT_ARRIVE_MS)
          await this.vsay(t, [{ id: this.mLine('m-hello') }])
          v.said = true
          this.mv({ glow: undefined })
        } else {
          // after a pause: the visit as it was, the coins in his hand included, and the hint's green coins still glowing
          const hint = this.view.merchant?.glow?.hint
          this.set({ merchant: { phase: 'pay', price: v.price, coins: v.coins, given: v.given, ...(hint?.length ? { glow: { hint } } : {}) }, overlay: null, needNext: false, hintAvailable: false })
        }
        if (!v.demoDone && this.merchantDemoDue()) await this.merchantDemo(t)
        v.demoDone = true
        await this.payLoop(t)
      }
    } catch (e) {
      if (!(e instanceof Declined)) throw e
    }
    await this.visitEnd(t)
  }

  /** He gives coins and takes them back (merchantGesture), and taps the potion; the merchant counts. Returns when he bought it. */
  private async payLoop(t: number) {
    const v = this.visit!
    for (;;) {
      // a glow (his empty hand, the hint) stays until he gives a coin
      this.mv({ phase: 'pay', counted: undefined, verdict: undefined, tag: undefined, demo: undefined, given: [...v.given] })
      this.set({ phase: 'answer', hintAvailable: true })
      // coins and undo are handled as they come (merchantGesture); the potion goes on here
      await this.waitMerchant(t)
      if (!v.given.length) {
        this.mv({ glow: { hand: true } })
        this.set({ phase: 'feedback' })
        await this.vsay(t, [{ id: this.mLine('m-empty') }])
        continue
      }
      if (await this.count(t) === 'exact') return this.buy(t)
    }
  }

  /** The merchant counts the coins in his hand one by one (a chime each, the running total in a bubble), then the tag. */
  private async count(t: number): Promise<'exact' | 'short' | 'over'> {
    const v = this.visit!
    const given = [...v.given]
    const sum = given.reduce((a, b) => a + b, 0)
    this.set({ phase: 'feedback' })
    this.mv({ phase: 'count', counted: 0, glow: undefined })
    for (let i = 0; i < given.length; i++) {
      await this.vsleep(t, COUNT_STEP_MS)
      this.mv({ counted: i + 1 })
      this.sfx('count')
    }
    const vd = payVerdict(sum, v.price)
    this.mv({ verdict: vd, tag: vd === 'exact' ? 'lit' : 'flash' })
    this.track('merchant-offer', { sum, price: v.price, verdict: vd, coins: given })
    await this.vsleep(t, COUNT_STEP_MS)
    if (vd === 'exact') return vd
    // wrong tries cost nothing; the coins stay in his hand
    v.wrongTries++
    this.wrongInRow++
    if (!this.opts.sandbox) useDuel2Store.getState().noteMerchant(vd)
    // two wrong tries in a row: the wand glows (it does not open by itself)
    if (this.wrongInRow >= 2) this.set({ hintGlow: true })
    await this.vsay(t, [{ id: this.mLine(vd === 'short' ? 'm-short' : 'm-over') }])
    if (vd === 'over' && !this.undoShown()) {
      // the first time ever he gives too much: the hand taps the merchant's hand and the last coin flies back (rule:
      // explain a move when he first needs it)
      this.mv({ demo: { step: 'undo', t: ++this.demoMove } })
      await this.vsleep(t, UNDO_TAP_MS)
      v.given.pop()
      this.sfx('coin')
      this.mv({ given: [...v.given] })
      await this.vsay(t, [{ id: this.mLine('m-undo') }])
      this.mv({ demo: undefined })
      if (!this.opts.sandbox) useDuel2Store.getState().setMerchantFlag('undoShown')
      else this.sandboxUndoShown = true
    }
    return vd
  }

  private sandboxUndoShown = false
  private undoShown() { return this.opts.sandbox ? this.sandboxUndoShown : !!useDuel2Store.getState().merchant?.undoShown }

  /** The exact price: the coins are spent, the potion flies to the wizard and a heart to the top bar. */
  private async buy(t: number) {
    const v = this.visit!
    v.bought = true
    const st = useDuel2Store.getState()
    if (!this.opts.sandbox) {
      st.spendCoins(v.price)
      st.noteMerchant('purchase')
      st.merchantPaid(v.wrongTries === 0 && !v.hinted, v.hinted)
    }
    this.purchasesThisRun++
    this.wrongInRow = 0
    this.set({ hintGlow: false })
    this.hearts = { ...this.hearts, left: Math.min(HEARTS, this.hearts.left + 1) }
    this.track('merchant-buy', { price: v.price, coins: [...v.given], hearts: this.hearts.left })
    this.mv({ phase: 'sold', glow: undefined, bought: true })
    this.set({ phase: 'celebrate', hearts: this.hearts.left, heal: { id: ++this.fxId, at: this.now(), from: WIZARD_AT }, ...(this.view.coins !== undefined ? { coins: this.view.coins - v.price } : {}) })
    this.sfx('potion')
    await this.sleep(t, SFX_RING_MS)
    await this.say(t, [{ id: this.mLine('m-exact') }])
  }

  /** He walks away (after the ✗: his coins go back to their piles and he says goodbye). */
  private async visitEnd(t: number) {
    const v = this.visit!
    this.set({ phase: 'feedback', hintAvailable: false, hintGlow: false })
    if (v.declined) {
      v.given = []
      this.mv({ phase: 'leave', given: [], glow: undefined, demo: undefined, tag: undefined, counted: undefined, verdict: undefined })
      if (!v.byeSaid) { v.byeSaid = true; await this.say(t, [{ id: this.mLine('m-bye') }]) }
    } else this.mv({ phase: 'leave', glow: undefined })
    await this.sleep(t, MERCHANT_LEAVE_MS)
    this.set({ merchant: undefined })
  }

  private newVisit() {
    this.visitBoss = undefined
    this.visitStarted = false
    this.boss = null
    this.tower = null
  }

  // ---- the first duel's tower (spec: one duel, Part 3)
  /** every third tower visit is a boss visit (the run's boss rhythm); the gallery forces it */
  private towerBossNext(): boolean {
    if (this.opts.force) return !!this.opts.force.towerBoss
    return (useDuel2Store.getState().towerVisits ?? 0) % 3 === 2
  }

  /**
   * A tower visit: the duel's board plays two waves from where his last visit ended (a boss visit: the boss alone, at the
   * next multiple of 5). Its answers come in through towerAnswer; the visit ends with towerDone. A pause keeps the visit.
   */
  private async runTower(t: number) {
    const st = useDuel2Store.getState()
    if (!this.tower) {
      const boss = this.towerBossNext()
      const from = this.opts.force ? (boss ? 5 : 1) : st.towerWave ?? 1
      const wave = boss ? Math.ceil(from / 5) * 5 : from
      if (!this.opts.sandbox) {
        st.noteTowerVisit()
        // the boss's wave jumps over the waves from `from`: the new monsters of those waves are introduced later, the
        // first time each of them appears
        if (boss && wave > from) st.oweMonsters(skippedMonsters(from, wave))
      }
      this.tower = { wave, waves: this.visitLen || VISIT.tower, boss, visit: ++this.towerNo, done: null, coins: 0 }
      this.track('tower-start', { wave, boss, waves: this.tower.waves })
    }
    const tw = this.tower
    this.syncMult()
    this.set({ screen: { screen: 'tower', wave: tw.wave, waves: tw.waves, boss: tw.boss, visit: tw.visit }, phase: 'answer', overlay: null, needNext: false, hintAvailable: false, hearts: this.hearts.left })
    this.resuming = false
    const last = tw.done ?? await this.guard(t, new Promise<number>((r) => { this.towerWaiter = r }))
    this.towerWaiter = null
    // the hearts ran out on the tower: its answer has finished on the screen (the duel said the mark); the run ends
    if (this.ending) { await this.endRun(); throw new Aborted() }
    if (!this.opts.sandbox) st.setTowerWave(last + 1)
    if (!tw.ended) { tw.ended = true; this.track('tower-end', { wave: tw.wave, last, boss: tw.boss }) }
    if (tw.boss) {
      // the boss's bonus coins, one by one (the dragon and the troll are not Book 2's bosses: no trophy)
      this.set({ phase: 'celebrate' })
      while (tw.coins < BOSS_COINS) {
        tw.coins++
        if (!this.opts.sandbox) useDuel2Store.getState().addCoins(1)
        this.set({ coinPop: (this.view.coinPop ?? 0) + 1 })
        this.sfx('lock')
        await this.sleep(t, COIN_POP_MS)
      }
    }
    // stage 0 passes when his marks are mastered by the duel's own measure: Book 2's minigames open (once)
    if (!this.opts.sandbox && !this.bookOpen() && towerMastered(useProgressStore.getState().duel?.recent ?? {}, DUEL_MARKS.map((m) => m.id))) {
      useDuel2Store.getState().openBook()
      this.track('book-open', { stars: useDuel2Store.getState().totalStars, towerWave: last + 1 })
      await this.celebrate(t, 'streak')
    }
  }

  /** An answer on the tower: the run's stars, coins and streak, or a heart. 'over' when the hearts ran out. */
  towerAnswer(r: 'right' | 'wrong', markId: string): 'on' | 'over' {
    if (this.ending) return 'over'
    if (this.view.screen?.screen !== 'tower') return 'on'
    this.track('answer', { screen: 'tower', target: markId, result: r, clock: Date.now(), ...(this.opts.sandbox ? { gallery: true } : {}) })
    if (r === 'right') {
      this.streak++
      this.gainStar()
      // the badge follows the streak; the duel's own streak line celebrates on the board (no second voice over it)
      const m = multiplierOf(this.streak)
      if (m > this.view.mult) { this.set({ mult: m }); this.track('mult', { mult: m, streak: this.streak }) }
      return 'on'
    }
    const outcome = onAnswer(this.hearts, 'wrong')
    this.hearts = outcome.hearts
    this.resetStreak()
    this.set({ hearts: this.hearts.left })
    if (!outcome.over) return 'on'
    // the answer on the screen finishes (the duel's feedback), then towerDone ends the run; a pause no longer cancels it
    this.ending = true
    return 'over'
  }

  /** The tower's visit is over (its waves, its boss, or the hearts ran out and the last answer finished). */
  towerDone(lastWave: number) {
    if (!this.tower || this.tower.done !== null) return
    this.tower.done = lastWave
    const w = this.towerWaiter
    this.towerWaiter = null
    w?.(lastWave)
  }

  /** Every second broom visit of a run is a boss visit (never the first); the gallery forces its kind. */
  private decideBoss(): BossKind | null {
    if (this.opts.force) return this.opts.force.boss ?? null
    this.broomVisits++
    if (!isBossVisit(this.broomVisits)) return null
    const st = useDuel2Store.getState()
    const kind = chooseBoss({
      stage: this.stage, confusions: { letters: st.confusions.letters, vowels: st.confusions.vowels },
      beaten: st.bossesBeaten ?? [], last: st.lastBoss ?? null, rng: this.rng,
    })
    if (kind && !this.opts.sandbox) st.setLastBoss(kind)
    return kind
  }

  private async runScreen(t: number, screen: ScreenId) {
    // the hearts last the run; only the gallery refills them when its forced screen starts (a pause keeps them)
    if (!this.visitStarted) { this.visitStarted = true; this.visitLen = this.lenFor(screen); if (this.opts.force) this.hearts = heartsAtRunStart() }
    if (screen === 'tower') return this.runTower(t)
    if (screen === 'broom' && this.visitBoss === undefined) this.visitBoss = this.decideBoss()
    // a boss throws syllables
    if (this.visitBoss) this.visitKind = 'syllable'
    this.set({ hearts: this.hearts.left, overlay: null, needNext: false })
    const kind = (this.visitKind ??= this.kindFor(screen))
    const st = useDuel2Store.getState()
    if (screen === 'draw' || screen === 'draw-hand') {
      // its own demo: the hand writes the letter in the slot (runDrawRound)
      while (this.roundInScreen < this.visitLen) await this.runDrawRound(t, screen)
      return
    }
    const demo = this.demoKey(screen, kind)
    // no demo before a boss: he has flown already (a boss never comes on the first broom visit)
    if (!this.visitBoss && (this.opts.force ? !!this.opts.force.demo && !this.demoShown : !st.demosSeen.includes(demo)) && this.roundInScreen === 0) {
      this.demoShown = true
      this.prepareView(screen, kind)
      this.demoRound = screen !== 'broom'
      this.set({ phase: 'demo', overlay: { kind: 'demo', line: lineAudioId(demo, 1), demo } })
      if (!this.opts.sandbox) { st.markDemo(demo); duel2Telemetry.track('demo', { demo }) }
      await this.waitNext(t)
      this.set({ overlay: null })
    }
    if (screen === 'broom') return this.runBroom(t, kind)
    while (this.roundInScreen < this.visitLen) {
      const done = await this.runRound(t, screen, kind)
      if (done === 'over') throw new Aborted()
    }
    if (screen === 'ladder') await this.celebrate(t, 'ladder-top')
  }

  /** Build the first view of a screen (used by the demo before any round). */
  private prepareView(screen: ScreenId, kind: Kind) {
    this.buildRound(screen, kind)
  }

  private buildRound(screen: ScreenId, kind: Kind): Choice | Word {
    const cur = this.view.screen
    if (this.resuming && cur && cur.screen === screen && !this.answered) {
      // after a pause the same round starts again from its question (rule); a broom flight restarts its waves
      this.resuming = false
      this.setScreen({ reveal: undefined, ...(cur.screen === 'broom' ? { waves: [] } : {}), ...(cur.screen === 'doors' ? { lit: 0, opening: false, zooming: false } : {}) } as Partial<ScreenView>)
      return cur.screen === 'doors' ? cur.word : (cur as BroomView).target
    }
    this.resuming = false
    this.answered = false
    if (this.demoRound) {
      this.demoRound = false
      if (cur && cur.screen === screen) return cur.screen === 'doors' ? cur.word : (cur as CauldronView).target
    }
    const c = this.ctx()
    // never the same sound two rounds in a row on one screen
    const prev = this.view.screen?.screen === screen ? (this.view.screen as { target?: Choice }).target?.soundId : undefined
    if (screen === 'broom') {
      // a new boss never starts with the sound the flight before ended on
      const target = this.boss ? bossTarget(c, this.boss.kind, prev) : broomTarget(c, kind)
      this.set({ screen: { screen: 'broom', kind, waves: [], travelMs: travelMs(useDuel2Store.getState().pace), lane: 1, target } })
      return target
    }
    if (screen === 'cauldron') {
      const r = cauldronRound(c, prev)
      const target = { ...letterChoice(r.letter), kind: 'syllable' as Kind, id: r.target.id, text: r.target.text, soundId: r.target.soundId, group: r.target.mark.group, mark: r.target.mark.id }
      this.set({ screen: { screen: 'cauldron', letterId: r.letter.id, orbs: r.orbs.map((m) => m.id), target } })
      return target
    }
    if (screen === 'ladder') {
      if (!this.ladder) this.ladder = { ...ladderPlan(c, this.visitLen, this.opts.force?.fixed), built: [] }
      const step = this.ladder.steps[this.ladder.built.length]
      this.set({ screen: { screen: 'ladder', built: this.ladder.built, plates: step.plates, rungs: this.visitLen, target: step.target } })
      return step.target
    }
    if (screen === 'ghosts') {
      const r = ghostRound(c, kind, prev)
      this.set({ screen: { screen: 'ghosts', signs: r.signs, target: r.target } })
      return r.target
    }
    // doors
    if (!this.doorWords.length) {
      const pool = WORDS.filter((w) => w.door && w.stage <= Math.max(2, Math.min(this.stage, 3)))
      const scored = pool.map((w) => ({ w, p: predict([`w:${w.id}`], useDuel2Store.getState().tallies, useDuel2Store.getState().recent) }))
      this.doorWords = scored.sort(() => this.rng() - 0.5).slice(0, this.visitLen).map((x) => x.w)
    }
    const word = this.doorWords[this.roundInScreen % this.doorWords.length]
    const others = WORDS.filter((w) => w.door && w.id !== word.id).sort(() => this.rng() - 0.5).slice(0, 2)
    const keys = [word, ...others].sort(() => this.rng() - 0.5)
    // behind the last door: the crystal he is about to win (the kind runCrystal will show)
    const behind = this.roundInScreen === this.visitLen - 1
      ? { crystal: useDuel2Store.getState().crystals + (this.opts.sandbox ? 0 : 1) } : undefined
    this.set({ screen: { screen: 'doors', word, lit: 0, keys, opening: false, zooming: false, ...(behind ? { behind } : {}) } })
    return word
  }

  private needsDotIntro(target: Choice | Word): string | null {
    if (!('itemId' in target)) return null
    // the gallery's dot-intro entry shows the introduction every round
    const seen = this.opts.force?.screen === 'dot' ? [] : useDuel2Store.getState().dotIntrosSeen
    return dotIntroFor(target.itemId, this.stage, seen)
  }

  private async dotIntro(t: number, hard: string) {
    // the words only on his very first introduction (the parent: later they are understood from the screen)
    const d = dotIntroParts(hard, useDuel2Store.getState().dotIntrosSeen.length === 0)
    this.set({ phase: 'explain', overlay: { kind: 'dot', parts: d.parts, soft: d.right, hard: d.left } })
    if (!this.opts.sandbox) useDuel2Store.getState().markDotIntro(hard)
    await this.waitNext(t)
    this.set({ overlay: null })
  }

  private questionLine(screen: ScreenId, kind: Kind) {
    if (screen === 'ghosts' && kind === 'letter') return 'q-ghosts-letter'
    if (screen === 'doors') return 'q-door'
    return `q-${screen}`
  }

  /** One round on a calm screen. Returns 'over' when the hearts ran out. */
  private async runRound(t: number, screen: ScreenId, kind: Kind): Promise<'next' | 'over'> {
    this.hearts = newRound(this.hearts)
    this.syncMult()
    const target = this.buildRound(screen, kind)
    const intro = this.needsDotIntro(target)
    if (intro) await this.dotIntro(t, intro)
    this.set({ phase: 'question', overlay: null, hintAvailable: screen === 'doors' || (target as Choice).kind === 'syllable' })
    this.assets = []
    // no instruction and no hint at the start of a round: he knows the screen (Michael). They come only when he waits
    // (idleWait), and the hint button is always there.
    if (screen === 'doors') {
      await this.sleep(t, 200)
      this.setScreen({ lit: 1 } as Partial<DoorsView>)
      await this.sleep(t, 900)
      this.setScreen({ lit: 2 } as Partial<DoorsView>)
      this.set({ phase: 'answer' })
      this.cueStarted = this.now()
      for (;;) {
        const res = await this.evaluate(t, screen, target, await this.idleWait(t, this.waitPick(t), screen, kind, null))
        if (res !== 'near') return res
      }
    }
    const c = target as Choice
    const open = () => { this.set({ phase: 'answer' }); this.cueStarted = this.now() }
    // the answers are open while the cue plays; a tap stops the reading (rule)
    const early = this.waitPick(t)
    const said = this.say(t, [{ id: this.cueId(c), onStart: open }])
    let picked = await Promise.race([said.then(() => null), early])
    // the answers open after the cue even if it was cut short (a stopped voice must never leave the round shut)
    if (this.view.phase === 'question') open()
    for (;;) {
      picked ??= await this.idleWait(t, early, screen, kind, c)
      const res = await this.evaluate(t, screen, target, picked)
      if (res !== 'near') return res
      picked = await this.idleWait(t, this.waitPick(t), screen, kind, c)
    }
  }

  /**
   * Waits for his pick. If none comes for IDLE_MS, the instruction and the sound play once; after IDLE_HINT_MS the hint
   * shows. A pick stops whatever plays (he must never be stuck listening to what he already knows).
   */
  private async idleWait(t: number, pick: Promise<string>, screen: ScreenId, kind: Kind, c: Choice | null): Promise<string> {
    let waiting = true
    let spoke = false
    const live = () => waiting && t === this.token && !this.view.paused && this.view.phase === 'answer'
    const t1 = window.setTimeout(() => {
      if (!live()) return
      spoke = true
      this.track('idle', { screen, target: c?.id ?? null })
      void sayParts([{ id: this.variation(this.questionLine(screen, kind)) }, ...(c ? [{ id: this.cueId(c) }] : [])])
    }, IDLE_MS)
    const t2 = window.setTimeout(() => {
      if (live() && c) { spoke = true; void this.playHint(c, true, t).catch(() => {}) }
    }, IDLE_HINT_MS)
    try {
      const id = await pick
      if (this.view.overlay?.kind === 'hint') this.set({ overlay: null })
      if (spoke) stopVoice()
      return id
    } finally {
      waiting = false
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }

  private choicesOf(screen: ScreenId): Choice[] {
    const s = this.view.screen
    if (!s) return []
    if (s.screen === 'ghosts') return s.signs
    if (s.screen === 'ladder') return s.plates
    if (s.screen === 'cauldron') return [s.target]
    if (s.screen === 'broom') return [s.target]
    void screen
    return []
  }

  private async playHint(c: Choice, auto: boolean, t = this.token) {
    if (c.kind !== 'syllable' || !c.mark) return
    if (!this.opts.sandbox) duel2Telemetry.track('hint', { target: c.id, auto })
    this.set({ overlay: { kind: 'hint', target: c, glow: null } })
    const glow = (g: Highlight) => () => { if (this.view.overlay?.kind === 'hint') this.set({ overlay: { kind: 'hint', target: c, glow: g } }) }
    try {
      await this.say(t, [{ id: `ln-${c.itemId}`, onStart: glow('letter') }, { id: `vn-${c.mark}`, onStart: glow('vowel') }])
    } finally {
      if (this.view.overlay?.kind === 'hint') this.set({ overlay: null })
    }
  }

  private record(screen: ScreenId, target: Choice | Word, tapped: Choice | Word | null, result: 'right' | 'wrong' | 'near') {
    if (result !== 'near' && screen !== 'broom') this.answered = true
    const feats = 'syllables' in target || 'first' in target ? [`w:${(target as Word).id}`, 'sc:doors'] : sylFeatures(target as Choice, screen)
    const ms = Math.round(this.now() - this.cueStarted)
    if (!this.opts.sandbox) {
      const asked = 'soundId' in target ? (target as Choice) : undefined
      const tap = tapped && 'soundId' in tapped ? (tapped as Choice) : undefined
      const newStage = asked ? isNewStageChoice(this.stage, asked) && result !== 'near' : this.stage === 4 && result !== 'near'
      const { passed } = useDuel2Store.getState().recordAnswer({ features: feats, miss: result !== 'right', asked, tapped: tap, newStage })
      if (passed) {
        this.stage = useDuel2Store.getState().stage.stage
        duel2Telemetry.track('stage', { stage: this.stage })
      }
    }
    duel2Telemetry.track('answer', {
      screen, stage: this.stage, target: 'id' in target ? target.id : '', tapped: tapped && 'id' in tapped ? tapped.id : null, result, ms,
      assets: this.assets, clock: Date.now(), ...(this.opts.sandbox ? { gallery: true } : {}),
    })
  }

  /** right → feedback and on; near → forgiven once (same round); wrong → mistake, next, maybe an explanation. */
  private async evaluate(t: number, screen: ScreenId, target: Choice | Word, pickedId: string): Promise<'next' | 'near' | 'over'> {
    if (screen === 'doors') return this.evaluateDoor(t, target as Word, pickedId)
    const c = target as Choice
    const s = this.view.screen!
    let tapped: Choice | undefined
    if (s.screen === 'cauldron') {
      const m = markOf(pickedId as MarkId)
      tapped = { ...c, id: `${c.itemId}-${m.id}`, group: m.group, mark: m.id, soundId: syllable(c.itemId, m.id).soundId }
      if (m.group === c.group) tapped = c
    } else tapped = this.choicesOf(screen).find((x) => x.id === pickedId)
    if (!tapped) return 'near'
    const right = tapped.id === c.id || tapped.soundId === c.soundId
    const near = !right && tapped.nearMissOf === c.id
    const outcome = onAnswer(this.hearts, right ? 'right' : near ? 'near' : 'wrong')
    if (right) {
      this.record(screen, c, tapped, 'right')
      this.roundInScreen++
      // the streak counts this answer before its coins (the fifth right answer pays 2)
      this.streak++
      this.gainStar()
      this.set({ phase: 'feedback' })
      const confident = predict(sylFeatures(c, screen), useDuel2Store.getState().tallies, useDuel2Store.getState().recent) < 0.2 && this.now() - this.cueStarted < CONFIDENT_MS
      if (s.screen === 'cauldron') { this.setScreen({ joined: true } as Partial<CauldronView>); this.sfx('puff') }
      if (s.screen === 'ladder') { this.ladder!.built = [...this.ladder!.built, c]; this.setScreen({ built: this.ladder!.built, plates: [] } as Partial<LadderView>); this.sfx('lock') }
      if (s.screen === 'ghosts') { this.setScreen({ zapped: c.id } as Partial<GhostsView>); this.sfx('zap') }
      // let the effect ring a moment before the voice goes on (Michael: effects got cut)
      await this.sleep(t, SFX_RING_MS)
      await this.say(t, confident ? [] : [{ id: this.cueId(c) }])
      await this.maybeWordLink(t, c)
      await this.streakMoment(t)
      await this.sleep(t, 300)
      return 'next'
    }
    if (outcome.forgiven) {
      this.hearts = outcome.hearts
      this.record(screen, c, tapped, 'near')
      await this.say(t, [{ id: this.variation('almost') }])
      return 'near'
    }
    // a mistake
    this.hearts = outcome.hearts
    this.resetStreak()
    this.record(screen, c, tapped, 'wrong')
    this.roundInScreen++
    this.sfx('hit')
    const reveal = s.screen === 'cauldron' ? { right: c.mark!, wrong: tapped.mark } : { right: c.id, wrong: tapped.id }
    this.setScreen({ reveal } as Partial<ScreenView>)
    this.set({ phase: 'mistake', hearts: this.hearts.left })
    if (outcome.over) return this.endRun(this.cueId(c))
    // no hint here: the right answer glows and its sound plays (Michael: the hint came too often); then he does the
    // right move himself, which does what a right answer does on that screen (no star: it was a mistake)
    await this.fix(t, this.cueId(c))
    this.set({ phase: 'feedback' })
    if (s.screen === 'cauldron') { this.setScreen({ reveal: undefined, joined: true } as Partial<CauldronView>); this.sfx('puff') }
    if (s.screen === 'ladder') { this.ladder!.built = [...this.ladder!.built, c]; this.setScreen({ reveal: undefined, built: this.ladder!.built, plates: [] } as Partial<LadderView>); this.sfx('lock') }
    if (s.screen === 'ghosts') { this.setScreen({ reveal: undefined, zapped: c.id } as Partial<GhostsView>); this.sfx('zap') }
    await this.sleep(t, FIX_DONE_MS)
    if (this.explanationDue(screen, c)) await this.explain(t, c)
    return 'next'
  }

  /** After a mistake: the right answer's sound, then wait until he does the right move; the sound again if he waits. */
  private async fix(t: number, cue: string) {
    const done = this.guard(t, new Promise<string>((r) => { this.fixWaiter = r }))
    this.set({ fixing: true })
    const from = this.now()
    let replays = 0
    let waiting = true
    void done.then(() => { waiting = false }, () => { waiting = false })
    try {
      await this.sleep(t, SFX_RING_MS)
      await Promise.race([this.say(t, [{ id: cue }]), done])
      for (;;) {
        const r = await Promise.race([done.then(() => true), this.sleep(t, IDLE_MS).then(() => false)])
        if (r) break
        if (waiting && !this.view.paused) { replays++; await Promise.race([this.say(t, [{ id: cue }]), done]) }
      }
      stopVoice()
      // how long he took to do the right move himself, and how often the sound played again meanwhile
      this.track('fix', { screen: this.screenId, target: cue, ms: Math.round(this.now() - from), replays })
    } finally {
      this.fixWaiter = null
      this.set({ fixing: false })
    }
  }

  private async evaluateDoor(t: number, word: Word, picked: string): Promise<'next' | 'over'> {
    const right = picked === word.id
    const outcome = onAnswer(this.hearts, right ? 'right' : 'wrong')
    const tapped = WORDS.find((w) => w.id === picked) ?? null
    if (right) {
      this.record('doors', word, tapped, 'right')
      this.roundInScreen++
      this.streak++
      this.gainStar()
      this.set({ phase: 'feedback' })
      this.sfx('key')
      this.setScreen({ opening: true } as Partial<DoorsView>)
      this.sfx('door')
      await this.sleep(t, SFX_RING_MS)
      await this.say(t, [{ id: `w-${word.id}` }])
      await this.streakMoment(t)
      // through the doorway to the next door (or the crystal): the round goes on where the flight ends
      this.setScreen({ zooming: true } as Partial<DoorsView>)
      await this.sleep(t, ZOOM_MS + 60)
      return 'next'
    }
    this.hearts = outcome.hearts
    this.resetStreak()
    this.record('doors', word, tapped, 'wrong')
    this.sfx('hit')
    this.setScreen({ reveal: { right: word.id, wrong: picked } } as Partial<DoorsView>)
    this.set({ phase: 'mistake', hearts: this.hearts.left })
    if (outcome.over) return this.endRun(`w-${word.id}`)
    // he drags the marked key himself and the door opens (no star: it was a mistake)
    await this.fix(t, `w-${word.id}`)
    this.roundInScreen++
    this.set({ phase: 'feedback' })
    this.sfx('key')
    this.setScreen({ reveal: undefined, opening: true } as Partial<DoorsView>)
    this.sfx('door')
    await this.sleep(t, SFX_RING_MS)
    await this.say(t, [{ id: `w-${word.id}` }])
    this.setScreen({ zooming: true } as Partial<DoorsView>)
    await this.sleep(t, ZOOM_MS + 60)
    return 'next'
  }

  private explanationDue(screen: ScreenId, c: Choice): boolean {
    if (c.kind !== 'syllable') return false
    const s = useDuel2Store.getState()
    const lf = `l:${c.itemId}`
    const recent = s.mistakes.filter((m) => m.round > s.roundNo - 8 && m.features.includes(lf)).length
    void screen
    return recent >= 2 || this.rng() < 0.25
  }

  private async explain(t: number, c: Choice) {
    const parts: { id: string; highlight: Highlight }[] = [
      { id: lineAudioId('explain-lead', 1), highlight: 'none' }, { id: `ln-${c.itemId}`, highlight: 'letter' },
      { id: `vn-${c.mark}`, highlight: 'vowel' }, { id: c.soundId, highlight: 'all' },
    ]
    if (!this.opts.sandbox) duel2Telemetry.track('explain', { target: c.id })
    this.set({ phase: 'explain', overlay: { kind: 'explain', parts, target: c } })
    await this.waitNext(t)
    this.set({ overlay: null })
  }

  private async maybeWordLink(t: number, c: Choice) {
    if (c.kind !== 'syllable' || this.lastWordLink) { this.lastWordLink = false; return }
    if (this.rng() >= WORD_LINK_CHANCE) return
    const w = wordLinkFor(c.itemId, c.mark!, this.rng)
    if (!w) return
    this.lastWordLink = true
    this.set({ overlay: { kind: 'word', word: w } })
    await this.say(t, [{ id: `w-${w.id}` }])
    this.set({ overlay: null })
  }

  private async celebrate(t: number, line: 'streak' | 'ladder-top' | 'crystal') {
    this.set({ phase: 'celebrate' })
    this.sfx(line === 'crystal' ? 'crystal' : 'streak')
    startMusic('celebrate')
    const praise = this.praiseLine(line)
    if (praise) await this.say(t, [{ id: praise }])
    else await this.sleep(t, PRAISE_SOUND_MS)
    stopMusic()
  }

  /** The praise words only the first PRAISE_SPOKEN times of each kind; after that its sound is enough (Michael: "he knows it"). */
  private praiseLine(kind: 'streak' | 'ladder-top' | 'crystal' | 'boss-win', note = true): string | null {
    if ((useDuel2Store.getState().praiseHeard?.[kind] ?? 0) >= PRAISE_SPOKEN) return null
    if (note && !this.opts.sandbox) useDuel2Store.getState().notePraise(kind)
    return this.variation(kind)
  }

  /** The doors were skipped and the run ends before the cycle's end: their crystal is given now, once (no screen). */
  private payOwedCrystal() {
    if (!this.crystalOwed) return
    this.crystalOwed = false
    this.crystalsThisRun++
    if (!this.opts.sandbox) { useDuel2Store.getState().addCrystal(); duel2Telemetry.track('crystal', { kind: useDuel2Store.getState().crystals, owed: true }) }
  }

  private async runCrystal(t: number) {
    if (!this.crystalAwarded) {
      this.crystalAwarded = true
      this.crystalsThisRun++
      if (!this.opts.sandbox) { useDuel2Store.getState().addCrystal(); duel2Telemetry.track('crystal', { kind: useDuel2Store.getState().crystals }) }
    }
    const kind = useDuel2Store.getState().crystals
    this.set({ screen: { screen: 'crystal', kind }, overlay: null })
    await this.celebrate(t, 'crystal')
    await this.sleep(t, 1200)
  }

  /**
   * Ends the run: says the right answer (none after the tower: the duel said it), then the short defeat scene (the dizzy wizard spins and falls, a hit and its line,
   * playful, never praise for a loss), then the summary. A pause can no longer cancel it (it is already saved).
   */
  private async endRun(cue?: string): Promise<'over'> {
    this.ending = true
    this.stopBroom()
    stopMusic()
    const st = useDuel2Store.getState()
    const best = this.score > st.bestRun
    this.payOwedCrystal()
    if (!this.opts.sandbox) {
      st.endRun(this.screenId === 'crystal' ? 'doors' : this.screenId, this.score)
      duel2Telemetry.track('run-end', { screen: this.screenId, score: this.score, crystals: this.crystalsThisRun })
    }
    if (cue) await sayParts([{ id: cue }])
    this.set({ defeat: true, phase: 'feedback', overlay: null, needNext: false, hintAvailable: false, fixing: false })
    this.sfx('hit')
    this.track('defeat', { screen: this.screenId })
    await Promise.all([
      new Promise<void>((r) => window.setTimeout(r, DEFEAT_MS)),
      new Promise<void>((r) => window.setTimeout(r, SFX_RING_MS)).then(() => sayParts([{ id: this.variation('defeat') }])),
    ])
    await new Promise<void>((r) => window.setTimeout(r, 300))
    this.token++
    this.set({ over: { score: this.score, crystals: this.crystalsThisRun, best, bosses: [...this.bossesWon], startStars: this.startStars }, needNext: false })
    return 'over'
  }

  // ---- the drawing screen (spec: 2026-11-07 drawing)
  private dv() { return this.view.screen as DrawView }

  /** a drawing round: the script comes from the screen (print or handwriting); DrawView.screen is 'draw' for both */
  private buildDraw(script: Script): DrawView {
    const cur = this.view.screen
    if (this.resuming && cur?.screen === 'draw' && !this.answered) {
      // after a pause the same word starts again from its beginning
      this.resuming = false
      const v: DrawView = { ...cur, strokes: [], mode: 'letter', demo: undefined, lineFx: undefined, glow: undefined }
      this.set({ screen: v })
      return v
    }
    this.resuming = false
    this.answered = false
    const st = useDuel2Store.getState()
    this.drawPlan ??= drawWords({ rng: this.rng, tallies: st.tallies, recent: st.recent, confusions: st.confusions.letters })
    const word = this.drawPlan[this.roundInScreen % this.drawPlan.length]
    const split = splitWord(word, script)
    const def = strokesOf(split.letter, script)
    const marks = marksFor(word, this.stage)
    const layout = drawLayout({
      ...split, script, def,
      marksAbove: marks.some((m) => m.zone === 'above-left' || m.zone === 'above-right' || m.zone === 'vav-above'),
      marksUnder: marks.some((m) => m.zone === 'under'),
    })
    const v: DrawView = { screen: 'draw', word, script, letter: split.letter, layout, marks, strokes: [], mode: 'letter' }
    this.set({ screen: v })
    return v
  }

  private addStroke(pts: Pt[], state: DrawStroke['state']): number {
    const id = ++this.strokeNo
    this.setScreen({ strokes: [...this.dv().strokes, { id, pts, state }] } as Partial<DrawView>)
    return id
  }
  private restyle(f: (s: DrawStroke, i: number, all: DrawStroke[]) => DrawStroke['state'] | null) {
    const all = this.dv().strokes
    this.setScreen({ strokes: all.map((s, i) => { const k = f(s, i, all); return k ? { ...s, state: k } : s }) } as Partial<DrawView>)
  }
  private dropFaded() { this.setScreen({ strokes: this.dv().strokes.filter((s) => s.state !== 'wrong') } as Partial<DrawView>) }
  /** his next stroke, or null when `settleMs` passes first (a waiting piece is then settled) */
  private waitStroke(t: number, settleMs?: number) {
    return this.guard(t, new Promise<Pt[] | null>((r) => {
      const w = (pts: Pt[]) => r(pts)
      this.strokeWaiter = w
      if (settleMs !== undefined) window.setTimeout(() => { if (this.strokeWaiter === w) { this.strokeWaiter = null; r(null) } }, settleMs)
    }))
  }

  /** The glowing hand draws `strokes` (and the voice may speak meanwhile); returns when both are done. */
  private async handDraw(t: number, strokes: Pt[][], line?: string) {
    const id = ++this.demoNo
    this.setScreen({ demo: { id, strokes } } as Partial<DrawView>)
    await Promise.all([this.sleep(t, strokeTiming(strokes).total), line ? this.say(t, [{ id: line }]) : Promise.resolve()])
    if (this.dv().demo?.id === id) this.setScreen({ demo: undefined } as Partial<DrawView>)
  }

  /** The hint (button, or by itself after a long wait): the hand shows what is left; his next stroke stops it. */
  private drawHint(auto: boolean) {
    const s = this.view.screen
    if (s?.screen !== 'draw' || !this.drawState) return
    const strokes = s.mode === 'mark' && this.drawState.boxes ? markTargets(s.marks, this.drawState.boxes) : this.drawState.checker.remaining()
    if (!strokes.length) return
    this.track('hint', { screen: 'draw', target: s.word.id, auto })
    const id = ++this.demoNo
    this.setScreen({ demo: { id, strokes, hint: true } } as Partial<DrawView>)
    const t = this.token
    window.setTimeout(() => {
      const v = this.view.screen
      if (t === this.token && v?.screen === 'draw' && v.demo?.id === id) this.setScreen({ demo: undefined } as Partial<DrawView>)
    }, strokeTiming(strokes).total)
  }

  /** Waits for his next stroke; the instruction and the word after IDLE_MS, the hint after IDLE_HINT_MS (rule). */
  private async drawWait(t: number, settleMs?: number): Promise<Pt[] | null> {
    const v = this.dv()
    let waiting = true
    let spoke = false
    const live = () => waiting && t === this.token && !this.view.paused && this.view.phase === 'answer'
    const t1 = window.setTimeout(() => {
      if (!live()) return
      spoke = true
      this.track('idle', { screen: 'draw', target: v.word.id })
      void sayParts(this.dv().mode === 'mark' ? [{ id: lineAudioId('draw-mark', 1) }] : [{ id: this.variation('q-draw') }, { id: `w-${v.word.id}` }])
    }, IDLE_MS)
    const t2 = window.setTimeout(() => { if (live()) { spoke = true; this.drawHint(true) } }, IDLE_HINT_MS)
    try {
      const pts = await this.waitStroke(t, settleMs)
      if (spoke && pts) stopVoice()
      return pts
    } finally {
      waiting = false
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }

  /**
   * One drawing round: the word; the demo when needed; he writes the letter from memory, each stroke judged when the
   * finger lifts; then the lines (told, never failed); then the marks; then the word again and a star. No hearts are lost.
   */
  private async runDrawRound(t: number, screen: 'draw' | 'draw-hand') {
    this.syncMult()
    const v0 = this.buildDraw(this.opts.force?.script ?? scriptOf(screen))
    const { letter, script, word } = v0
    const def = strokesOf(letter, script)
    const st = useDuel2Store.getState()
    // the print screen has its demo; the handwriting screen uses the per-letter demos (needsDemo)
    const firstVisit = screen === 'draw' && (this.opts.force ? !!this.opts.force.demo && !this.demoShown : !st.demosSeen.includes('demo-draw'))
    const checker = new LetterChecker(def)
    this.drawState = { checker }
    this.set({ phase: 'question', overlay: null, hintAvailable: true, needNext: false })
    this.assets = []
    this.track('draw-start', { word: word.id, letter, script })
    const started = this.now()
    await this.say(t, [{ id: `w-${word.id}` }])
    if (firstVisit) {
      this.demoShown = true
      if (!this.opts.sandbox) { st.markDemo('demo-draw'); duel2Telemetry.track('demo', { demo: 'demo-draw' }) }
      this.set({ phase: 'demo' })
      await this.handDraw(t, checker.remaining(), lineAudioId('demo-draw', 1))
    } else if (needsDemo(letter, script, st.tallies, st.recent)) {
      this.set({ phase: 'demo' })
      await this.handDraw(t, checker.remaining())
    }
    this.set({ phase: 'answer' })
    this.cueStarted = this.now()
    const tries: number[] = []
    let wrongStrokes = 0
    let helped = false
    let againSaid = false
    while (!checker.done) {
      // a piece waiting for the rest of its stroke is settled after a short pause (it gets its feedback then)
      const pts = await this.drawWait(t, checker.hasPending ? SETTLE_MS : undefined)
      let r: Verdict | null
      if (pts === null) r = checker.settle()
      else {
        if (pathLength(pts) < TAP_LEN) continue
        this.addStroke(pts, 'live')
        r = checker.add(pts)
      }
      if (!r) continue
      const v = r
      this.track('draw-stroke', {
        letter, script, n: v.index + 1, ok: v.kind !== 'wrong', ...(v.kind === 'partial' ? { partial: true } : {}), ...(v.kind === 'wrong' ? { why: v.why } : {}),
        ...(pts === null ? { settled: true } : {}), ...(v.kind === 'ok' && v.joined ? { joined: true } : {}),
      })
      // the strokes this verdict covers; a piece that waited before them was right (settled) or wrong
      const mine = v.kind === 'ok' ? 'ok' : v.kind === 'partial' ? 'pending' : 'wrong'
      this.restyle((s, i, all) => (i >= all.length - v.pieces ? mine : s.state === 'pending' ? (v.settled ? 'ok' : 'wrong') : null))
      if (v.kind === 'partial') continue
      if (v.kind === 'ok') { this.sfx('stroke'); continue }
      if (checker.done) { this.dropFaded(); break }
      wrongStrokes++
      tries[v.index] = (tries[v.index] ?? 0) + 1
      this.set({ phase: 'feedback' })
      await this.sleep(t, 350)
      if (tries[v.index] >= DRAW_TRIES) {
        // no dead end: the hand draws it for him and the round goes on
        await this.handDraw(t, [checker.expected()])
        this.dropFaded()
        this.addStroke(checker.force(), 'helped')
        helped = true
      } else {
        const line = againSaid ? undefined : this.variation('draw-again')
        againSaid = true
        await this.handDraw(t, [checker.expected()], line)
        this.dropFaded()
      }
      this.set({ phase: 'answer' })
    }
    // the lines: told, never failed (the parent)
    const ink = bbox(this.dv().strokes.filter((s) => s.state === 'ok' || s.state === 'helped').flatMap((s) => s.pts))
    this.set({ phase: 'feedback' })
    const fb = lineFeedback(ink, def)
    if (fb) {
      this.setScreen({ lineFx: fb } as Partial<DrawView>)
      this.track('draw-lines', { letter, kind: fb.kind })
      await this.sleep(t, SFX_RING_MS)
      await this.say(t, [{ id: lineAudioId(`line-${fb.kind}`, 1) }])
      this.setScreen({ lineFx: undefined } as Partial<DrawView>)
    }
    let markWrong = false
    if (this.dv().marks.length) markWrong = await this.drawMarks(t, ink, () => { helped = true })
    // done
    this.answered = true
    this.roundInScreen++
    this.setScreen({ mode: 'done', glow: undefined, demo: undefined } as Partial<DrawView>)
    this.sfx('drawn')
    // every finished drawing counts in the streak: only a lost heart resets it (none is lost here)
    this.streak++
    this.gainStar()
    const clean = wrongStrokes === 0 && !helped && !markWrong
    if (!this.opts.sandbox) {
      useDuel2Store.getState().recordAnswer({ features: [drawFeature(letter, script), `sc:${screen}`], miss: !clean, newStage: false })
      useDuel2Store.getState().noteDrawRound()
    }
    this.track('draw-done', { letter, script, word: word.id, ms: Math.round(this.now() - started), wrongStrokes, helped })
    await this.sleep(t, SFX_RING_MS)
    await this.say(t, [{ id: `w-${word.id}` }])
    await this.streakMoment(t)
    await this.sleep(t, 500)
  }

  /** The marks of the first syllable, judged by place and count; the hand shows them after a wrong try. Returns: any wrong. */
  private async drawMarks(t: number, ink: Box, onHelped: () => void): Promise<boolean> {
    const v = this.dv()
    const boxes: MarkBoxes = { letter: ink, vav: v.layout.vav?.box }
    this.drawState!.boxes = boxes
    this.setScreen({ mode: 'mark' } as Partial<DrawView>)
    await this.say(t, [{ id: lineAudioId('draw-mark', 1), onStart: () => this.setScreen({ glow: 'marks' } as Partial<DrawView>) }])
    this.set({ phase: 'answer' })
    let wrong = false
    let tries = 0
    let mine: Pt[][] = []
    const markId = v.marks.map((m) => `${m.zone}:${m.shape}`).join('+')
    for (;;) {
      const pts = await this.drawWait(t)
      if (!pts) continue
      mine.push(pts)
      this.addStroke(pts, 'mark')
      const j = judgeMarks(mine, v.marks, boxes)
      if (j.state === 'more') continue
      this.track('draw-mark', { mark: markId, ok: j.state === 'ok' })
      if (j.state === 'ok') { this.restyle((s) => (s.state === 'mark' ? 'ok' : null)); break }
      wrong = true
      tries++
      mine = []
      this.restyle((s) => (s.state === 'mark' ? 'wrong' : null))
      this.set({ phase: 'feedback' })
      await this.sleep(t, 350)
      const targets = markTargets(v.marks, boxes)
      await this.handDraw(t, targets)
      this.dropFaded()
      if (tries >= DRAW_TRIES) { for (const p of targets) this.addStroke(p, 'helped'); onHelped(); break }
      this.set({ phase: 'answer' })
    }
    this.setScreen({ glow: undefined } as Partial<DrawView>)
    return wrong
  }

  // ---- the broom flight
  private stopBroom() {
    window.clearInterval(this.broomTimer)
    this.broomTimer = undefined
  }

  /**
   * The broom flight, one continuous arcade flow (Michael: "more fluent, like an arcade game"): orbs keep coming; a catch,
   * a hit or a miss is handled on the fly with no stop and no next button. A new sound to catch comes only when the orbs on
   * the screen are done, and is announced while he flies. The visit ends when its last orbs have all arrived.
   */
  private async runBroom(t: number, kind: Kind) {
    this.hearts = newRound(this.hearts)
    this.syncMult()
    if (this.visitBoss && !this.boss) {
      this.boss = { kind: this.visitBoss, hitsLeft: BOSS_HITS, arrived: false, startedAt: this.now(), coins: 0 }
      this.track('boss-start', { kind: this.visitBoss })
    }
    let target = this.buildRound('broom', kind) as Choice
    this.spokenTargets.clear()
    this.stopBroom()
    this.setScreen({ waves: [], reveal: undefined, missed: false, fx: undefined, finished: false, boss: this.bossView() } as Partial<BroomView>)
    if (this.boss?.won) return this.bossWin(t)
    startMusic(this.boss ? 'boss' : 'flight')
    this.set({ phase: 'question', hintAvailable: kind === 'syllable' })
    this.assets = []
    if (this.boss && !this.boss.arrived) {
      // the sky darkens and the boss swoops in from the right; then its line and the first sound
      await this.sleep(t, BOSS_ARRIVE_MS)
      this.boss.arrived = true
      this.setScreen({ boss: this.bossView() } as Partial<BroomView>)
      await this.say(t, [{ id: this.variation('boss-arrive') }, { id: this.cueId(target) }])
    } else {
      // only the sound to catch (the demo taught the screen)
      await this.say(t, [{ id: this.cueId(target) }])
    }
    this.set({ phase: 'answer' })
    const travel = travelMs(useDuel2Store.getState().pace) * (this.boss ? BOSS_SLOW : 1)
    this.track('flight', { kind, travelMs: Math.round(travel), pace: useDuel2Store.getState().pace, boss: this.boss?.kind ?? null })
    let spawned = 0
    let catches = 0
    let newTargetDue = false
    let announcing = false
    let holdSpawn = false
    let nextSpawnAt = -Infinity
    /** the hearts ran out: the orbs on the screen finish (nothing counts any more), then the run ends */
    let dying = false
    /** a boss visit has no wave count: it lasts until the boss is beaten or the hearts run out */
    const more = () => !!this.boss || spawned < this.visitLen
    const open = (ws: BroomWave[]) => ws.some((w) => w.resolved.some((r) => !r))
    const spawn = (now: number) => {
      const choices = this.boss ? bossWave(this.ctx(), this.boss.kind, target) : broomWave(this.ctx(), target, kind)
      // a two-orb wave takes two of the three lanes, at random
      let lanes: number[] | undefined
      if (choices.length === 2) {
        const drop = Math.floor(this.rng() * 3) % 3
        lanes = [0, 1, 2].filter((l) => l !== drop)
        if (this.rng() < 0.5) lanes.reverse()
      }
      const w: BroomWave = {
        id: ++this.waveId, choices, startMs: now, ...(lanes ? { lanes } : {}),
        offsets: choices.map(() => Math.round(this.rng() * POPCORN * 100) / 100),
        jitter: choices.map(() => Math.round((this.rng() - 0.5) * 60)),
        resolved: choices.map(() => false),
      }
      this.setScreen({ waves: [...(this.view.screen as BroomView).waves, w], travelMs: travel } as Partial<BroomView>)
      this.sfx('wave')
      this.cueStarted = this.now()
      spawned++
      nextSpawnAt = now + travel * WAVE_EVERY
    }
    const result = await this.guard(t, new Promise<'done' | 'over' | 'won'>((resolve, reject) => {
      this.broomTimer = window.setInterval(() => {
        if (t !== this.token) { this.stopBroom(); reject(new Aborted()); return }
        const now = this.broomClock()
        const cur = this.view.screen as BroomView
        const events: { hit: Choice | null; wave: BroomWave }[] = []
        const waves = cur.waves.map((w) => {
          const k = w.choices.map((_, i) => wavePos(w.startMs + w.offsets[i] * travel, now, travel))
          const e = orbEvents(k, w.resolved, cur.lane, w.choices.map((c) => c.soundId === target.soundId), w.lanes)
          const hitWrong = e.hit !== null && w.choices[e.hit].soundId !== target.soundId
          // one wave is one question: after a mistake its other orbs fly on harmlessly (no second heart for the same wave)
          if (w.spent || dying) return { ...w, resolved: e.resolved }
          if (e.hit !== null) events.push({ hit: w.choices[e.hit], wave: w })
          else if (e.missedTarget) events.push({ hit: null, wave: w })
          return { ...w, resolved: e.resolved, spent: hitWrong || e.missedTarget }
        }).filter((w) => w.resolved.some((r) => !r))
        this.setScreen({ waves } as Partial<BroomView>)
        for (const ev of events) {
          if (ev.hit && ev.hit.soundId === target.soundId) {
            // the catch that beats the boss has its own celebration: no streak praise on it
            this.onCatch(target, !!this.boss && this.boss.hitsLeft === 1)
            catches++
            this.roundInScreen++
            if (this.boss && this.bossHit(t, cur.lane) === 'won') { this.stopBroom(); resolve('won'); return }
            if (catches % TARGET_EVERY === 0 && more()) newTargetDue = true
          } else {
            if (this.onFlightMistake(t, target, ev.hit, ev.wave) === 'over') {
              if (this.boss) this.track('boss-lose', { kind: this.boss.kind, left: this.boss.hitsLeft })
              // the answers already on the screen finish (rule), then the run ends; a pause can no longer cancel it
              dying = true
              this.ending = true
              this.setScreen({ waves: (this.view.screen as BroomView).waves.map((w) => ({ ...w, spent: true })) } as Partial<BroomView>)
              break
            }
          }
        }
        // a new sound: once no orb with the old sound is flying (other leftovers finish harmlessly), say it while he
        // flies; the next orbs set off when the sound itself is said (Michael: with "and now" they were already close by
        // the sound) and not later (no long waits)
        if (dying) {
          if (!(this.view.screen as BroomView).waves.length) { this.stopBroom(); resolve('over') }
          return
        }
        const oldLeft = waves.some((w) => !w.spent && w.choices.some((c, j) => c.soundId === target.soundId && !w.resolved[j]))
        if (newTargetDue && !announcing && !oldLeft) {
          announcing = true
          newTargetDue = false
          const spentWaves = waves.map((w) => ({ ...w, spent: true }))
          target = this.boss ? bossTarget(this.ctx(), this.boss.kind, target.soundId) : broomTarget(this.ctx(), kind, target.soundId)
          this.setScreen({ target, waves: spentWaves } as Partial<BroomView>)
          holdSpawn = true
          const go = () => { holdSpawn = false; nextSpawnAt = -Infinity }
          void this.say(t, [{ id: this.variation('target-new') }, { id: this.cueId(target), onStart: go }])
            .catch(() => {}).finally(() => { announcing = false; if (holdSpawn) go() })
        }
        if (!newTargetDue && !holdSpawn && more() && now >= nextSpawnAt) spawn(now)
        // the visit ends when all its orbs have arrived (Michael: "let me finish")
        if (!this.boss && spawned >= this.visitLen && !newTargetDue && !open(waves)) { this.stopBroom(); resolve('done') }
      }, 50)
    }))
    if (result === 'over') { await this.endRun(this.cueId(target)); throw new Aborted() }
    this.stopBroom()
    if (result === 'won') {
      // let a last mistake's feedback finish first, as before the normal finale
      const wfx = (this.view.screen as BroomView).fx
      if (wfx && this.now() - wfx.at < FLIGHT_SETTLE_MS) await this.sleep(t, FLIGHT_SETTLE_MS - (this.now() - wfx.at))
      return this.bossWin(t)
    }
    // a closure, never a jump from a correction to the next screen (Michael): let a last mistake's feedback finish, then
    // a short finale — a celebration sound and the wizard swooping away
    const fx = (this.view.screen as BroomView).fx
    if (fx && this.now() - fx.at < FLIGHT_SETTLE_MS) await this.sleep(t, FLIGHT_SETTLE_MS - (this.now() - fx.at))
    await this.finale(t)
  }

  /** the wizard swoops away with a celebration sound */
  private async finale(t: number) {
    this.setScreen({ finished: true, reveal: undefined } as Partial<BroomView>)
    this.set({ phase: 'celebrate' })
    this.sfx('streak')
    await this.sleep(t, FINALE_MS)
    stopMusic()
  }

  private bossView(): BossView | undefined {
    const b = this.boss
    if (!b) return undefined
    const prev = this.view.screen?.screen === 'broom' ? this.view.screen.boss : undefined
    return {
      // the hit pose is a moment only (bossHit sets it): rebuilt views fly
      kind: b.kind, hitsLeft: b.hitsLeft, arrived: b.arrived, pose: b.won ? 'down' : 'fly',
      ...(prev?.bolt ? { bolt: prev.bolt } : {}), ...(b.won ? { won: true, first: !!b.first } : {}),
    }
  }

  /** A right catch on a boss visit: a spell bolt flies to the boss, it shows its hit pose, one segment goes out. */
  private bossHit(t: number, lane: number): 'on' | 'won' {
    const b = this.boss!
    b.hitsLeft = Math.max(0, b.hitsLeft - 1)
    const bolt = { id: ++this.fxId, lane }
    this.setScreen({ boss: { ...this.bossView()!, hitsLeft: b.hitsLeft, pose: 'hit', bolt } } as Partial<BroomView>)
    this.sfx('spell')
    this.track('boss-hit', { kind: b.kind, left: b.hitsLeft })
    if (b.hitsLeft === 0) return 'won'
    window.setTimeout(() => {
      const s = this.view.screen
      if (t === this.token && s?.screen === 'broom' && s.boss?.bolt?.id === bolt.id && !s.boss.won) this.setScreen({ boss: { ...s.boss, pose: 'fly' } } as Partial<BroomView>)
    }, BOSS_HIT_MS)
    return 'on'
  }

  /**
   * The win: the defeated pose, a burst of light, a celebration sound, the congratulation line (praise rule), 3 bonus
   * coins one by one (added to his balance), and on his first win against this kind the golden frame and its line. Re-entrant after a pause:
   * each part happens once.
   */
  private async bossWin(t: number) {
    const b = this.boss!
    const st = useDuel2Store.getState()
    if (!b.won) {
      b.won = true
      // the trophy is kept at once; the "new in your collection" moment only once its line was heard
      b.first = !(st.bossNewHeard ?? []).includes(b.kind)
      if (!this.opts.sandbox) st.markBossBeaten(b.kind)
      this.bossesWon.push(b.kind)
      this.track('boss-win', { kind: b.kind, ms: Math.round(this.now() - b.startedAt), first: b.first })
    }
    this.setScreen({ waves: [], reveal: undefined, boss: this.bossView() } as Partial<BroomView>)
    this.set({ phase: 'celebrate' })
    // its sound and music start once (a resume during the win goes on from where it was)
    if (!b.celebrated) {
      b.celebrated = true
      stopMusic()
      this.sfx('boss-win')
      startMusic('celebrate')
      await this.sleep(t, SFX_RING_MS)
    }
    if (!b.praised) {
      b.praised = true
      const praise = this.praiseLine('boss-win', false)
      if (praise) {
        // the praise counts as heard only when it really played (a missing file leaves it for next time)
        if (await this.say(t, [{ id: praise }]) && !this.opts.sandbox) useDuel2Store.getState().notePraise('boss-win')
      } else await this.sleep(t, PRAISE_SOUND_MS)
    }
    while (b.coins < BOSS_COINS) {
      b.coins++
      if (!this.opts.sandbox) useDuel2Store.getState().addCoins(1)
      this.set({ coinPop: (this.view.coinPop ?? 0) + 1 })
      this.sfx('lock')
      await this.sleep(t, COIN_POP_MS)
    }
    if (b.first && !b.newSaid) {
      b.newSaid = true
      if (await this.say(t, [{ id: lineAudioId('boss-new', 1) }]) && !this.opts.sandbox) useDuel2Store.getState().markBossNewHeard(b.kind)
    }
    await this.sleep(t, 600)
    stopMusic()
    await this.finale(t)
  }

  /**
   * A right answer: this run's score, a star on his kept total, and coins for his balance — one times the streak
   * multiplier (`this.streak` already counts this answer). The coin in the top bar pops (its number changes).
   */
  private gainStar() {
    this.score++
    this.set({ score: this.score, coinPop: (this.view.coinPop ?? 0) + 1 })
    if (this.opts.sandbox) return
    const st = useDuel2Store.getState()
    st.addStar()
    st.addCoins(coinsFor(this.streak))
  }

  /** A heart was lost: the streak and its multiplier start again (a forgiven near miss does not come here). */
  private resetStreak() {
    this.streak = 0
    this.syncMult()
  }
  /** the top bar's badge follows the streak (also after a pause cut its moment short) */
  private syncMult() {
    const m = multiplierOf(this.streak)
    if (m !== this.view.mult) this.set({ mult: m })
  }
  /**
   * After a right answer (the streak counts it): at 5 and 10 the multiplier rises in its own moment, with a sound and its
   * line (always spoken); at 15, 20, … the streak praise (spoken the first PRAISE_SPOKEN times).
   */
  private async streakMoment(t: number) {
    const m = multiplierOf(this.streak)
    if (m > this.view.mult) {
      this.set({ phase: 'celebrate', mult: m })
      this.sfx('streak')
      this.track('mult', { mult: m, streak: this.streak })
      await this.sleep(t, SFX_RING_MS)
      await this.say(t, [{ id: this.multLine(m) }])
      return
    }
    this.syncMult()
    if (this.streak % STREAK_EVERY === 0) await this.celebrate(t, 'streak')
  }
  private multLine(m: 1 | 2 | 3) { return lineAudioId('mult-up', m === 2 ? 1 : 2) }

  private onCatch(target: Choice, noPraise = false) {
    const st = useDuel2Store.getState()
    this.record('broom', target, target, 'right')
    if (!this.opts.sandbox) st.setPace(flightPace(st.pace, 'catch'))
    this.streak++
    this.gainStar()
    this.sfx('catch')
    if (!this.spokenTargets.has(target.soundId)) {
      this.spokenTargets.add(target.soundId)
      void sayParts([{ id: this.cueId(target) }])
    }
    // the multiplier rises over the flight (its sound and line; no line on the catch that beats the boss)
    const m = multiplierOf(this.streak)
    if (m > this.view.mult) {
      this.set({ mult: m })
      this.track('mult', { mult: m, streak: this.streak })
      if (!noPraise) { this.sfx('streak'); void sayParts([{ id: this.multLine(m) }]) }
    } else if (!noPraise && this.streak % STREAK_EVERY === 0) { const praise = this.praiseLine('streak'); if (praise) void sayParts([{ id: praise }]) }
  }

  /**
   * A hit (`hit` = the wrong orb he met) or a miss (null: the target flew past) during the flight: a flash, a heart, the
   * right orb of that wave glows a moment and its sound plays again — and the flight goes on.
   */
  private onFlightMistake(t: number, target: Choice, hit: Choice | null, wave: BroomWave): 'on' | 'over' {
    const st = useDuel2Store.getState()
    const near = !!hit && hit.nearMissOf === target.id
    const outcome = onAnswer(this.hearts, near ? 'near' : 'wrong')
    this.hearts = outcome.hearts
    if (outcome.forgiven) {
      this.record('broom', target, hit, 'near')
      void sayParts([{ id: this.variation('almost') }])
      return 'on'
    }
    this.resetStreak()
    this.record('broom', target, hit, 'wrong')
    if (!this.opts.sandbox) st.setPace(flightPace(st.pace, 'miss'))
    // a miss (the target flew past in another lane) is a whoosh, not a crash
    this.sfx(hit ? 'hit' : 'wave')
    const right = wave.choices.find((c) => c.soundId === target.soundId)
    const fx = { id: ++this.fxId, kind: hit ? 'hit' as const : 'miss' as const, at: this.now() }
    this.setScreen({ reveal: { right: right?.id ?? target.id, wrong: hit?.id }, missed: !hit, fx } as Partial<BroomView>)
    this.set({ hearts: this.hearts.left })
    if (outcome.over) return 'over'
    void sayParts([{ id: this.cueId(target) }])
    window.setTimeout(() => {
      const s = this.view.screen
      if (t === this.token && s?.screen === 'broom' && s.fx?.id === fx.id) this.setScreen({ reveal: undefined } as Partial<BroomView>)
    }, 1400)
    return 'on'
  }

}
