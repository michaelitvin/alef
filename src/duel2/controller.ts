// The run controller (spec: Run, Screens). One async flow per screen: question → cue → answer → feedback, with mistakes
// that wait for next, explanations, hints, demos, the dotted-letter introduction, the word link, celebrations, the hearts
// (for the whole run; one comes back at the end of each pass) and the run's end. React reads `view` through subscribe(); gestures come in through gesture().
// Pausing aborts the flow at its next await; resume restarts the same round from the start.
import type { Rng } from '../shared/adaptive'
import { mark as markOf, syllable, type MarkId } from './logic/content'
import { predict, type ScreenId } from './logic/predict'
import type { Choice, Kind, LadderStep, RoundCtx } from './logic/rounds'
import {
  TARGET_EVERY, waveTick, wavePos, WAVE_EVERY, POPCORN, ORB_JITTER, HEARTS, flightPace, coinsFor, multiplierOf, travelMs,
} from './logic/run'
import { WORDS, type Word } from './data/words'
import { dotIntroParts } from './logic/dotIntro'
import { ZOOM_MS } from './layout'
import type { Duel2Sfx } from './audio/duel2Audio'
import { readOnlySavePort, type SavePort } from './savePort'
import { realSleeper, type Cancel, type Sleeper } from '../shared/sleeper'
import { BOSS_COINS, BOSS_SLOW, type BossKind } from './logic/boss'
import { HEBREW } from './course/hebrew'
import type { Course, CourseId } from './course/types'
import type { Highlight } from './viewTypes'
import { strokesOf, type Pt, type Script } from './data/strokes'
import { LetterChecker } from './logic/recognizer'
import { marksFor, needsDemo, scriptOf, splitWord } from './logic/draw'
import { drawLayout } from './logic/drawLayout'
import { drawRound, stepDraw, type DrawInput, type DrawLine, type DrawState, type DrawView } from './policies/draw'
import { composeCoins, priceAt, type NumberRange } from './logic/merchant'
import { bossDue, bossVisit, stepBoss, type BossInput, type BossLine, type BossState, type BossStep, type BossView } from './policies/broomBoss'
import { merchantVisit, stepMerchant, type MerchantGesture, type MerchantInput, type MerchantState, type MerchantView } from './policies/merchant'
import { NEVER_VISITED } from './store'
import { stage0Lane } from './logic/mastery'
import { runPass, stepPass, type PassFacts, type PassInput, type PassState, type PassStep } from './policies/pass'
import { DUEL_MARKS } from '../utils/duel/marks'
import { skippedMonsters } from '../utils/duel/rules'

export type Phase = 'demo' | 'question' | 'answer' | 'feedback' | 'mistake' | 'explain' | 'celebrate'
export type Reveal = { right: string; wrong?: string }
export interface BroomWave {
  id: number; choices: Choice[]; startMs: number; offsets: number[]; jitter: number[]; resolved: boolean[]
  /** each orb's lane (a two-orb wave uses two of the three lanes); by default an orb's lane is its index */
  lanes?: number[]
  /** a mistake happened in this wave: its other orbs no longer count */
  spent?: boolean
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
interface CauldronView { screen: 'cauldron'; letterId: string; orbs: MarkId[]; target: Choice; joined?: boolean; reveal?: { right: MarkId; wrong?: MarkId } }
interface LadderView { screen: 'ladder'; built: Choice[]; plates: Choice[]; rungs: number; target: Choice; reveal?: Reveal }
interface GhostsView { screen: 'ghosts'; signs: Choice[]; target: Choice; zapped?: string; reveal?: Reveal }
interface DoorsView {
  screen: 'doors'; word: Word; lit: 0 | 1 | 2; keys: Word[]; opening: boolean; zooming: boolean; reveal?: Reveal
  /** the last door: the crystal (its kind) waits behind it */
  behind?: { crystal: number }
}
interface CrystalView { screen: 'crystal'; kind: number }
/** The first duel's tower (spec: one duel, Part 3): drawn by `Tower` (the duel's own board), which reports each answer
 * (towerAnswer) and the end of the visit (towerDone). `visit` changes with each new visit (a pause keeps it). */
export interface TowerView {
  screen: 'tower'; wave: number; waves: number; boss: boolean; visit: number
  /**
   * a placement check: Book 2's stage 0 (the marks he has not answered yet are asked first), or the course's own
   * (`Course.placement`: the tower plays its rounds; a miss costs no heart and no streak, and there is no hint)
   */
  placement?: boolean
  /** the duel's מגה charge at the visit's start: it carries over from the run's last tower visit (none at a run's start) */
  mega?: number
}
export type ScreenView = BroomView | CauldronView | LadderView | GhostsView | DoorsView | CrystalView | DrawView | TowerView

export type { MerchantView } from './policies/merchant'
export type { DrawStroke, DrawView } from './policies/draw'
export type { BossPose, BossView } from './policies/broomBoss'

export type Overlay =
  | { kind: 'demo'; line: string; demo: string }
  | { kind: 'explain'; parts: { id: string; highlight: Highlight }[]; target: Choice }
  | { kind: 'dot'; parts: { id: string; highlight: Highlight }[]; soft: string; hard: string }
  | { kind: 'hint'; target: Choice; glow: Highlight | null }
  | { kind: 'word'; word: Word }

export interface View {
  /** the course being played: its direction sets the screens' layout (`dir` and `data-course` on the root) */
  course: { id: CourseId; dir: 'rtl' | 'ltr' }
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
  /** `session`: a session from the path ended (one visit, nothing at stake): its summary goes home by itself */
  over: { score: number; crystals: number; best: boolean; bosses?: BossKind[]; startStars?: number; session?: boolean } | null
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
  /** a new value flashes the top bar's hearts (a pass heart); it only grows, across runs too (TopBar) */
  heartFlash?: number
  /** the hearts ran out: the short defeat scene plays (the dizzy wizard spins and falls), then `over` */
  defeat?: boolean
  /** the merchant's visit at a checkpoint (drawn instead of the screen) */
  merchant?: MerchantView
  /** the hint button (?) glows: two wrong payments in a row (it does not open by itself) */
  hintGlow?: boolean
  /** the coins the top bar shows instead of his balance (the gallery's merchant visit) */
  coins?: number
}
/** he touches an answer (finger-down on a choice, before a drag or a tap ends) or puts the pen down: a hint goes away */
type TouchGesture = { type: 'touch'; by: 'answer' | 'pen' }

export interface RunOpts {
  sandbox?: boolean
  force?: {
    /** 'merchant': the gallery's merchant visit (1 heart, 40 coins); the visit ends the gallery screen */
    screen: ScreenId | 'crystal' | 'dot' | 'merchant'; stage: number; kind?: Kind; demo?: boolean; fixed?: 'letter' | 'vowel' | 'dot'; script?: Script
    /** the gallery: a boss of this kind on the broom flight */
    boss?: BossKind
    /** the gallery: the tower's boss visit */
    towerBoss?: boolean
  }
  /**
   * A session from the home screen's path (spec: one duel, Part 3): one visit of this screen (SESSION_LENGTH), then the
   * summary. No hearts at stake (a mistake costs only the streak), no merchant, no pass heart, no crystal; the run's
   * lastEnded and best are not changed. Stars and coins are earned as usual.
   */
  session?: { screen: ScreenId }
  rng?: Rng
  now?: () => number
  /** the time the run waits on (default: the window's timers); `now` defaults to its clock */
  sleeper?: Sleeper
  /** the saves the run reads and writes (default: the course's saves; in the gallery, `sandbox`, they are only read) */
  save?: SavePort
  /** what the run plays: its rounds, voice, log and saves (default: the Hebrew course) */
  course?: Course
}

class Aborted extends Error {}
/** where the potion's heart rises: the wizard (Merchant.tsx WIZARD) */
const WIZARD_AT = { x: 260, y: 520 }
/** no pick for this long: the instruction and the sound play once */
/** an effect rings this long before the voice goes on (fluent, but not cut) */
const SFX_RING_MS = 400
/** the pass hearts' flashes so far, in every run (View.heartFlash) */
let heartFlashes = 0
/** after his fixing move: the effect plays before the next round */
const FIX_DONE_MS = 700
/** a mistake's feedback (flash, glow, its sound) plays out this long before the flight's finale */
const FLIGHT_SETTLE_MS = 1400
/** the flight's finale: the wizard swoops away */
const FINALE_MS = 2500
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
/** a bonus coin pops this long after the one before */
const COIN_POP_MS = 550
/** the placement check's visit: a bound on its waves, never reached (at most 15 answers and its confirmations) */
const PLACEMENT_WAVES = 10

export class RunController {
  view: View = { course: { id: HEBREW.id, dir: HEBREW.dir }, phase: 'question', hearts: HEARTS, screen: null, overlay: null, needNext: false, hintAvailable: false, paused: false, over: null, score: 0, mult: 1 }
  private listeners = new Set<() => void>()
  private token = 0
  private rng: Rng
  private now: () => number
  private time: Sleeper
  private save: SavePort
  private course: Course
  private pausedAt: number | null = null
  private pausedTotal = 0
  /** the pass: the screen, the hearts, the crystals, the checkpoint (policies/pass.ts) */
  private pass: PassState
  private get hearts() { return this.pass.hearts }
  private get screenId() { return this.pass.screen }
  private stage: number
  private roundInScreen = 0
  private score = 0
  private streak = 0
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
  /** stops the broom's tick */
  private broomStop: Cancel | undefined
  private waveId = 0
  private running = false
  private resuming = false
  /** the current round was answered (right or wrong): a resume must not replay it */
  private answered = false
  /** a broom/ghost visit keeps its kind (letters or syllables) across a pause */
  private visitKind: Kind | null = null
  /** the run is ending: a pause no longer cancels the summary */
  private ending = false
  /** he left the run with the home button (exit): closing the game after it is no abandon */
  private exited = false
  private demoShown = false
  private assets: string[] = []
  /** broom visits in this run: every second one is a boss visit */
  private broomVisits = 0
  /** this visit's boss kind (null: a normal flight; undefined: not decided yet) */
  private visitBoss: BossKind | null | undefined = undefined
  /** this visit has started: its hearts were filled (a pause keeps them) */
  private visitStarted = false
  /** the boss of this visit (policies/broomBoss.ts): its hits survive a pause (rule: losing them is the "gives up" problem again) */
  private boss: BossState | null = null
  private bossesWon: BossKind[] = []
  private startStars = 0
  private drawPlan: Word[] | null = null
  /** the drawing round in progress (policies/draw.ts) */
  private draw: DrawState | null = null
  /** it waits for his next stroke; the wait's number, and its times (settle, idle, hint) */
  private strokeWait = false
  private drawWait = 0
  private drawTimers: Cancel[] = []
  private drawDone: (() => void) | null = null
  private strokeNo = 0
  private demoNo = 0
  /** the merchant's visit in progress (policies/merchant.ts): it survives a pause (coins in his hand included) */
  private visit: MerchantState | null = null
  /** ends the run's wait for the visit (it has ended) */
  private visitDone: (() => void) | null = null
  /** the visit's current wait: a new number makes the end of an older one go unheard */
  private merchantWait = 0
  /** the idle line's timer */
  private merchantIdle: Cancel | undefined
  /** the demo hand's moves so far, in this run (MerchantView.demo.t) */
  private demoMove = 0
  /** the door's hint (the syllables light again) runs; a new number ends it */
  private doorHint = 0
  private doorHintOn = false
  /** a hint's voice plays (a touch on an answer stops it) */
  private hintVoice = 0
  /** the tower's visit in progress (it survives a pause: the same visit goes on); `done` = its last wave, once over */
  private tower: { wave: number; waves: number; boss: boolean; visit: number; done: number | null; coins: number; ended?: boolean; placement?: boolean } | null = null
  private towerNo = 0
  /** the duel's מגה charge: it carries over between the tower's visits within this run, and starts empty in a new run */
  private towerMegaCharge = 0
  private towerWaiter: ((lastWave: number) => void) | null = null
  /** this visit's length (rounds, waves, rungs, doors or words), decided when it starts */
  private visitLen = 0

