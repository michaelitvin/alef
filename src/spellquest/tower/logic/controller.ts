// The first duel's flow (Book 2's tower), framework-free. The reducer (reducer.ts) owns the rules; this controller owns
// time: announcements, spoken instructions, clue-then-clock, the outcome's effects and speech, pause, and stats.
// Pacing rule: the next monster appears only after the effects AND every wizard line have finished (+500 ms).
//
// React reads `getView()` through `subscribe()` (src/hooks/useDuelGame.ts). The state changes as soon as an action is
// dispatched; the reactions to a change (spawn the next monster, run the clock, play an outcome) run once the current
// call is over (one React commit), or, with `reactOnCommit`, when the hook calls commit() after React rendered it.
import type { Choice, DuelState, IconName, Next, Rng, Round } from '../types'
import type { BlendPart, BlendPlan } from '../../course/types'
import { duelReducer, initialDuelState, type DuelAction } from './reducer'
import { predictedMistakeRate, type MakeRoundOpts } from './rounds'
import { MEGA_MAX, bossFor, keyOf, newMonsterAt, nextPace, pickEffect, unlockedMonsters } from './rules'
import { feedbackPlan, nextBossStart, type FeedbackPlan } from './flow'
import { makeFxPicker, type FxStyle } from './fxStyle'
import { EFFECT_PRESETS } from './effects'
import { lineAsset, muteDuelAudio, playLine, playSfx, setDuelAudioLog, stopAllLines, unlockDuelAudio } from './duelAudio'
import { HEBREW_TOWER, type TowerContent } from './content'
import { progressTallies, type DuelTallies } from './tallies'
import type { LineCue } from '../assets/lineCues'
import { MONSTERS, WORD_PICTURE } from '../assets/sprites'
import { BLEND_GAP_MS, playUnitsThenWord, scheduleBlend } from '../../../shared/blendSchedule'
import { realSleeper, type Cancel, type Sleeper } from '../../../shared/sleeper'

/** What the announcement banner shows while the wizard speaks (rendered by the tower). */
export type BannerVisual = { icons: IconName[] } | { sprite: string }

/** Playtest: lines ran into each other (intro → instruction); a beat of silence between consecutive lines. */
const LINE_GAP_MS = 800

/**
 * Book 2's run plays the duel as one of its screens (spec: one duel, Part 3): the run owns the hearts (each answer
 * is reported; a מגה kill is not an answer: it goes to `onMega`, and it is kept out of the mastery data), a fixed visit
 * of `waves` waves from `wave` (or one boss), no session or run-end records (the rounds, confusions and pace are still
 * recorded: the adaptive data), no duel music, and no own visibility pause (the run pauses it through pause()/resume()).
 * The intro and the screen explanations play once ever: `seen` / `onSeen` keep them (keys 'tower-intro' and
 * 'tower-screen-<key>').
 */
export interface DuelEmbedded {
  wave: number
  waves: number
  boss: boolean
  seen: string[]
  onSeen: (key: string) => void
  /** a hit → 'right'; a miss or a timeout → 'wrong' (the forgiven twin is not an answer); 'over' stops after its feedback */
  onAnswer: (r: 'right' | 'wrong', markId: string) => 'on' | 'over'
  /** set: called instead of onAnswer, with the round answered (a course whose tower answers count: Course.tower.facts) */
  onAnswerRound?: (r: 'right' | 'wrong', round: Round, helped?: true) => 'on' | 'over'
  /**
   * a מגה kill (the parent brought it back, 2026-11-14): not reading, so no answer for the run (no star, no streak, no
   * heart); the run tracks it on its own
   */
  onMega?: (markId: string) => void
  /** no מגה spell in this visit (a placement check has no help): never announced, a lightning tap does nothing */
  megaOff?: boolean
  /** the מגה charge at the visit's start (the run keeps it from its last visit) */
  mega?: number
  /** the מגה charge changed: the run keeps it for its next visit */
  onCharge?: (mega: number) => void
  /** the visit is over (its waves, the boss's defeat, or the run's hearts ran out): the last wave played */
  onDone: (lastWave: number) => void
  /** the gallery: nothing is recorded */
  dry?: boolean
  /**
   * monsters whose introduction a boss visit skipped (rules.skippedMonsters): each is introduced at the start of a wave
   * that has no new monster of its own, and never appears before that; `onIntroduced` is told once its line was said
   */
  owed?: string[]
  onIntroduced?: (id: string) => void
  /** the placement check (Book 2's stage 0): every mark with no recent answer is asked first (pickTarget's cover) */
  placement?: boolean
  /**
   * a wave of the visit ended and another one would start: true ends the visit there (onDone with that wave), e.g. when
   * stage 0 has passed in the middle of a visit
   */
  onWaveEnd?: (wave: number) => boolean
}

/**
 * Where the duel's events go: Book 2's log (ADR 0004). The controller adds `via: 'tower'` and its own visit counter
 * `visit` to every event, and never sets the log's run number (that is Book 2's run).
 */
export interface DuelTelemetry {
  track: (e: string, data?: Record<string, unknown>) => void
  flush: () => void
}

