// Space Cat's play flow as a framework-free controller (as Book 2's RunController): it takes each round from the ladder,
// hands it to the canvas engine, runs the demo, the zoom tip, the missing-number line and the intros of the new kinds
// with their glows, records each round, and calls the screens' callbacks at a level's end and the run's end. Every wait
// goes through the Sleeper (ADR 0005); the rules that need no time are in logic/. usePlay.ts is its thin React bridge.
import type { Rng } from '../shared/adaptive'
import type { Sleeper } from '../shared/sleeper'
import type { Track } from '../parent/types'
import { AGAIN_AFTER, INTRO_CUES, INTRO_LINE_MS, INTRO_TIMES, introMistake, introOf, type IntroId } from './audio/intros'
import type * as SpaceCatAudio from './audio/spaceCatAudio'
import type { Cue, Engine, Hud, PodsWhen } from './canvas/engine'
import { hasPods, makeRound, type RoundContent } from './content'
import { itemById, itemsOfRung, type Item } from './logic/facts'
import { isFast } from './logic/fast'
import { frontier, type LadderEvent, type Part } from './logic/ladder/index'
import { rungDef, type RungId } from './logic/rungs'
import type { RoundResult } from './logic/round'
import { RUN_START, applyResult, nextLevel, type Run } from './logic/run'
import { arrivalInForce, speedOfBand } from './logic/speed'
import type { SpaceCatSavePort } from './savePort'

/** the demo round's sum (spec *The first time*) */
export const DEMO_ITEM = '1+1=2/c'
/** the demo hand drags to the right planet and back in this long; the zoom tip's flick shows this long */
export const DEMO_HAND_MS = 3200, TIP_HAND_MS = 2400
/** the zoom tip and the missing-number line (of sums; of jump rows, its own count) show at most this many times */
export const TIP_TIMES = 2, MISSING_TIMES = 2
/** the equal-groups pods show from the start on the first this many tallied rounds of T1, and of T2 (the design) */
export const T1_POD_ROUNDS = 5, T2_POD_ROUNDS = 2
/** a voice line starts this long after the effect before it (spec *Voice*: about 0.4 s) */
export const SFX_TO_VOICE_MS = 400
/** the ship starts in this lane in a new run */
const START_LANE = 1

export interface LevelDoneInfo { level: number; points: number; newShips: (2 | 3)[] }
export interface EndInfo { points: number; newBest: boolean; best: number; level: number }

