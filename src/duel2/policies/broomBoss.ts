// The flight boss as a policy (spec 2026-11-07-book2-flight-boss-design): which broom visit has a boss and of which kind,
// its swoop-in and line, its hits (a spell bolt, the hit pose, one segment of its bar), its loss, and the win (the defeated
// pose, its sound and music, the praise, the bonus coins one by one, the trophy and, on the first win against a kind, its
// golden frame and line). Pure: no store, no clock, no audio. `stepBoss(state, event)` returns the next state and what the
// run must do (show, say, play, save, track, wait); the run (controller.ts) does it and sends back the events. The flight
// itself (the waves, the catches, the mistakes) and its finale stay with the run.
import type { Stage } from '../logic/content'
import type { Conf } from '../logic/rounds'
import { BOSS_COINS, BOSS_HITS, chooseBoss, isBossVisit, type BossKind } from '../logic/boss'

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

/** the boss swoops in this long before its line */
export const BOSS_ARRIVE_MS = 1300
/** its hit pose shows this long */
export const BOSS_HIT_MS = 600
/** the win's sound rings this long before the praise (the run's SFX_RING_MS) */
export const WIN_RING_MS = 400
/** a praise with no words lets its sound play this long (the run's PRAISE_SOUND_MS) */
export const WIN_SOUND_MS = 900
/** a bonus coin pops this long after the one before (the run's COIN_POP_MS) */
export const BOSS_COIN_MS = 550
/** the win rests this long before the flight's finale */
export const WIN_REST_MS = 600

/**
 * Which broom visit has a boss, and its kind: every second broom visit of a run (never the first); in sessions from the
 * path, every second broom session; the gallery forces it. Decided once per visit, when the visit is due.
 */
export interface BossDueCtx {
  /** the gallery: this kind (or none) */
  force?: { boss?: BossKind }
  /** a session from the path */
  session: boolean
  /** broom sessions so far (the save) */
  broomSessions: number
  /** broom visits so far in this run */
  broomVisits: number
  stage: Stage
  confusions: { letters: Conf; vowels: Conf }
  beaten: BossKind[]
  last: BossKind | null
  /** the run's random numbers (in [0, 1)) */
  rng: () => number
}
export type BossDueSaveOp = { op: 'noteBroomSession' } | { op: 'setLastBoss'; kind: BossKind }
export interface BossDue {
  kind: BossKind | null
  /** broom visits in this run, this one included */
  broomVisits: number
  save: BossDueSaveOp[]
}
export function bossDue(c: BossDueCtx): BossDue {
  if (c.force) return { kind: c.force.boss ?? null, broomVisits: c.broomVisits, save: [] }
  const save: BossDueSaveOp[] = []
  let broomVisits = c.broomVisits
  if (c.session) {
    // every second broom session is a boss fight (the run's rhythm: every second broom visit)
    save.push({ op: 'noteBroomSession' })
    if (c.broomSessions % 2 !== 1) return { kind: null, broomVisits, save }
  } else {
    broomVisits++
    if (!isBossVisit(broomVisits)) return { kind: null, broomVisits, save }
  }
  const kind = chooseBoss({ stage: c.stage, confusions: c.confusions, beaten: c.beaten, last: c.last, rng: c.rng })
  if (kind) save.push({ op: 'setLastBoss', kind })
  return { kind, broomVisits, save }
}

/**
 * What the run tells the policy. `start`: the boss visit begins (once). `fly`: a flight starts (again after a pause): the
 * boss is drawn as it is. `arrive`: the flight's first line is due (the boss swoops in, once). `hit`: a right catch (`id`
 * = the bolt's id, `lane` = his lane). `pose`: the hit pose's time has come. `lose`: the hearts ran out. `win`: the boss is
 * beaten, or the win goes on after a pause; `heardNew` = its "new in your collection" line was heard before, `praise` =
 * the praise words are still due (the praise rule). `heard` (`ok`: the lines really played) / `slept`: the wait it asked
 * for is over. `at` = the run's clock.
 */