/** The duel's audio (duelAudio.ts by default; it plays through the device output's player, a fake one in tests). */
export interface DuelAudio {
  /** `onHeard`: the file really plays, with its length in ms when known (the English hint's lights); never for a missing file */
  playLine(id: string, onCue?: (c: LineCue) => void, onHeard?: (ms: number | null) => void): Promise<void>
  playSfx(name: Parameters<typeof playSfx>[0], power?: number): Promise<void>
  lineAsset(id: string): { id: string; file: string; url: string | null }
  stopAllLines(): void
  mute(on: boolean): void
  unlock(): void
  /** where the kit's own events (voice-fallback) go */
  setLog(log: { track(e: string, data?: Record<string, unknown>): void } | null): void
}

/** duelAudio.ts, looked up on each call (a test may replace the module) */
const duelAudio: DuelAudio = {
  playLine: (id, onCue) => playLine(id, onCue),
  playSfx: (name, power) => playSfx(name, power),
  lineAsset: (id) => lineAsset(id),
  stopAllLines: () => stopAllLines(),
  mute: (on) => muteDuelAudio(on),
  unlock: () => unlockDuelAudio(),
  setLog: (log) => setDuelAudioLog(log),
}

export interface DuelOpts {
  /** read on every use: the latest callbacks of the run (the hook passes its newest props) */
  embedded: DuelEmbedded | (() => DuelEmbedded)
  telemetry: DuelTelemetry | (() => DuelTelemetry)
  rng?: Rng
  /** verify/test builds only: fixed monster walk time */
  walkOverride?: number
  /** injectable round factory (tests); default: the content's */
  makeRound?: (o: MakeRoundOpts) => Round
  /** the course's rounds, runes and spoken parts (default: the Hebrew tower) */
  content?: TowerContent
  /** where the answers are read from and recorded (default: the first duel's save, alef-progress) */
  tallies?: DuelTallies
  /** the time the flow waits on (default: the browser's timers) */
  sleeper?: Sleeper
  audio?: DuelAudio
  /**
   * the reactions wait for commit() (the hook calls it in an effect after each render of a new state), so that they run
   * when React's effects ran when this flow was a hook; otherwise they run as soon as the call that changed the state
   * is over
   */
  reactOnCommit?: boolean
}

export interface DuelView {
  state: DuelState
  banner: BannerVisual | null
  shake: { power: number; at: number } | null
  /** What the wizard is naming right now ("the picture", "the marks"…): the tower makes it glow. */
  cue: LineCue | null
  /** The mega button shows only once the wizard says "tap the lightning" (בָּרָק). */
  lightning: boolean
  /** A streak being celebrated (every 5 hits in a row): the tower shows the burst. */
  celebrate: { combo: number; at: number } | null
  /** Which part of the result the wizard is saying now: the banner animates it. */
  speaking: 'sound' | 'name' | 'word' | null
  /** Things not on screen yet: each appears when the wizard names it ("…the tower", "…the picture", "…the marks"). */
  hidden: LineCue[]
  /** The look of the current hit (projectile, burst, exit, colours, cast), dealt so hits don't repeat. */
  fx: FxStyle | null
  /** How the current result is fed back (full recap / sound + name / sound only); the tower shows the banner from it. */
  feedback: FeedbackPlan | null
  /** the `?` is there: the content has a hint and this round is a word round (English). Never in the Hebrew tower or the placement. */
  canHint: boolean
  /** the hint's blend plays: the word's pieces, and the units lit so far (BlendWord) */
  blend: { parts: BlendPart[]; lit: number[] } | null
  /** the walk is held while the hint's blend plays: the monster stands where it is, and the time left is kept */
  held: boolean
}

const TOWER_INTRO = 'tower-intro'
/** the feedback's parts in turn: what the banner animates, and the beat before each (sound → name → word) */
const FEEDBACK_SPEAKING = ['sound', 'name', 'word'] as const
const FEEDBACK_GAP_MS = [0, 250, 200]
const towerScreenKey = (key: string) => `tower-screen-${key}`
type Spawn = Extract<Next, { kind: 'spawn' }>

export class DuelController {
  private readonly rng: Rng
  private readonly walkOverride?: number
  private readonly makeRound: (o: MakeRoundOpts) => Round
  private readonly time: Sleeper
  private readonly audio: DuelAudio
  private readonly embOpt: DuelOpts['embedded']
  private readonly telOpt: DuelOpts['telemetry']
  private readonly content: TowerContent
  private readonly tallies: DuelTallies
  private readonly onCommit: boolean

  private view: DuelView = {
    state: initialDuelState, banner: null, shake: null, cue: null, lightning: false, celebrate: null, speaking: null,
    hidden: [], fx: null, feedback: null, canHint: false, blend: null, held: false,
  }
  private listeners = new Set<() => void>()
  /** the state the reactions last ran on (React's last commit) */
  private committed: DuelState = initialDuelState
  private depth = 0
  private flushing = false

