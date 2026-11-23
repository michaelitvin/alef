// The run's pass and its hearts as a policy (spec: Run; one duel, Parts 1–3): where the run starts, which screen comes
// next (skipping long-mastered screens every other cycle; the crystal after the doors, or at the cycle's end when the
// doors were skipped), how long a visit is, the hearts for the whole run (a mistake costs one, a near miss is forgiven
// once a round, a session from the path puts none at stake), one heart back at the end of a full pass (not at stage 0),
// the checkpoint between two screens (does the merchant come, and his price), and the run's end (its records and the
// short defeat scene). Pure: no store, no clock, no audio. `stepPass(state, event)` returns the next state and what the
// run must do; the run (controller.ts) keeps the loop and the time, does what a step says, and sends back the events.
import type { CourseStages } from '../course/types'
import type { ScreenId } from '../logic/predict'
import { merchantDue, priceAt, type NumberRange } from '../logic/merchant'
import { SHORT_AFTER, screenRecent, skipInCycle, visitScale } from '../logic/mastery'
import { HEBREW_STAGES, cycleOf, heartsAtRunStart, newRound, nextScreen, onAnswer, passEndHeart, runStart, type Hearts } from '../logic/run'

/** the defeat scene: the dizzy wizard spins and falls (spec: one duel, a short and funny end) */
export const DEFEAT_MS = 1800
/** the defeat's hit rings this long before its line (the run's SFX_RING_MS) */
export const DEFEAT_RING_MS = 400
/** the scene rests this long before the summary */
export const DEFEAT_REST_MS = 300

/** a run (the adventure), a session from the path (one visit, no hearts at stake), or the gallery (one screen, again) */
export type PassMode = 'run' | 'session' | 'gallery'
export type PassScreen = ScreenId | 'crystal'

/** what the run reads from the saves when the policy needs it (they change during a run: the stage, the book, his answers) */
export interface PassFacts {
  stage: number
  /** the course's stages: its cycle, its visits and its sessions (Hebrew by default) */
  stages?: CourseStages
  /** the parent turned the drawing screens on */
  draw: boolean
  /** Spell Quest's minigames are open (before: stage 0, the tower alone) */
  screensOpen: boolean
  /** Spell Quest's recent answers per feature, and the tower's per mark */
  recent: Readonly<Record<string, string>>
  towerRecent: Readonly<Record<string, string>>
  /** the cycles he has started (the save) */
  cycleNo: number
  /** the tower's last answers in time order */
  towerTail: string
}

/**
 * What the run tells the policy. `visit`: a screen's visit starts (once; a pause keeps it). `round`: a new round or
 * flight (the near miss is forgiven again). `answer`: right, wrong or a near miss. `screen-done`: the screen (or the
 * crystal) is over: the next one (`score`: the run's points, for a session's end; `empty`: the visit had no round, so no
 * checkpoint follows it). `checkpoint`: between two screens
 * (`sinceVisit`: the checkpoints since his last visit, this one included; Infinity before the first; `bossNext`: a boss
 * comes next). `visited`: the merchant's visit at the checkpoint is over. `bought`: he bought a potion (his hearts now).
 * `gallery-merchant`: the gallery's merchant visit (1 heart). `crystal`: the cycle's crystal shows. `owed`: the game
 * closes or he leaves: the crystal the skipped doors owe him. `lost`: the hearts ran out (`cue`: the right answer is said
 * first). `heard` / `slept`: the wait it asked for is over. `at` = the run's clock.
 */
export type PassInput =
  | { type: 'visit'; screen: ScreenId; facts: PassFacts } | { type: 'round' } | { type: 'answer'; a: 'right' | 'wrong' | 'near' }
  | { type: 'screen-done'; facts: PassFacts; score: number; empty?: true }
  | { type: 'checkpoint'; screensOpen: boolean; coins: number; range: NumberRange; sinceVisit: number; bossNext: boolean }
  | { type: 'visited' } | { type: 'bought'; hearts: number } | { type: 'gallery-merchant' } | { type: 'crystal' } | { type: 'owed' }
  | { type: 'lost'; score: number; bestRun: number; cue?: string } | { type: 'heard' } | { type: 'slept' }
export type PassEvent = PassInput & { at: number }

