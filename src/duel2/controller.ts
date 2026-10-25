// The run controller (spec: Run, Screens). One async flow per screen: question → cue → answer → feedback, with mistakes
// that wait for next, explanations, hints, demos, the dotted-letter introduction, the word link, celebrations, the hearts
// (refilled on every screen) and the run's end. React reads `view` through subscribe(); gestures come in through gesture().
// Pausing aborts the flow at its next await; resume restarts the same round from the start.
import type { Rng } from '../shared/adaptive'
import { item as itemOf, mark as markOf, syllable, type MarkId, type Stage } from './logic/content'
import { features, predict, type ScreenId } from './logic/predict'
import {
  broomTarget, broomWave, cauldronRound, ghostRound, isNewStageChoice, ladderPlan, letterChoice,
  type Choice, type Kind, type LadderStep, type RoundCtx,
} from './logic/rounds'
import {
  TARGET_EVERY, orbEvents, wavePos, VISIT, heartsOnScreenStart, newRound, nextPace, nextScreen, onAnswer, runStart, travelMs,
  type Hearts,
} from './logic/run'
import { WORDS, wordLinkFor, type Word } from './data/words'
import { dotIntroFor, dotIntroParts } from './logic/dotIntro'
import { ZOOM_MS } from './components/screens/Doors'
import { lineAudioId, lineById } from './data/lines'
import { playSfx, sayParts, startMusic, stopMusic, stopVoice, type Duel2Sfx } from './audio/duel2Audio'
import { coinsOf, useDuel2Store } from './store'
import { duel2Telemetry } from './telemetry'
import type { Highlight } from './components/ExplainPanel'

export type Phase = 'demo' | 'question' | 'answer' | 'feedback' | 'mistake' | 'explain' | 'celebrate'
export type Reveal = { right: string; wrong?: string }
export interface BroomWave {
  id: number; choices: Choice[]; startMs: number; offsets: number[]; jitter: number[]; resolved: boolean[]
  /** a mistake happened in this wave: its other orbs no longer count */
  spent?: boolean
}
export interface BroomView {
  screen: 'broom'; kind: Kind; waves: BroomWave[]; travelMs: number; lane: 0 | 1 | 2; target: Choice; reveal?: Reveal; missed?: boolean
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
export type ScreenView = BroomView | CauldronView | LadderView | GhostsView | DoorsView | CrystalView

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
  /** the mistake waits for this; also after a celebration that needs a tap */
  needNext: boolean
  hintAvailable: boolean
  paused: boolean
  over: { score: number; crystals: number; best: boolean } | null
  /** the points of this run (right answers) */
  score: number
  /** counts the coins he earned this run (a coin pops in the top bar) */
  coinPop?: number
}

export interface RunOpts {
  sandbox?: boolean
  force?: { screen: ScreenId | 'crystal' | 'dot'; stage: Stage; kind?: Kind; demo?: boolean; fixed?: 'letter' | 'vowel' | 'dot' }
  rng?: Rng
  now?: () => number
}

class Aborted extends Error {}
/** no pick for this long: the instruction and the sound play once */
/** an effect rings this long before the voice goes on (fluent, but not cut) */
const SFX_RING_MS = 400
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
const WAVE_EVERY = 0.55
/** the most an orb starts late in its wave (fraction of the travel): popcorn, not a column */
const POPCORN = 0.28

const sylFeatures = (c: Choice, screen: ScreenId) => {
  const it = itemOf(c.itemId)
  return features(c.mark ? { item: it, mark: markOf(c.mark) } : { item: it }, screen)
}