  /** the run's hearts ran out: nothing spawns after this round's feedback */
  private over = false
  private done = false
  private nextFx: (() => FxStyle) | null = null
  private paused = false
  private runId = 0 // bumps on start/destroy: stale async continuations stop
  private roundToken = 0 // bumps on every begin(): stale per-round continuations stop
  private nextId = 1
  private introDue = false
  /** the last wave whose start was handled (an owed monster's introduction comes at a wave's start) */
  private waveStart = -1
  /** owed monsters introduced in this visit */
  private introduced = new Set<string>()
  /** the owed monster introduced at this wave's start: the wave's first monster */
  private owedNow: { wave: number; id: string } | null = null
  private spawnedAt = 0
  private walkStartedAt = 0
  private answeredRound = -1 // guards double taps
  private twinRound = -1
  private twinKey: string | null = null
  private almost: Promise<void> = Promise.resolve() // "almost" + twin name; the outcome speech waits for it
  private megaAnnounced = false
  private marksThisRun = new Set<string>() // marks already answered this game (the first time gets the full recap)
  private bossStart = 0 // a boss fight continues from where the boss stood
  private megaQueued = false // lightning tapped between monsters: cast on the next one
  private cueTimer: Cancel = () => {}
  private clock: Cancel = () => {}
  private pendingSpawn: Spawn | null = null
  private resumeAdvance = false
  /** the hint's blends play: a new number ends the ones before (their lights) */
  private blendNo = 0
  /** the hint blended the words in this round: a right answer is helped, not right */
  private hinted = false
  /** when the walk was held for the hint's blend (null: it walks); the time held is given back to the walk */
  private holdAt: number | null = null
  /** the word misses of this visit (every second one blends the right word in its feedback) */
  private wordMisses = 0

  constructor(opts: DuelOpts) {
    this.rng = opts.rng ?? Math.random
    this.walkOverride = opts.walkOverride
    this.content = opts.content ?? HEBREW_TOWER
    this.tallies = opts.tallies ?? progressTallies
    this.makeRound = opts.makeRound ?? this.content.makeRound
    this.time = opts.sleeper ?? realSleeper
    this.audio = opts.audio ?? duelAudio
    this.embOpt = opts.embedded
    this.telOpt = opts.telemetry
    this.onCommit = !!opts.reactOnCommit
  }

  subscribe = (f: () => void) => { this.listeners.add(f); return () => { this.listeners.delete(f) } }
  getView = () => this.view

  private get emb(): DuelEmbedded {
    return typeof this.embOpt === 'function' ? this.embOpt() : this.embOpt
  }
  /** the log the visit writes to; every event says it came from the tower, and which visit of this controller */
  private track(e: string, data: Record<string, unknown> = {}) {
    const t = typeof this.telOpt === 'function' ? this.telOpt() : this.telOpt
    t.track(e, { ...data, via: 'tower', visit: this.runId })
  }
  private flushLog() {
    const t = typeof this.telOpt === 'function' ? this.telOpt() : this.telOpt
    t.flush()
  }

  private get state() { return this.view.state }
  private set(patch: Partial<DuelView>) {
    this.view = { ...this.view, ...patch }
    this.listeners.forEach((f) => f())
  }

  // ---- dispatch and the reactions (what the hook's effects did) ----

  private dispatch(a: DuelAction) {
    const s = duelReducer(this.state, a)
    if (s !== this.state) this.set({ state: s })
    if (this.depth === 0 && !this.onCommit) this.flush()
  }
  /** runs `fn`; the reactions to what it dispatched run once, at the end (one React commit) */
  private batch<T>(fn: () => T): T {
    this.depth++
    try {
      return fn()
    } finally {
      this.depth--
      if (this.depth === 0 && !this.onCommit) this.flush()
    }
  }
  /** React rendered the newest state (`reactOnCommit`): its reactions run now */
  commit() {
    this.flush()
  }
  private flush() {
    if (this.flushing) return
    this.flushing = true
    try {
      while (this.committed !== this.state) {
        const prev = this.committed
        const s = this.state
        this.committed = s
        this.depth++
        try {
          this.react(prev, s)
        } finally {
          this.depth--
        }
      }
    } finally {
      this.flushing = false
    }
  }
  private react(p: DuelState, s: DuelState) {
    if (s.next !== p.next) this.onNext(s)
    if (s.round !== p.round || s.walking !== p.walking || s.paused !== p.paused || s.outcome !== p.outcome || s.phase !== p.phase) this.runClock(s)
    if (s.outcome !== p.outcome) this.onOutcome(s)
    // a lightning tap queued between monsters fires as soon as the next one is on the field
    if ((s.round !== p.round || s.outcome !== p.outcome || s.paused !== p.paused || s.preview !== p.preview)
      && this.megaQueued && s.round && !s.outcome && !s.paused && !s.preview) this.megaCast()
    if (s.mega !== p.mega || s.phase !== p.phase) {
      // Book 2's run keeps the charge for its next visit
      if (s.phase === 'playing') this.emb.onCharge?.(s.mega)
      if (s.mega < MEGA_MAX) {
        this.set({ lightning: false })
        this.megaQueued = false
      }
    }
  }

  /** The reducer asks for the next step. */
  private onNext(s: DuelState) {
    const next = s.next
    if (!next) return
    const e = this.emb
    // a visit of Book 2's run: its waves are done (or its boss is beaten): no next monster
    if (next.wave >= e.wave + (e.boss ? 1 : e.waves)) return this.finish(next.wave - 1)
    // a wave ended in the middle of the visit: the run may end the visit here
    if (this.waveStart >= 0 && next.wave > this.waveStart && e.onWaveEnd?.(next.wave - 1)) return this.finish(next.wave - 1)
    void this.spawn(next)
  }
  private finish(lastWave: number) {
    if (this.done) return
    this.done = true
    this.emb.onDone(lastWave)
  }

  /** The clock: a walking monster that reaches the tower is a miss. */
  private runClock(s: DuelState) {
    this.clock()
    this.clock = () => {}
    if (this.holdAt !== null) return // held for the hint's blend: it re-arms when the walk goes on
    const r = s.round
    if (!r || !s.walking || s.paused || s.outcome || s.phase !== 'playing') return
    const left = r.walkMs - (this.time.now() - this.walkStartedAt)
    this.clock = this.time.after(Math.max(0, left), () => this.dispatch({ type: 'TIMEOUT' }))
  }

