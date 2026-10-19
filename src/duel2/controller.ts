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
  TARGET_EVERY, VISIT, heartsOnScreenStart, newRound, nextPace, nextScreen, onAnswer, runStart, travelMs, waveX,
  type Hearts,
} from './logic/run'
import { WORDS, wordLinkFor, type Word } from './data/words'
import { lineAudioId, lineById } from './data/lines'
import { playSfx, sayParts, startMusic, stopMusic, stopVoice, type Duel2Sfx } from './audio/duel2Audio'
import { useDuel2Store } from './store'
import { duel2Telemetry } from './telemetry'
import type { Highlight } from './components/ExplainPanel'

export type Phase = 'demo' | 'question' | 'answer' | 'feedback' | 'mistake' | 'explain' | 'celebrate'
export type Reveal = { right: string; wrong?: string }
export interface BroomView { screen: 'broom'; kind: Kind; waves: { id: number; choices: Choice[]; startMs: number }[]; travelMs: number; lane: 0 | 1 | 2; target: Choice; reveal?: Reveal }
export interface CauldronView { screen: 'cauldron'; letterId: string; orbs: MarkId[]; target: Choice; joined?: boolean; reveal?: { right: MarkId; wrong?: MarkId } }
export interface LadderView { screen: 'ladder'; built: Choice[]; plates: Choice[]; rungs: number; target: Choice; reveal?: Reveal }
export interface GhostsView { screen: 'ghosts'; signs: Choice[]; target: Choice; zapped?: string; reveal?: Reveal }
export interface DoorsView { screen: 'doors'; word: Word; lit: 0 | 1 | 2; keys: Word[]; opening: boolean; zooming: boolean; reveal?: Reveal }
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
}

export interface RunOpts {
  sandbox?: boolean
  force?: { screen: ScreenId | 'crystal' | 'dot'; stage: Stage; kind?: Kind; demo?: boolean; fixed?: 'letter' | 'vowel' | 'dot' }
  rng?: Rng
  now?: () => number
}

class Aborted extends Error {}
const HINT_AUTO = 6
const STREAK_EVERY = 5
const WORD_LINK_CHANCE = 0.25
const CONFIDENT_MS = 3000
const WAVE_EVERY = 0.55
const CATCH_AT = 0.08

const sylFeatures = (c: Choice, screen: ScreenId) => {
  const it = itemOf(c.itemId)
  return features(c.mark ? { item: it, mark: markOf(c.mark) } : { item: it }, screen)
}