export class RunController {
  view: View = { phase: 'question', hearts: 3, screen: null, overlay: null, needNext: false, hintAvailable: false, paused: false, over: null, score: 0 }
  private listeners = new Set<() => void>()
  private token = 0
  private rng: Rng
  private now: () => number
  private pausedAt: number | null = null
  private pausedTotal = 0
  private hearts: Hearts = heartsOnScreenStart()
  private screenId: ScreenId | 'crystal' = 'broom'
  private stage: Stage
  private cycle = 0
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
  /** set when he taps the right answer during a mistake: the rest of the mistake is skipped */
  private skipMistake = false
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
  private demoShown = false
  private assets: string[] = []

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
  gesture(g: { type: 'pick'; id: string } | { type: 'lane'; lane: 0 | 1 | 2 }) {
    if (this.view.paused) return
    if (g.type === 'lane') {
      if (this.view.screen?.screen === 'broom') this.setScreen({ lane: g.lane } as Partial<BroomView>)
      return
    }
    if (this.view.phase === 'mistake' && !this.ending) {
      // he shows he knows: a tap on the marked right answer skips the hint, the wait for next and the explanation (Michael)
      const right = (this.view.screen as { reveal?: { right: string } } | null)?.reveal?.right
      if (right && g.id === right) {
        this.skipMistake = true
        stopVoice()
        if (this.nextWaiter) this.next()
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
    const t = this.currentTarget()
    if (!t) return
    stopVoice()
    void sayParts([{ id: this.cueId(t) }])
  }
  hint() {
    const s = this.view.screen
    if (s?.screen === 'doors' && this.view.phase === 'answer') {
      // the door's hint: the syllables light again one at a time, slower, with no voice (he reads it)
      const t = this.token
      this.setScreen({ lit: 0 } as Partial<DoorsView>)
      void this.sleep(t, 600).then(() => this.setScreen({ lit: 1 } as Partial<DoorsView>))
        .then(() => this.sleep(t, 1400)).then(() => this.setScreen({ lit: 2 } as Partial<DoorsView>)).catch(() => {})
      return
    }
    const t = this.currentTarget()
    if (!t || this.view.overlay) return
    void this.playHint(t, false).catch(() => {})
  }

  // ---- lifecycle
  start() {
    if (this.running) return
    this.running = true
    const st = useDuel2Store.getState()
    if (!this.opts.sandbox) duel2Telemetry.track('run-start', { stage: this.stage })
    const f = this.opts.force
    this.screenId = f ? (f.screen === 'dot' ? 'ladder' : f.screen) : runStart(this.stage, st.lastEnded)
    void this.loop()
  }
  destroy() {
    this.token++
    this.running = false
    this.stopBroom()
    stopVoice()
    stopMusic()
    if (!this.view.over && !this.opts.sandbox && this.score > 0) duel2Telemetry.track('abandon', { screen: this.screenId, score: this.score })
  }
  pause() {
    if (this.view.paused || this.view.over || this.ending) return
    this.token++
    this.pausedAt = this.now()
    this.stopBroom()
    stopVoice()
    this.pickWaiter = null
    this.nextWaiter = null
    this.resuming = true
    this.set({ paused: true, overlay: null, needNext: false })
  }
  resume() {
    if (!this.view.paused) return
    if (this.pausedAt !== null) this.pausedTotal += this.now() - this.pausedAt
    this.pausedAt = null
    this.set({ paused: false })
    void this.loop()
  }

  // ---- helpers
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
    if (this.skipMistake) return Promise.resolve()
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
    if (!s || s.screen === 'crystal' || s.screen === 'doors') return null
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
      for (;;) {
        if (this.screenId === 'crystal') await this.runCrystal(t)
        else await this.runScreen(t, this.screenId)
        if (this.opts.force) {
          // the gallery plays one screen, then starts it again
          this.roundInScreen = 0
          this.ladder = null
          this.doorWords = []
          this.visitKind = null
          this.crystalAwarded = false
          this.hearts = heartsOnScreenStart()
          continue
        }
        if (this.screenId === 'doors') { this.screenId = 'crystal'; continue }
        this.crystalAwarded = false
        const from: ScreenId = this.screenId === 'crystal' ? 'doors' : this.screenId
        const nx = nextScreen(this.stage, from)
        if (nx.newCycle) this.cycle++
        this.screenId = nx.screen
        this.roundInScreen = 0
        this.ladder = null
        this.doorWords = []
        this.visitKind = null
      }
    } catch (e) {
      if (!(e instanceof Aborted)) throw e
    }
  }

