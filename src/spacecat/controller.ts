// Space Cat's play flow as a framework-free controller (as Book 2's RunController): it picks each sum, hands it to the
// canvas engine, runs the demo, the zoom tip and the missing-number line, records each round, and calls the screens'
// callbacks at a level's end and the run's end. Every wait goes through the Sleeper (ADR 0005); the rules that need no
// time are in logic/. usePlay.ts is its thin React bridge.
import type { Rng } from '../shared/adaptive'
import type { Sleeper } from '../shared/sleeper'
import type { Track } from '../parent/types'
import type * as SpaceCatAudio from './audio/spaceCatAudio'
import type { Engine, Hud } from './canvas/engine'
import { makeRound, type RoundContent } from './content'
import { itemById, maxNumber, type Item } from './logic/facts'
import { candidates, openRungs } from './logic/ladder'
import { pickNext } from './logic/predict'
import type { RoundResult } from './logic/round'
import { RUN_START, applyResult, nextLevel, type Run } from './logic/run'
import { arrivalInForce } from './logic/speed'
import type { SpaceCatSavePort } from './savePort'

/** the demo round's sum (spec *The first time*) */
export const DEMO_ITEM = '1+1=2/c'
/** the demo hand drags to the right planet and back in this long; the zoom tip's flick shows this long */
export const DEMO_HAND_MS = 3200, TIP_HAND_MS = 2400
/** the zoom tip and the missing-number line show at most this many times */
export const TIP_TIMES = 2, MISSING_TIMES = 2
/** a voice line starts this long after the effect before it (spec *Voice*: about 0.4 s) */
export const SFX_TO_VOICE_MS = 400
/** the ship starts in this lane in a new run */
const START_LANE = 1

export interface LevelDoneInfo { level: number; points: number; newShips: (2 | 3)[] }
export interface EndInfo { points: number; newBest: boolean; best: number; level: number }

export interface PlayOpts {
  engine: Engine
  audio: Pick<typeof SpaceCatAudio, 'say' | 'playSfx' | 'quiet' | 'stopAll' | 'stopVoice' | 'startTune' | 'stopTune'>
  save: SpaceCatSavePort
  /** the run's telemetry (Space Cat's log: telemetry.ts) */
  track: Track
  /** the log's run number: each event carries it (the save's run count + 1 at a run's start) */
  setRun?: (run: number) => void
  /** writes the log's pending events now: the page may go away right after a pause or an abandon */
  flush?: () => void
  sleeper: Sleeper
  rng: Rng
  onLevelDone: (info: LevelDoneInfo) => void
  onEnd: (info: EndInfo) => void
}

/** demo: the first round's hand and line; tip: the zoom tip; missing: the missing-number line; between: a level done or the end */
export type PlayPhase = 'demo' | 'tip' | 'missing' | 'flight' | 'between'
export interface PlayView { paused: boolean; hud: Hud; phase: PlayPhase }

interface Current { item: Item; content: RoundContent; demo: boolean; missing: boolean; rung: number }

export class PlayController {
  private o: PlayOpts
  private run: Run = RUN_START
  private view: PlayView = { paused: false, hud: { dots: 0, points: 0, hearts: RUN_START.hearts }, phase: 'between' }
  private subs = new Set<() => void>()
  private cur: Current | null = null
  /** a round is on the screen and has no result yet */
  private inRound = false
  /** the run has started and not ended */
  private running = false
  /** bumps on every pause, round and destroy: a flow step that waited checks it is still its turn */
  private epoch = 0
  private shipLane = START_LANE
  private tipEnd: (() => void) | null = null
  private dead = false

  constructor(o: PlayOpts) {
    this.o = o
    o.engine.onEnd = (r) => this.roundEnded(r)
    o.engine.onFirstParkedUnderRight = () => { void this.zoomTip() }
    o.engine.onTouch = () => this.touched()
  }

  getView = (): PlayView => this.view
  subscribe = (fn: () => void): (() => void) => {
    this.subs.add(fn)
    return () => { this.subs.delete(fn) }
  }
  private set(p: Partial<PlayView>) {
    this.view = { ...this.view, ...p }
    this.subs.forEach((f) => f())
  }

  start(): void {
    if (this.running || this.dead) return
    const s = this.o.save.get()
    this.running = true
    this.run = RUN_START
    this.o.engine.setShip(s.ship)
    this.setHud()
    this.music()
    this.o.setRun?.(s.runs + 1)
    this.o.track('run-start', { ship: s.ship, rung: s.ladder.top })
    void this.nextRound()
  }