  constructor(private opts: RunOpts = {}) {
    this.rng = opts.rng ?? Math.random
    this.time = opts.sleeper ?? realSleeper
    this.course = opts.course ?? HEBREW
    this.view = { ...this.view, course: { id: this.course.id, dir: this.course.dir } }
    this.save = opts.save ?? (opts.sandbox ? readOnlySavePort(this.course.save()) : this.course.save())
    this.now = opts.now ?? (() => this.time.now())
    this.stage = opts.force?.stage ?? this.save.read().stage.stage
    this.pass = this.newPass()
  }

  // ---- React bridge
  subscribe = (f: () => void) => { this.listeners.add(f); return () => { this.listeners.delete(f) } }
  getView = () => this.view
  private set(p: Partial<View>) { this.view = { ...this.view, ...p }; this.listeners.forEach((f) => f()) }
  private setScreen(p: Partial<ScreenView>) { if (this.view.screen) this.set({ screen: { ...this.view.screen, ...p } as ScreenView }) }
  /** the broom's clock: stops while paused */
  broomClock = () => (this.pausedAt ?? this.now()) - this.pausedTotal

  // ---- input
  gesture(g: { type: 'pick'; id: string } | { type: 'lane'; lane: 0 | 1 | 2 } | { type: 'stroke'; pts: Pt[] } | MerchantGesture | TouchGesture) {
    if (this.view.paused) return
    if (g.type === 'touch') { this.dropHint(g.by); return }
    if (g.type === 'coin' || g.type === 'hand' || g.type === 'potion' || g.type === 'decline') { this.merchantStep(g); return }
    if (g.type === 'stroke') {
      if (this.view.phase !== 'answer' || !this.strokeWait || this.view.screen?.screen !== 'draw') return
      // a stroke stops a hint's hand at once (he shows that he knows)
      this.dropHint('pen')
      this.endStrokeWait()
      this.drawStep({ type: 'stroke', pts: g.pts })
      return
    }
    if (g.type === 'lane') {
      if (this.view.screen?.screen === 'broom') this.setScreen({ lane: g.lane } as Partial<BroomView>)
      return
    }
    // he picks: a hint that shows goes away (its voice too)
    this.dropHint('answer')
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
    // the merchant's screen has no speaker: its one help button (?) replays the walkthrough (the parent)
    if (this.view.merchant) return
    if (this.view.screen?.screen === 'draw') {
      this.track('replay', { screen: 'draw', target: this.view.screen.word.id, phase: this.view.phase })
      this.course.audio.stopVoice()
      void this.course.audio.sayParts([{ id: `w-${this.view.screen.word.id}` }])
      return
    }
    const t = this.currentTarget()
    if (!t) return
    this.track('replay', { screen: this.screenId, target: t.id, phase: this.view.phase })
    this.course.audio.stopVoice()
    void this.course.audio.sayParts([{ id: this.cueId(t) }])
  }
  hint() {
    if (this.view.merchant) { this.merchantStep({ type: 'help' }); return }
    const s = this.view.screen
    if (s?.screen === 'doors' && this.view.phase === 'answer') {
      // the door's hint: the syllables light again one at a time, slower, with no voice (he reads it); a touch on a key ends it
      const t = this.token
      const no = ++this.doorHint
      const on = () => t === this.token && no === this.doorHint
      this.doorHintOn = true
      this.setScreen({ lit: 0 } as Partial<DoorsView>)
      void this.sleep(t, 600).then(() => { if (on()) this.setScreen({ lit: 1 } as Partial<DoorsView>) })
        .then(() => this.sleep(t, 1400)).then(() => { if (on()) { this.doorHintOn = false; this.setScreen({ lit: 2 } as Partial<DoorsView>) } }).catch(() => {})
      return
    }
    if (s?.screen === 'draw') { if (this.view.phase === 'answer') this.drawStep({ type: 'hint', auto: false }); return }
    const t = this.currentTarget()
    if (!t || this.view.overlay) return
    void this.playHint(t, false).catch(() => {})
  }

  /**
   * He acts (touches an answer, puts the pen down, picks): a hint that shows goes away at once — its card and glow, its
   * hand, its voice, the door's lighting, the merchant's walkthrough replay (rule: a hint goes away when the child acts).
   * The hint stays counted; `hint-stop` says that he cut it.
   */
  private dropHint(by: 'answer' | 'pen') {
    let cut = false
    if (this.view.overlay?.kind === 'hint') { this.set({ overlay: null }); cut = true }
    const s = this.view.screen
    if (s?.screen === 'draw' && s.demo?.hint) { this.drawStep({ type: 'touch' }); cut = true }
    if (s?.screen === 'doors' && this.doorHintOn) {
      this.doorHint++
      this.doorHintOn = false
      this.setScreen({ lit: 2 } as Partial<DoorsView>)
      cut = true
    }
    if (this.visit?.help) { this.merchantStep({ type: 'touch' }); cut = true }
    if (this.hintVoice) { this.hintVoice = 0; this.course.audio.stopVoice(); cut = true }
    if (cut) this.track('hint-stop', { screen: this.view.merchant ? 'merchant' : this.view.screen?.screen ?? null, by })
  }

