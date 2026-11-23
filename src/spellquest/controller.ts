// The run controller (spec: Run, Screens). One async flow per screen: question → cue → answer → feedback, with mistakes
// that wait for next, explanations, hints, demos, the dotted-letter introduction, the word link, celebrations, the hearts
// (for the whole run; one comes back at the end of each pass) and the run's end. React reads `view` through subscribe(); gestures come in through gesture().
// Pausing aborts the flow at its next await; resume restarts the same round from the start.
import { BLEND_GAP_MS, playUnitsThenWord, scheduleBlend } from '../shared/blendSchedule'
import type { Rng } from '../shared/adaptive'
import { mark as markOf, syllable, type MarkId } from './logic/content'
import { predict, type ScreenId } from './logic/predict'
import type { Choice, Kind, RoundCtx } from './logic/rounds'
import type { Round } from './tower/types'
import {
  TARGET_EVERY, waveTick, wavePos, WAVE_EVERY, POPCORN, ORB_JITTER, HEARTS, flightPace, coinsFor, multiplierOf, travelMs,
} from './logic/run'
import type { Word } from './data/words'
import { dotIntroParts } from './logic/dotIntro'
import { ZOOM_MS } from './layout'
import type { SpellQuestSfx } from './audio/spellQuestAudio'
import { readOnlySavePort, type SavePort } from './savePort'
import { realSleeper, type Cancel, type Sleeper } from '../shared/sleeper'
import { BOSS_COINS, BOSS_SLOW, type BossKind } from './logic/boss'
import { HEBREW } from './course/hebrew'
import type { BlendPart, BlendPlan, Course, CourseId, DoorKey, DoorRound, DrawItem, LadderPlan } from './course/types'
import type { Highlight } from './viewTypes'
import { strokesOf, type Pt, type Script } from './data/strokes'
import { LetterChecker, splitMarks } from './logic/recognizer'
import { marksFor, needsDemo, scriptOf, splitWord } from './logic/draw'
import { drawLayout, latinLayout } from './logic/drawLayout'
import { drawRound, stepDraw, type DrawInput, type DrawLine, type DrawState, type DrawView, type LatinRound } from './policies/draw'
import { spellVisit, stepSpell, type SpellAnswer, type SpellInput, type SpellRound, type SpellSfx, type SpellState, type SpellView } from './policies/spell'
import { spellWriting } from './policies/spellWrite'
import { spellFixture } from './data/spellFixtures'
import { composeCoins, priceAt, type NumberRange } from './logic/merchant'
import { bossDue, bossVisit, stepBoss, type BossInput, type BossLine, type BossState, type BossStep, type BossView } from './policies/broomBoss'
import { merchantVisit, stepMerchant, type MerchantGesture, type MerchantInput, type MerchantState, type MerchantView } from './policies/merchant'
import { NEVER_VISITED } from './store'
import { stage0Lane } from './logic/mastery'
import { runPass, stepPass, type PassFacts, type PassInput, type PassState, type PassStep } from './policies/pass'
import { TOWER_MARKS } from './tower/logic/marks'
import { skippedMonsters } from './tower/logic/rules'

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
interface CauldronView {
  /** `target`: what he hears; Hebrew: the letter and its vowel orbs (English leaves them empty: it has boxes and tiles) */
  screen: 'cauldron'; letterId: string; orbs: MarkId[]; target: Choice; joined?: boolean
  /** Hebrew: the vowel orbs' marks; English: the tiles' ids */
  reveal?: { right: string; wrong?: string }
  /** English: the word's parts, `boxes[gap]` the missing one (the right tile), and the tiles */
  boxes?: Choice[]; gap?: number; tiles?: Choice[]
  /** English stage 6: the word shown before the thrown `e` turns it into `target` (cap → cape) */
  shown?: Choice
  /** the course's call: this round's answer never counts towards the stage (CauldronRound.noStage) */
  noStage?: boolean
}
interface LadderView {
  screen: 'ladder'; built: Choice[]; plates: Choice[]; rungs: number; target: Choice; reveal?: Reveal
  /**
   * English, after the first rung: the rung he makes shows `from` (the word below's boxes); `parts` are the new word's,
   * `parts[at]` the right plate (ladderAnswerId); `grow` 1: a box more than below; `marked`: the place `at` is marked
   */
  from?: Choice[]; parts?: Choice[]; at?: number; grow?: 1 | -1; marked?: boolean
  /** an unmarked rung: the plate a tap lifted above the box row (the boxes glow); the next tap on a box places it */
  lifted?: string
  /** English: what the voice names now: the foot rung ('foot'), the place the new letter goes ('box'); the screen glows it */
  cue?: 'foot' | 'box'
  /** the swap after the right move (ladderSwap): the plate `id` flies to its place, then (step `swap`) it is in the row */
  placing?: { id: string; step: 'fly' | 'swap' }
}
/** the plate a ladder rung asks for: the changed part (English), else the target */
export const ladderAnswerId = (s: { target: Choice; parts?: Choice[]; at?: number }): string => (s.at !== undefined && s.parts ? s.parts[s.at].id : s.target.id)
interface GhostsView { screen: 'ghosts'; signs: Choice[]; target: Choice; zapped?: string; reveal?: Reveal }
interface DoorsBase {
  /** `lit`: how many parts of the plate are lit (Hebrew: the word's two syllables; English: its words) */
  screen: 'doors'; lit: number; opening: boolean; zooming: boolean; reveal?: Reveal
  /** the last door: the crystal (its kind) waits behind it */
  behind?: { crystal: number }
}
/** Hebrew: the door word (its syllables are the plate) and the keys, door words; `word.id` is the right key */
interface WordDoorsView extends DoorsBase { word: Word; keys: Word[]; plate?: undefined }
/** English: the words on the door in reading order (`plate`); `word` is the right key (the word's or the noun's picture) */
interface PlateDoorsView extends DoorsBase { word: DoorKey; keys: DoorKey[]; plate: Choice[] }
type DoorsView = WordDoorsView | PlateDoorsView
/** what a door asks: the Hebrew door word; on an English door the word of its right key (the word, or the phrase's noun) */
const doorTarget = (s: DoorsView): Choice | Word => (s.plate ? s.plate.find((c) => c.id === s.word.id)! : s.word)
/** the parts of a door's plate that light one at a time: the Hebrew word's two syllables, or the English door's words */
const doorParts = (s: DoorsView) => (s.plate ? s.plate.length : 2)
interface CrystalView { screen: 'crystal'; kind: number }
/** The tower's tower (spec: one duel, Part 3): drawn by `Tower` (the tower's own board), which reports each answer
 * (towerAnswer) and the end of the visit (towerDone). `visit` changes with each new visit (a pause keeps it). */
export interface TowerView {
  screen: 'tower'; wave: number; waves: number; boss: boolean; visit: number
  /**
   * a placement check: Spell Quest's stage 0 (the marks he has not answered yet are asked first), or the course's own
   * (`Course.placement`: the tower plays its rounds; a miss costs no heart and no streak, and there is no hint)
   */
  placement?: boolean
  /** the tower's מגה charge at the visit's start: it carries over from the run's last tower visit (none at a run's start) */
  mega?: number
}
export type ScreenView = BroomView | CauldronView | LadderView | GhostsView | DoorsView | CrystalView | DrawView | TowerView | SpellView

export type { MerchantView } from './policies/merchant'
export type { DrawStroke, DrawView } from './policies/draw'
export type { SpellView } from './policies/spell'
export type { BossPose, BossView } from './policies/broomBoss'

export type Overlay =
  /** `parts`: the demo's voice in beats, each lighting a part of the screen (the English ladder); unset: `line` alone */
  | { kind: 'demo'; line: string; demo: string; parts?: { id: string; highlight: Highlight }[] }
  | { kind: 'explain'; parts: { id: string; highlight: Highlight }[]; target: Choice }
  | { kind: 'dot'; parts: { id: string; highlight: Highlight }[]; soft: string; hard: string }
  | { kind: 'hint'; target: Choice; glow: Highlight | null }
  /** a word blends (English): its pieces, and the units lit so far (BlendWord) */
  | { kind: 'blend'; parts: BlendPart[]; lit: number[] }
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
/** the spell book: he dropped the tile of `tile` (its unit) into box `box` (in box order, the reading's); a written word takes `stroke`s */
type DropGesture = { type: 'drop'; tile: string; box: number }