  /** the tablet locks or he changes app: everything stops, and the round on the screen is cut */
  pause(): void {
    if (this.view.paused || !this.running || this.dead) return
    this.epoch++
    this.endTip(false)
    this.o.engine.freeze()
    this.o.engine.setInput(false)
    this.o.audio.stopAll()
    this.o.track('pause', { phase: this.view.phase })
    this.o.flush?.()
    this.set({ paused: true })
  }

  /** a tap on the pause cover's triangle: the same sum from the top (a cut round: no heart, no tally) */
  resume(): void {
    if (!this.view.paused || this.dead) return
    this.set({ paused: false })
    this.music()
    if (this.view.phase === 'between' || !this.cur) return
    if (this.inRound) {
      const c = this.cur
      this.o.save.recordRound(c.item, this.cutResult(), { cut: true })
      this.o.track('round', { item: c.item.id, labels: c.content.labels, rung: c.rung, level: this.run.level, ship: this.o.save.get().ship, cut: true })
      this.o.engine.restart()
      void this.begin(this.cur)
    } else this.o.engine.resume()
  }

  /** LevelDone's play: the next level, hearts full again */
  nextLevel(): void {
    if (!this.running || this.view.phase !== 'between' || this.dead) return
    this.run = nextLevel(this.run)
    this.setHud()
    this.music()
    void this.nextRound()
  }

  /** the page goes away (pagehide): leaving in the middle of a run is an abandon */
  pageHide(): void {
    if (this.running) this.o.track('abandon', { level: this.run.level, points: this.run.points, phase: this.view.phase })
    this.pause()
    this.o.flush?.()
  }

  /** the held house: the run stops (the app then goes to alef's home screen) */
  leave(): void {
    if (this.running) this.o.track('abandon', { level: this.run.level, points: this.run.points, phase: this.view.phase })
    this.o.flush?.()
    this.running = false
    this.epoch++
    this.endTip(false)
    this.o.engine.freeze()
    this.o.engine.setInput(false)
    this.o.audio.stopAll()
  }

  destroy(): void {
    if (this.dead) return
    this.dead = true
    this.epoch++
    this.endTip(false)
    this.o.engine.destroy()
    this.subs.clear()
  }

  // ---------- the flow

  private music() {
    if (this.o.save.get().settings.flightMusic) this.o.audio.startTune()
    else this.o.audio.stopTune()
  }

  private setHud() {
    const hud = { dots: this.run.rightInLevel, points: this.run.points, hearts: this.run.hearts }
    this.o.engine.setHud(hud)
    this.set({ hud })
  }

  private nextRound(): Promise<void> {
    const s = this.o.save.get()
    const demo = !(s.heard.demo > 0) && s.runs === 0
    const item = demo
      ? itemById(DEMO_ITEM)!
      : pickNext(this.o.rng, candidates(s.ladder, s.settings), s.items, { fact: s.lastFact, sinceZero: s.sinceZero })
    const max = maxNumber(openRungs(s.ladder, s.settings))
    const content = makeRound(this.o.rng, item, this.shipLane, max, confusionOf(s.items[item.id]?.picks))
    const missing = !demo && item.hole !== 'c' && (s.heard.missing ?? 0) < MISSING_TIMES
    const cur: Current = { item, content, demo, missing, rung: item.rung }
    this.cur = cur
    this.o.engine.play(content, arrivalInForce(s.speed, s.settings.arrival), { frozen: true })
    return this.begin(cur)
  }

  /**
   * A round starts (again, after a pause: the engine has restarted it). The planets stand still until the voice and the
   * last effect have ended, then the arrival sound plays; the demo or the missing-number line comes 0.4 s after it with
   * his touches off; then the planets move.
   */
  private async begin(cur: Current): Promise<void> {
    const my = ++this.epoch
    const live = () => my === this.epoch && !this.dead && this.cur === cur
    this.inRound = true
    this.o.engine.setInput(false)
    this.set({ phase: cur.demo ? 'demo' : cur.missing ? 'missing' : 'flight' })
    await this.o.audio.quiet()
    if (!live()) return
    const arrival = this.o.audio.playSfx('new-sum')
    if (cur.demo || cur.missing) {
      const hand = cur.demo ? this.o.engine.demoHand('drag', cur.content.rightLane, DEMO_HAND_MS) : Promise.resolve()
      if (cur.missing) this.o.engine.pulseRing(true)
      await arrival
      await this.o.sleeper.sleep(SFX_TO_VOICE_MS)
      if (!live()) return
      await Promise.all([this.o.audio.say(cur.demo ? 'demo' : 'missing'), hand])
      if (!live()) return
      if (cur.missing) {
        this.o.engine.pulseRing(false)
        this.o.save.markHeard('missing')
      }
    }
    this.o.engine.setInput(true)
    this.o.engine.resume()
    this.set({ phase: 'flight' })
  }