  // ---- lifecycle
  start() {
    if (this.running) return
    this.running = true
    const st = this.save.read()
    this.startStars = st.totalStars ?? 0
    const session = this.opts.session?.screen
    if (!this.opts.sandbox) this.course.telemetry.track(session ? 'session-start' : 'run-start', { stage: this.stage, ...(session ? { screen: session } : {}) })
    // the hearts last the whole run (spec: one duel, Part 1)
    this.pass = this.newPass(st.lastEnded)
    void this.loop()
  }
  destroy() {
    this.token++
    this.running = false
    this.stopBroom()
    this.course.audio.stopVoice()
    this.course.audio.stopMusic()
    if (this.exited) return
    // closing the game before the cycle's end: the crystal the skipped doors owe him is still his
    if (!this.view.over && !this.ending) this.passStep({ type: 'owed' })
    // the run is already ending (its run-end was sent): closing now is no abandon
    if (this.visit && !this.visit.bought && !this.visit.declined) this.track('merchant-decline', { phase: 'closed' })
    if (!this.view.over && !this.ending && !this.opts.sandbox && this.score > 0) this.course.telemetry.track('abandon', { screen: this.screenId, score: this.score })
  }
  /**
   * He held the home button (2 s): the run stops here, as when the game is closed — the owed crystal is paid, nothing is
   * lost (stars, coins and crystals are saved as they come), and the run's records (lastEnded, runs, best) are not
   * written, as after a lock or an app close; the hearts and the streak start fresh in the next run anyway. The sound
   * stops. A 'run-exit' says where he left (no 'abandon' then).
   */
  exit() {
    if (this.exited) return
    const screen = this.view.merchant ? 'merchant' : this.screenId
    const paused = this.view.paused
    const done = !!this.view.over || this.ending
    this.token++
    this.running = false
    this.stopBroom()
    this.course.audio.stopVoice()
    this.course.audio.stopMusic()
    this.pickWaiter = null
    this.nextWaiter = null
    this.endStrokeWait()
    if (!done) this.passStep({ type: 'owed' })
    if (this.visit && !this.visit.bought && !this.visit.declined) this.track('merchant-decline', { phase: 'exit' })
    this.exited = true
    this.track('run-exit', { screen, score: this.score, paused, ...(done ? { ended: true } : {}) })
  }
  pause() {
    if (this.view.paused || this.view.over || this.ending) return
    this.token++
    this.pausedAt = this.now()
    this.stopBroom()
    this.course.audio.stopVoice()
    this.pickWaiter = null
    this.nextWaiter = null
    this.endStrokeWait()
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
  private drawOn() { return !!this.save.read().settings.drawing }
  /** Book 2's minigames are open (before: stage 0, the tower alone); the gallery plays any screen */
  private bookOpen() { return !!this.opts.force || this.save.read().bookOpen !== false }
  /** the course's placement check is due (Course.placement; never in the gallery) */
  private placementDue() { return !this.opts.sandbox && !this.opts.force && !!this.course.placement?.due(this.save) }

  // ---- helpers
  /** a telemetry event (never in the gallery) */
  private track(e: string, data: Record<string, unknown>) { if (!this.opts.sandbox) this.course.telemetry.track(e, data) }
  private guard<T>(t: number, p: Promise<T>): Promise<T> {
    return p.then((v) => { if (t !== this.token) throw new Aborted(); return v })
  }
  private sleep(t: number, ms: number) { return this.guard(t, this.time.sleep(ms)) }
  private say(t: number, parts: { id: string; onStart?: () => void }[]) {
    for (const p of parts) this.assets.push(p.id)
    return this.guard(t, this.course.audio.sayParts(parts))
  }
  private variation(id: string): string {
    const n = this.course.lineVariations(id)
    let k = 1 + Math.floor(this.rng() * n)
    if (n > 1 && k === this.lastLine[id]) k = (k % n) + 1
    this.lastLine[id] = k
    return this.course.lineAudioId(id, k)
  }
  private waitPick(t: number) { return this.guard(t, new Promise<string>((r) => { this.pickWaiter = r })) }
  private waitNext(t: number) {
    this.set({ needNext: true })
    return this.guard(t, new Promise<void>((r) => { this.nextWaiter = r }))
  }
  private sfx(name: Duel2Sfx) { void this.course.audio.playSfx(name) }
  private cueId(c: Choice) { return c.soundId }
  private ctx(): RoundCtx {
    const s = this.save.read()
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

  // ---- the loop: screens in their cycle until the hearts run out (policies/pass.ts says which comes next)
  private async loop() {
    const t = this.token
    try {
      if (this.opts.force?.screen === 'merchant') return await this.galleryMerchant(t)
      for (;;) {
        if (this.pass.checkpointDue) await this.runCheckpoint(t)
        if (this.screenId === 'crystal') await this.runCrystal(t)
        else await this.runScreen(t, this.screenId)
        const r = this.passStep({ type: 'screen-done', facts: this.facts(), score: this.score })
        if (r.end) return this.endSession(r)
        if (!r.fresh) continue
        this.roundInScreen = 0
        this.ladder = null
        this.doorWords = []
        this.drawPlan = null
        this.visitKind = null
        this.newVisit()
      }
    } catch (e) {
      if (!(e instanceof Aborted)) throw e
    }
  }

  /** the run's mode for the pass, and its first screen (the gallery's forced one, the session's) */
  private newPass(lastEnded: ScreenId | null = null): PassState {
    const f = this.opts.force
    const session = this.opts.session?.screen
    return runPass({
      mode: session ? 'session' : f ? 'gallery' : 'run', lastEnded, facts: this.facts(),
      // the course's placement check is due: the run starts at the tower, where it is played
      screen: session ?? (f ? (f.screen === 'dot' ? 'ladder' : f.screen === 'merchant' ? 'broom' : f.screen) : this.placementDue() ? 'tower' : undefined),
    })
  }
  /** what the pass reads from the saves, now */
  private facts(): PassFacts {
    const st = this.save.read()
    return {
      stage: this.stage, stages: this.course.stages, draw: this.drawOn(), bookOpen: this.bookOpen(), recent: st.recent,
      duelRecent: this.save.firstDuelRecent(), cycleNo: st.cycleNo ?? 0, towerTail: st.towerTail ?? '',
    }
  }

  /** One step of the pass's policy, done: the top bar (a pass heart flies there), the sounds, the saves, the telemetry. */
  private passStep(e: PassInput): PassStep {
    const r = stepPass(this.pass, { ...e, at: this.now() })
    this.pass = r.state
    if (r.run) this.set({ ...r.run, ...(r.heal ? { heal: { id: ++this.fxId, at: this.now() }, heartFlash: ++heartFlashes } : {}) })
    for (const x of r.sfx) this.sfx(x)
    for (const op of r.save) {
      if (op.op === 'nextCycle') this.save.nextCycle()
      else if (op.op === 'noteCheckpoint') this.save.noteCheckpoint(op.due)
      else if (op.op === 'endRun') this.save.endRun(op.screen, op.score)
      else {
        this.save.addCrystal()
        this.track('crystal', { kind: this.save.read().crystals, ...(op.owed ? { owed: true } : {}) })
      }
    }
    for (const x of r.track) this.track(x.e, x.data)
    return r
  }

  /** Sends `e`, then does each wait the step asks for and sends its end (a pause does not cut them: the run is ending). */
  private async passRun(e: PassInput): Promise<PassStep> {
    let r = this.passStep(e)
    while (r.wait) {
      if (r.wait.for === 'sleep') { await this.time.sleep(r.wait.ms); r = this.passStep({ type: 'slept' }) }
      else {
        const said = this.course.audio.sayParts(r.say.map((l) => ({ id: 'id' in l ? l.id : this.variation(l.line) })))
        await (r.wait.min ? Promise.all([said, this.time.sleep(r.wait.min)]) : said)
        r = this.passStep({ type: 'heard' })
      }
    }
    return r
  }

  // ---- the merchant (spec: one duel, Part 2): policies/merchant.ts decides, the run does what it says
  /**
   * A checkpoint between two screens: the merchant comes when the rules say so (merchantDue). Decided once; a visit in
   * progress goes on after a pause as it was.
   */
  private async runCheckpoint(t: number) {
    if (!this.visit) {
      // the next screen's boss is decided here, once (runScreen does not decide again): he always comes before a boss (the
      // checkpoint is only in the adventure, where the boss is decided at the visit's start anyway)
      if (this.screenId === 'broom' && this.visitBoss === undefined) this.visitBoss = this.decideBoss()
      const st = this.save.read()
      const range: NumberRange = st.settings.range ?? 100
      // the checkpoints since his last visit, this one included (the save counts the ones passed without him)
      const since = st.checkpointsSinceVisit ?? NEVER_VISITED
      const r = this.passStep({
        type: 'checkpoint', bookOpen: this.bookOpen(), coins: st.coins ?? 0, range, sinceVisit: since >= NEVER_VISITED ? Infinity : since + 1,
        bossNext: this.screenId === 'tower' ? this.towerBossNext() : !!this.visitBoss,
      })
      if (!r.merchant) return
      const price = r.merchant.price
      // the composition is made once, at his arrival (never during a visit)
      this.newMerchantVisit(price, composeCoins(st.coins ?? 0, price, range, st.merchant?.level ?? 0, this.rng))
      const coins = this.visit!.coins
      this.save.noteMerchant('visit')
      this.track('merchant-arrive', { price, coins: st.coins ?? 0, hearts: this.hearts.left, composition: coins })
    }
    await this.runVisit(t)
    this.visit = null
    this.passStep({ type: 'visited' })
    // the next screen starts fresh (a pause during the visit is not a pause of that screen)
    this.resuming = false
  }

  private newMerchantVisit(price: number, coins: number[]) {
    this.visit = merchantVisit({
      price, coins, knows: this.knowsMerchant(), demoDue: this.merchantDemoDue(), undoShown: this.undoShown(), hearts: this.hearts.left,
      moves: this.demoMove, now: this.now(),
    })
  }

  /** The gallery's merchant (the parent reviews him): a visit with 1 heart and 40 coins, its demo first; then the gallery. */
  private async galleryMerchant(t: number) {
    const GALLERY_COINS = 40
    if (!this.visit) {
      this.passStep({ type: 'gallery-merchant' })
      const range = this.save.read().settings.range ?? 100
      const price = priceAt(0, range)
      this.newMerchantVisit(price, composeCoins(GALLERY_COINS, price, range, this.save.read().merchant?.level ?? 0, this.rng))
    }
    this.set({ hearts: this.hearts.left, coins: GALLERY_COINS - (this.visit!.bought ? this.visit!.price : 0) })
    await this.runVisit(t)
    this.visit = null
    this.set({ over: { score: 0, crystals: 0, best: false } })
  }

  /** he knows the merchant: he has bought a potion from him before (a persisted count; the gallery: never) */
  private knowsMerchant() {
    return !this.opts.force && (this.save.read().merchant?.purchases ?? 0) > 0
  }

  /** the first-visit demo: on his first visit ever (the gallery: when it asks for the demo) */
  private merchantDemoDue() {
    if (this.opts.force) return !!this.opts.force.demo
    return !this.save.read().merchant?.demoSeen
  }

  /** the undo was shown in this run (the gallery: only here; it never reads the child's flag, as its save is read-only) */
  private undoShownHere = false
  private undoShown() { return this.opts.sandbox ? this.undoShownHere : this.undoShownHere || !!this.save.read().merchant?.undoShown }

  /** The visit: it starts (or goes on after a pause) and runs until he has walked away. */
  private async runVisit(t: number) {
    await this.guard(t, new Promise<void>((r) => {
      this.visitDone = r
      this.merchantStep({ type: 'arrive' })
    }))
  }

  /** One step of the visit's policy, done: the views, the sounds, the saves, the telemetry, then its wait. */
  private merchantStep(e: MerchantInput) {
    const v = this.visit
    if (!v) return
    const r = stepMerchant(v, { ...e, at: this.now() })
    this.visit = r.state
    this.demoMove = r.state.moves
    if (r.hush) this.course.audio.stopVoice()
    if (r.view !== undefined) this.set({ merchant: r.view ?? undefined })
    if (r.run) this.set(r.run)
    if (r.bought) {
      this.passStep({ type: 'bought', hearts: r.bought.hearts })
      // the heart flies to the top bar and the hearts flash, as at the end of a pass
      this.set({ hearts: this.hearts.left, heal: { id: ++this.fxId, at: this.now(), from: WIZARD_AT }, heartFlash: ++heartFlashes,
        ...(this.view.coins !== undefined ? { coins: this.view.coins - r.bought.price } : {}) })
    }
    for (const s of r.sfx) this.sfx(s)
    for (const op of r.save) {
      if (op.op === 'noteMerchant') this.save.noteMerchant(op.e)
      else if (op.op === 'setMerchantFlag') {
        this.save.setMerchantFlag(op.k)
        if (op.k === 'undoShown') this.undoShownHere = true
      } else if (op.op === 'merchantPaid') this.save.merchantPaid(op.exactNoHint, op.hinted)
      else this.save.spendCoins(op.n)
    }
    for (const x of r.track) this.track(x.e, x.data)
    if (r.idleAt !== undefined) {
      this.merchantIdle?.()
      this.merchantIdle = undefined
      const t = this.token
      if (r.idleAt !== null) this.merchantIdle = this.time.after(r.idleAt - this.now(), () => {
        if (t === this.token && !this.view.paused) this.merchantStep({ type: 'idle' })
      })
    }
    const parts = r.say.map((l) => ({ id: this.mLine(l.line) }))
    if (r.wait) {
      const no = ++this.merchantWait
      const t = this.token
      const done = (type: 'heard' | 'slept') => () => { if (t === this.token && no === this.merchantWait) this.merchantStep({ type }) }
      if (r.wait.for === 'say') {
        for (const p of parts) this.assets.push(p.id)
        const said = this.course.audio.sayParts(parts)
        void (r.wait.min ? Promise.all([said, this.time.sleep(r.wait.min)]) : said).then(done('heard'))
      } else if (r.wait.for === 'sleep') void this.time.sleep(r.wait.ms).then(done('slept'))
    } else if (parts.length) void this.course.audio.sayParts(parts)
    if (r.end) {
      const d = this.visitDone
      this.visitDone = null
      d?.()
    }
  }
  /** a merchant's line: a variation */
  private mLine(id: string) { return this.variation(id) }

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
    return (this.save.read().towerVisits ?? 0) % 3 === 2
  }

  /**
   * A tower visit: the duel's board plays two waves from where his last visit ended (a boss visit: the boss alone, at the
   * next multiple of 5). Its answers come in through towerAnswer; the visit ends with towerDone. A pause keeps the visit.
   */
  private async runTower(t: number) {
    const st = this.save.read()
    if (!this.tower && this.placementDue()) {
      // the course's placement check: one visit that lasts until he is placed (its waves are only a bound), never a
      // boss; it is not a visit of his tower's rhythm (the visits' count and his tower wave stay)
      this.tower = { wave: st.towerWave ?? 1, waves: PLACEMENT_WAVES, boss: false, visit: ++this.towerNo, done: null, coins: 0, placement: true }
      this.track('placement-start', { wave: this.tower.wave })
    }
    if (!this.tower) {
      const boss = this.towerBossNext()
      const from = this.opts.force ? (boss ? 5 : 1) : st.towerWave ?? 1
      const wave = boss ? Math.ceil(from / 5) * 5 : from
      this.save.noteTowerVisit()
      // the boss's wave jumps over the waves from `from`: the new monsters of those waves are introduced later, the
      // first time each of them appears
      if (boss && wave > from) this.save.oweMonsters(skippedMonsters(from, wave))
      this.tower = { wave, waves: this.visitLen || this.course.stages.visit.tower, boss, visit: ++this.towerNo, done: null, coins: 0 }
      this.track('tower-start', { wave, boss, waves: this.tower.waves })
    }
    const tw = this.tower
    this.syncMult()
    const placement = tw.placement || !this.bookOpen() || undefined
    const mega = this.towerMegaCharge || undefined
    this.set({ screen: { screen: 'tower', wave: tw.wave, waves: tw.waves, boss: tw.boss, visit: tw.visit, ...(placement ? { placement } : {}), ...(mega ? { mega } : {}) }, phase: 'answer', overlay: null, needNext: false, hintAvailable: false, hearts: this.hearts.left })
    this.resuming = false
    const last = tw.done ?? await this.guard(t, new Promise<number>((r) => { this.towerWaiter = r }))
    this.towerWaiter = null
    // the hearts ran out on the tower: its answer has finished on the screen (the duel said the mark); the run ends
    if (this.ending) { await this.endRun(); throw new Aborted() }
    if (!tw.placement) this.save.setTowerWave(last + 1)
    if (!tw.ended) { tw.ended = true; this.track('tower-end', { wave: tw.wave, last, boss: tw.boss }) }
    if (tw.boss) {
      // the boss's bonus coins, one by one (the dragon and the troll are not Book 2's bosses: no trophy)
      this.set({ phase: 'celebrate' })
      while (tw.coins < BOSS_COINS) {
        tw.coins++
        this.save.addCoins(1)
        this.set({ coinPop: (this.view.coinPop ?? 0) + 1 })
        this.sfx('lock')
        await this.sleep(t, COIN_POP_MS)
      }
    }
    // stage 0 passes when his marks are mastered by the duel's own measure (the slow lane) or he has shown that he
    // knows them (the fast lane): Book 2's minigames open (once). A pass in the middle of a visit ended it at that wave.
    const lane = this.stage0Passed()
    if (lane) {
      this.save.openBook()
      this.track('book-open', { stars: this.save.read().totalStars, towerWave: last + 1, lane })
      await this.celebrate(t, 'streak')
    }
  }

  /** stage 0 has passed (the book still closed): by which lane (mastery.stage0Lane); never in the gallery */
  private stage0Passed(): 'fast' | 'slow' | null {
    if (this.opts.sandbox || this.bookOpen()) return null
    return stage0Lane(this.save.firstDuelRecent(), DUEL_MARKS.map((m) => m.id), this.save.read().towerTail ?? '')
  }

  /**
   * A wave of the tower's visit ended and another would start: at stage 0 the check runs after every wave, and a pass
   * ends the visit at this wave (true); the book opens with its celebration when the visit is over (runTower).
   */
  towerWaveEnd(wave: number): boolean {
    if (this.ending || !this.tower || this.view.screen?.screen !== 'tower') return false
    const lane = this.stage0Passed()
    if (lane) this.track('tower-placed', { wave, lane })
    return !!lane
  }

  /** An answer on the tower: the run's stars, coins and streak, or a heart. 'over' when the hearts ran out. */
  towerAnswer(r: 'right' | 'wrong', markId: string): 'on' | 'over' {
    if (this.ending) return 'over'
    if (this.view.screen?.screen !== 'tower') return 'on'
    if (this.tower?.placement) return this.placementAnswer(r, markId)
    this.track('answer', { screen: 'tower', target: markId, result: r, clock: Date.now(), ...(this.opts.sandbox ? { gallery: true } : {}) })
    this.save.noteTowerAnswer(r === 'right')
    // a course whose tower answers count as its other screens' (English): its tallies and the stage pass
    const facts = this.course.tower.facts?.(markId, this.stage)
    if (facts) {
      const { passed } = this.save.recordAnswer({ features: facts.features, miss: r !== 'right', newStage: facts.newStage })
      if (passed) {
        this.stage = this.save.read().stage.stage
        this.track('stage', { stage: this.stage })
      }
    }
    if (r === 'right') {
      this.streak++
      this.gainStar()
      // the badge follows the streak; the duel's own streak line celebrates on the board (no second voice over it)
      const m = multiplierOf(this.streak)
      if (m > this.view.mult) { this.set({ mult: m }); this.track('mult', { mult: m, streak: this.streak }) }
      return 'on'
    }
    const outcome = this.answerOutcome('wrong')
    this.resetStreak()
    this.set({ hearts: this.hearts.left })
    if (!outcome.over) return 'on'
    // the answer on the screen finishes (the duel's feedback), then towerDone ends the run; a pause no longer cancels it
    this.ending = true
    return 'over'
  }

  /**
   * An answer of the course's placement check: walked and saved by the course. A right answer earns its star and coins
   * and moves the streak; a miss costs no heart and no streak (nobody taught him that yet). Once he is placed, the run
   * goes on at his stage, and 'over' ends the visit after this answer's feedback (the cycle goes on).
   */
  private placementAnswer(r: 'right' | 'wrong', markId: string): 'on' | 'over' {
    const { stage, done } = this.course.placement!.answer(this.save, r === 'right', markId, Date.now())
    this.track('placement-answer', { stage, target: markId, result: r, clock: Date.now() })
    if (r === 'right') {
      this.streak++
      this.gainStar()
      const m = multiplierOf(this.streak)
      if (m > this.view.mult) { this.set({ mult: m }); this.track('mult', { mult: m, streak: this.streak }) }
    }
    if (!done) return 'on'
    this.stage = done.level
    this.track('placement-done', { level: done.level, answers: done.answers })
    return 'over'
  }

  /**
   * A מגה kill on the tower (the parent brought it back, 2026-11-14): it is not reading (spec: count special results
   * separately), so it gives no star or coin, does not move the streak or the hearts, and is not in the fast lane's tail.
   * Its own telemetry event keeps it out of the answers.
   */
  towerMega(markId: string) {
    if (this.ending || this.view.screen?.screen !== 'tower') return
    this.track('tower-mega', { target: markId, clock: Date.now(), ...(this.opts.sandbox ? { gallery: true } : {}) })
  }

  /** the duel's מגה charge changed: kept for the run's next tower visit */
  towerCharge(mega: number) {
    // (a placement check has no מגה spell: its charge is not kept)
    if (this.view.screen?.screen === 'tower' && !this.tower?.placement) this.towerMegaCharge = mega
  }

  /** The tower's visit is over (its waves, its boss, or the hearts ran out and the last answer finished). */
  towerDone(lastWave: number) {
    if (!this.tower || this.tower.done !== null) return
    this.tower.done = lastWave
    const w = this.towerWaiter
    this.towerWaiter = null
    w?.(lastWave)
  }

  /** Every second broom visit of a run is a boss visit (never the first); the gallery forces its kind (policies/broomBoss.ts). */
  private decideBoss(): BossKind | null {
    const st = this.save.read()
    const d = bossDue({
      force: this.opts.force ? { boss: this.opts.force.boss } : undefined, session: !!this.opts.session, broomSessions: st.broomSessions ?? 0,
      broomVisits: this.broomVisits, stage: this.stage, confusions: { letters: st.confusions.letters, vowels: st.confusions.vowels },
      beaten: st.bossesBeaten ?? [], last: st.lastBoss ?? null, rng: this.rng,
    })
    this.broomVisits = d.broomVisits
    for (const op of d.save) {
      if (op.op === 'noteBroomSession') this.save.noteBroomSession()
      else this.save.setLastBoss(op.kind)
    }
    return d.kind
  }

  private async runScreen(t: number, screen: ScreenId) {
    // the hearts last the run; only the gallery refills them when its forced screen starts (a pause keeps them)
    if (!this.visitStarted) { this.visitStarted = true; this.visitLen = this.passStep({ type: 'visit', screen, facts: this.facts() }).len! }
    if (screen === 'tower') return this.runTower(t)
    if (screen === 'broom' && this.visitBoss === undefined) this.visitBoss = this.decideBoss()
    // a boss throws syllables
    if (this.visitBoss) this.visitKind = 'syllable'
    this.set({ hearts: this.hearts.left, overlay: null, needNext: false })
    const kind = (this.visitKind ??= this.kindFor(screen))
    const st = this.save.read()
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
      this.set({ phase: 'demo', overlay: { kind: 'demo', line: this.course.lineAudioId(demo, 1), demo } })
      this.save.markDemo(demo)
      this.track('demo', { demo })
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
      const target = this.boss ? this.course.rounds.bossTarget(c, this.boss.kind, prev) : this.course.rounds.broomTarget(c, kind)
      this.set({ screen: { screen: 'broom', kind, waves: [], travelMs: travelMs(this.save.read().pace), lane: 1, target } })
      return target
    }
    if (screen === 'cauldron') {
      const r = this.course.rounds.cauldronRound(c, prev)
      const target = { ...this.course.rounds.letterChoice(r.letter), kind: 'syllable' as Kind, id: r.target.id, text: r.target.text, soundId: r.target.soundId, group: r.target.mark.group, mark: r.target.mark.id }
      this.set({ screen: { screen: 'cauldron', letterId: r.letter.id, orbs: r.orbs.map((m) => m.id), target } })
      return target
    }
    if (screen === 'ladder') {
      if (!this.ladder) this.ladder = { ...this.course.rounds.ladderPlan(c, this.visitLen, this.opts.force?.fixed), built: [] }
      const step = this.ladder.steps[this.ladder.built.length]
      this.set({ screen: { screen: 'ladder', built: this.ladder.built, plates: step.plates, rungs: this.visitLen, target: step.target } })
      return step.target
    }
    if (screen === 'ghosts') {
      const r = this.course.rounds.ghostRound(c, kind, prev)
      this.set({ screen: { screen: 'ghosts', signs: r.signs, target: r.target } })
      return r.target
    }
    // doors
    if (!this.doorWords.length) this.doorWords = this.course.rounds.doorWords(c, this.visitLen)
    const word = this.doorWords[this.roundInScreen % this.doorWords.length]
    const keys = this.course.rounds.doorKeys(c, word)
    // behind the last door: the crystal he is about to win (the kind runCrystal will show)
    const behind = this.roundInScreen === this.visitLen - 1 && !this.opts.session
      ? { crystal: this.save.read().crystals + (this.opts.sandbox ? 0 : 1) } : undefined
    this.set({ screen: { screen: 'doors', word, lit: 0, keys, opening: false, zooming: false, ...(behind ? { behind } : {}) } })
    return word
  }