export interface RunOpts {
  sandbox?: boolean
  force?: {
    /** 'merchant': the gallery's merchant visit (1 heart, 40 coins); the visit ends the gallery screen */
    screen: ScreenId | 'crystal' | 'dot' | 'merchant'; stage: number; kind?: Kind; demo?: boolean; fixed?: 'letter' | 'vowel' | 'dot'; script?: Script
    /** the gallery: a boss of this kind on the broom flight */
    boss?: BossKind
    /** the gallery: the tower's boss visit */
    towerBoss?: boolean
    /** the gallery: the spell book's long fixture round (English's 5 boxes); `write`: the same word written (7 letters) */
    longSpell?: boolean | 'write'
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
/** an input of a policy, before the run stamps its time */
type NoAt<T> = T extends unknown ? Omit<T, 'at'> : never
/** the spell book's effects: a tile lands (the lock's click), a wrong tile (the hit), the spell */
const SPELL_SFX: Record<SpellSfx, SpellQuestSfx> = { drop: 'lock', wrong: 'hit', spell: 'spell', stroke: 'stroke' }
/** after his fixing move: the effect plays before the next round */
const FIX_DONE_MS = 700
/** the ladder's swap (design 2026-11-23 A): the plate flies to its place; then (English) the old letter drops out, and the
 * lock's click rings one SFX_RING_MS before the word */
const LADDER_FLY_MS = 250
const LADDER_SWAP_MS = SFX_RING_MS
/** the kit's voice gap (gapMs of the Spell Quest sound): between two words that follow each other */
const VOICE_GAP_MS = 800
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
  /** an introduction plays during the flight (its say's id; 0: none): the next wave waits for it, the orbs flying go on */
  private introHold = 0
  private introSays = 0
  private fixWaiter: ((id: string) => void) | null = null
  /** the round the demo showed is the first round he plays (the parent: the letter changed after the demo) */
  private demoRound = false
  private fxId = 0
  private ladder: (LadderPlan & { built: Choice[]; footSaid?: boolean }) | null = null
  /** the ladder's last built rung whose word a pause cut (said first after the resume), and when its word ended */
  private ladderOwed: Choice | null = null
  private ladderWordEnd: number | null = null
  /** the box of the rung he made that the plate was dropped on (an unmarked English rung; unset: a tap, or elsewhere) */
  private pickBox: number | undefined
  /** the doors of this visit, and the one on screen */
  private doorRounds: DoorRound[] = []
  private door: DoorRound | null = null
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
  /** the words he was asked in this run, in order, once each (the course's `onRunEnd` gets them) */
  private wordsRead: string[] = []
  private wordsSaved = false
  private startStars = 0
  private drawPlan: DrawItem[] | null = null
  /** the drawing round on the screen (a pause starts it again) */
  private drawCur: DrawItem | null = null
  /** the drawing round in progress (policies/draw.ts) */
  private draw: DrawState | null = null
  /** it waits for his next stroke; the wait's number, and its times (settle, idle, hint) */
  private strokeWait = false
  private drawWait = 0
  private drawTimers: Cancel[] = []
  private drawDone: (() => void) | null = null
  private strokeNo = 0
  private demoNo = 0
  /** restarts the idle wait of the round (idleWait), while it waits */
  /** the ladder's demo said the foot word and the new word: its first round does not say them again */
  private demoSaidWords = false
  private idleBump: (() => void) | null = null
  /** the spell book's round in progress (policies/spell.ts); its waits share the drawing's wait number and timers */
  private spell: SpellState | null = null
  /** the boxes of the spell round in progress already answered (they survive a pause: the same round again counts them once) */
  private spellAnswered: number[] = []
  /** this visit ended with no round (the course had none at this stage): no checkpoint after it */
  private visitEmpty = false
  private spellDone: ((end: 'next' | 'over') => void) | null = null
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
  /** the blends play: a new number ends the ones before (their lights); `blendHint` is the hint's (a touch stops it) */
  private blendNo = 0
  private blendHint = 0
  /** the hint blended a word in this round (English): its answer counts as helped, not right */
  private hinted = false
  /** the misses on this visit's word rounds (English): the blend plays too after every second one */
  private blendMisses = 0
  /** the tower's visit in progress (it survives a pause: the same visit goes on); `done` = its last wave, once over */
  private tower: { wave: number; waves: number; boss: boolean; visit: number; done: number | null; coins: number; ended?: boolean; placement?: boolean } | null = null
  private towerNo = 0
  /** the tower's מגה charge: it carries over between the tower's visits within this run, and starts empty in a new run */
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
    // a forced screen the course does not have, or a boss kind not open at the forced stage, has nothing to run: the loop
    // would turn without waiting for anything (a screen of length 0) or throw in the round's pick, so it is refused here
    const f = opts.force
    if (f && f.screen !== 'merchant' && f.screen !== 'dot' && f.screen !== 'crystal' && this.course.stages.visit[f.screen] === 0) throw new Error(`the ${this.course.id} course has no ${f.screen} screen`)
    if (f?.boss && this.course.rounds.bossKinds && !this.course.rounds.bossKinds(this.stage, { letters: {}, vowels: {} } as never).open.includes(f.boss)) {
      throw new Error(`the ${this.course.id} course's ${f.boss} boss is not open at stage ${this.stage}`)
    }
  }

  // ---- React bridge
  subscribe = (f: () => void) => { this.listeners.add(f); return () => { this.listeners.delete(f) } }
  getView = () => this.view
  private set(p: Partial<View>) { this.view = { ...this.view, ...p }; this.listeners.forEach((f) => f()) }
  private setScreen(p: Partial<ScreenView>) { if (this.view.screen) this.set({ screen: { ...this.view.screen, ...p } as ScreenView }) }
  /** the broom's clock: stops while paused */
  broomClock = () => (this.pausedAt ?? this.now()) - this.pausedTotal