export class RunController {
  view: View = { phase: 'question', hearts: 3, screen: null, overlay: null, needNext: false, hintAvailable: false, paused: false, over: null }
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
  private ladder: { fixed: 'letter' | 'vowel' | 'dot'; steps: LadderStep[]; built: Choice[] } | null = null
  private doorWords: Word[] = []
  private broomTimer: number | undefined
  private waveId = 0
  private running = false
  private resuming = false
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
    if (this.view.paused || this.view.over) return
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
          this.hearts = heartsOnScreenStart()
          continue
        }
        if (this.screenId === 'doors') { this.screenId = 'crystal'; continue }
        const from: ScreenId = this.screenId === 'crystal' ? 'doors' : this.screenId
        const nx = nextScreen(this.stage, from)
        if (nx.newCycle) this.cycle++
        this.screenId = nx.screen
        this.roundInScreen = 0
        this.ladder = null
        this.doorWords = []
      }
    } catch (e) {
      if (!(e instanceof Aborted)) throw e
    }
  }

  private async runScreen(t: number, screen: ScreenId) {
    if (this.roundInScreen === 0) this.hearts = heartsOnScreenStart()
    this.set({ hearts: this.hearts.left, overlay: null, needNext: false })
    const kind = this.kindFor(screen)
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
    if (this.resuming && cur && cur.screen === screen) {
      // after a pause the same round starts again from its question (rule); a broom flight restarts its waves
      this.resuming = false
      this.setScreen({ reveal: undefined, ...(cur.screen === 'broom' ? { waves: [] } : {}), ...(cur.screen === 'doors' ? { lit: 0, opening: false, zooming: false } : {}) } as Partial<ScreenView>)
      return cur.screen === 'doors' ? cur.word : (cur as BroomView).target
    }
    this.resuming = false
    const c = this.ctx()
    if (screen === 'broom') {
      const target = broomTarget(c, kind)
      this.set({ screen: { screen: 'broom', kind, waves: [], travelMs: travelMs(useDuel2Store.getState().pace, this.cycle), lane: 1, target } })
      return target
    }
    if (screen === 'cauldron') {
      const r = cauldronRound(c)
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
      const r = ghostRound(c, kind)
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
    this.set({ screen: { screen: 'doors', word, lit: 0, keys, opening: false, zooming: false } })
    return word
  }

  private needsDotIntro(choices: Choice[]): string | null {
    if (this.stage < 3) return null
    // the gallery's dot-intro entry shows the introduction every round
    const seen = this.opts.force?.screen === 'dot' ? [] : useDuel2Store.getState().dotIntrosSeen
    for (const c of choices) {
      const it = itemOf(c.itemId)
      const hard = it.soft ? it.pair! : it.id
      if (it.pair && !seen.includes(hard)) return hard
    }
    return null
  }

  private async dotIntro(t: number, hard: string) {
    const h = itemOf(hard)
    const s = itemOf(h.pair!)
    const hardS = syllable(h.id, 'kamatz')
    const softS = syllable(s.id, 'kamatz')
    const parts: { id: string; highlight: Highlight }[] = [
      { id: lineAudioId('dot-intro', 1), highlight: 'none' }, { id: softS.soundId, highlight: 'right' }, { id: hardS.soundId, highlight: 'left' },
    ]
    this.set({ phase: 'explain', overlay: { kind: 'dot', parts, soft: softS.text, hard: hardS.text } })
    if (!this.opts.sandbox) useDuel2Store.getState().markDotIntro(hard)
    await this.waitNext(t)
    this.set({ overlay: null })
  }

  private questionLine(screen: ScreenId, kind: Kind) {
    if (screen === 'broom') return kind === 'letter' ? 'q-broom-letter' : 'q-broom'
    if (screen === 'doors') return 'q-door'
    return `q-${screen}`
  }

  /** One round on a calm screen. Returns 'over' when the hearts ran out. */
  private async runRound(t: number, screen: ScreenId, kind: Kind): Promise<'next' | 'over'> {
    this.hearts = newRound(this.hearts)
    const target = this.buildRound(screen, kind)
    const choices = this.choicesOf(screen)
    const intro = this.needsDotIntro(choices)
    if (intro) await this.dotIntro(t, intro)
    this.set({ phase: 'question', overlay: null, hintAvailable: screen === 'doors' || (target as Choice).kind === 'syllable' })
    this.assets = []
    if (screen === 'doors') {
      await this.say(t, [{ id: this.variation('q-door') }])
      await this.sleep(t, 200)
      this.setScreen({ lit: 1 } as Partial<DoorsView>)
      await this.sleep(t, 900)
      this.setScreen({ lit: 2 } as Partial<DoorsView>)
      this.set({ phase: 'answer' })
      this.cueStarted = this.now()
    } else {
      const c = target as Choice
      // an automatic hint is an instruction: answers count only after it (rule)
      const autoHint = this.autoHintDue(screen, c)
      const open = () => { this.set({ phase: 'answer' }); this.cueStarted = this.now() }
      await this.say(t, [{ id: this.variation(this.questionLine(screen, kind)) }, { id: this.cueId(c), onStart: autoHint ? undefined : open }])
      if (autoHint) {
        if (!this.opts.sandbox) useDuel2Store.getState().noteHint(`${screen}:${this.stage}`)
        await this.playHint(c, true, t)
        open()
      }
    }
    for (;;) {
      const picked = await this.waitPick(t)
      const res = await this.evaluate(t, screen, target, picked)
      if (res === 'near') continue
      return res
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

  private autoHintDue(screen: ScreenId, c: Choice): boolean {
    if (c.kind !== 'syllable' || screen === 'broom') return false
    return (useDuel2Store.getState().hintsSeen[`${screen}:${this.stage}`] ?? 0) < HINT_AUTO
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
      this.score++
      this.streak++
      this.set({ phase: 'feedback' })
      const confident = predict(sylFeatures(c, screen), useDuel2Store.getState().tallies, useDuel2Store.getState().recent) < 0.2 && this.now() - this.cueStarted < CONFIDENT_MS
      if (s.screen === 'cauldron') { this.setScreen({ joined: true } as Partial<CauldronView>); this.sfx('puff') }
      if (s.screen === 'ladder') { this.ladder!.built = [...this.ladder!.built, c]; this.setScreen({ built: this.ladder!.built, plates: [] } as Partial<LadderView>); this.sfx('lock') }
      if (s.screen === 'ghosts') { this.setScreen({ zapped: c.id } as Partial<GhostsView>); this.sfx('zap') }
      await this.say(t, confident ? [] : [{ id: this.cueId(c) }])
      await this.maybeWordLink(t, c)
      if (this.streak % STREAK_EVERY === 0) await this.celebrate(t, 'streak')
      this.roundInScreen++
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
    this.sfx('hit')
    const reveal = s.screen === 'cauldron' ? { right: c.mark!, wrong: tapped.mark } : { right: c.id, wrong: tapped.id }
    this.setScreen({ reveal } as Partial<ScreenView>)
    this.set({ phase: 'mistake', hearts: this.hearts.left })
    await this.say(t, [{ id: this.cueId(c) }])
    if (outcome.over) return this.endRun(t)
    await this.waitNext(t)
    if (this.explanationDue(screen, c)) await this.explain(t, c)
    if (s.screen !== 'ladder') this.roundInScreen++
    return 'next'
  }

  private async evaluateDoor(t: number, word: Word, picked: string): Promise<'next' | 'over'> {
    const right = picked === word.id
    const outcome = onAnswer(this.hearts, right ? 'right' : 'wrong')
    const tapped = WORDS.find((w) => w.id === picked) ?? null
    if (right) {
      this.record('doors', word, tapped, 'right')
      this.score++
      this.streak++
      this.set({ phase: 'feedback' })
      this.sfx('key')
      this.setScreen({ opening: true } as Partial<DoorsView>)
      this.sfx('door')
      await this.say(t, [{ id: `w-${word.id}` }])
      this.setScreen({ zooming: true } as Partial<DoorsView>)
      await this.sleep(t, 700)
      this.roundInScreen++
      return 'next'
    }
    this.hearts = outcome.hearts
    this.streak = 0
    this.record('doors', word, tapped, 'wrong')
    this.sfx('hit')
    this.setScreen({ reveal: { right: word.id, wrong: picked } } as Partial<DoorsView>)
    this.set({ phase: 'mistake', hearts: this.hearts.left })
    await this.say(t, [{ id: `w-${word.id}` }])
    if (outcome.over) return this.endRun(t)
    await this.waitNext(t)
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
    const w = wordLinkFor(c.soundId, this.rng)
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
    await this.say(t, [{ id: this.variation(line) }])
    stopMusic()
  }

  private async runCrystal(t: number) {
    this.crystalsThisRun++
    const kind = useDuel2Store.getState().crystals + this.crystalsThisRun
    this.set({ screen: { screen: 'crystal', kind }, overlay: null })
    if (!this.opts.sandbox) { useDuel2Store.getState().addCrystal(); duel2Telemetry.track('crystal', { kind }) }
    await this.celebrate(t, 'crystal')
    await this.sleep(t, 1200)
  }

  private async endRun(t: number): Promise<'over'> {
    this.stopBroom()
    stopMusic()
    const st = useDuel2Store.getState()
    const best = this.score > st.bestRun
    if (!this.opts.sandbox) {
      st.endRun(this.screenId === 'crystal' ? 'doors' : this.screenId, this.score)
      duel2Telemetry.track('run-end', { screen: this.screenId, score: this.score, crystals: this.crystalsThisRun })
    }
    await this.sleep(t, 600)
    this.token++
    this.set({ over: { score: this.score, crystals: this.crystalsThisRun, best }, needNext: false })
    return 'over'
  }

  // ---- the broom flight
  private stopBroom() {
    window.clearInterval(this.broomTimer)
    this.broomTimer = undefined
  }

  private async runBroom(t: number, kind: Kind) {
    this.hearts = newRound(this.hearts)
    let target = this.buildRound('broom', kind) as Choice
    this.spokenTargets.clear()
    let catches = 0
    startMusic('flight')
    const announce = async (first: boolean) => {
      this.stopBroom()
      this.setScreen({ waves: [], reveal: undefined } as Partial<BroomView>)
      this.set({ phase: 'question', hintAvailable: kind === 'syllable' })
      this.assets = []
      const line = first ? this.variation(this.questionLine('broom', kind)) : this.variation('target-new')
      await this.say(t, [{ id: line }, { id: this.cueId(target) }])
      this.set({ phase: 'answer' })
    }
    await announce(true)
    while (this.roundInScreen < VISIT.broom) {
      const r = await this.flyWave(t, target, kind)
      if (r === 'right') {
        catches++
        this.roundInScreen++
        if (catches % TARGET_EVERY === 0 && this.roundInScreen < VISIT.broom) {
          target = broomTarget(this.ctx(), kind, target.soundId)
          this.setScreen({ target } as Partial<BroomView>)
          await announce(false)
        }
      } else if (r === 'over') {
        throw new Aborted()
      } else {
        this.roundInScreen++
        await announce(true)
      }
    }
    this.stopBroom()
    stopMusic()
  }

  /** Spawns waves until one reaches the wizard; resolves with the outcome of that wave. */
  private flyWave(t: number, target: Choice, kind: Kind): Promise<'right' | 'wrong' | 'over'> {
    return this.guard(t, new Promise<'right' | 'wrong' | 'over'>((resolve, reject) => {
      const s = this.view.screen as BroomView
      const travel = travelMs(useDuel2Store.getState().pace, this.cycle)
      const spawn = () => {
        const choices = broomWave(this.ctx(), target, kind)
        const w = { id: ++this.waveId, choices, startMs: this.broomClock() }
        const cur = this.view.screen as BroomView
        this.setScreen({ waves: [...cur.waves, w], travelMs: travel } as Partial<BroomView>)
        this.sfx('wave')
        this.cueStarted = this.now()
      }
      if (!s.waves.length) spawn()
      let lastSpawn = this.broomClock()
      this.stopBroom()
      this.broomTimer = window.setInterval(() => {
        if (t !== this.token) { this.stopBroom(); reject(new Aborted()); return }
        const now = this.broomClock()
        const cur = this.view.screen as BroomView
        const head = cur.waves[0]
        if (head && waveX(head.startMs, now, travel) <= CATCH_AT) {
          this.stopBroom()
          const hit = head.choices[cur.lane]
          this.setScreen({ waves: cur.waves.slice(1) } as Partial<BroomView>)
          void this.resolveWave(t, target, hit, head.choices).then(resolve, reject)
          return
        }
        if (now - lastSpawn >= travel * WAVE_EVERY) { spawn(); lastSpawn = now }
      }, 50)
    }))
  }

  private async resolveWave(t: number, target: Choice, hit: Choice, choices: Choice[]): Promise<'right' | 'wrong' | 'over'> {
    const right = hit.soundId === target.soundId
    const near = !right && hit.nearMissOf === target.id
    const st = useDuel2Store.getState()
    if (right) {
      this.record('broom', target, hit, 'right')
      if (!this.opts.sandbox) st.setPace(nextPace(st.pace, { result: 'correct', msWalk: 0, walkMs: 1 }))
      this.score++
      this.streak++
      this.sfx('catch')
      if (!this.spokenTargets.has(target.soundId)) {
        this.spokenTargets.add(target.soundId)
        void sayParts([{ id: this.cueId(target) }])
      }
      if (this.streak % STREAK_EVERY === 0) {
        void sayParts([{ id: this.variation('streak') }])
      }
      return 'right'
    }
    const outcome = onAnswer(this.hearts, near ? 'near' : 'wrong')
    this.hearts = outcome.hearts
    if (outcome.forgiven) {
      this.record('broom', target, hit, 'near')
      void sayParts([{ id: this.variation('almost') }])
      return this.flyAgain()
    }
    this.streak = 0
    this.record('broom', target, hit, 'wrong')
    if (!this.opts.sandbox) st.setPace(nextPace(st.pace, { result: 'timeout', msWalk: null, walkMs: 1 }))
    this.sfx('hit')
    // the flight stops: the wave stays with the right one marked until next
    const frozen = { id: ++this.waveId, choices, startMs: this.broomClock() - travelMs(st.pace, this.cycle) * (1 - CATCH_AT) }
    this.setScreen({ waves: [frozen], reveal: { right: target.id, wrong: hit.id } } as Partial<BroomView>)
    this.set({ phase: 'mistake', hearts: this.hearts.left })
    await this.say(t, [{ id: this.cueId(target) }])
    if (outcome.over) return this.endRun(t)
    await this.waitNext(t)
    if (this.explanationDue('broom', target)) await this.explain(t, target)
    return 'wrong'
  }

  /** A forgiven near miss in the flight: the waves keep coming (not counted as a catch). */
  private flyAgain(): Promise<'right' | 'wrong' | 'over'> {
    return Promise.resolve('wrong' as const).then(() => this.flyWave(this.token, (this.view.screen as BroomView).target, (this.view.screen as BroomView).kind))
  }
}