export type BossInput =
  | { type: 'start' } | { type: 'fly' } | { type: 'arrive' } | { type: 'hit'; id: number; lane: number } | { type: 'pose'; id: number }
  | { type: 'lose' } | { type: 'win'; heardNew: boolean; praise: boolean } | { type: 'heard'; ok: boolean } | { type: 'slept' }
export type BossEvent = BossInput & { at: number }

/** a line: `line` in its take `take` (no take: the run picks a variation), or the sound he catches now */
export type BossLine = { line: string; take?: number } | { cue: true }
export type BossSfx = 'spell' | 'boss-win' | 'lock'
export type BossSaveOp =
  | { op: 'markBossBeaten'; kind: BossKind }
  | { op: 'notePraise'; kind: 'boss-win' }
  | { op: 'addCoins'; n: number }
  | { op: 'markBossNewHeard'; kind: BossKind }
export interface TrackRequest { e: string; data: Record<string, unknown> }
/** the run's view around the boss */
export interface RunPatch { phase?: 'celebrate' }
/** what the run waits for before the next event: the step's lines (`heard`) or a time (`slept`) */
export type Wait = { for: 'say' } | { for: 'sleep'; ms: number }

export interface BossStep {
  state: BossState
  /** the boss after this step (undefined: as it was) */
  view?: BossView
  run?: RunPatch
  /** the music: `celebrate` = it stops, and the celebration starts after this step's sounds; `stop` = it stops */
  music?: 'celebrate' | 'stop'
  /** lines in order (the run waits for them: `wait` is `say`) */
  say: BossLine[]
  sfx: BossSfx[]
  save: BossSaveOp[]
  track: TrackRequest[]
  /** a bonus coin pops in the top bar */
  coinPop?: true
  /** the hit pose ends: send `pose` with this id after `ms` (the flight goes on meanwhile) */
  poseFor?: { id: number; ms: number }
  /** this hit beat it: the flight stops and the win follows */
  won?: true
  wait?: Wait
  /** the win is over: the flight's finale follows */
  end?: true
}

type Flow =
  | { k: 'fly' } | { k: 'arriving' } | { k: 'cue' } | { k: 'win-ring' } | { k: 'praise' } | { k: 'praise-sound' }
  | { k: 'coin' } | { k: 'new' } | { k: 'rest' } | { k: 'over' }

export interface BossState {
  kind: BossKind
  hitsLeft: number
  arrived: boolean
  /** when the visit started (the run's clock) */
  startedAt: number
  /** the boss as drawn now (its bolt is kept across a pause) */
  view?: BossView
  won?: boolean
  first?: boolean
  /** the win's parts that have happened (a pause during the win goes on with the next one) */
  celebrated?: boolean
  praised?: boolean
  coins: number
  newSaid?: boolean
  /** the praise words are still due (as the last `win` said) */
  praiseDue?: boolean
  flow: Flow
}

/** A boss visit as it starts (the run sends `start` next). */
export function bossVisit(kind: BossKind): BossState {
  return { kind, hitsLeft: BOSS_HITS, arrived: false, startedAt: 0, coins: 0, flow: { k: 'fly' } }
}