  // ---- speech ----

  private onCue = (c: LineCue) => {
    const h = this.view.hidden
    this.set({ lightning: c === 'lightning' ? true : this.view.lightning, hidden: h.includes(c) ? h.filter((x) => x !== c) : h, cue: c })
    this.cueTimer()
    this.cueTimer = this.time.after(1500, () => this.set({ cue: null }))
  }

  /** Every voice line goes through here so telemetry knows exactly which asset played. */
  private say(id: string, cb?: (c: LineCue) => void, onHeard?: (ms: number | null) => void) {
    this.track('line', this.audio.lineAsset(id))
    return onHeard ? this.audio.playLine(id, cb, onHeard) : this.audio.playLine(id, cb)
  }

  /** the parts one after another (the first is said at once) */
  private sayAll(parts: string[]): Promise<void> {
    if (!parts.length) return Promise.resolve()
    let p = this.say(parts[0])
    for (const id of parts.slice(1)) p = p.then(() => this.say(id))
    return p
  }

  /**
   * Wizard feedback: the content's parts (Hebrew: sound → name → picture word), each highlighted as it is said, a beat
   * before each. The plan shortens it after confident answers (flow.ts).
   */
  private sayFeedback(parts: string[]): Promise<void> {
    if (!parts.length) return Promise.resolve()
    this.set({ speaking: FEEDBACK_SPEAKING[0] })
    let p = this.say(parts[0])
    // (at least two steps, so that the chain is as long as it always was)
    for (let i = 1; i < Math.max(3, parts.length); i++) {
      p = p.then(() => (i >= parts.length ? undefined : this.time.sleep(FEEDBACK_GAP_MS[i] ?? 200).then(() => {
        this.set({ speaking: FEEDBACK_SPEAKING[i] ?? 'word' })
        return this.say(parts[i])
      })))
    }
    return p.finally(() => this.set({ speaking: null }))
  }

  // Clues are said once, cleanly, by the narrator — the same verified lines as the feedback. (The monster voice
  // and its pitch-shifting were dropped after playtesting: they moaned.)
  private playClue(r: Round): Promise<void> {
    return this.sayAll(this.content.questionParts(r))
  }

  // ---- the round ----

  /** Show the monster; A/D walk at once, B/C after arrival sound → silence → clue. */
  private begin(r: Round, restart = false) {
    this.batch(() => {
      const token = ++this.roundToken
      this.almost = Promise.resolve()
      this.endBlend()
      this.hinted = false
      this.dispatch({ type: 'ROUND_READY', round: r })
      // (the Hebrew tower and the placement have no hint)
      const hint = (r.ask === 'name' || r.ask === 'word') && (this.content.hint?.(r).length ?? 0) > 0
      if (hint !== this.view.canHint) this.set({ canHint: hint })
      this.spawnedAt = this.time.now()
      this.walkStartedAt = this.time.now()
      const s = this.state
      // `hearts: null` in the events: the run owns the hearts (the log kept the field, which was always empty here)
      this.track('round', {
        round: r.id, restart, wave: s.wave, kills: s.kills, boss: r.boss, bossHp: s.bossHp, hearts: null,
        combo: s.combo, type: r.type, target: r.target.id, word: r.word.key, picture: r.picture ?? (r.type === 'A' ? WORD_PICTURE[r.word.key] : null),
        monster: r.monster, monsterSrc: MONSTERS[r.monster]?.src ?? null, walkMs: r.walkMs,
        pad: r.runes.map((m) => m.id), padWords: r.padWords.map((w) => w.key),
      })
      if (r.boss && !r.startFrac) {
        // a boss stomps in: the ground shakes
        this.time.after(280, () => {
          this.set({ shake: { power: 9, at: Date.now() } })
          void this.audio.playSfx('boom', 0.5)
        })
      }
      const arrived = r.startFrac ? Promise.resolve() : this.audio.playSfx('arrival')
      if (r.type === 'A' || r.type === 'D') return
      void arrived
        .then(() => this.time.sleep(450))
        .then(() => (token === this.roundToken && !this.paused ? this.playClue(r) : undefined))
        .then(() => {
          if (token !== this.roundToken || this.paused) return
          this.walkStartedAt = this.time.now()
          this.track('walk', { round: r.id, clueMs: Math.round(this.walkStartedAt - this.spawnedAt) })
          this.dispatch({ type: 'WALK_START' })
        })
    })
  }