/** a line: `id` as it is, or `line` (the run picks a variation) */
export type PassLine = { id: string } | { line: string }
export type PassSfx = 'potion' | 'hit'
export type PassSaveOp =
  | { op: 'nextCycle' }
  | { op: 'noteCheckpoint'; due: boolean }
  /** a crystal (the run tracks it with the saved count: `owed` when the skipped doors owed it) */
  | { op: 'addCrystal'; owed?: boolean }
  | { op: 'endRun'; screen: ScreenId; score: number }
export interface TrackRequest { e: string; data: Record<string, unknown> }
/** the run's view around the pass */
export interface RunPatch {
  hearts?: number
  passHeart?: number
  defeat?: true
  phase?: 'feedback'
  overlay?: null
  needNext?: false
  hintAvailable?: false
  fixing?: false
}
/** what the run waits for before the next event: the step's lines (`heard`; with `min`, at least that long too) or a time */
export type Wait = { for: 'say'; min?: number } | { for: 'sleep'; ms: number }

export interface PassStep {
  state: PassState
  run?: RunPatch
  /** a heart flies to the top bar and the hearts flash (the end of a pass) */
  heal?: true
  /** lines in order (the run waits for them: `wait` is `say`) */
  say: PassLine[]
  sfx: PassSfx[]
  save: PassSaveOp[]
  track: TrackRequest[]
  /** `answer`: the near miss was forgiven / the hearts ran out */
  outcome?: { forgiven: boolean; over: boolean }
  /** `visit`: its length (rounds, waves, rungs, doors or words) */
  len?: number
  /** `screen-done`: a new visit starts (the run forgets the last visit's rounds, ladder, words, kind and boss) */
  fresh?: true
  /** `checkpoint`: the merchant comes, at this price */
  merchant?: { price: number }
  /** the run (or the session) is over: its summary */
  over?: { crystals: number; best: boolean; session?: true }
  wait?: Wait
  end?: true
}

type Flow = { k: 'play' } | { k: 'cue' } | { k: 'ring' } | { k: 'defeat' } | { k: 'rest' } | { k: 'over' }

export interface PassState {
  mode: PassMode
  screen: PassScreen
  hearts: Hearts
  /** this pass went through every screen of the cycle: the run started at the cycle's first screen, or a pass ended
   * since (spec: "a pass is one trip through all his open minigames"; a run resumed near the end gets no heart there) */
  full: boolean
  /** the hearts given back at the ends of passes in this run */
  passHearts: number
  /** the doors were skipped in this cycle: their crystal comes at the cycle's end */
  crystalOwed: boolean
  /** the next screen after a crystal that came at the cycle's end */
  afterCrystal: { screen: ScreenId; newCycle: boolean } | null
  /** this cycle's crystal was given (a pause during it must not give it twice) */
  crystalGiven: boolean
  /** a screen has ended: the checkpoint (maybe the merchant) comes before the next one */
  checkpointDue: boolean
  /** potions bought in this run (the price rises) */
  purchases: number
  crystals: number
  /** the run's end, while its scene plays */
  best?: boolean
  flow: Flow
}

/** the course's stages of these facts */
const stagesOf = (f: PassFacts): CourseStages => f.stages ?? HEBREW_STAGES

/**
 * A run as it starts: a session plays its screen, the gallery its forced screen, a run the screen after the one where the
 * last run ended. The hearts are full.
 */
export function runPass(c: { mode: PassMode; screen?: PassScreen; lastEnded: ScreenId | null; facts: PassFacts }): PassState {
  const f = c.facts
  const screen = c.screen ?? runStart(f.stage, c.lastEnded, f.draw, f.screensOpen, stagesOf(f))
  return {
    mode: c.mode, screen, hearts: heartsAtRunStart(),
    full: c.mode === 'run' && screen === cycleOf(f.stage, f.draw, f.screensOpen, stagesOf(f))[0],
    passHearts: 0, crystalOwed: false, afterCrystal: null, crystalGiven: false, checkpointDue: false, purchases: 0, crystals: 0,
    flow: { k: 'play' },
  }
}