  // ---- input
  gesture(g: { type: 'pick'; id: string; box?: number } | { type: 'lane'; lane: 0 | 1 | 2 } | { type: 'stroke'; pts: Pt[] } | MerchantGesture | TouchGesture | DropGesture) {
    if (this.view.paused) return
    if (g.type === 'touch') { this.dropHint(g.by); return }
    // (the spell policy takes a drop only while it waits for one, and only into the next box)
    if (g.type === 'drop') { if (this.view.screen?.screen === 'spell') this.spellStep({ type: 'drop', tile: g.tile, box: g.box }); return }
    if (g.type === 'coin' || g.type === 'hand' || g.type === 'potion' || g.type === 'decline') { this.merchantStep(g); return }
    // (a written word on the spell book: the spell policy takes a stroke only while it waits for one)
    if (g.type === 'stroke' && this.view.screen?.screen === 'spell') { this.spellStep({ type: 'stroke', pts: g.pts }); return }
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
    // he picks: a hint that shows goes away (its voice too). A lift (a tap on a plate of an unmarked English rung) is no pick:
    // its finger-down went through dropHint already
    const lc = this.view.screen
    const lift = this.view.phase === 'answer' && lc?.screen === 'ladder' && lc.at !== undefined && !lc.marked && g.type === 'pick' && g.box === undefined
    if (!lift) this.dropHint('answer')
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
    // an unmarked English rung: a tap on a plate lifts it (a second tap puts it back), a tap on a box places the lifted
    // plate (the screen sends it as a pick with its box, as a drop does); a tap alone never answers (design 2.C)
    const sc = this.view.screen
    if (sc?.screen === 'ladder' && sc.at !== undefined && !sc.marked) {
      if (g.box === undefined) { this.setScreen({ lifted: sc.lifted === g.id ? undefined : g.id } as Partial<LadderView>); this.idleBump?.(); return }
      this.setScreen({ lifted: undefined } as Partial<LadderView>)
    }
    const w = this.pickWaiter
    this.pickWaiter = null
    this.pickBox = g.box
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
      void this.course.audio.sayParts([{ id: this.drawCur?.voice ?? `w-${this.view.screen.word.id}` }])
      return
    }
    if (this.view.screen?.screen === 'spell') {
      this.track('replay', { screen: 'spell', target: this.view.screen.round.word, phase: this.view.phase })
      this.course.audio.stopVoice()
      void this.course.audio.sayParts([{ id: this.view.screen.round.wordVoice }])
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
    // the spell book's hint: the next tile glows (policies/spell.ts)
    if (s?.screen === 'spell') { if (this.view.phase === 'answer') this.spellStep({ type: 'hint', auto: false }); return }
    // the course's hint blends the words (English): on every screen with a word to blend, while he answers
    if (this.course.hint && s && s.screen !== 'draw' && s.screen !== 'tower') {
      if (this.view.phase === 'answer' && !this.view.overlay) void this.hintBlend(this.token, false).catch(() => {})
      return
    }
    if (s?.screen === 'doors' && this.view.phase === 'answer') {
      // the door's hint: the syllables light again one at a time, slower, with no voice (he reads it); a touch on a key ends it
      const t = this.token
      const no = ++this.doorHint
      const on = () => t === this.token && no === this.doorHint
      this.doorHintOn = true
      const full = doorParts(s)
      const light = (k: number) => () => { if (on()) { if (k === full) this.doorHintOn = false; this.setScreen({ lit: k } as Partial<DoorsView>) } }
      this.setScreen({ lit: 0 } as Partial<DoorsView>)
      let step = this.sleep(t, 600).then(light(1))
      for (let k = 2; k <= full; k++) step = step.then(() => this.sleep(t, 1400)).then(light(k))
      void step.catch(() => {})
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
    if (s?.screen === 'spell' && this.spell?.hinted) { this.spellStep({ type: 'touch' }); cut = true }
    if (s?.screen === 'doors' && this.doorHintOn) {
      this.doorHint++
      this.doorHintOn = false
      this.setScreen({ lit: doorParts(s) } as Partial<DoorsView>)
      cut = true
    }
    if (this.visit?.help) { this.merchantStep({ type: 'touch' }); cut = true }
    if (this.hintVoice) { this.hintVoice = 0; this.course.audio.stopVoice(); cut = true }
    if (this.blendHint) {
      this.blendHint = 0
      this.blendNo++
      if (this.view.overlay?.kind === 'blend') this.set({ overlay: null })
      this.course.audio.stopVoice()
      cut = true
    }
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
  /** gives the course the words of the run once, however the run ends (none read, a sandbox run: nothing) */
  private saveWords() {
    if (this.opts.sandbox || this.wordsSaved || this.wordsRead.length === 0) return
    this.wordsSaved = true
    this.course.onRunEnd?.(this.wordsRead)
  }
  destroy() {
    this.saveWords()
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
    this.saveWords()
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
    // (the ladder: the pause cuts the voice a cue was lit for, and a lifted plate goes back)
    if (this.view.screen?.screen === 'ladder' && this.view.screen.from) this.setScreen({ lifted: undefined, cue: undefined } as Partial<LadderView>)
    // (a swap the pause cut: its rung is built at once)
    if (this.view.screen?.screen === 'ladder' && this.view.screen.placing) this.setScreen({ placing: undefined, built: this.ladder!.built, plates: [] } as Partial<LadderView>)
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
  /** Spell Quest's minigames are open (before: stage 0, the tower alone); the gallery plays any screen */
  private screensOpen() { return !!this.opts.force || this.save.read().screensOpen !== false }
  /** the course's placement check is due (Course.placement; never in the gallery) */
  private placementDue() { return !this.opts.sandbox && !this.opts.force && !!this.course.placement?.due(this.save) }

  // ---- helpers
  /** a telemetry event (never in the gallery) */
  private track(e: string, data: Record<string, unknown>) { if (!this.opts.sandbox) this.course.telemetry.track(e, data) }
  private guard<T>(t: number, p: Promise<T>): Promise<T> {
    return p.then((v) => { if (t !== this.token) throw new Aborted(); return v })
  }
  private sleep(t: number, ms: number) { return this.guard(t, this.time.sleep(ms)) }
  private say(t: number, parts: { id: string; onStart?: () => void; onHeard?: (ms: number | null) => void }[]) {
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
  private sfx(name: SpellQuestSfx) { void this.course.audio.playSfx(name) }
  private cueId(c: Choice) { return c.soundId }
  private ctx(): RoundCtx {
    const s = this.save.read()
    return { rng: this.rng, stage: this.stage, tallies: s.tallies, recent: s.recent, confusions: { letters: s.confusions.letters, syllables: s.confusions.syllables } }
  }
  private currentTarget(): Choice | null {
    const s = this.view.screen
    if (!s || s.screen === 'crystal' || s.screen === 'doors' || s.screen === 'draw' || s.screen === 'tower' || s.screen === 'spell') return null
    return s.target
  }
  private kindFor(screen: ScreenId): Kind {
    if (this.opts.force?.kind) return this.opts.force.kind
    // the course's own choice (English ghosts: by the stage's word share)
    const own = this.course.rounds.visitKind?.(screen, this.stage, this.rng)
    if (own) return own
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
        const empty = this.visitEmpty
        this.visitEmpty = false
        const r = this.passStep({ type: 'screen-done', facts: this.facts(), score: this.score, ...(empty ? { empty: true as const } : {}) })
        if (r.end) return this.endSession(r)
        if (!r.fresh) continue
        this.roundInScreen = 0
        this.blendMisses = 0
        this.ladder = null
        this.doorRounds = []
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
      stage: this.stage, stages: this.course.stages, draw: this.drawOn(), screensOpen: this.screensOpen(), recent: st.recent,
      towerRecent: this.save.towerRecent(), cycleNo: st.cycleNo ?? 0, towerTail: st.towerTail ?? '',
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
      const range: NumberRange = this.save.range()
      // the checkpoints since his last visit, this one included (the save counts the ones passed without him)
      const since = st.checkpointsSinceVisit ?? NEVER_VISITED
      const r = this.passStep({
        type: 'checkpoint', screensOpen: this.screensOpen(), coins: st.coins ?? 0, range, sinceVisit: since >= NEVER_VISITED ? Infinity : since + 1,
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
      const range = this.save.range()
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

  // ---- the tower's tower (spec: one duel, Part 3)
  /** every third tower visit is a boss visit (the run's boss rhythm); the gallery forces it */
  private towerBossNext(): boolean {
    if (this.opts.force) return !!this.opts.force.towerBoss
    return (this.save.read().towerVisits ?? 0) % 3 === 2
  }

  /**
   * A tower visit: the tower's board plays two waves from where his last visit ended (a boss visit: the boss alone, at the
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
    const placement = tw.placement || !this.screensOpen() || undefined
    const mega = this.towerMegaCharge || undefined
    this.set({ screen: { screen: 'tower', wave: tw.wave, waves: tw.waves, boss: tw.boss, visit: tw.visit, ...(placement ? { placement } : {}), ...(mega ? { mega } : {}) }, phase: 'answer', overlay: null, needNext: false, hintAvailable: false, hearts: this.hearts.left })
    this.resuming = false
    const last = tw.done ?? await this.guard(t, new Promise<number>((r) => { this.towerWaiter = r }))
    this.towerWaiter = null
    // the hearts ran out on the tower: its answer has finished on the screen (the tower said the mark); the run ends
    if (this.ending) { await this.endRun(); throw new Aborted() }
    if (!tw.placement) this.save.setTowerWave(last + 1)
    if (!tw.ended) { tw.ended = true; this.track('tower-end', { wave: tw.wave, last, boss: tw.boss }) }
    if (tw.boss) {
      // the boss's bonus coins, one by one (the dragon and the troll are not Spell Quest's bosses: no trophy)
      this.set({ phase: 'celebrate' })
      while (tw.coins < BOSS_COINS) {
        tw.coins++
        this.save.addCoins(1)
        this.set({ coinPop: (this.view.coinPop ?? 0) + 1 })
        this.sfx('lock')
        await this.sleep(t, COIN_POP_MS)
      }
    }
    // stage 0 passes when his marks are mastered by the tower's own measure (the slow lane) or he has shown that he
    // knows them (the fast lane): Spell Quest's minigames open (once). A pass in the middle of a visit ended it at that wave.
    const lane = this.stage0Passed()
    if (lane) {
      this.save.markScreensOpen()
      this.track('book-open', { stars: this.save.read().totalStars, towerWave: last + 1, lane })
      await this.celebrate(t, 'streak')
    }
  }

  /** stage 0 has passed (the book still closed): by which lane (mastery.stage0Lane); never in the gallery */
  private stage0Passed(): 'fast' | 'slow' | null {
    if (this.opts.sandbox || this.screensOpen()) return null
    return stage0Lane(this.save.towerRecent(), TOWER_MARKS.map((m) => m.id), this.save.read().towerTail ?? '')
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

  /**
   * An answer on the tower: the run's stars, coins and streak, or a heart. 'over' when the hearts ran out. `helped`: a right
   * answer after the hint blended the word (English): it counts as helped, as on the other screens.
   */
  towerAnswer(r: 'right' | 'wrong', markId: string, round?: Round, helped?: true): 'on' | 'over' {
    if (this.ending) return 'over'
    if (this.view.screen?.screen !== 'tower') return 'on'
    if (this.tower?.placement) return this.placementAnswer(r, markId)
    this.track('answer', { screen: 'tower', target: markId, result: helped ? 'helped' : r, clock: Date.now(), ...(this.opts.sandbox ? { gallery: true } : {}) })
    this.save.noteTowerAnswer(r === 'right')
    // a course whose tower answers count as its other screens' (English): its tallies and the stage pass
    const facts = round && this.course.tower.facts?.(round, this.stage)
    if (facts) {
      const { passed } = this.save.recordAnswer({ features: facts.features, miss: r !== 'right', newStage: facts.newStage, ...(helped && r === 'right' ? { helped } : {}) })
      if (passed) {
        this.stage = this.save.read().stage.stage
        this.track('stage', { stage: this.stage })
      }
    }
    if (r === 'right') {
      this.streak++
      this.gainStar()
      // the badge follows the streak; the tower's own streak line celebrates on the board (no second voice over it)
      const m = multiplierOf(this.streak)
      if (m > this.view.mult) { this.set({ mult: m }); this.track('mult', { mult: m, streak: this.streak }) }
      return 'on'
    }
    const outcome = this.answerOutcome('wrong')
    this.resetStreak()
    this.set({ hearts: this.hearts.left })
    if (!outcome.over) return 'on'
    // the answer on the screen finishes (the tower's feedback), then towerDone ends the run; a pause no longer cancels it
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

  /** the tower's מגה charge changed: kept for the run's next tower visit */
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
      ...(this.course.rounds.bossKinds ? { kinds: this.course.rounds.bossKinds(this.stage, st.confusions) } : {}),
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
    if (screen === 'spell') {
      // its own demo: the hand drops the first tile (policies/spell.ts); no round at this stage: the visit ends
      while (this.roundInScreen < this.visitLen) {
        if (await this.runSpellRound(t)) continue
        // (no round before any answer: the visit was empty, and no checkpoint follows it)
        this.visitEmpty = this.roundInScreen === 0
        return
      }
      return
    }
    const demo = this.demoKey(screen, kind)
    // no demo before a boss: he has flown already (a boss never comes on the first broom visit)
    if (!this.visitBoss && (this.opts.force ? !!this.opts.force.demo && !this.demoShown : !st.demosSeen.includes(demo)) && this.roundInScreen === 0) {
      this.demoShown = true
      this.prepareView(screen, kind)
      this.demoRound = screen !== 'broom'
      this.set({ phase: 'demo', overlay: { kind: 'demo', line: this.course.lineAudioId(demo, 1), demo, ...this.ladderDemoParts(screen) } })
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

  /**
   * The English ladder's demo in two beats (course.rounds.ladderDemo): the foot rung glows while "This word is:" and the
   * foot word play, then the place glows while "Find the letter that makes:" and the new word play. Each beat waits for its
   * line (ExplainPanel plays the parts one after the other). Hebrew: none, the demo is its one line.
   */
  private ladderDemoParts(screen: ScreenId): { parts?: { id: string; highlight: Highlight }[] } {
    const d = this.course.rounds.ladderDemo
    const base = this.ladder?.base
    if (screen !== 'ladder' || !d || !base) return {}
    const target = this.view.screen?.screen === 'ladder' ? this.view.screen.target : undefined
    if (!target) return {}
    // the demo says both words: the first round does not say them again (it opens its answers at once)
    this.ladder!.footSaid = true
    this.demoSaidWords = true
    return { parts: [
      { id: this.course.lineAudioId(d.look, 1), highlight: 'foot' }, { id: this.cueId(base.target), highlight: 'foot' },
      { id: this.course.lineAudioId(d.ask, 1), highlight: 'gap' }, { id: this.cueId(target), highlight: 'gap' },
    ] }
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
      // (the ladder: a plate lifted before the pause goes back, and no cue stays lit from a voice the pause cut)
      this.setScreen({ reveal: undefined, ...(cur.screen === 'ladder' && cur.from ? { lifted: undefined, cue: undefined } : {}), ...(cur.screen === 'ladder' ? { placing: undefined } : {}), ...(cur.screen === 'broom' ? { waves: [] } : {}), ...(cur.screen === 'doors' ? { lit: 0, opening: false, zooming: false } : {}) } as Partial<ScreenView>)
      return cur.screen === 'doors' ? doorTarget(cur) : (cur as BroomView).target
    }
    this.resuming = false
    this.answered = false
    if (this.demoRound) {
      this.demoRound = false
      if (cur && cur.screen === screen) return cur.screen === 'doors' ? doorTarget(cur) : (cur as CauldronView).target
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
      if (r.target.kind === 'syllable') {
        // Hebrew: the letter (the one box) and the vowel orbs' marks
        this.set({ screen: { screen: 'cauldron', letterId: r.boxes[0].itemId, orbs: r.orbs.map((o) => o.mark!), target: r.target } })
        return r.target
      }
      // English: he hears the word to make (after a thrown e, the word it becomes)
      const target = r.becomes ?? r.target
      this.set({ screen: { screen: 'cauldron', letterId: '', orbs: [], target, boxes: r.boxes, gap: r.gap, tiles: r.orbs, ...(r.becomes ? { shown: r.target } : {}), ...(r.noStage ? { noStage: true } : {}) } })
      return target
    }
    if (screen === 'ladder') {
      if (!this.ladder) {
        const plan = this.course.rounds.ladderPlan(c, this.visitLen, this.opts.force?.fixed)
        // the ladder's foot (English) is built already; the visit has as many rounds as the plan has rungs to make
        this.ladder = { ...plan, built: plan.base ? [plan.base.target] : [] }
        this.visitLen = Math.min(this.visitLen, plan.steps.length)
      }
      const foot = this.ladder.base ? 1 : 0
      const k = this.ladder.built.length - foot
      const step = this.ladder.steps[k]
      // English: the rung he makes is the word below, its changed place marked at the early stages
      const below = k > 0 ? this.ladder.steps[k - 1].parts : this.ladder.base?.parts
      const change = step.at !== undefined
        ? { from: below, parts: step.parts, at: step.at, ...(step.grow ? { grow: step.grow } : {}), marked: this.ladder.marked }
        : {}
      this.set({ screen: { screen: 'ladder', built: this.ladder.built, plates: step.plates, rungs: this.visitLen + foot, target: step.target, ...change } })
      return step.target
    }
    if (screen === 'ghosts') {
      const before = this.view.screen?.screen === 'ghosts' ? this.view.screen.signs.map((x) => x.id) : undefined
      const r = this.course.rounds.ghostRound(c, kind, prev, before)
      this.set({ screen: { screen: 'ghosts', signs: r.signs, target: r.target } })
      return r.target
    }
    // doors
    if (!this.doorRounds.length) this.doorRounds = this.course.rounds.doorRounds(c, this.visitLen)
    const door = this.doorRounds[this.roundInScreen % this.doorRounds.length]
    this.door = door
    const keys = this.course.rounds.doorKeys(c, door)
    // behind the last door: the crystal he is about to win (the kind runCrystal will show)
    const behind = this.roundInScreen === this.visitLen - 1 && !this.opts.session
      ? { crystal: this.save.read().crystals + (this.opts.sandbox ? 0 : 1) } : undefined
    const more = { opening: false, zooming: false, ...(behind ? { behind } : {}) }
    // Hebrew: the door word and its keys, door words; English: the right key as `word`, and the plate's words
    const view: DoorsView = door.word
      ? { screen: 'doors', word: door.word, lit: 0, keys: keys as Word[], ...more }
      : { screen: 'doors', word: keys.find((k) => k.id === door.key)!, lit: 0, keys, ...more, plate: door.plate }
    this.set({ screen: view })
    return doorTarget(view)
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
    // (a phrase on an English door: "What do the words say?")
    if (screen === 'doors') return ((this.view.screen as DoorsView).plate?.length ?? 1) > 1 ? 'q-door-words' : 'q-door'
    return `q-${screen}`
  }

  /** One round on a calm screen. Returns 'over' when the hearts ran out. */
  private async runRound(t: number, screen: ScreenId, kind: Kind): Promise<'next' | 'over'> {
    this.passStep({ type: 'round' })
    this.syncMult()
    const target = this.buildRound(screen, kind)
    const intro = this.needsDotIntro(target)
    if (intro) await this.dotIntro(t, intro)
    this.hinted = false
    this.set({ phase: 'question', overlay: null, hintAvailable: this.hintOpen(screen, target) })
    this.assets = []
    // no instruction and no hint at the start of a round: he knows the screen (Michael). They come only when he waits
    // (idleWait), and the hint button is always there.
    if (screen === 'doors') {
      await this.sleep(t, 200)
      this.setScreen({ lit: 1 } as Partial<DoorsView>)
      for (let k = 2; k <= doorParts(this.view.screen as DoorsView); k++) {
        await this.sleep(t, 900)
        this.setScreen({ lit: k } as Partial<DoorsView>)
      }
      this.set({ phase: 'answer' })
      this.cueStarted = this.now()
      for (;;) {
        const res = await this.evaluate(t, screen, target, await this.idleWait(t, this.waitPick(t), screen, kind, null))
        if (res !== 'near') return res
      }
    }
    const c = target as Choice
    // the ladder's foot (English): he hears the word it starts from before the first rung
    if (screen === 'ladder' && this.ladder?.base && !this.ladder.footSaid) {
      this.ladder.footSaid = true
      this.setScreen({ cue: 'foot' } as Partial<LadderView>)
      await this.say(t, [{ id: this.cueId(this.ladder.base.target) }])
      this.setScreen({ cue: undefined } as Partial<LadderView>)
      await this.sleep(t, 300)
    }
    const open = () => { this.set({ phase: 'answer' }); this.cueStarted = this.now() }
    // the answers are open while the cue plays; a tap stops the reading (rule)
    const early = this.waitPick(t)
    // (the English ladder: the place that changes glows while the new word plays)
    const boxCue = screen === 'ladder' && (this.view.screen as LadderView).from !== undefined
    const skipSay = screen === 'ladder' && this.demoSaidWords
    this.demoSaidWords = false
    // ("And now:" comes before every new word after the first rung; the foot counts as built in English)
    const andNow = screen === 'ladder' && this.ladder !== null && this.ladder.built.length > (this.ladder.base ? 1 : 0)
    const word = { id: this.cueId(c), onStart: () => { open(); if (boxCue) this.setScreen({ cue: 'box' } as Partial<LadderView>) } }
    const owed = andNow ? this.ladderOwed : null
    this.ladderOwed = null
    // (the rung's word and "And now:" are one voice gap apart: said in one call after a pause, else wait out what is left)
    if (andNow && !owed && this.ladderWordEnd !== null) await this.sleep(t, Math.max(0, VOICE_GAP_MS - (this.now() - this.ladderWordEnd)))
    this.ladderWordEnd = null
    const said = skipSay ? Promise.resolve() : this.say(t, andNow ? [...(owed ? [{ id: this.cueId(owed) }] : []), { id: this.course.lineAudioId('target-new', 1) }, word] : [word])
    let picked = await Promise.race([said.then(() => null), early])
    if (boxCue) this.setScreen({ cue: undefined } as Partial<LadderView>)
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
    let idle = () => {}
    let hint = () => {}
    const arm = () => {
      idle = this.time.after(IDLE_MS, () => {
        if (!live()) return
        spoke = true
        this.track('idle', { screen, target: c?.id ?? null })
        void this.course.audio.sayParts([{ id: this.variation(this.questionLine(screen, kind)) }, ...(c ? [{ id: this.cueId(c) }] : [])])
      })
      hint = this.time.after(IDLE_HINT_MS, () => {
        if (live() && c) { spoke = true; void (this.course.hint ? this.hintBlend(t, true) : this.playHint(c, true, t)).catch(() => {}) }
      })
    }
    arm()
    // a lift (a tap on a plate, no answer yet) is activity: the waiting starts again
    this.idleBump = () => { idle(); hint(); arm() }
    try {
      const id = await pick
      if (this.view.overlay?.kind === 'hint') this.set({ overlay: null })
      if (spoke) this.course.audio.stopVoice()
      return id
    } finally {
      waiting = false
      this.idleBump = null
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

  /**
   * `target`: what was asked; `tapped`: what he took. An English door: `target` is the door (`{ id }`) and `door.asked` the
   * word of its key (the word, or the phrase's noun): its features and its stage decide
   */
  private record(screen: ScreenId, target: Choice | Word | { id: string }, tapped: Choice | Word | DoorKey | null, result: 'right' | 'wrong' | 'near', door?: { asked: Choice }, word?: string) {
    if (result !== 'near' && screen !== 'broom') this.answered = true
    const feats = door ? this.course.rounds.features(door.asked, screen)
      : 'syllables' in target || 'first' in target ? [`w:${(target as Word).id}`, 'sc:doors'] : this.course.rounds.features(target as Choice, screen)
    const ms = Math.round(this.now() - this.cueStarted)
    const asked = door ? door.asked : 'soundId' in target ? (target as Choice) : undefined
    const tap = tapped && 'soundId' in tapped ? (tapped as Choice) : undefined
    if (asked?.kind === 'word' && !this.wordsRead.includes(asked.id)) this.wordsRead.push(asked.id)
    // a round the course keeps out of the stage pass (CauldronRound.noStage)
    const noStage = this.view.screen?.screen === 'cauldron' && !!this.view.screen.noStage
    // a Hebrew door word counts towards the stage from stage 4 (its last stage, the words); an English door by its key's word
    const newStage = noStage ? false : asked ? this.course.rounds.isNewStageChoice(this.stage, asked) && result !== 'near' : this.stage >= 4 && result !== 'near'
    // a right answer after the hint blended the word (English) is helped: counted apart from right (the Hebrew run never is)
    const helped = this.hinted && result === 'right'
    if (result !== 'near') this.hinted = false
    const { passed } = this.save.recordAnswer({ features: asked && this.course.rounds.recordOnly ? [...feats, ...this.course.rounds.recordOnly(asked)] : feats, miss: result !== 'right', asked, tapped: tap, newStage, ...(helped ? { helped } : {}) })
    if (passed) {
      this.stage = this.save.read().stage.stage
      this.track('stage', { stage: this.stage })
    }
    this.course.telemetry.track('answer', {
      screen, stage: this.stage, target: 'id' in target ? target.id : '', ...(word ? { word } : {}), tapped: tapped && 'id' in tapped ? tapped.id : null, result: helped ? 'helped' : result, ms,
      assets: this.assets, clock: Date.now(), ...(this.opts.sandbox ? { gallery: true } : {}),
    })
  }

  /** right → feedback and on; near → forgiven once (same round); wrong → mistake, next, maybe an explanation. */
  private async evaluate(t: number, screen: ScreenId, target: Choice | Word, pickedId: string): Promise<'next' | 'near' | 'over'> {
    if (screen === 'doors') return this.evaluateDoor(t, target, pickedId)
    const c = target as Choice
    const s = this.view.screen!
    let tapped: Choice | undefined
    // what the answer counts for: the target; on the English cauldron the missing part (he heard the word)
    let answer = c
    const tiles = s.screen === 'cauldron' ? s.tiles : undefined
    if (s.screen === 'cauldron' && tiles) {
      tapped = tiles.find((x) => x.id === pickedId)
      answer = s.boxes![s.gap!]
    } else if (s.screen === 'cauldron') {
      const m = markOf(pickedId as MarkId)
      tapped = { ...c, id: `${c.itemId}-${m.id}`, group: m.group, mark: m.id, soundId: syllable(c.itemId, m.id).soundId }
      if (m.group === c.group) tapped = c
    } else tapped = this.choicesOf(screen).find((x) => x.id === pickedId)
    // on an English ladder rung the changed part (he heard the word it makes)
    if (s.screen === 'ladder' && s.at !== undefined) answer = s.parts![s.at]
    const box = this.pickBox
    this.pickBox = undefined
    if (!tapped) return 'near'
    const right = tapped.id === answer.id || tapped.soundId === answer.soundId
    // an unmarked English rung: he finds the place (design Part 5). The right part dropped on another place is
    // "almost": no answer, no heart; he tries again. A pick here always has a box (a tap on a plate only lifts it, see
    // gesture()), so a missing box is never the right place
    if (right && s.screen === 'ladder' && s.at !== undefined && !s.marked && box !== s.at) {
      await this.say(t, [{ id: this.variation('almost') }])
      return 'near'
    }
    const near = !right && tapped.nearMissOf === answer.id
    // the answer's word when the answer is a part of it (the English cauldron's missing unit, a ladder's changed part)
    const wordOf = answer.id !== c.id ? c.id : undefined
    const outcome = this.answerOutcome(right ? 'right' : near ? 'near' : 'wrong')
    // a new unit's introduction (the English cauldron, ladder and ghosts; Hebrew has none), asked before the answer is
    // recorded; a run-ending miss keeps it due
    const intro = (tiles || s.screen === 'ladder' || s.screen === 'ghosts') && !outcome.forgiven && !outcome.over ? this.introAfter(answer, right) : []
    if (right) {
      this.record(screen, answer, tapped, 'right', undefined, wordOf)
      this.roundInScreen++
      // the streak counts this answer before its coins (the fifth right answer pays 2)
      this.streak++
      this.gainStar()
      this.set({ phase: 'feedback' })
      const confident = predict(this.course.rounds.features(answer, screen), this.save.read().tallies, this.save.read().recent) < 0.2 && this.now() - this.cueStarted < CONFIDENT_MS
      if (s.screen === 'cauldron') { this.setScreen({ joined: true } as Partial<CauldronView>); this.sfx('puff') }
      if (s.screen === 'ghosts') { this.setScreen({ zapped: c.id } as Partial<GhostsView>); this.sfx('zap') }
      // the ladder: the swap, and its word every time (also after a confident answer: the word is the swap's feedback)
      if (s.screen === 'ladder') await this.ladderSwap(t, c, tapped.id)
      // let the effect ring a moment before the voice goes on (Michael: effects got cut)
      else await this.sleep(t, SFX_RING_MS)
      // (the English cauldron: the made word blends instead)
      if (tiles) await this.wordBlend(t, c, true)
      else if (s.screen !== 'ladder') await this.say(t, confident ? [] : [{ id: this.cueId(c) }])
      if (intro.length) await this.say(t, intro)
      await this.maybeWordLink(t, c)
      await this.streakMoment(t)
      await this.sleep(t, 300)
      return 'next'
    }
    if (outcome.forgiven) {
      this.record(screen, answer, tapped, 'near', undefined, wordOf)
      await this.say(t, [{ id: this.variation('almost') }])
      return 'near'
    }
    // a mistake
    this.resetStreak()
    this.record(screen, answer, tapped, 'wrong', undefined, wordOf)
    this.roundInScreen++
    this.sfx('hit')
    const reveal = s.screen === 'cauldron' && !tiles ? { right: c.mark!, wrong: tapped.mark } : { right: answer.id, wrong: tapped.id }
    this.setScreen({ reveal } as Partial<ScreenView>)
    this.set({ phase: 'mistake', hearts: this.hearts.left })
    if (outcome.over) return this.endRun(this.cueId(c))
    // no hint here: the right answer glows and its sound plays (Michael: the hint came too often); then he does the
    // right move himself, which does what a right answer does on that screen (no star: it was a mistake)
    await this.fix(t, this.cueId(c))
    this.set({ phase: 'feedback' })
    if (s.screen === 'cauldron') { this.setScreen({ reveal: undefined, joined: true } as Partial<CauldronView>); this.sfx('puff') }
    if (s.screen === 'ghosts') { this.setScreen({ reveal: undefined, zapped: c.id } as Partial<GhostsView>); this.sfx('zap') }
    // the ladder: the same swap as after a right answer (its word too); the other screens let the effect play
    if (s.screen === 'ladder') await this.ladderSwap(t, c, answer.id, { reveal: undefined })
    else await this.sleep(t, FIX_DONE_MS)
    const blend = this.missBlendDue(c)
    if (tiles) await this.wordBlend(t, c, blend)
    else if (blend) await this.blendAfterMiss(t, c)
    if (intro.length) await this.say(t, intro)
    if (this.explanationDue(screen, c)) await this.explain(t, screen, c)
    return 'next'
  }

  /**
   * The ladder's swap after the right move (design 2026-11-23 A, both courses): the plate flies to its place; English: the
   * old letter drops out and the row reads the new word (Hebrew: the plate sits on the rung while the lock rings); then the
   * rung is built (the row turns into its plate, the wizard climbs) as the word plays. A pause builds the rung at once.
   */
  private async ladderSwap(t: number, c: Choice, plateId: string, more: Partial<LadderView> = {}) {
    this.ladder!.built = [...this.ladder!.built, c]
    this.ladderOwed = c
    this.setScreen({ ...more, placing: { id: plateId, step: 'fly' } } as Partial<LadderView>)
    await this.sleep(t, LADDER_FLY_MS)
    this.sfx('lock')
    this.setScreen({ placing: { id: plateId, step: 'swap' } } as Partial<LadderView>)
    await this.sleep(t, LADDER_SWAP_MS)
    this.setScreen({ placing: undefined, built: this.ladder!.built, plates: [] } as Partial<LadderView>)
    await this.say(t, [{ id: this.cueId(c) }])
    this.ladderOwed = null
    this.ladderWordEnd = this.now()
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

  private async evaluateDoor(t: number, target: Choice | Word, picked: string): Promise<'next' | 'over'> {
    const s = this.view.screen as DoorsView
    const right = picked === s.word.id
    const outcome = this.answerOutcome(right ? 'right' : 'wrong')
    // the key he took, among the course's keys of this door
    const tapped = (s.keys as DoorKey[]).find((k) => k.id === picked) ?? null
    // what he hears when it opens: the Hebrew door word; the English word, or the phrase's own clip
    const cue = s.plate ? this.door!.soundId ?? s.plate[0].soundId : `w-${s.word.id}`
    // an English door counts for the word of its key (the word, or the phrase's noun: its tallies and its stage), and may bring its introduction,
    // asked before the answer is recorded (a run-ending miss keeps it due)
    const asked = s.plate ? (target as Choice) : null
    const intro = asked && !outcome.over ? this.introAfter(asked, right) : []
    const record = (result: 'right' | 'wrong') => asked
      ? this.record('doors', { id: this.door!.id }, tapped, result, { asked })
      : this.record('doors', target as Word, tapped as Word | null, result)
    if (right) {
      record('right')
      this.roundInScreen++
      this.streak++
      this.gainStar()
      this.set({ phase: 'feedback' })
      this.sfx('key')
      this.setScreen({ opening: true } as Partial<DoorsView>)
      this.sfx('door')
      await this.sleep(t, SFX_RING_MS)
      await this.say(t, [{ id: cue }])
      if (intro.length) await this.say(t, intro)
      await this.streakMoment(t)
      // through the doorway to the next door (or the crystal): the round goes on where the flight ends
      this.setScreen({ zooming: true } as Partial<DoorsView>)
      await this.sleep(t, ZOOM_MS + 60)
      return 'next'
    }
    this.resetStreak()
    record('wrong')
    this.sfx('hit')
    this.setScreen({ reveal: { right: s.word.id, wrong: picked } } as Partial<DoorsView>)
    this.set({ phase: 'mistake', hearts: this.hearts.left })
    if (outcome.over) return this.endRun(cue)
    // he drags the marked key himself and the door opens (no star: it was a mistake)
    await this.fix(t, cue)
    this.roundInScreen++
    this.set({ phase: 'feedback' })
    this.sfx('key')
    this.setScreen({ reveal: undefined, opening: true } as Partial<DoorsView>)
    this.sfx('door')
    await this.sleep(t, SFX_RING_MS)
    await this.say(t, [{ id: cue }])
    if (asked && this.missBlendDue(asked)) await this.blendAfterMiss(t, asked)
    if (intro.length) await this.say(t, intro)
    this.setScreen({ zooming: true } as Partial<DoorsView>)
    await this.sleep(t, ZOOM_MS + 60)
    return 'next'
  }

  private explanationDue(screen: ScreenId, c: Choice): boolean {
    // the course's own explanation (English), counted by its feature
    const own = this.course.rounds.explanation
    if (own) { const e = own(c, screen); return !!e && this.explainNow(e.feature) }
    if (c.kind !== 'syllable') return false
    return this.explainNow(`l:${c.itemId}`)
  }

  /** an explanation comes from time to time (rule): after two recent mistakes on `feature`, else on a quarter of them */
  private explainNow(feature: string): boolean {
    const s = this.save.read()
    const recent = s.mistakes.filter((m) => m.round > s.roundNo - 8 && m.features.includes(feature)).length
    return recent >= 2 || this.rng() < 0.25
  }

  private async explain(t: number, screen: ScreenId, c: Choice) {
    const own = this.course.rounds.explanation?.(c, screen)
    const parts: { id: string; highlight: Highlight }[] = own
      ? own.parts.map((p) => ({ id: 'line' in p ? this.variation(p.line) : p.id, highlight: p.highlight }))
      : [
          { id: this.course.lineAudioId('explain-lead', 1), highlight: 'none' }, { id: `ln-${c.itemId}`, highlight: 'letter' },
          { id: `vn-${c.mark}`, highlight: 'vowel' }, { id: c.soundId, highlight: 'all' },
        ]
    if (!this.opts.sandbox) this.course.telemetry.track('explain', { target: c.id })
    this.set({ phase: 'explain', overlay: { kind: 'explain', parts, target: c } })
    await this.waitNext(t)
    this.set({ overlay: null })
  }

  /**
   * After the English cauldron's word is made (right, or after the fix): at a thrown e's turn he hears the short word,
   * then the long one ("cap … cape"); the made word blends (design Part 5) after a right answer, and after a miss when
   * the blend is due (every second miss: missBlendDue; else the fix has said the word already)
   */
  private async wordBlend(t: number, word: Choice, blend: boolean) {
    const s = this.view.screen as CauldronView
    if (s.shown) {
      await this.say(t, [{ id: this.cueId(s.shown) }])
      await this.sleep(t, BLEND_GAP_MS)
    }
    const plan = blend ? this.course.hint?.of(word) : null
    if (plan) await this.playBlends(t, [plan], false)
    else if (blend || s.shown) await this.say(t, [{ id: this.cueId(word) }])
  }

  /** the course's blends of the screen (English; none: no `?`) */
  private blendsOf(): BlendPlan[] {
    return this.course.hint && this.view.screen ? this.course.hint.plan(this.view.screen) : []
  }
  /** the `?` of a calm round: the course's blends, where it has them (English); else a door, or a syllable (Hebrew) */
  private hintOpen(screen: ScreenId, target: Choice | Word): boolean {
    if (this.course.hint) return this.blendsOf().length > 0
    return screen === 'doors' || (target as Choice).kind === 'syllable'
  }

  /** The hint blends the words of the screen (English; the `?`, or after a long wait): the answer after it is helped. */
  private async hintBlend(t: number, auto: boolean) {
    const plans = this.blendsOf()
    if (!plans.length) return
    this.hinted = true
    this.track('blend-hint', { screen: this.view.screen?.screen ?? null, words: plans.length, by: auto ? 'idle' : 'button' })
    await this.playBlends(t, plans, true)
  }

  /** a miss on a word round of this visit (English): true on every second one, when the right word blends too */
  private missBlendDue(c: Choice): boolean {
    if (!this.course.hint?.of(c)) return false
    this.blendMisses++
    const due = this.blendMisses % 2 === 0
    if (due) this.track('blend-hint', { screen: this.view.screen?.screen ?? null, words: 1, by: 'miss' })
    return due
  }
  /** after a miss (every second one) and his own right move: the right word blends */
  private async blendAfterMiss(t: number, c: Choice) {
    const plan = this.course.hint?.of(c)
    if (plan) await this.playBlends(t, [plan], false)
  }

  /**
   * Plays blends one word after another: the card shows the word, its voice plays, and each unit lights at its time from
   * the voice's real start. A missing clip (or a missing timing) never stalls it: the lights go on to the plan's end. A
   * newer blend (or, for the hint, a touch on an answer) ends it.
   */
  private async playBlends(t: number, plans: BlendPlan[], asHint: boolean) {
    const no = ++this.blendNo
    if (asHint) this.blendHint = no
    const alive = () => t === this.token && no === this.blendNo
    const timers: Cancel[] = []
    try {
      for (let i = 0; i < plans.length && alive(); i++) {
        let plan = plans[i]
        if (i > 0) await this.sleep(t, BLEND_GAP_MS)
        if (!alive()) break
        this.set({ overlay: { kind: 'blend', parts: plan.parts, lit: [] } })
        const light = (u: number) => () => {
          const o = this.view.overlay
          if (alive() && o?.kind === 'blend' && !o.lit.includes(u)) this.set({ overlay: { ...o, lit: [...o.lit, u] } })
        }
        if (plan.steps) {
          // units then word; a missing unit clip: the word's fallback blend (the normal word, the units in turn)
          const all = plan.parts.map((p) => p.unit).filter((u, k, a) => a.indexOf(u) === k)
          const done = await playUnitsThenWord(plan.steps, plan.audio[0], all, {
            say: (id, onHeard) => this.say(t, [{ id, onHeard: () => onHeard() }]),
            sleep: (ms) => this.sleep(t, ms),
            light: (us) => us.forEach((u) => light(u)()),
            alive,
          })
          if (done) continue
          this.set({ overlay: { kind: 'blend', parts: plan.parts, lit: [] } })
          plan = plan.fallback ?? { ...plan, steps: undefined }
        }
        let started: number | null = null
        let total = plan.totalMs
        // from the voice's real start (its file plays); an even split is stretched to the clip's own length
        const start = (clipMs: number | null) => {
          started = this.now()
          const sch = scheduleBlend(plan, clipMs)
          total = sch.totalMs
          for (const l of sch.lights) timers.push(this.time.after(l.atMs, light(l.unit)))
        }
        await this.say(t, plan.audio.map((id, k) => ({ id, ...(k === 0 ? { onHeard: start } : {}) })))
        // a missing clip (or one that never played) ends at once: the lights run on the plan's own times, then it ends
        if (started === null && alive()) start(null)
        const left = started === null ? 0 : total - (this.now() - started)
        if (left > 0 && alive()) await this.sleep(t, left)
      }
    } finally {
      timers.forEach((c) => c())
      if (no === this.blendNo && this.view.overlay?.kind === 'blend') this.set({ overlay: null })
      if (this.blendHint === no) this.blendHint = 0
    }
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
   * Ends the run: says the right answer (none after the tower: the tower said it), then the short defeat scene (the dizzy wizard spins and falls, a hit and its line,
   * playful, never praise for a loss), then the summary. A pause can no longer cancel it (it is already saved).
   */
  private async endRun(cue?: string): Promise<'over'> {
    this.ending = true
    this.stopBroom()
    this.course.audio.stopMusic()
    const r = await this.passRun({ type: 'lost', score: this.score, bestRun: this.save.read().bestRun, cue })
    this.token++
    this.saveWords()
    this.set({ over: { score: this.score, crystals: r.over!.crystals, best: r.over!.best, bosses: [...this.bossesWon], startStars: this.startStars }, needNext: false })
    return 'over'
  }

  // ---- the drawing screen (spec: 2026-11-07 drawing)

  /** a drawing round: the script comes from the screen (print or handwriting); DrawView.screen is 'draw' for both */
  private buildDraw(script: Script): DrawView {
    const cur = this.view.screen
    if (this.resuming && cur?.screen === 'draw' && !this.answered) {
      // after a pause the same word starts again from its beginning (Latin: from its first box)
      this.resuming = false
      const v: DrawView = { ...cur, strokes: [], mode: 'letter', demo: undefined, lineFx: undefined, glow: undefined, ...(cur.letters ? { letter: cur.letters[0], box: 0 } : {}) }
      this.set({ screen: v })
      return v
    }
    this.resuming = false
    this.answered = false
    const st = this.save.read()
    this.drawPlan ??= this.course.rounds.drawWords({ rng: this.rng, tallies: st.tallies, recent: st.recent, confusions: st.confusions.letters, stage: this.stage })
    const item = this.drawPlan[this.roundInScreen % this.drawPlan.length]
    this.drawCur = item
    const v = item.alphabet === 'latin' ? this.latinDraw(item) : this.hebrewDraw(item.word!, script)
    this.set({ screen: v })
    return v
  }

  /** Spell Quest's board: the word on its lines, the slot for its first letter, its bare vav and its marks */
  private hebrewDraw(word: Word, script: Script): DrawView {
    const split = splitWord(word, script)
    const def = strokesOf(split.letter, script)
    const marks = marksFor(word, this.stage)
    const layout = drawLayout({
      ...split, script, def,
      marksAbove: marks.some((m) => m.zone === 'above-left' || m.zone === 'above-right' || m.zone === 'vav-above'),
      marksUnder: marks.some((m) => m.zone === 'under'),
    })
    return { screen: 'draw', word, script, letter: split.letter, layout, marks, strokes: [], mode: 'letter' }
  }

  /** the course's Latin board (four lines): a box for each letter; after one letter, the rest of the word */
  private latinDraw(item: DrawItem): DrawView {
    const w = this.course.writing!
    const defs = item.letters.map((l) => w.strokesOf(l))
    // the word's text around the boxes (none for a whole word)
    const at = item.at ?? 0
    const text = item.text ?? ''
    const layout = latinLayout({
      defs, rest: text.slice(at + item.letters.length), before: text.slice(0, at), capital: !!item.firstSound && /[A-Z]/.test(item.letters[0]),
      lines: w.lines, font: w.font, unitEm: w.unitEm, em: w.em,
    })
    return {
      screen: 'draw', word: { id: item.id }, script: 'print', letter: item.letters[0], layout, marks: [], strokes: [], mode: 'letter',
      alphabet: 'latin', letters: item.letters, box: 0, ...(item.picture ? { picture: item.picture } : {}),
    }
  }

  /**
   * A Latin round's facts: each letter without its marks, its marks, the lines, and what he hears (the word, then its
   * first sound; a capital: the line for the big letter before the sound; a whole word: the word). When he waits: the
   * line, then the word or the sound (a last letter, x: the word and its sound); when it is drawn: the word.
   */
  private latinRound(item: DrawItem): LatinRound {
    const w = this.course.writing!
    const parts = item.letters.map((l) => splitMarks(w.strokesOf(l), w.isMark))
    const voice: DrawLine = { id: item.voice }
    const sound: DrawLine[] = item.firstSound ? [{ id: item.firstSound }] : []
    // a whole word has no first sound of its own
    const word = !item.firstSound
    const capital = !word && /[A-Z]/.test(item.letters[0])
    const last = !!item.at
    return {
      defs: parts.map((x) => x.body), marks: parts.map((x) => x.marks), lines: w.lines,
      cue: {
        start: capital ? [voice, { line: 'q-draw-big' }, ...sound] : [voice, ...sound],
        idle: word ? [{ line: 'q-draw-word' }, voice] : capital ? [{ line: 'q-draw-big' }, ...sound] : last ? [voice, ...sound] : [{ line: 'q-draw' }, voice, ...sound],
        end: [voice],
      },
    }
  }

  /**
   * One drawing round (policies/draw.ts decides, the run does what it says): the word; the demo when needed; he writes
   * the letter, then the lines are told, then the marks; then the word again and a star. No hearts are lost.
   */
  private async runDrawRound(t: number, screen: 'draw' | 'draw-hand') {
    this.syncMult()
    const view = this.buildDraw(this.opts.force?.script ?? scriptOf(screen))
    const latin = view.alphabet === 'latin' ? this.latinRound(this.drawCur!) : undefined
    const def = latin ? latin.defs[0] : strokesOf(view.letter, view.script)
    const st = this.save.read()
    // the print screen has its demo; the handwriting screen uses the per-letter demos (needsDemo); a whole word, only
    // with letters he has written alone, has the first visit's demo only (qu's two boxes are a letter round: q's demo)
    const firstVisit = screen === 'draw' && (this.opts.force ? !!this.opts.force.demo && !this.demoShown : !st.demosSeen.includes('demo-draw'))
    const wholeWord = !!latin && !this.drawCur?.firstSound
    const demo = firstVisit ? 'first' : !wholeWord && needsDemo(view.letter, view.script, st.tallies, st.recent) ? 'letter' : null
    this.draw = drawRound({ view, def, checker: new LetterChecker(def), screen, demo, strokeNo: this.strokeNo, demoNo: this.demoNo, ...(latin ? { latin } : {}) })
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

  /**
   * A drawn round's answer: the drawing's tallies; where the course says what it asks (English: the unit of one letter,
   * the word of a whole word), also that one's tallies and the stage pass (as on the other screens)
   */
  private drawAnswer(features: string[], miss: boolean, helped = false) {
    const asked = this.drawCur?.asked
    if (!asked) { this.save.recordAnswer({ features, miss, newStage: false, ...(helped ? { helped } : {}) }); return }
    const { passed } = this.save.recordAnswer({
      features: [...new Set([...features, ...this.course.rounds.features(asked, 'draw')])], miss, asked,
      newStage: this.course.rounds.isNewStageChoice(this.stage, asked), ...(helped ? { helped } : {}),
    })
    if (passed) {
      this.stage = this.save.read().stage.stage
      this.track('stage', { stage: this.stage })
    }
  }

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
      else if (op.op === 'recordAnswer') this.drawAnswer(op.features, op.miss, !!op.helped)
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

  // ---- the spell book (spec: 2026-11-16 English path, Part 7; both courses)

  /** this round of the spell book: after a pause the same round again; else the course's (the gallery: its fixture) */
  private buildSpell(): SpellRound | null {
    const cur = this.view.screen
    if (this.resuming && cur?.screen === 'spell' && !this.answered) { this.resuming = false; return cur.round }
    this.resuming = false
    this.answered = false
    this.spellAnswered = []
    // the gallery's long fixture (five boxes fit their page), always; else the course's round (until a course has its own
    // spell rounds, the gallery shows its fixture round)
    if (this.opts.force?.longSpell) return spellFixture(this.course, true, this.opts.force.longSpell === 'write')
    return this.course.rounds.spellRound(this.ctx()) ?? (this.opts.force ? spellFixture(this.course) : null)
  }

  /**
   * One round of the spell book (policies/spell.ts decides, the run does what it says): the word; the demo when needed;
   * he drops each unit's tile into its box (a written word: he writes each letter in its box); the last one casts the
   * spell. A wrong tile (or a wrong stroke) costs a heart, as on the calm screens. False: the course has no round at this stage (the visit ends).
   */
  private async runSpellRound(t: number): Promise<boolean> {
    this.passStep({ type: 'round' })
    this.syncMult()
    const round = this.buildSpell()
    if (!round) return false
    // (a written word has its own demo: the hand writes the first letter)
    const demoId = round.mode === 'write' ? 'demo-spell-write' : 'demo-spell'
    const demo = this.opts.force ? !!this.opts.force.demo && !this.demoShown : !this.save.read().demosSeen.includes(demoId)
    const write = round.mode === 'write' && this.course.writing ? spellWriting(round, this.course.writing) : undefined
    this.spell = spellVisit({ round, demo, at: this.now(), answered: this.spellAnswered, ...(write ? { write } : {}) })
    this.assets = []
    const end = await this.guard(t, new Promise<'next' | 'over'>((r) => {
      this.spellDone = r
      this.spellStep({ type: 'start' })
    }))
    this.spell = null
    if (end === 'over') { await this.endRun(round.wordVoice); throw new Aborted() }
    await this.streakMoment(t)
    await this.sleep(t, 500)
    return true
  }

  private spellEnd(end: 'next' | 'over') {
    const f = this.spellDone
    this.spellDone = null
    f?.(end)
  }

  /**
   * A box's answer on the spell book: its unit's tallies and the stage pass, through the course (as on the other screens).
   * `tile`: the tile he dropped (a miss: his mix-up).
   */
  private spellAnswer(round: SpellRound, tile: string | null, a: SpellAnswer) {
    const asked = round.boxes[a.box].choice
    if (!asked) return
    const tapped = a.miss ? round.tiles.find((t) => t.unit === tile)?.choice : undefined
    const { passed } = this.save.recordAnswer({
      features: this.course.rounds.features(asked, 'spell'), miss: a.miss, asked, ...(tapped ? { tapped } : {}),
      newStage: this.course.rounds.isNewStageChoice(this.stage, asked), ...(a.helped ? { helped: true } : {}),
    })
    if (passed) {
      this.stage = this.save.read().stage.stage
      this.track('stage', { stage: this.stage })
    }
  }

  /** One step of the spell round's policy, done: the views, the sounds, the heart, the saves, the telemetry, then its wait. */
  private spellStep(e: NoAt<SpellInput>) {
    const sp = this.spell
    if (!sp) return
    const r = stepSpell(sp, { ...e, at: this.now() } as SpellInput)
    this.spell = r.state
    this.spellAnswered = r.state.answered
    if (r.hush) this.course.audio.stopVoice()
    if (r.run) this.set(r.run)
    if (r.view) this.set({ screen: r.view })
    if (r.cue) this.cueStarted = this.now()
    for (const x of r.sfx) this.sfx(SPELL_SFX[x])
    for (const a of r.answers) this.spellAnswer(sp.round, e.type === 'drop' ? e.tile : null, a)
    for (const op of r.save) {
      if (op.op === 'markDemo') { this.demoShown = true; this.save.markDemo(op.id) }
      else {
        // the spell is cast: the round's one answer (a miss when he fixed a mistake on the way: no star then)
        this.answered = true
        this.roundInScreen++
        this.save.recordAnswer({ features: op.features, miss: op.miss, newStage: false })
        if (!op.miss) { this.streak++; this.gainStar() }
      }
    }
    for (const x of r.track) this.track(x.e, x.data)
    if (r.run?.phase === 'mistake') {
      // a wrong tile: the heart is the run's call, as on the calm screens
      const outcome = this.answerOutcome('wrong')
      this.resetStreak()
      this.set({ hearts: this.hearts.left })
      if (outcome.over) { this.endStrokeWait(); this.spellEnd('over'); return }
    }
    const t = this.token
    const parts = r.say.map((l) => ({ id: this.drawLine(l) }))
    if (r.wait) {
      this.endStrokeWait()
      const no = ++this.drawWait
      const on = () => t === this.token && no === this.drawWait
      const w = r.wait
      if (w.for === 'say') {
        for (const p of parts) this.assets.push(p.id)
        void this.course.audio.sayParts(parts).then(() => { if (on()) this.spellStep({ type: 'heard' }) })
      } else if (w.for === 'sleep') void this.time.sleep(w.ms).then(() => { if (on()) this.spellStep({ type: 'slept' }) })
      else {
        if (parts.length) void this.course.audio.sayParts(parts)
        const live = () => on() && !this.view.paused
        const idle = () => {
          this.drawTimers.push(this.time.after(w.idle, () => { if (!live()) return; this.spellStep({ type: 'idle' }); if (w.every && live()) idle() }))
        }
        idle()
        if (w.hint !== undefined) this.drawTimers.push(this.time.after(w.hint, () => { if (live()) this.spellStep({ type: 'hint', auto: true }) }))
        if (w.settle !== undefined) this.drawTimers.push(this.time.after(w.settle, () => { if (on()) this.spellStep({ type: 'settle' }) }))
      }
    } else if (parts.length) void this.course.audio.sayParts(parts)
    if (r.end) this.spellEnd('next')
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
    // the hint shows a syllable's letter and vowel (a word's blend comes with the English hint)
    this.hinted = false
    this.set({ phase: 'question', hintAvailable: this.course.hint ? this.blendsOf().length > 0 : target.kind === 'syllable' })
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
          // (English: a new word to catch has its own hint; a sound has none)
          if (this.course.hint) { this.hinted = false; this.set({ hintAvailable: this.blendsOf().length > 0 }) }
          holdSpawn = true
          const go = () => { holdSpawn = false; nextSpawnAt = -Infinity }
          void this.say(t, [{ id: this.variation('target-new') }, { id: this.cueId(target), onStart: go }])
            .catch(() => {}).finally(() => { announcing = false; if (holdSpawn) go() })
        }
        if (!newTargetDue && !holdSpawn && !this.introHold && more() && now >= nextSpawnAt) spawn(now)
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
    this.saveWords()
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

  /**
   * a new item's introduction after an answer on it, said after its sound (the course's: English; Hebrew has none). Asked
   * before the answer is recorded: it reads the tallies as they were before this answer
   */
  private introAfter(c: Choice, right: boolean): { id: string }[] {
    return (this.course.rounds.introAfter?.(this.save, c, right) ?? []).map((p) => ({ id: 'line' in p ? this.variation(p.line) : p.id }))
  }

  /** says `parts` during the flight; with an introduction in them, no new wave sets off until they end (`introHold`) */
  private sayFlight(parts: { id: string }[], intro: boolean) {
    const said = this.course.audio.sayParts(parts)
    if (!intro) return
    const id = ++this.introSays
    this.introHold = id
    void said.catch(() => {}).finally(() => { if (this.introHold === id) this.introHold = 0 })
  }

  private onCatch(target: Choice, noPraise = false) {
    const st = this.save.read()
    const intro = this.introAfter(target, true)
    this.record('broom', target, target, 'right')
    this.save.setPace(flightPace(st.pace, 'catch'))
    this.streak++
    this.gainStar()
    this.sfx('catch')
    if (!this.spokenTargets.has(target.soundId)) {
      this.spokenTargets.add(target.soundId)
      this.sayFlight([{ id: this.cueId(target) }, ...intro], intro.length > 0)
    } else if (intro.length) this.sayFlight(intro, true)
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
    // (a miss that ends the run says nothing more: its introduction stays due)
    const intro = outcome.over ? [] : this.introAfter(target, false)
    this.record('broom', target, hit, 'wrong')
    this.save.setPace(flightPace(st.pace, 'miss'))
    // a miss (the target flew past in another lane) is a whoosh, not a crash
    this.sfx(hit ? 'hit' : 'wave')
    const right = wave.choices.find((c) => c.soundId === target.soundId)
    const fx = { id: ++this.fxId, kind: hit ? 'hit' as const : 'miss' as const, at: this.now() }
    this.setScreen({ reveal: { right: right?.id ?? target.id, wrong: hit?.id }, missed: !hit, fx } as Partial<BroomView>)
    this.set({ hearts: this.hearts.left })
    if (outcome.over) return 'over'
    this.sayFlight([{ id: this.cueId(target) }, ...intro], intro.length > 0)
    this.time.after(1400, () => {
      const s = this.view.screen
      if (t === this.token && s?.screen === 'broom' && s.fx?.id === fx.id) this.setScreen({ reveal: undefined } as Partial<BroomView>)
    })
    return 'on'
  }

}