  /** Announcement (if any) → new round → first-time instruction (if any) → begin. Holds while paused. */
  private async spawn(next: Spawn) {
    const run = this.runId
    const held = () => run !== this.runId || this.paused
    if (this.paused) return void (this.pendingSpawn = next)

    if (this.introDue) {
      // no banner: the wizard on the tower is the one speaking (a second wizard picture doubled him)
      await this.say('line-intro', this.onCue)
      this.set({ hidden: [] })
      await this.time.sleep(LINE_GAP_MS)
      if (run !== this.runId) return
      this.introDue = false
      this.emb.onSeen(TOWER_INTRO)
      if (held()) return void (this.pendingSpawn = next)
    }
    // a monster whose introduction a boss visit skipped is introduced at the start of a wave with no new monster of
    // its own
    const pendingOwed = () => (this.emb.owed ?? []).filter((id) => !this.introduced.has(id))
    let owed: string | null = null
    if (!next.boss && this.waveStart !== next.wave && !newMonsterAt(next.wave)) {
      owed = pendingOwed().find((id) => unlockedMonsters(next.wave).includes(id)) ?? null
    }
    const announce = owed ? 'new-monster' : next.announce
    if (announce) {
      const visual: BannerVisual =
        announce === 'boss' ? { sprite: bossFor(next.wave) }
        : announce === 'new-monster' ? { sprite: owed ?? newMonsterAt(next.wave) ?? 'fuzzy' }
        : { icons: ['swords'] }
      this.set({ banner: visual })
      this.track('announce', { kind: announce, wave: next.wave, ...(owed ? { owed } : {}) })
      await this.say(`line-${announce}`)
      this.set({ banner: null })
      // a pause during the line says it again after the resume (as for any announcement)
      if (held()) return void (this.pendingSpawn = next)
      this.waveStart = next.wave
      if (owed) {
        this.introduced.add(owed)
        this.owedNow = { wave: next.wave, id: owed }
        this.emb.onIntroduced?.(owed)
      }
      await this.time.sleep(LINE_GAP_MS)
      if (held()) return void (this.pendingSpawn = owed ? { ...next, announce: null } : next)
    }
    this.waveStart = next.wave

    const s = this.state
    const { byMark, confusions, recent } = this.tallies.read()
    const r = this.makeRound({
      id: this.nextId++, wave: next.wave, kills: s.kills, boss: next.boss, rng: this.rng,
      lifetime: byMark, recent, confusions,
      bossStart: next.boss ? this.bossStart : undefined, cover: !!this.emb.placement,
    })
    if (!r.boss) {
      const now = this.owedNow
      if (now && now.wave === next.wave) {
        // right after its "new monster!" comes that monster
        r.monster = now.id
        this.owedNow = null
      } else if (pendingOwed().includes(r.monster)) {
        // an owed monster never appears before its introduction
        const others = unlockedMonsters(next.wave).filter((id) => !pendingOwed().includes(id))
        r.monster = others[Math.floor(this.rng() * others.length) % Math.max(1, others.length)] ?? r.monster
      }
    }
    // adaptive pace, applied silently between monsters (a ?walk= override in test builds wins)
    r.walkMs = this.walkOverride ?? Math.round(r.walkMs * this.tallies.read().pace)

    const how = this.content.howLine(r)
    if (how && !s.seenScreens.includes(how.key)) {
      // no look/listen icon (playtest: not needed); the glow cues point at the picture, speaker and marks
      // the round is shown while it is explained; its parts appear as the wizard names them
      this.set({ hidden: how.cues })
      this.dispatch({ type: 'ROUND_PREVIEW', round: r })
      await this.say(how.id, this.onCue)
      this.set({ hidden: [], banner: null })
      if (held()) return void (this.pendingSpawn = { ...next, announce: null })
      this.dispatch({ type: 'SCREEN_EXPLAINED', key: how.key })
      this.emb.onSeen(towerScreenKey(how.key))
    }
    this.begin(r)
  }