/** One step of the boss visit. Never changes `state`. */
export function stepBoss(state: BossState, ev: BossEvent): BossStep {
  const s: BossState = { ...state }
  const r: BossStep = { state: s, say: [], sfx: [], save: [], track: [] }
  const show = (v: BossView) => { s.view = v; r.view = v }
  /** the boss as it is: the hit pose is a moment only (a rebuilt view flies); the last bolt stays */
  const drawn = (): BossView => ({
    kind: s.kind, hitsLeft: s.hitsLeft, arrived: s.arrived, pose: s.won ? 'down' : 'fly',
    ...(s.view?.bolt ? { bolt: s.view.bolt } : {}), ...(s.won ? { won: true, first: !!s.first } : {}),
  })
  const go = (flow: Flow, wait?: Wait) => { s.flow = flow; if (wait) r.wait = wait }
  /** the next part of the win that has not happened yet; each happens once */
  const winOn = () => {
    if (!s.celebrated) {
      s.celebrated = true
      r.music = 'celebrate'
      r.sfx.push('boss-win')
      go({ k: 'win-ring' }, { for: 'sleep', ms: WIN_RING_MS })
      return
    }
    if (!s.praised) {
      s.praised = true
      if (s.praiseDue) { r.say.push({ line: 'boss-win' }); go({ k: 'praise' }, { for: 'say' }) }
      else go({ k: 'praise-sound' }, { for: 'sleep', ms: WIN_SOUND_MS })
      return
    }
    if (s.coins < BOSS_COINS) {
      s.coins++
      r.save.push({ op: 'addCoins', n: 1 })
      r.coinPop = true
      r.sfx.push('lock')
      go({ k: 'coin' }, { for: 'sleep', ms: BOSS_COIN_MS })
      return
    }
    if (s.first && !s.newSaid) {
      s.newSaid = true
      r.say.push({ line: 'boss-new', take: 1 })
      go({ k: 'new' }, { for: 'say' })
      return
    }
    go({ k: 'rest' }, { for: 'sleep', ms: WIN_REST_MS })
  }

  switch (ev.type) {
    case 'start':
      s.startedAt = ev.at
      r.track.push({ e: 'boss-start', data: { kind: s.kind } })
      break
    case 'fly':
      go({ k: 'fly' })
      show(drawn())
      break
    case 'arrive':
      if (s.arrived) { r.say.push({ cue: true }); go({ k: 'cue' }, { for: 'say' }); break }
      // the sky darkens and the boss swoops in from the right; then its line and the first sound
      go({ k: 'arriving' }, { for: 'sleep', ms: BOSS_ARRIVE_MS })
      break
    case 'hit': {
      s.hitsLeft = Math.max(0, s.hitsLeft - 1)
      show({ ...drawn(), pose: 'hit', bolt: { id: ev.id, lane: ev.lane } })
      r.sfx.push('spell')
      r.track.push({ e: 'boss-hit', data: { kind: s.kind, left: s.hitsLeft } })
      if (s.hitsLeft === 0) r.won = true
      else r.poseFor = { id: ev.id, ms: BOSS_HIT_MS }
      break
    }
    case 'pose':
      if (s.view?.bolt?.id === ev.id && !s.view.won) show({ ...s.view, pose: 'fly' })
      break
    case 'lose':
      r.track.push({ e: 'boss-lose', data: { kind: s.kind, left: s.hitsLeft } })
      break
    case 'win':
      if (!s.won) {
        s.won = true
        // the trophy is kept at once; the "new in your collection" moment only once its line was heard
        s.first = !ev.heardNew
        r.save.push({ op: 'markBossBeaten', kind: s.kind })
        r.track.push({ e: 'boss-win', data: { kind: s.kind, ms: Math.round(ev.at - s.startedAt), first: s.first } })
      }
      show(drawn())
      r.run = { phase: 'celebrate' }
      s.praiseDue = ev.praise
      winOn()
      break
    case 'heard': case 'slept': {
      const f = s.flow
      switch (f.k) {
        case 'arriving':
          s.arrived = true
          show(drawn())
          r.say.push({ line: 'boss-arrive' }, { cue: true })
          go({ k: 'cue' }, { for: 'say' })
          break
        case 'cue':
          go({ k: 'fly' })
          break
        case 'praise':
          // the praise counts as heard only when it really played (a missing file leaves it for next time)
          if (ev.type === 'heard' && ev.ok) r.save.push({ op: 'notePraise', kind: 'boss-win' })
          winOn()
          break
        case 'new':
          if (ev.type === 'heard' && ev.ok) r.save.push({ op: 'markBossNewHeard', kind: s.kind })
          winOn()
          break
        case 'win-ring': case 'praise-sound': case 'coin':
          winOn()
          break
        case 'rest':
          r.music = 'stop'
          r.end = true
          go({ k: 'over' })
          break
        default:
          break
      }
      break
    }
  }
  return r
}