export interface PlayOpts {
  engine: Engine
  audio: Pick<typeof SpaceCatAudio, 'say' | 'hasLine' | 'playSfx' | 'quiet' | 'stopAll' | 'stopVoice' | 'startTune' | 'stopTune'>
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

/**
 * demo: the first round's hand and line; tip: the zoom tip; missing: the missing-number line; intro: an intro line of a
 * new kind; between: a level done or the end
 */
export type PlayPhase = 'demo' | 'tip' | 'missing' | 'intro' | 'flight' | 'between'
export interface PlayView { paused: boolean; hud: Hud; phase: PlayPhase }

/**
 * The line a round says: the missing-number line (while he already plays; counted in `heard` under `count`), or an intro
 * (before the planets move).
 * An intro: `first` (one of its first INTRO_TIMES), `again` (after AGAIN_AFTER of its mistake today), `silent` (no take:
 * its glows play on their own timeline and nothing is counted).
 */
type Say =
  | { line: 'missing'; count: 'missing' | 'missing-jumps' }
  | { line: IntroId; first: boolean; again: boolean; silent: boolean }

interface Current { item: Item; content: RoundContent; demo: boolean; say?: Say; part: Part }

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
  /** the silent intros played in this run (a line with no take plays its glows at most INTRO_TIMES a run) */
  private silentPlays: Partial<Record<IntroId, number>> = {}

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
    this.silentPlays = {}
    this.o.setRun?.(s.runs + 1)
    const { events, playDay } = this.o.save.beginRun()
    const at = frontier(this.o.save.get().ladder, s.settings)
    this.o.track('run-start', { ship: s.ship, rung: at, frontier: at, playDay })
    this.trackLadder(events)
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
      this.o.track('round', {
        item: c.item.id, labels: c.content.labels, rung: c.item.rung, kind: c.item.kind, part: c.part, level: this.run.level, ship: this.o.save.get().ship, cut: true,
      })
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
    const taken = demo ? { item: itemById(DEMO_ITEM)!, part: 'frontier' as Part } : this.o.save.takeRound(this.o.rng)
    const say = demo ? undefined : this.sayOf(taken.item)
    // the times and divide intros show the groups: their round is a fact whose dots fit (the design: only to 36)
    const item = say?.line === 'times' || say?.line === 'divide' ? withPods(taken.item, say.line, this.o.rng) : taken.item
    const { part } = taken
    const content = makeRound(this.o.rng, item, this.shipLane, confusionOf(s.items[item.id]?.picks))
    if (say && say.line !== 'missing' && say.silent) this.silentPlays[say.line] = (this.silentPlays[say.line] ?? 0) + 1
    const cur: Current = { item, content, demo, say, part }
    this.cur = cur
    const pods: PodsWhen = say?.line === 'times' || say?.line === 'divide' ? 'cue' : podsFromStart(item, s.items) ? 'start' : 'mistake'
    this.o.engine.play(content, arrivalInForce(speedOfBand(s.speed, rungDef(item.rung).band), s.settings.arrival), { frozen: true, pods })
    return this.begin(cur)
  }

  /**
   * The line this round says. A jump row with its ring not last: the missing-number line, its first MISSING_TIMES (its
   * own count). A round of a new kind: its intro, the first INTRO_TIMES heard, or again after AGAIN_AFTER of its mistake
   * on this play day (once a day); a silent intro at most INTRO_TIMES a run. A sum with its ring not at the end: the
   * missing-number line, its first MISSING_TIMES.
   */
  private sayOf(item: Item): Say | undefined {
    const s = this.o.save.get()
    const heard = (id: string) => s.heard[id] ?? 0
    if (item.kind === 'jumps' && item.hole !== 3 && heard('missing-jumps') < MISSING_TIMES) return { line: 'missing', count: 'missing-jumps' }
    const id = introOf(item)
    if (id) {
      const today = s.intro.day === s.ladder.day
      const first = heard(id) < INTRO_TIMES
      const again = today && (s.intro.mistakes[id] ?? 0) >= AGAIN_AFTER && !s.intro.again.includes(id)
      const silent = !this.o.audio.hasLine(id)
      if ((first || again) && (!silent || (this.silentPlays[id] ?? 0) < INTRO_TIMES)) return { line: id, first, again, silent }
    }
    if (item.kind === 'sum' && item.hole !== 'c' && heard('missing') < MISSING_TIMES) return { line: 'missing', count: 'missing' }
    return undefined
  }

  /**
   * A round starts (again, after a pause: the engine has restarted it). The planets stand still until the voice and the
   * last effect have ended (a jump row: and its numbers have hopped in). An intro plays here, before the planets move
   * (the design): the round stays still, with no arrival timer, until its line and all its cues are done. Then the
   * arrival sound plays and the planets move with his touches on. The demo or the missing-number line comes 0.4 s after
   * the arrival sound and is spoken while he already plays.
   */
  private async begin(cur: Current): Promise<void> {
    const my = ++this.epoch
    const live = () => my === this.epoch && !this.dead && this.cur === cur
    this.inRound = true
    this.o.engine.setInput(false)
    const say = cur.say
    this.set({ phase: cur.demo ? 'demo' : say?.line === 'missing' ? 'missing' : say ? 'intro' : 'flight' })
    await this.o.audio.quiet()
    if (!live()) return
    // the numbers of a jump row hop in on the engine's own clock while the planets stand still
    if (cur.item.kind === 'jumps') {
      await this.o.engine.boxIn()
      if (!live()) return
    }
    if (!cur.demo && say && say.line !== 'missing') {
      const heard = await this.intro(say.line, say.silent, live)
      if (!live()) return
      if (heard && say.first) this.o.save.markHeard(say.line)
      if (heard && say.again) this.o.save.markIntroAgain(say.line)
    }
    const arrival = this.o.audio.playSfx('new-sum')
    // the planets move and his touches work at once: he may start while the instruction is spoken. The line is never
    // cut; a line that wants to start behind it waits in the voice queue (a round's arrival sound waits for `quiet()`).
    this.o.engine.setInput(true)
    this.o.engine.resume()
    if (cur.demo || say?.line === 'missing') void this.instruct(cur, arrival, live)
    else this.set({ phase: 'flight' })
  }

  /** the demo hand or the missing-number ring, and the line, while the round already runs */
  private async instruct(cur: Current, arrival: Promise<void>, live: () => boolean): Promise<void> {
    const say = cur.say?.line === 'missing' ? cur.say : undefined
    const hand = cur.demo ? this.o.engine.demoHand('drag', cur.content.rightLane, DEMO_HAND_MS) : Promise.resolve()
    if (say) this.o.engine.pulseRing(true)
    await arrival
    await this.o.sleeper.sleep(SFX_TO_VOICE_MS)
    // the round ended or he left in the meantime: the line stays unsaid
    const heard = live() ? await this.o.audio.say(cur.demo ? 'demo' : 'missing') : false
    await hand
    if (say) {
      this.o.engine.pulseRing(false)
      if (heard) this.o.save.markHeard(say.count)
    }
    if (live() && this.view.phase !== 'tip') this.set({ phase: 'flight' })
  }

  /**
   * An intro line with its glows, timed from the line's start (INTRO_CUES); true when it was heard. The glows always run
   * the take's whole timeline: a line that ends early (or never starts) waits out the rest, so every cue shows. A line
   * with no take: the glows alone, from now, and false (nothing is counted).
   */
  private async intro(id: IntroId, silent: boolean, live: () => boolean): Promise<boolean> {
    if (!live()) return false
    if (silent) {
      const end = this.cueTimeline(id, live)
      await this.o.sleeper.sleep(INTRO_LINE_MS[id])
      end()
      return false
    }
    const timeline = { end: null as (() => void) | null, at: 0 }
    const heard = await this.o.audio.say(id, { onStart: () => { timeline.at = this.o.sleeper.now(); timeline.end = this.cueTimeline(id, live) } })
    if (live()) {
      if (!timeline.end) { timeline.at = this.o.sleeper.now(); timeline.end = this.cueTimeline(id, live) }
      const left = timeline.at + INTRO_LINE_MS[id] - this.o.sleeper.now()
      if (left > 0) await this.o.sleeper.sleep(left)
    }
    timeline.end?.()
    return heard
  }

  /** runs an intro's cues from now: each glows until the next one; the returned function ends the last (and the rest) */
  private cueTimeline(id: IntroId, live: () => boolean): () => void {
    let on: Cue | null = null
    let done = false
    const off = () => {
      if (on && live()) this.o.engine.cue(on, false)
      on = null
    }
    void (async () => {
      let t = 0
      for (const c of INTRO_CUES[id]) {
        await this.o.sleeper.sleep(c.at - t)
        t = c.at
        // the round ended (the next play clears every cue) or the line did
        if (done || !live()) return
        off()
        this.o.engine.cue(c.cue, true)
        on = c.cue
      }
    })()
    return () => {
      done = true
      off()
    }
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
    const band = speedOfBand(s.speed, rungDef(cur.item.rung).band)
    const arrivalMs = arrivalInForce(band, s.settings.arrival)
    const fast = isFast(r, band, arrivalMs)
    const { events } = this.o.save.recordRound(cur.item, r, { demo: cur.demo, part: cur.part, fast })
    this.o.track('round', {
      item: cur.item.id, labels: cur.content.labels, startLane: this.shipLane, endLane: r.lane, number: numberOf(r.number), result: r.result,
      end: r.end, lastLaneMs: r.lastLaneMs, endMs: r.endMs, arrivalMs, rung: cur.item.rung, kind: cur.item.kind, part: cur.part, fast,
      level: this.run.level, ship: s.ship, ...(cur.demo ? { demo: true } : {}),
    })
    this.trackLadder(events)
    if (cur.demo) this.o.save.markHeard('demo')
    else if (r.result === 'wrong') {
      const mistake = introMistake(cur.item, r.number)
      if (mistake) this.o.save.noteIntroMistake(mistake)
    }
    this.shipLane = r.lane
    const { run, levelDone, over } = applyResult(this.run, r)
    this.run = run
    this.setHud()
    if (over) return this.endRun()
    if (levelDone) return this.levelDone()
    void this.nextRound()
  }

  /** the ladder's changes, one literal event name each (ADR 0007: the golden test finds every call site) */
  private trackLadder(events: LadderEvent[]) {
    for (const ev of events) {
      switch (ev.e) {
        case 'ladder':
          this.o.track('ladder', { rung: ev.rung, change: ev.change, ...(ev.by ? { by: ev.by } : {}), ...(ev.days !== undefined ? { days: ev.days } : {}) })
          break
        case 'placement':
          this.o.track('placement', { phase: ev.phase, kind: ev.kind, probes: ev.probes, mistakes: ev.mistakes, frontier: ev.frontier })
          break
        case 'warmup':
          this.o.track('warmup', { rung: ev.rung, how: ev.how, rounds: ev.rounds })
          break
      }
    }
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
    return { result: 'timeout', end: 'arrival', lane: this.shipLane, number: '', points: 0, lastLaneMs: null, endMs: 0, underMs: null, startedUnder: false }
  }
}