  /** An outcome: record it, play effects and the wizard's lines, then advance. */
  private onOutcome(state: DuelState) {
    const o = state.outcome
    const r = state.round
    if (!o || !r || state.phase !== 'playing') return
    const token = this.roundToken
    const tallies = this.tallies
    const result = o.mega ? 'mega' : o.kind === 'hit' ? 'correct' : o.choiceKey ? 'wrong' : 'timeout'
    // how sure the answer was — measured before this round is recorded
    const before = tallies.read()
    const confidence = {
      firstThisRun: !this.marksThisRun.has(r.target.id),
      predicted: predictedMistakeRate(before.byMark[r.target.id], before.recent[r.target.id]),
      usedFrac: state.walking ? (this.time.now() - this.walkStartedAt) / r.walkMs : null,
      twin: state.twinTried !== null,
    }
    this.marksThisRun.add(r.target.id)
    const emb = this.emb
    const dry = !!emb.dry
    this.endBlend()
    // a right answer after the hint blended the word is helped: counted apart from right (the Hebrew tower never is)
    const helped = this.hinted && o.kind === 'hit' && !o.mega
    if (this.view.canHint) this.set({ canHint: false })
    // Book 2's run: a מגה kill is not reading (spec: count special results separately): its tally is kept, but it is no
    // right answer for the mastery data (`recent`) nor for the pace
    const megaInRun = o.mega
    // what the course says after the feedback (English: a new unit's introduction); the answer is the course's to keep.
    // A boss fight flows: the course hears it once, at the hit that beats the boss. Heard before the run records the
    // answer (onAnswerRound): the introduction reads the tallies as they were before this answer
    const heard = !dry && !megaInRun && (!r.boss || (o.kind === 'hit' && o.final))
    const after = heard ? this.content.answered?.(r, o.kind === 'hit') ?? [] : []
    if (!dry) {
      if (helped && tallies.recordDuelHelped) tallies.recordDuelHelped(r.target.id, r.type)
      else tallies.recordDuelRound(r.target.id, r.type, result, this.time.now() - this.spawnedAt, megaInRun ? { recent: false } : undefined)
    }
    // Book 2's run owns the hearts, the stars and the coins: each answer goes to it (a מגה kill is not an answer)
    if (megaInRun) emb.onMega?.(r.target.id)
    else {
      const res = o.kind === 'hit' ? 'right' : 'wrong'
      const verdict = emb.onAnswerRound ? (helped ? emb.onAnswerRound(res, r, true) : emb.onAnswerRound(res, r)) : emb.onAnswer(res, r.target.id)
      if (verdict === 'over') this.over = true
    }
    const now = this.time.now()
    const msWalk = state.walking || result === 'timeout' ? now - this.walkStartedAt : null
    const pace = nextPace(tallies.read().pace, { result, msWalk, walkMs: r.walkMs })
    if (r.boss) this.bossStart = o.final ? 0 : nextBossStart(r.startFrac ?? 0, msWalk, r.walkMs, result)
    const plan = feedbackPlan(r, o, confidence)
    // after every second word miss of the visit the feedback blends the right word instead of only saying it
    const wordRound = r.ask === 'name' || r.ask === 'word'
    const missPlans = o.kind === 'miss' && !megaInRun && wordRound ? this.content.hint?.(r) : undefined
    const blendRight = !!missPlans?.length && ++this.wordMisses % 2 === 0
    if (blendRight) this.track('blend-hint', { round: r.id, words: 1, by: 'miss' })
    this.set({ feedback: plan })
    if (!dry && !megaInRun) tallies.setDuelPace(pace)
    this.track('outcome', {
      pace, feedback: plan.say, predicted: Math.round(confidence.predicted * 1000) / 1000,
      round: r.id, result: helped ? 'helped' : result, choice: o.choiceKey, mega: o.mega, final: o.final, points: o.points, effect: o.effect,
      hearts: null, combo: state.combo, score: state.score, bossHp: state.bossHp,
      msShown: Math.round(now - this.spawnedAt), msWalk: Math.round(now - this.walkStartedAt),
    })

    const juice = EFFECT_PRESETS[o.effect]
    if (o.kind === 'hit') {
      const impact = 260 + juice.hitstopMs
      void this.audio.playSfx(o.mega ? 'mega' : 'cast')
      this.time.after(impact, () => {
        void this.audio.playSfx('boom', o.final ? juice.boom : juice.boom * 0.5)
        void this.audio.playSfx('sparkle')
        this.set({ shake: { power: o.final ? juice.shake : juice.shake * 0.4, at: Date.now() } })
      })
    } else {
      this.time.after(380, () => {
        void this.audio.playSfx('ouch')
        this.set({ shake: { power: 8, at: Date.now() } })
      })
    }
    if (o.mega) this.megaAnnounced = false
    // (in Book 2's run a מגה kill leaves the streak as it was: no second celebration of it)
    const comboLine = o.kind === 'hit' && !megaInRun && state.combo > 0 && state.combo % 5 === 0
    if (comboLine) this.track('combo', { round: r.id, combo: state.combo })
    const megaLine = o.kind === 'hit' && !o.mega && state.mega >= MEGA_MAX && !this.megaAnnounced && !emb.megaOff
    if (megaLine) this.megaAnnounced = true

    let recap = Promise.all([this.almost, this.time.sleep(o.kind === 'hit' ? 560 + juice.hitstopMs : 700)])
      // a defeated boss is congratulated first, then the usual recap
      .then(() => (r.boss && o.kind === 'hit' && o.final ? this.say('line-boss-win') : undefined))
      .then(() => (blendRight
        ? this.playBlends([missPlans![Math.max(0, r.runes.findIndex((m) => m.id === r.target.id))]], r.id)
        : this.sayFeedback(this.content.feedbackParts(r, plan))))
    if (after.length) recap = recap.then(() => this.sayAll(after))
    const speech = recap
      .then(() => {
        if (!comboLine) return
        this.set({ celebrate: { combo: state.combo, at: Date.now() } })
        void this.audio.playSfx('sparkle')
        return this.say('line-combo').then(() => this.set({ celebrate: null }))
      })
      .then(() => (megaLine ? this.say('line-mega', this.onCue) : undefined))
    void Promise.all([this.time.sleep(plan.waitMs), speech])
      .then(() => this.time.sleep(plan.tailMs))
      .then(() => {
        if (token !== this.roundToken) return
        if (this.over) {
          // the run's hearts ran out: the answer on the screen has finished; the run ends now
          this.finish(this.state.wave)
          return
        }
        if (this.paused) {
          this.resumeAdvance = true
          return
        }
        this.dispatch({ type: 'ADVANCE' })
      })
  }

  // ---- what the tower calls ----

  /** One visit: the intro if it was never heard, then the visit's first monster (or its boss). */
  start() {
    this.batch(() => {
      this.audio.unlock()
      this.audio.mute(false) // a run left while paused must not leave everything muted
      this.audio.setLog({ track: (e, data) => this.track(e, data) }) // the kit's voice-fallback events go to the visit's log
      const e = this.emb
      this.runId += 1
      this.track('run_start', { embedded: true, wave: e.wave, waves: e.waves, boss: e.boss })
      this.over = false
      this.done = false
      this.roundToken += 1
      this.paused = false
      this.pendingSpawn = null
      this.resumeAdvance = false
      this.introDue = !e.seen.includes(TOWER_INTRO)
      this.waveStart = -1
      this.introduced = new Set()
      this.owedNow = null
      this.megaAnnounced = false
      this.megaQueued = false
      this.bossStart = 0
      this.wordMisses = 0
      this.holdAt = null
      this.marksThisRun = new Set()
      // the intro names the tower: "…הַגֵּן עַל הַמִּגְדָּל"
      this.set({ lightning: false, cue: null, celebrate: null, hidden: this.introDue ? ['tower'] : [], banner: null })
      const seen = e.seen.filter((k) => k.startsWith(towerScreenKey(''))).map((k) => k.slice(towerScreenKey('').length))
      this.dispatch({ type: 'START_AT', wave: e.wave, boss: e.boss, seen, mega: e.mega })
    })
  }