  private async runScreen(t: number, screen: ScreenId) {
    if (this.roundInScreen === 0) this.hearts = heartsOnScreenStart()
    this.set({ hearts: this.hearts.left, overlay: null, needNext: false })
    const kind = (this.visitKind ??= this.kindFor(screen))
    const st = useDuel2Store.getState()
    const demo = this.demoKey(screen, kind)
    if ((this.opts.force ? !!this.opts.force.demo && !this.demoShown : !st.demosSeen.includes(demo)) && this.roundInScreen === 0) {
      this.demoShown = true
      this.prepareView(screen, kind)
      this.set({ phase: 'demo', overlay: { kind: 'demo', line: lineAudioId(demo, 1), demo } })
      if (!this.opts.sandbox) { st.markDemo(demo); duel2Telemetry.track('demo', { demo }) }
      await this.waitNext(t)
      this.set({ overlay: null })
    }
    if (screen === 'broom') return this.runBroom(t, kind)
    while (this.roundInScreen < VISIT[screen]) {
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
    const c = this.ctx()
    // never the same sound two rounds in a row on one screen
    const prev = this.view.screen?.screen === screen ? (this.view.screen as { target?: Choice }).target?.soundId : undefined
    if (screen === 'broom') {
      const target = broomTarget(c, kind)
      this.set({ screen: { screen: 'broom', kind, waves: [], travelMs: travelMs(useDuel2Store.getState().pace, this.cycle), lane: 1, target } })
      return target
    }
    if (screen === 'cauldron') {
      const r = cauldronRound(c, prev)
      const target = { ...letterChoice(r.letter), kind: 'syllable' as Kind, id: r.target.id, text: r.target.text, soundId: r.target.soundId, group: r.target.mark.group, mark: r.target.mark.id }
      this.set({ screen: { screen: 'cauldron', letterId: r.letter.id, orbs: r.orbs.map((m) => m.id), target } })
      return target
    }
    if (screen === 'ladder') {
      if (!this.ladder) this.ladder = { ...ladderPlan(c, VISIT.ladder, this.opts.force?.fixed), built: [] }
      const step = this.ladder.steps[this.ladder.built.length]
      this.set({ screen: { screen: 'ladder', built: this.ladder.built, plates: step.plates, rungs: VISIT.ladder, target: step.target } })
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
      this.doorWords = scored.sort(() => this.rng() - 0.5).slice(0, VISIT.doors).map((x) => x.w)
    }
    const word = this.doorWords[this.roundInScreen % this.doorWords.length]
    const others = WORDS.filter((w) => w.door && w.id !== word.id).sort(() => this.rng() - 0.5).slice(0, 2)
    const keys = [word, ...others].sort(() => this.rng() - 0.5)
    // behind the last door: the crystal he is about to win (the kind runCrystal will show)
    const behind = this.roundInScreen === VISIT.doors - 1
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
      this.gainStar()
      this.streak++
      this.set({ phase: 'feedback' })
      const confident = predict(sylFeatures(c, screen), useDuel2Store.getState().tallies, useDuel2Store.getState().recent) < 0.2 && this.now() - this.cueStarted < CONFIDENT_MS
      if (s.screen === 'cauldron') { this.setScreen({ joined: true } as Partial<CauldronView>); this.sfx('puff') }
      if (s.screen === 'ladder') { this.ladder!.built = [...this.ladder!.built, c]; this.setScreen({ built: this.ladder!.built, plates: [] } as Partial<LadderView>); this.sfx('lock') }
      if (s.screen === 'ghosts') { this.setScreen({ zapped: c.id } as Partial<GhostsView>); this.sfx('zap') }
      // let the effect ring a moment before the voice goes on (Michael: effects got cut)
      await this.sleep(t, SFX_RING_MS)
      await this.say(t, confident ? [] : [{ id: this.cueId(c) }])
      await this.maybeWordLink(t, c)
      if (this.streak % STREAK_EVERY === 0) await this.celebrate(t, 'streak')
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
    this.streak = 0
    this.record(screen, c, tapped, 'wrong')
    if (s.screen !== 'ladder') this.roundInScreen++
    this.sfx('hit')
    const reveal = s.screen === 'cauldron' ? { right: c.mark!, wrong: tapped.mark } : { right: c.id, wrong: tapped.id }
    this.skipMistake = false
    this.setScreen({ reveal } as Partial<ScreenView>)
    this.set({ phase: 'mistake', hearts: this.hearts.left })
    if (outcome.over) return this.endRun(this.cueId(c))
    await this.sleep(t, SFX_RING_MS)
    await this.say(t, [{ id: this.cueId(c) }])
    // no hint here: the right answer glows and its sound plays (Michael: the hint came too often)
    await this.waitNext(t)
    if (!this.skipMistake && this.explanationDue(screen, c)) await this.explain(t, c)
    this.skipMistake = false
    return 'next'
  }

  private async evaluateDoor(t: number, word: Word, picked: string): Promise<'next' | 'over'> {
    const right = picked === word.id
    const outcome = onAnswer(this.hearts, right ? 'right' : 'wrong')
    const tapped = WORDS.find((w) => w.id === picked) ?? null
    if (right) {
      this.record('doors', word, tapped, 'right')
      this.roundInScreen++
      this.gainStar()
      this.streak++
      this.set({ phase: 'feedback' })
      this.sfx('key')
      this.setScreen({ opening: true } as Partial<DoorsView>)
      this.sfx('door')
      await this.sleep(t, SFX_RING_MS)
      await this.say(t, [{ id: `w-${word.id}` }])
      // through the doorway to the next door (or the crystal): the round goes on where the flight ends
      this.setScreen({ zooming: true } as Partial<DoorsView>)
      await this.sleep(t, ZOOM_MS + 60)
      return 'next'
    }
    this.hearts = outcome.hearts
    this.streak = 0
    this.record('doors', word, tapped, 'wrong')
    this.sfx('hit')
    this.skipMistake = false
    this.setScreen({ reveal: { right: word.id, wrong: picked } } as Partial<DoorsView>)
    this.set({ phase: 'mistake', hearts: this.hearts.left })
    if (outcome.over) return this.endRun(`w-${word.id}`)
    await this.say(t, [{ id: `w-${word.id}` }])
    await this.waitNext(t)
    this.skipMistake = false
    // the same door again (it opens only with its key)
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
  private praiseLine(kind: 'streak' | 'ladder-top' | 'crystal'): string | null {
    if ((useDuel2Store.getState().praiseHeard?.[kind] ?? 0) >= PRAISE_SPOKEN) return null
    if (!this.opts.sandbox) useDuel2Store.getState().notePraise(kind)
    return this.variation(kind)
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

  /** Ends the run: says the right answer, then the summary. A pause can no longer cancel it (it is already saved). */
  private async endRun(cue: string): Promise<'over'> {
    this.ending = true
    this.stopBroom()
    stopMusic()
    const st = useDuel2Store.getState()
    const best = this.score > st.bestRun
    if (!this.opts.sandbox) {
      st.endRun(this.screenId === 'crystal' ? 'doors' : this.screenId, this.score)
      duel2Telemetry.track('run-end', { screen: this.screenId, score: this.score, crystals: this.crystalsThisRun })
    }
    await sayParts([{ id: cue }])
    await new Promise<void>((r) => window.setTimeout(r, 600))
    this.token++
    this.set({ over: { score: this.score, crystals: this.crystalsThisRun, best }, needNext: false })
    return 'over'
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
    let target = this.buildRound('broom', kind) as Choice
    this.spokenTargets.clear()
    startMusic('flight')
    this.stopBroom()
    this.setScreen({ waves: [], reveal: undefined, missed: false, fx: undefined, finished: false } as Partial<BroomView>)
    this.set({ phase: 'question', hintAvailable: kind === 'syllable' })
    this.assets = []
    // only the sound to catch (the demo taught the screen)
    await this.say(t, [{ id: this.cueId(target) }])
    this.set({ phase: 'answer' })
    const travel = travelMs(useDuel2Store.getState().pace, this.cycle)
    let spawned = 0
    let catches = 0
    let newTargetDue = false
    let announcing = false
    let lastSpawn = -Infinity
    const open = (ws: BroomWave[]) => ws.some((w) => w.resolved.some((r) => !r))
    const spawn = (now: number) => {
      const choices = broomWave(this.ctx(), target, kind)
      const w: BroomWave = {
        id: ++this.waveId, choices, startMs: now,
        offsets: choices.map(() => Math.round(this.rng() * POPCORN * 100) / 100),
        jitter: choices.map(() => Math.round((this.rng() - 0.5) * 60)),
        resolved: choices.map(() => false),
      }
      this.setScreen({ waves: [...(this.view.screen as BroomView).waves, w], travelMs: travel } as Partial<BroomView>)
      this.sfx('wave')
      this.cueStarted = this.now()
      spawned++
      lastSpawn = now
    }
    const result = await this.guard(t, new Promise<'done' | 'over'>((resolve, reject) => {
      this.broomTimer = window.setInterval(() => {
        if (t !== this.token) { this.stopBroom(); reject(new Aborted()); return }
        const now = this.broomClock()
        const cur = this.view.screen as BroomView
        const events: { hit: Choice | null; wave: BroomWave }[] = []
        const waves = cur.waves.map((w) => {
          const k = w.choices.map((_, i) => wavePos(w.startMs + w.offsets[i] * travel, now, travel))
          const e = orbEvents(k, w.resolved, cur.lane, w.choices.map((c) => c.soundId === target.soundId))
          const hitWrong = e.hit !== null && w.choices[e.hit].soundId !== target.soundId
          // one wave is one question: after a mistake its other orbs fly on harmlessly (no second heart for the same wave)
          if (w.spent) return { ...w, resolved: e.resolved }
          if (e.hit !== null) events.push({ hit: w.choices[e.hit], wave: w })
          else if (e.missedTarget) events.push({ hit: null, wave: w })
          return { ...w, resolved: e.resolved, spent: hitWrong || e.missedTarget }
        }).filter((w) => w.resolved.some((r) => !r))
        this.setScreen({ waves } as Partial<BroomView>)
        for (const ev of events) {
          if (ev.hit && ev.hit.soundId === target.soundId) {
            this.onCatch(target)
            catches++
            this.roundInScreen++
            if (catches % TARGET_EVERY === 0 && spawned < VISIT.broom) newTargetDue = true
          } else if (this.onFlightMistake(t, target, ev.hit, ev.wave) === 'over') {
            this.stopBroom()
            resolve('over')
            return
          }
        }
        // a new sound: once no orb with the old sound is flying (other leftovers finish harmlessly), say it while he
        // flies and send the next orbs at once — they need a moment to fly in anyway (Michael: no long waits)
        const oldLeft = waves.some((w) => !w.spent && w.choices.some((c, j) => c.soundId === target.soundId && !w.resolved[j]))
        if (newTargetDue && !announcing && !oldLeft) {
          announcing = true
          newTargetDue = false
          const spentWaves = waves.map((w) => ({ ...w, spent: true }))
          target = broomTarget(this.ctx(), kind, target.soundId)
          this.setScreen({ target, waves: spentWaves } as Partial<BroomView>)
          lastSpawn = -Infinity
          void this.say(t, [{ id: this.variation('target-new') }, { id: this.cueId(target) }])
            .catch(() => {}).finally(() => { announcing = false })
        }
        if (!newTargetDue && spawned < VISIT.broom && now - lastSpawn >= travel * WAVE_EVERY) spawn(now)
        // the visit ends when all its orbs have arrived (Michael: "let me finish")
        if (spawned >= VISIT.broom && !newTargetDue && !open(waves)) { this.stopBroom(); resolve('done') }
      }, 50)
    }))
    if (result === 'over') { await this.endRun(this.cueId(target)); throw new Aborted() }
    this.stopBroom()
    // a closure, never a jump from a correction to the next screen (Michael): let a last mistake's feedback finish, then
    // a short finale — a celebration sound and the wizard swooping away
    const fx = (this.view.screen as BroomView).fx
    if (fx && this.now() - fx.at < FLIGHT_SETTLE_MS) await this.sleep(t, FLIGHT_SETTLE_MS - (this.now() - fx.at))
    this.setScreen({ finished: true, reveal: undefined } as Partial<BroomView>)
    this.set({ phase: 'celebrate' })
    this.sfx('streak')
    await this.sleep(t, FINALE_MS)
    stopMusic()
  }

  /** A point: this run's score, and a star on his kept total; every COIN_EVERY-th star is a coin, with a sound. */
  private gainStar() {
    this.score++
    this.set({ score: this.score })
    if (this.opts.sandbox) return
    const st = useDuel2Store.getState()
    const before = coinsOf(st.totalStars)
    st.addStar()
    if (coinsOf(useDuel2Store.getState().totalStars) > before) {
      this.set({ coinPop: (this.view.coinPop ?? 0) + 1 })
      this.sfx('lock')
    }
  }

  private onCatch(target: Choice) {
    const st = useDuel2Store.getState()
    this.record('broom', target, target, 'right')
    if (!this.opts.sandbox) st.setPace(nextPace(st.pace, { result: 'correct', msWalk: 0, walkMs: 1 }))
    this.gainStar()
    this.streak++
    this.sfx('catch')
    if (!this.spokenTargets.has(target.soundId)) {
      this.spokenTargets.add(target.soundId)
      void sayParts([{ id: this.cueId(target) }])
    }
    if (this.streak % STREAK_EVERY === 0) { const praise = this.praiseLine('streak'); if (praise) void sayParts([{ id: praise }]) }
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
    this.streak = 0
    this.record('broom', target, hit, 'wrong')
    if (!this.opts.sandbox) st.setPace(nextPace(st.pace, { result: 'timeout', msWalk: null, walkMs: 1 }))
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