/** the equal-groups pods from the round's start: the first T1_POD_ROUNDS tallied rounds of T1, T2_POD_ROUNDS of T2 */
function podsFromStart(it: Item, items: Record<string, { seen: number }>): boolean {
  const max = it.rung === 'T1' ? T1_POD_ROUNDS : it.rung === 'T2' ? T2_POD_ROUNDS : 0
  return max > 0 && talliedOf(it.rung, items) < max
}

/**
 * An intro round's item: this one when its groups fit on the screen, else a random item of its rung with the same intro
 * whose groups fit (none such: this one, and the intro plays without its groups)
 */
function withPods(it: Item, id: IntroId, rng: Rng): Item {
  if (hasPods(it)) return it
  const fit = itemsOfRung(it.rung).filter((x) => introOf(x) === id && hasPods(x))
  return fit.length ? fit[Math.floor(rng() * fit.length)] : it
}

/** the tallied rounds of a rung's items */
function talliedOf(rung: RungId, items: Record<string, { seen: number }>): number {
  let n = 0
  for (const [id, st] of Object.entries(items)) if (itemById(id)?.rung === rung) n += st.seen
  return n
}

/** his most frequent wrong pick for an item, as the planet showed it (digits, or a sign) */
function confusionOf(picks: Record<string, number> | undefined): string | undefined {
  let best: [string, number] | undefined
  for (const e of Object.entries(picks ?? {})) if (!best || e[1] > best[1]) best = e
  return best?.[0]
}

/** the telemetry keeps a number for a numeric label, else the sign string */
const numberOf = (label: string): number | string => (/^\d+$/.test(label) ? Number(label) : label)