  private needsDotIntro(target: Choice | Word): string | null {
    if (!('itemId' in target)) return null
    // the gallery's dot-intro entry shows the introduction every round
    const seen = this.opts.force?.screen === 'dot' ? [] : this.save.read().dotIntrosSeen
    return this.course.rounds.dotIntroFor(target.itemId, this.stage, seen)
  }

  private async dotIntro(t: number, hard: string) {
    // the words only on his very first introduction (the parent: later they are understood from the screen)
    const d = dotIntroParts(hard, this.save.read().dotIntrosSeen.length === 0)
    this.set({ phase: 'explain', overlay: { kind: 'dot', parts: d.parts, soft: d.right, hard: d.left } })
    this.save.markDotIntro(hard)
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
    this.passStep({ type: 'round' })
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
    const idle = this.time.after(IDLE_MS, () => {
      if (!live()) return
      spoke = true
      this.track('idle', { screen, target: c?.id ?? null })
      void this.course.audio.sayParts([{ id: this.variation(this.questionLine(screen, kind)) }, ...(c ? [{ id: this.cueId(c) }] : [])])
    })
    const hint = this.time.after(IDLE_HINT_MS, () => {
      if (live() && c) { spoke = true; void this.playHint(c, true, t).catch(() => {}) }
    })
    try {
      const id = await pick
      if (this.view.overlay?.kind === 'hint') this.set({ overlay: null })
      if (spoke) this.course.audio.stopVoice()
      return id
    } finally {
      waiting = false
      idle()
      hint()
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
    if (!this.opts.sandbox) this.course.telemetry.track('hint', { target: c.id, auto })
    this.set({ overlay: { kind: 'hint', target: c, glow: null } })
    const glow = (g: Highlight) => () => { if (this.view.overlay?.kind === 'hint') this.set({ overlay: { kind: 'hint', target: c, glow: g } }) }
    const voice = ++this.fxId
    this.hintVoice = voice
    try {
      await this.say(t, [{ id: `ln-${c.itemId}`, onStart: glow('letter') }, { id: `vn-${c.mark}`, onStart: glow('vowel') }])
    } finally {
      if (this.hintVoice === voice) this.hintVoice = 0
      if (this.view.overlay?.kind === 'hint') this.set({ overlay: null })
    }
  }

  private record(screen: ScreenId, target: Choice | Word, tapped: Choice | Word | null, result: 'right' | 'wrong' | 'near') {
    if (result !== 'near' && screen !== 'broom') this.answered = true
    const feats = 'syllables' in target || 'first' in target ? [`w:${(target as Word).id}`, 'sc:doors'] : this.course.rounds.features(target as Choice, screen)
    const ms = Math.round(this.now() - this.cueStarted)
    const asked = 'soundId' in target ? (target as Choice) : undefined
    const tap = tapped && 'soundId' in tapped ? (tapped as Choice) : undefined
    // a word (the doors) counts towards the stage from stage 4: Hebrew's last stage (the words), English's 4–9
    const newStage = asked ? this.course.rounds.isNewStageChoice(this.stage, asked) && result !== 'near' : this.stage >= 4 && result !== 'near'
    const { passed } = this.save.recordAnswer({ features: feats, miss: result !== 'right', asked, tapped: tap, newStage })
    if (passed) {
      this.stage = this.save.read().stage.stage
      this.track('stage', { stage: this.stage })
    }
    this.course.telemetry.track('answer', {
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
    const outcome = this.answerOutcome(right ? 'right' : near ? 'near' : 'wrong')
    if (right) {
      this.record(screen, c, tapped, 'right')
      this.roundInScreen++
      // the streak counts this answer before its coins (the fifth right answer pays 2)
      this.streak++
      this.gainStar()
      this.set({ phase: 'feedback' })
      const confident = predict(this.course.rounds.features(c, screen), this.save.read().tallies, this.save.read().recent) < 0.2 && this.now() - this.cueStarted < CONFIDENT_MS
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
      this.record(screen, c, tapped, 'near')
      await this.say(t, [{ id: this.variation('almost') }])
      return 'near'
    }
    // a mistake
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
      this.course.audio.stopVoice()
      // how long he took to do the right move himself, and how often the sound played again meanwhile
      this.track('fix', { screen: this.screenId, target: cue, ms: Math.round(this.now() - from), replays })
    } finally {
      this.fixWaiter = null
      this.set({ fixing: false })
    }
  }

  private async evaluateDoor(t: number, word: Word, picked: string): Promise<'next' | 'over'> {
    const right = picked === word.id
    const outcome = this.answerOutcome(right ? 'right' : 'wrong')
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
    const s = this.save.read()
    const lf = `l:${c.itemId}`
    const recent = s.mistakes.filter((m) => m.round > s.roundNo - 8 && m.features.includes(lf)).length
    void screen
    return recent >= 2 || this.rng() < 0.25
  }

  private async explain(t: number, c: Choice) {
    const parts: { id: string; highlight: Highlight }[] = [
      { id: this.course.lineAudioId('explain-lead', 1), highlight: 'none' }, { id: `ln-${c.itemId}`, highlight: 'letter' },
      { id: `vn-${c.mark}`, highlight: 'vowel' }, { id: c.soundId, highlight: 'all' },
    ]
    if (!this.opts.sandbox) this.course.telemetry.track('explain', { target: c.id })
    this.set({ phase: 'explain', overlay: { kind: 'explain', parts, target: c } })
    await this.waitNext(t)
    this.set({ overlay: null })
  }

  private async maybeWordLink(t: number, c: Choice) {
    if (c.kind !== 'syllable' || this.lastWordLink) { this.lastWordLink = false; return }
    if (this.rng() >= WORD_LINK_CHANCE) return
    const w = this.course.rounds.wordLinkFor(c.itemId, c.mark!, this.rng)
    if (!w) return
    this.lastWordLink = true
    this.set({ overlay: { kind: 'word', word: w } })
    await this.say(t, [{ id: `w-${w.id}` }])
    this.set({ overlay: null })
  }

  private async celebrate(t: number, line: 'streak' | 'ladder-top' | 'crystal') {
    this.set({ phase: 'celebrate' })
    this.sfx(line === 'crystal' ? 'crystal' : 'streak')
    this.course.audio.startMusic('celebrate')
    const praise = this.praiseLine(line)
    if (praise) await this.say(t, [{ id: praise }])
    else await this.sleep(t, PRAISE_SOUND_MS)
    this.course.audio.stopMusic()
  }

  /** The praise words only the first PRAISE_SPOKEN times of each kind; after that its sound is enough (Michael: "he knows it"). */
  private praiseLine(kind: 'streak' | 'ladder-top' | 'crystal' | 'boss-win', note = true): string | null {
    if ((this.save.read().praiseHeard?.[kind] ?? 0) >= PRAISE_SPOKEN) return null
    if (note) this.save.notePraise(kind)
    return this.variation(kind)
  }

  private async runCrystal(t: number) {
    this.passStep({ type: 'crystal' })
    const kind = this.save.read().crystals
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
    this.course.audio.stopMusic()
    const r = await this.passRun({ type: 'lost', score: this.score, bestRun: this.save.read().bestRun, cue })
    this.token++
    this.set({ over: { score: this.score, crystals: r.over!.crystals, best: r.over!.best, bosses: [...this.bossesWon], startStars: this.startStars }, needNext: false })
    return 'over'
  }

  // ---- the drawing screen (spec: 2026-11-07 drawing)

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
    const st = this.save.read()
    this.drawPlan ??= this.course.rounds.drawWords({ rng: this.rng, tallies: st.tallies, recent: st.recent, confusions: st.confusions.letters })
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

  /**
   * One drawing round (policies/draw.ts decides, the run does what it says): the word; the demo when needed; he writes
   * the letter, then the lines are told, then the marks; then the word again and a star. No hearts are lost.
   */
  private async runDrawRound(t: number, screen: 'draw' | 'draw-hand') {
    this.syncMult()
    const view = this.buildDraw(this.opts.force?.script ?? scriptOf(screen))
    const def = strokesOf(view.letter, view.script)
    const st = this.save.read()
    // the print screen has its demo; the handwriting screen uses the per-letter demos (needsDemo)
    const firstVisit = screen === 'draw' && (this.opts.force ? !!this.opts.force.demo && !this.demoShown : !st.demosSeen.includes('demo-draw'))
    const demo = firstVisit ? 'first' : needsDemo(view.letter, view.script, st.tallies, st.recent) ? 'letter' : null
    this.draw = drawRound({ view, def, checker: new LetterChecker(def), screen, demo, strokeNo: this.strokeNo, demoNo: this.demoNo })
    this.assets = []
    await this.guard(t, new Promise<void>((r) => {
      this.drawDone = r
      this.drawStep({ type: 'start' })
    }))
    await this.streakMoment(t)
    await this.sleep(t, 500)
  }

  private endStrokeWait() {
    this.strokeWait = false
    for (const c of this.drawTimers) c()
    this.drawTimers = []
  }
  private drawLine(l: DrawLine) { return 'id' in l ? l.id : l.take ? this.course.lineAudioId(l.line, l.take) : this.variation(l.line) }

  /** One step of the round's policy, done: the views, the sounds, the saves, the telemetry, then its wait. */
  private drawStep(e: DrawInput) {
    const d = this.draw
    if (!d) return
    const r = stepDraw(d, { ...e, at: this.now() })
    this.draw = r.state
    this.strokeNo = r.state.strokeNo
    this.demoNo = r.state.demoNo
    if (r.hush) this.course.audio.stopVoice()
    if (r.run) this.set(r.run)
    if (r.view) this.set({ screen: r.view })
    if (r.cue) this.cueStarted = this.now()
    for (const x of r.sfx) this.sfx(x)
    if (r.drawn) {
      this.answered = true
      this.roundInScreen++
      // every finished drawing counts in the streak: only a lost heart resets it (none is lost here)
      this.streak++
      this.gainStar()
    }
    for (const op of r.save) {
      if (op.op === 'markDemo') { this.demoShown = true; this.save.markDemo(op.id) }
      else if (op.op === 'recordAnswer') this.save.recordAnswer({ features: op.features, miss: op.miss, newStage: false })
      else this.save.noteDrawRound()
    }
    for (const x of r.track) this.track(x.e, x.data)
    const t = this.token
    if (r.hintFor) {
      const { id, ms } = r.hintFor
      this.time.after(ms, () => { if (t === this.token && this.view.screen?.screen === 'draw') this.drawStep({ type: 'hint-over', id }) })
    }
    if (r.ask) {
      const id = this.drawLine(r.ask)
      this.assets.push(id)
      void this.course.audio.sayParts([{ id, onStart: () => { if (t === this.token) this.drawStep({ type: 'ask-start' }) } }])
        .then(() => { if (t === this.token) this.drawStep({ type: 'asked' }) })
    }
    const parts = r.say.map((l) => ({ id: this.drawLine(l) }))
    if (r.wait) {
      this.endStrokeWait()
      const no = ++this.drawWait
      const on = () => t === this.token && no === this.drawWait
      const done = (type: 'heard' | 'slept') => () => { if (on()) this.drawStep({ type }) }
      const w = r.wait
      if (w.for === 'say') {
        for (const p of parts) this.assets.push(p.id)
        const said = this.course.audio.sayParts(parts)
        void (w.min ? Promise.all([said, this.time.sleep(w.min)]) : said).then(done('heard'))
      } else if (w.for === 'sleep') void this.time.sleep(w.ms).then(done('slept'))
      else {
        if (parts.length) void this.course.audio.sayParts(parts)
        this.strokeWait = true
        const live = () => on() && this.strokeWait && !this.view.paused && this.view.phase === 'answer'
        this.drawTimers = [
          this.time.after(w.idle, () => { if (live()) this.drawStep({ type: 'idle' }) }),
          this.time.after(w.hint, () => { if (live()) this.drawStep({ type: 'hint', auto: true }) }),
        ]
        if (w.settle !== undefined) {
          this.drawTimers.push(this.time.after(w.settle, () => { if (on() && this.strokeWait) { this.endStrokeWait(); this.drawStep({ type: 'settle' }) } }))
        }
      }
    } else if (parts.length) void this.course.audio.sayParts(parts)
    if (r.end) {
      const f = this.drawDone
      this.drawDone = null
      f?.()
    }
  }

  // ---- the broom flight
  private stopBroom() {
    this.broomStop?.()
    this.broomStop = undefined
  }

  /**
   * The broom flight, one continuous arcade flow (Michael: "more fluent, like an arcade game"): orbs keep coming; a catch,
   * a hit or a miss is handled on the fly with no stop and no next button. A new sound to catch comes only when the orbs on
   * the screen are done, and is announced while he flies. The visit ends when its last orbs have all arrived.
   */
  private async runBroom(t: number, kind: Kind) {
    this.passStep({ type: 'round' })
    this.syncMult()
    if (this.visitBoss && !this.boss) {
      this.boss = bossVisit(this.visitBoss)
      this.bossStep({ type: 'start' })
    }
    let target = this.buildRound('broom', kind) as Choice
    this.spokenTargets.clear()
    this.stopBroom()
    const fresh: Partial<BroomView> = { waves: [], reveal: undefined, missed: false, fx: undefined, finished: false }
    if (this.boss) this.bossStep({ type: 'fly' }, fresh)
    else this.setScreen({ ...fresh, boss: undefined } as Partial<BroomView>)
    if (this.boss?.won) return this.bossWin(t)
    this.course.audio.startMusic(this.boss ? 'boss' : 'flight')
    this.set({ phase: 'question', hintAvailable: kind === 'syllable' })
    this.assets = []
    // a boss swoops in first (once), then its line; otherwise only the sound to catch (the demo taught the screen)
    if (this.boss) await this.bossRun(t, { type: 'arrive' }, target)
    else await this.say(t, [{ id: this.cueId(target) }])
    this.set({ phase: 'answer' })
    const travel = travelMs(this.save.read().pace) * (this.boss ? BOSS_SLOW : 1)
    this.track('flight', { kind, travelMs: Math.round(travel), pace: this.save.read().pace, boss: this.boss?.kind ?? null })
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
      const choices = this.boss ? this.course.rounds.bossWave(this.ctx(), this.boss.kind, target) : this.course.rounds.broomWave(this.ctx(), target, kind)
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
        jitter: choices.map(() => Math.round((this.rng() - 0.5) * 2 * ORB_JITTER)),
        resolved: choices.map(() => false),
      }
      this.setScreen({ waves: [...(this.view.screen as BroomView).waves, w], travelMs: travel } as Partial<BroomView>)
      this.sfx('wave')
      this.cueStarted = this.now()
      spawned++
      nextSpawnAt = now + travel * WAVE_EVERY
    }
    const result = await this.guard(t, new Promise<'done' | 'over' | 'won'>((resolve, reject) => {
      this.broomStop = this.time.every(50, () => {
        if (t !== this.token) { this.stopBroom(); reject(new Aborted()); return }
        const now = this.broomClock()
        const cur = this.view.screen as BroomView
        const events: { hit: Choice | null; wave: BroomWave }[] = []
        const waves = cur.waves.map((w) => {
          const k = w.choices.map((_, i) => wavePos(w.startMs + w.offsets[i] * travel, now, travel))
          // one wave is one question: after its catch or a mistake its other orbs fly on harmlessly (at most one heart)
          const e = waveTick(k, { resolved: w.resolved, spent: w.spent || dying }, cur.lane, w.choices.map((c) => c.soundId === target.soundId), w.lanes)
          if (e.event) events.push({ hit: e.event.kind === 'miss' ? null : w.choices[e.event.orb], wave: w })
          return { ...w, resolved: e.resolved, ...(e.spent ? { spent: true } : {}) }
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
              if (this.boss) this.bossStep({ type: 'lose' })
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
          target = this.boss ? this.course.rounds.bossTarget(this.ctx(), this.boss.kind, target.soundId) : this.course.rounds.broomTarget(this.ctx(), kind, target.soundId)
          this.setScreen({ target, waves: spentWaves } as Partial<BroomView>)
          holdSpawn = true
          const go = () => { holdSpawn = false; nextSpawnAt = -Infinity }
          void this.say(t, [{ id: this.variation('target-new') }, { id: this.cueId(target), onStart: go }])
            .catch(() => {}).finally(() => { announcing = false; if (holdSpawn) go() })
        }
        if (!newTargetDue && !holdSpawn && more() && now >= nextSpawnAt) spawn(now)
        // the visit ends when all its orbs have arrived (Michael: "let me finish"); the screen's waves, not `waves`: a wave
        // spawned in this tick (the last one, after a new sound) is only there
        if (!this.boss && spawned >= this.visitLen && !newTargetDue && !open((this.view.screen as BroomView).waves)) { this.stopBroom(); resolve('done') }
      })
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
    this.course.audio.stopMusic()
  }

  // ---- the flight boss: policies/broomBoss.ts decides, the run does what it says
  /** One step of the boss's policy, done: its view (with `patch` over the screen), sounds, music, saves and telemetry. */
  private bossStep(e: BossInput, patch: Partial<BroomView> = {}): BossStep {
    const r = stepBoss(this.boss!, { ...e, at: this.now() })
    this.boss = r.state
    if (r.view || Object.keys(patch).length) this.setScreen({ ...patch, ...(r.view ? { boss: r.view } : {}) } as Partial<BroomView>)
    if (r.run) this.set(r.run)
    if (r.music) this.course.audio.stopMusic()
    for (const x of r.sfx) this.sfx(x)
    if (r.music === 'celebrate') this.course.audio.startMusic('celebrate')
    for (const op of r.save) {
      if (op.op === 'markBossBeaten') { this.save.markBossBeaten(op.kind); this.bossesWon.push(op.kind) }
      else if (op.op === 'notePraise') this.save.notePraise(op.kind)
      else if (op.op === 'addCoins') this.save.addCoins(op.n)
      else this.save.markBossNewHeard(op.kind)
    }
    if (r.coinPop) this.set({ coinPop: (this.view.coinPop ?? 0) + 1 })
    for (const x of r.track) this.track(x.e, x.data)
    return r
  }

  /** Sends `e`, then does each wait the step asks for and sends its end, until a step asks for none (`target`: the cue). */
  private async bossRun(t: number, e: BossInput, target?: Choice, patch?: Partial<BroomView>): Promise<BossStep> {
    let r = this.bossStep(e, patch)
    while (r.wait) {
      if (r.wait.for === 'sleep') {
        await this.sleep(t, r.wait.ms)
        r = this.bossStep({ type: 'slept' })
      } else {
        const ok = await this.say(t, r.say.map((l) => ({ id: this.bossLine(l, target) })))
        r = this.bossStep({ type: 'heard', ok: !!ok })
      }
    }
    return r
  }
  private bossLine(l: BossLine, target?: Choice) {
    if ('cue' in l) return this.cueId(target!)
    return l.take ? this.course.lineAudioId(l.line, l.take) : this.variation(l.line)
  }

  /** A right catch on a boss visit: a spell bolt flies to the boss, it shows its hit pose, one segment goes out. */
  private bossHit(t: number, lane: number): 'on' | 'won' {
    const r = this.bossStep({ type: 'hit', id: ++this.fxId, lane })
    if (r.poseFor) {
      const { id, ms } = r.poseFor
      this.time.after(ms, () => { if (t === this.token && this.boss && this.view.screen?.screen === 'broom') this.bossStep({ type: 'pose', id }) })
    }
    return r.won ? 'won' : 'on'
  }

  /**
   * The win (the policy's order): the defeated pose, its sound and music, the congratulation line (praise rule), 3 bonus
   * coins one by one, and on his first win against this kind the golden frame and its line; then the flight's finale.
   * Re-entrant after a pause: each part happens once.
   */
  private async bossWin(t: number) {
    const st = this.save.read()
    const heardNew = (st.bossNewHeard ?? []).includes(this.boss!.kind)
    const praise = (st.praiseHeard?.['boss-win'] ?? 0) < PRAISE_SPOKEN
    await this.bossRun(t, { type: 'win', heardNew, praise }, undefined, { waves: [], reveal: undefined })
    await this.finale(t)
  }

  /**
   * A right answer: this run's score, a star on his kept total, and coins for his balance — one times the streak
   * multiplier (`this.streak` already counts this answer). The coin in the top bar pops (its number changes).
   */
  private gainStar() {
    this.score++
    this.set({ score: this.score, coinPop: (this.view.coinPop ?? 0) + 1 })
    this.save.addStar()
    this.save.addCoins(coinsFor(this.streak))
  }

  /** The hearts after an answer: in a session from the path no heart is at stake (a mistake costs only the streak). */
  private answerOutcome(a: 'right' | 'wrong' | 'near') { return this.passStep({ type: 'answer', a }).outcome! }

  /**
   * The end of a session from the path: no defeat scene, no run records (lastEnded, best and runs stay); the summary
   * shows its stars and goes home by itself. A pause can no longer cancel it.
   */
  private endSession(r: PassStep) {
    this.ending = true
    this.stopBroom()
    this.course.audio.stopMusic()
    this.token++
    this.set({ over: { score: this.score, crystals: r.over!.crystals, best: r.over!.best, bosses: [...this.bossesWon], startStars: this.startStars, session: true }, needNext: false, overlay: null, hintAvailable: false })
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
  private multLine(m: 1 | 2 | 3) { return this.course.lineAudioId('mult-up', m === 2 ? 1 : 2) }

  private onCatch(target: Choice, noPraise = false) {
    const st = this.save.read()
    this.record('broom', target, target, 'right')
    this.save.setPace(flightPace(st.pace, 'catch'))
    this.streak++
    this.gainStar()
    this.sfx('catch')
    if (!this.spokenTargets.has(target.soundId)) {
      this.spokenTargets.add(target.soundId)
      void this.course.audio.sayParts([{ id: this.cueId(target) }])
    }
    // the multiplier rises over the flight (its sound and line; no line on the catch that beats the boss)
    const m = multiplierOf(this.streak)
    if (m > this.view.mult) {
      this.set({ mult: m })
      this.track('mult', { mult: m, streak: this.streak })
      if (!noPraise) { this.sfx('streak'); void this.course.audio.sayParts([{ id: this.multLine(m) }]) }
    } else if (!noPraise && this.streak % STREAK_EVERY === 0) { const praise = this.praiseLine('streak'); if (praise) void this.course.audio.sayParts([{ id: praise }]) }
  }

  /**
   * A hit (`hit` = the wrong orb he met) or a miss (null: the target flew past) during the flight: a flash, a heart, the
   * right orb of that wave glows a moment and its sound plays again — and the flight goes on.
   */
  private onFlightMistake(t: number, target: Choice, hit: Choice | null, wave: BroomWave): 'on' | 'over' {
    const st = this.save.read()
    const near = !!hit && hit.nearMissOf === target.id
    const outcome = this.answerOutcome(near ? 'near' : 'wrong')
    if (outcome.forgiven) {
      this.record('broom', target, hit, 'near')
      void this.course.audio.sayParts([{ id: this.variation('almost') }])
      return 'on'
    }
    this.resetStreak()
    this.record('broom', target, hit, 'wrong')
    this.save.setPace(flightPace(st.pace, 'miss'))
    // a miss (the target flew past in another lane) is a whoosh, not a crash
    this.sfx(hit ? 'hit' : 'wave')
    const right = wave.choices.find((c) => c.soundId === target.soundId)
    const fx = { id: ++this.fxId, kind: hit ? 'hit' as const : 'miss' as const, at: this.now() }
    this.setScreen({ reveal: { right: right?.id ?? target.id, wrong: hit?.id }, missed: !hit, fx } as Partial<BroomView>)
    this.set({ hearts: this.hearts.left })
    if (outcome.over) return 'over'
    void this.course.audio.sayParts([{ id: this.cueId(target) }])
    this.time.after(1400, () => {
      const s = this.view.screen
      if (t === this.token && s?.screen === 'broom' && s.fx?.id === fx.id) this.setScreen({ reveal: undefined } as Partial<BroomView>)
    })
    return 'on'
  }

}