  /** A tap on a rune or a picture. */
  choose(c: Choice) {
    this.batch(() => {
      const s = this.state
      const r = s.round
      if (!r || s.outcome || s.paused || s.preview || s.phase !== 'playing' || this.answeredRound === r.id) return
      if (this.twinRound === r.id && keyOf(c) === this.twinKey) return // same twin again: still forgiven
      this.stopBlend()
      const now = this.time.now()
      const pos = c.kind === 'rune' ? r.runes.findIndex((m) => m.id === c.mark.id) : r.padWords.findIndex((w) => w.group === c.group)
      const correct = this.content.isCorrect(r, c)
      const twin = this.content.isTwin(r, c)
      this.track('choice', {
        round: r.id, key: keyOf(c), pos, correct, twin: !correct && twin, walking: s.walking,
        msShown: Math.round(now - this.spawnedAt), msWalk: s.walking ? Math.round(now - this.walkStartedAt) : null,
      })
      const tallies = this.tallies
      if (!correct && twin && !s.twinTried && this.twinRound !== r.id) {
        // forgiven once: no heart, no combo break — hear which mark he tapped, then try again
        this.twinRound = r.id
        this.twinKey = keyOf(c)
        if (!this.emb.dry) {
          tallies.recordDuelTwin(r.target.id, r.type)
          tallies.recordDuelConfusion(r.target.id, keyOf(c))
        }
        const almost = this.content.twinParts(r, c)
        if (almost.length) this.almost = this.sayAll(almost)
        this.dispatch({ type: 'CHOOSE', choice: c, effect: 'gentle', verdict: { correct, twin } })
        return
      }
      this.answeredRound = r.id
      if (!correct && !this.emb.dry) tallies.recordDuelConfusion(r.target.id, keyOf(c))
      this.set({ fx: (this.nextFx ??= makeFxPicker(this.rng))() })
      const effect = pickEffect(this.rng, { final: !r.boss || s.bossHp <= 1, mega: false, boss: r.boss })
      this.dispatch({ type: 'CHOOSE', choice: c, effect, verdict: { correct, twin } })
    })
  }

  /**
   * The `?` (English word rounds): the words on the runes blend one after another, left to right: the word shows, its
   * voice plays, and each unit lights at its time from the voice's real start. The answer after it is helped. A touch on
   * an answer ends it. The monster keeps walking.
   */
  hint() {
    this.batch(() => {
      const s = this.state
      const r = s.round
      if (!this.view.canHint || !r || !s.walking || s.outcome || s.paused || s.preview || s.phase !== 'playing' || this.answeredRound === r.id) return
      const plans = this.content.hint?.(r) ?? []
      if (!plans.length) return
      this.hinted = true
      this.holdWalk()
      this.track('blend-hint', { round: r.id, words: plans.length, by: 'button' })
      void this.playBlends(plans, r.id).catch(() => {})
    })
  }

  /** the walk stops where it is while the blend plays (the answers stay open): its clock stops, the monster stands */
  private holdWalk() {
    if (this.holdAt !== null) return
    this.holdAt = this.time.now()
    this.clock()
    this.clock = () => {}
    this.set({ held: true })
  }
  /** the walk goes on with the time it had left: the time held is given back */
  private releaseWalk() {
    if (this.holdAt === null) return
    this.walkStartedAt += this.time.now() - this.holdAt
    this.holdAt = null
    this.set({ held: false })
    this.runClock(this.state)
  }

  /** the blend ends at once: its card, its lights, its voice; a held walk goes on */
  private endBlend() {
    this.blendNo++
    if (this.view.blend) this.set({ blend: null })
    this.releaseWalk()
  }
  /** a touch on an answer: a blend that plays goes away with its voice (the answer stays counted as helped) */
  private stopBlend() {
    if (!this.view.blend && this.holdAt === null) return
    this.endBlend()
    this.audio.stopAllLines()
  }