  /** he rests under the right planet: the zoom tip, at most TIP_TIMES (the planets stop so no round sound falls on the line) */
  private async zoomTip(): Promise<void> {
    const cur = this.cur
    if (!cur || this.view.phase !== 'flight' || this.view.paused || (this.o.save.get().heard['zoom-tip'] ?? 0) >= TIP_TIMES) return
    const my = this.epoch
    this.o.engine.freeze()
    this.set({ phase: 'tip' })
    const ended = new Promise<boolean>((r) => { this.tipEnd = () => r(true) })
    const shown = Promise.all([this.o.engine.demoHand('flick', cur.content.rightLane, TIP_HAND_MS), this.o.audio.say('zoom-tip')]).then(() => true)
    await Promise.race([shown, ended])
    if (my !== this.epoch || this.dead) return
    this.endTip(true)
  }

  /** the tip ends (its line and hand done, or he touched); `shown`: it counts as one of its TIP_TIMES */
  private endTip(shown: boolean) {
    if (this.view.phase !== 'tip') return
    this.tipEnd?.()
    this.tipEnd = null
    if (shown) this.o.save.markHeard('zoom-tip')
    if (this.view.paused) return
    this.o.engine.resume()
    this.set({ phase: 'flight' })
  }

  /** any touch or key: a tip goes away at once (rule: a hint goes away when the child acts); a flick also zooms */
  private touched() {
    if (this.view.phase !== 'tip') return
    this.o.audio.stopVoice()
    this.endTip(true)
  }

  private roundEnded(r: RoundResult) {
    const cur = this.cur
    if (!cur || !this.inRound || this.dead || !this.running) return
    this.inRound = false
    this.epoch++
    const s = this.o.save.get()
    const { opened } = this.o.save.recordRound(cur.item, r, { demo: cur.demo })
    this.o.track('round', {
      item: cur.item.id, labels: cur.content.labels, startLane: this.shipLane, endLane: r.lane, number: r.number, result: r.result,
      end: r.end, lastLaneMs: r.lastLaneMs, endMs: r.endMs, arrivalMs: arrivalInForce(s.speed, s.settings.arrival), rung: cur.rung,
      level: this.run.level, ship: s.ship, ...(cur.demo ? { demo: true } : {}),
    })
    if (opened) this.o.track('rung', { rung: opened })
    if (cur.demo) this.o.save.markHeard('demo')
    this.shipLane = r.lane
    const { run, levelDone, over } = applyResult(this.run, r)
    this.run = run
    this.setHud()
    if (over) return this.endRun()
    if (levelDone) return this.levelDone()
    void this.nextRound()
  }

  private levelDone() {
    const newShips = this.o.save.unlockShips(this.run.level + 1)
    this.o.track('level-done', { level: this.run.level, points: this.run.points })
    for (const n of newShips) this.o.track('ship', { ship: n })
    this.set({ phase: 'between' })
    this.o.onLevelDone({ level: this.run.level, points: this.run.points, newShips })
  }

  private endRun() {
    this.running = false
    const { newBest } = this.o.save.endRun(this.run.points)
    const best = this.o.save.get().best
    this.o.track('run-end', { points: this.run.points, levels: this.run.level, best })
    this.set({ phase: 'between' })
    this.o.onEnd({ points: this.run.points, newBest, best, level: this.run.level })
  }

  private cutResult(): RoundResult {
    return { result: 'timeout', end: 'arrival', lane: this.shipLane, number: 0, points: 0, lastLaneMs: null, endMs: 0, underMs: null, startedUnder: false }
  }
}

/** his most frequent wrong pick for an item, as a number */
function confusionOf(picks: Record<string, number> | undefined): number | undefined {
  let best: [string, number] | undefined
  for (const e of Object.entries(picks ?? {})) if (!best || e[1] > best[1]) best = e
  return best ? Number(best[0]) : undefined
}