/** One step of the pass. Never changes `state`. */
export function stepPass(state: PassState, ev: PassEvent): PassStep {
  const s: PassState = { ...state }
  const r: PassStep = { state: s, say: [], sfx: [], save: [], track: [] }
  const go = (flow: Flow, wait?: Wait) => { s.flow = flow; if (wait) r.wait = wait }

  /**
   * The screen after `from` in the cycle, passing over the screens he has long mastered in this cycle (every other cycle;
   * never the tower, never the only screen): a skipped screen has no visit and no checkpoint of its own.
   */
  const nextOf = (from: ScreenId, f: PassFacts) => {
    let nx = nextScreen(f.stage, from, f.draw, f.screensOpen, stagesOf(f))
    const len = cycleOf(f.stage, f.draw, f.screensOpen, stagesOf(f)).length
    for (let k = 0; k < len && s.mode !== 'session'; k++) {
      // a new cycle starts at the tower, which is never skipped
      if (nx.newCycle || !skipInCycle(nx.screen, screenRecent(nx.screen, f.recent, f.towerRecent), f.cycleNo, len)) break
      if (nx.screen === 'doors') s.crystalOwed = true
      r.track.push({ e: 'skip', data: { screen: nx.screen, cycle: f.cycleNo } })
      nx = nextScreen(f.stage, nx.screen, f.draw, f.screensOpen, stagesOf(f))
    }
    return nx
  }
  /** a new visit starts at `screen` (the gallery's starts its screen again, with full hearts) */
  const fresh = (screen: PassScreen) => {
    s.screen = screen
    s.crystalGiven = false
    r.fresh = true
  }
  const defeat = () => {
    r.run = { defeat: true, phase: 'feedback', overlay: null, needNext: false, hintAvailable: false, fixing: false }
    r.sfx.push('hit')
    r.track.push({ e: 'defeat', data: { screen: s.screen } })
    go({ k: 'ring' }, { for: 'sleep', ms: DEFEAT_RING_MS })
  }
  /** the crystal the skipped doors owe him, once */
  const payOwed = () => {
    if (!s.crystalOwed) return
    s.crystalOwed = false
    s.crystals++
    r.save.push({ op: 'addCrystal', owed: true })
  }

  switch (ev.type) {
    case 'visit': {
      // the hearts last the run; only the gallery refills them when its forced screen starts (a pause keeps them)
      if (s.mode === 'gallery') s.hearts = heartsAtRunStart()
      r.len = visitLength(s.mode, ev.screen, ev.facts)
      break
    }
    case 'round':
      s.hearts = newRound(s.hearts)
      break
    case 'answer': {
      const o = onAnswer(s.hearts, ev.a)
      // in a session from the path no heart is at stake (a mistake costs only the streak)
      if (s.mode === 'session' && ev.a !== 'right' && !o.forgiven) {
        s.hearts = { ...s.hearts, nearMissUsed: o.hearts.nearMissUsed }
        r.outcome = { forgiven: false, over: false }
      } else {
        s.hearts = o.hearts
        r.outcome = { forgiven: o.forgiven, over: o.over }
      }
      break
    }
    case 'screen-done': {
      const f = ev.facts
      // a session from the path is one visit
      if (s.mode === 'session') {
        r.track.push({ e: 'session-end', data: { screen: s.screen, score: ev.score } })
        r.over = { crystals: 0, best: false, session: true }
        go({ k: 'over' })
        r.end = true
        break
      }
      // the gallery plays one screen, then starts it again
      if (s.mode === 'gallery') { s.hearts = heartsAtRunStart(); fresh(s.screen); break }
      if (s.screen === 'doors') { s.screen = 'crystal'; break }
      const nx = s.screen === 'crystal' ? (s.afterCrystal ?? nextOf('doors', f)) : nextOf(s.screen, f)
      s.afterCrystal = null
      if (s.screen !== 'crystal' && nx.newCycle && s.crystalOwed) {
        // the doors were skipped in this cycle: their crystal still comes, at the cycle's end (then the pass heart)
        s.crystalOwed = false
        s.afterCrystal = nx
        s.screen = 'crystal'
        break
      }
      fresh(nx.screen)
      // between two screens (never between the doors and their crystal): the checkpoint, after the pass heart; an empty
      // visit (no round at this stage) is none, so two merchants never meet back to back
      if (!ev.empty) s.checkpointDue = true
      if (!nx.newCycle) break
      r.save.push({ op: 'nextCycle' })
      // the end of a full pass: one heart comes back (up to HEARTS) at once, with a sound; no line and no pause (the
      // parent, 2026-11-12); stage 0 (the tower alone) has none
      const due = s.full && f.screensOpen
      s.full = true
      if (!due) break
      const h = passEndHeart(s.hearts)
      if (!h.gained) break
      s.hearts = h.hearts
      s.passHearts++
      r.run = { hearts: s.hearts.left, passHeart: s.passHearts }
      r.heal = true
      r.track.push({ e: 'pass-heart', data: { hearts: s.hearts.left } })
      r.sfx.push('potion')
      break
    }
    case 'checkpoint': {
      // the merchant: only in the adventure, never at stage 0 (the tower alone)
      if (s.mode !== 'run' || !ev.screensOpen) { s.checkpointDue = false; break }
      const price = priceAt(s.purchases, ev.range)
      // with 2 hearts he comes at every other checkpoint (merchantDue)
      const due = merchantDue({ adventure: true, hearts: s.hearts.left, coins: ev.coins, price, sinceVisit: ev.sinceVisit, bossNext: ev.bossNext })
      r.save.push({ op: 'noteCheckpoint', due })
      if (due) r.merchant = { price }
      else s.checkpointDue = false
      break
    }
    case 'visited':
      s.checkpointDue = false
      break
    case 'bought':
      s.purchases++
      s.hearts = { ...s.hearts, left: ev.hearts }
      break
    case 'gallery-merchant':
      s.hearts = { left: 1, nearMissUsed: false }
      break
    case 'crystal':
      if (s.crystalGiven) break
      s.crystalGiven = true
      s.crystals++
      r.save.push({ op: 'addCrystal' })
      break
    case 'owed':
      payOwed()
      break
    case 'lost': {
      // the run's records first: a pause can no longer cancel the end (it is already saved)
      s.best = ev.score > ev.bestRun
      payOwed()
      r.save.push({ op: 'endRun', screen: s.screen === 'crystal' ? 'doors' : s.screen, score: ev.score })
      r.track.push({ e: 'run-end', data: { screen: s.screen, score: ev.score, crystals: s.crystals } })
      // the right answer is said (none after the tower: the tower said it), then the defeat scene (playful, never praise)
      if (ev.cue) { r.say.push({ id: ev.cue }); go({ k: 'cue' }, { for: 'say' }) } else defeat()
      break
    }
    case 'heard': case 'slept':
      switch (s.flow.k) {
        case 'cue':
          defeat()
          break
        case 'ring':
          r.say.push({ line: 'defeat' })
          go({ k: 'defeat' }, { for: 'say', min: DEFEAT_MS - DEFEAT_RING_MS })
          break
        case 'defeat':
          go({ k: 'rest' }, { for: 'sleep', ms: DEFEAT_REST_MS })
          break
        case 'rest':
          r.over = { crystals: s.crystals, best: !!s.best }
          go({ k: 'over' })
          r.end = true
          break
        default:
          break
      }
      break
  }
  return r
}

/**
 * The length of a visit, decided when it starts: about half for a screen with no recent mistakes (at least 2 rounds;
 * the tower at least 1 wave). The gallery plays the full visit; a session from the path its own length.
 */
export function visitLength(mode: PassMode, screen: ScreenId, f: PassFacts): number {
  if (mode === 'session') return stagesOf(f).sessionLength[screen]
  const full = stagesOf(f).visit[screen]
  if (mode === 'gallery') return full
  // stage 0 (the tower alone): never shorter, so that the check after each wave comes after fewer answers, not more stops
  if (screen === 'tower' && !f.screensOpen) return full
  const r = screenRecent(screen, f.recent, f.towerRecent)
  // the tower: its last answers in time order (the fast lane's tail), as for the other screens; before it holds enough
  // of them, every mark's recent answers side by side (not in time order), none of which may be a mistake
  const tail = f.towerTail
  const scale = screen !== 'tower' ? visitScale(r) : tail.length >= SHORT_AFTER ? visitScale(tail) : r.length >= SHORT_AFTER && !r.includes('x') ? 0.5 : 1
  if (scale === 1) return full
  return Math.max(screen === 'tower' ? 1 : 2, Math.round(full * scale))
}