  /**
   * Plays blends one word after another. A missing clip (or a missing timing) never stalls it: the lights go on to the
   * plan's end. A newer blend, a touch, a pause or the end of the round ends it.
   */
  private async playBlends(plans: BlendPlan[], round: number) {
    const no = ++this.blendNo
    const token = this.roundToken
    const alive = () => token === this.roundToken && no === this.blendNo && this.state.round?.id === round
    const timers: Cancel[] = []
    try {
      for (let i = 0; i < plans.length && alive(); i++) {
        let plan = plans[i]
        if (i > 0) await this.time.sleep(BLEND_GAP_MS)
        if (!alive()) break
        this.set({ blend: { parts: plan.parts, lit: [] } })
        const light = (u: number) => () => {
          const b = this.view.blend
          if (alive() && b && !b.lit.includes(u)) this.set({ blend: { ...b, lit: [...b.lit, u] } })
        }
        if (plan.steps) {
          // units then word; a missing unit clip: the word's fallback blend (the normal word, the units in turn)
          const all = plan.parts.map((p) => p.unit).filter((u, k, a) => a.indexOf(u) === k)
          const done = await playUnitsThenWord(plan.steps, plan.audio[0], all, {
            say: (id, onHeard) => this.say(id, undefined, () => onHeard()),
            sleep: (ms) => this.time.sleep(ms),
            light: (us) => us.forEach((u) => light(u)()),
            alive,
          })
          if (done) continue
          this.set({ blend: { parts: plan.parts, lit: [] } })
          plan = plan.fallback ?? { ...plan, steps: undefined }
        }
        let started: number | null = null
        let total = plan.totalMs
        // from the voice's real start (its file plays); an even split is stretched to the clip's own length
        const start = (clipMs: number | null) => {
          started = this.time.now()
          const sch = scheduleBlend(plan, clipMs)
          total = sch.totalMs
          for (const l of sch.lights) timers.push(this.time.after(l.atMs, light(l.unit)))
        }
        for (let k = 0; k < plan.audio.length && alive(); k++) await this.say(plan.audio[k], undefined, k === 0 ? start : undefined)
        // a missing clip (or one that never played) ends at once: the lights run on the plan's own times, then it ends
        if (started === null && alive()) start(null)
        const left = started === null ? 0 : total - (this.time.now() - started)
        if (left > 0 && alive()) await this.time.sleep(left)
      }
    } finally {
      timers.forEach((c) => c())
      if (no === this.blendNo) {
        if (this.view.blend) this.set({ blend: null })
        this.releaseWalk()
      }
    }
  }

  /** A tap on the lightning: casts on the monster now, or on the next one when none is on the field. */
  megaCast = () => {
    this.batch(() => {
      const s = this.state
      const r = s.round
      // (Book 2's run: not after its hearts ran out or its visit ended)
      if (s.paused || s.mega < MEGA_MAX || this.over || this.done || this.emb.megaOff) return
      this.track('mega_tap', { round: r?.id ?? null, queued: !r || !!s.outcome })
      if (!r || s.outcome || s.preview) {
        this.megaQueued = true // he did what the wizard said; it fires when the next monster appears
        return
      }
      if (this.answeredRound === r.id) return
      this.megaQueued = false
      this.answeredRound = r.id
      this.set({ fx: (this.nextFx ??= makeFxPicker(Math.random))() })
      this.dispatch({ type: 'MEGA', effect: 'mega' })
    })
  }

  /** The run pauses the board (its cover, a lock): everything stays silent. */
  pause() {
    this.batch(() => {
      const s = this.state
      if (s.phase !== 'playing' || this.paused) return
      this.paused = true
      this.endBlend()
      const hidden = typeof document !== 'undefined' && document.hidden
      this.track('pause', { cause: hidden ? 'hidden' : 'button', round: s.round?.id ?? null, duringOutcome: !!s.outcome })
      this.flushLog()
      this.dispatch({ type: 'PAUSE' })
      this.audio.mute(true)
      this.audio.stopAllLines()
    })
  }

  /** The same monster goes on after the resume (from the right edge, clue and all), or the held step runs. */
  resume() {
    this.batch(() => {
      if (!this.paused) return
      this.paused = false
      this.audio.unlock() // inside the ▶ tap: Android may have suspended audio during a long lock
      this.track('resume', {})
      this.dispatch({ type: 'RESUME' })
      this.audio.mute(false)
      const s = this.state
      if (this.pendingSpawn) {
        const p = this.pendingSpawn
        this.pendingSpawn = null
        void this.spawn(p)
      } else if (this.resumeAdvance) {
        this.resumeAdvance = false
        this.dispatch({ type: 'ADVANCE' })
      } else if (s.round && !s.outcome) {
        // restart the interrupted round from the right edge, clue and all
        this.begin({ ...s.round, id: this.nextId++ }, true)
      }
    })
  }

  /** The speaker on the field: the clue again. */
  replay() {
    const r = this.state.round
    if (r) this.track('replay', { round: r.id })
    if (r) void this.playClue(r)
  }

  /** The tab closed or navigated away mid-run (no unmount happens then): record the churn. */
  pageHidden() {
    const s = this.state
    if (s.phase !== 'playing') return
    this.track('abandon', {
      reason: 'pagehide', round: s.round?.id ?? null, wave: s.wave, score: s.score, hearts: null, paused: s.paused,
      duringOutcome: !!s.outcome, msShown: s.round ? Math.round(this.time.now() - this.spawnedAt) : null,
    })
    this.flushLog()
  }

  /** Leaving the screen stops everything (a later start() begins a new visit). */
  destroy() {
    const s = this.state
    // (a visit of Book 2's run that is done is no abandon)
    if (s.phase === 'playing' && !this.done) {
      // left mid-run (home button, back): churn
      this.track('abandon', {
        reason: 'unmount',
        round: s.round?.id ?? null, wave: s.wave, score: s.score, hearts: null, paused: s.paused, duringOutcome: !!s.outcome,
        msShown: s.round ? Math.round(this.time.now() - this.spawnedAt) : null,
      })
    }
    this.flushLog()
    this.audio.setLog(null)
    this.runId += 1
    this.roundToken += 1
    this.paused = false
    this.audio.stopAllLines()
    this.audio.mute(false) // leaving while paused must not leave the app muted
    this.endBlend()
    this.cueTimer()
    this.clock()
    this.clock = () => {}
  }
}
