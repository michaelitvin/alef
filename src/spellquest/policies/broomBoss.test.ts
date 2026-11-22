import { describe, expect, it } from 'vitest'
import { BOSS_COINS, BOSS_HITS } from '../logic/boss'
import {
  BOSS_ARRIVE_MS, BOSS_COIN_MS, BOSS_HIT_MS, WIN_REST_MS, WIN_RING_MS, WIN_SOUND_MS,
  bossDue, bossVisit, stepBoss,
  type BossDueCtx, type BossInput, type BossLine, type BossSaveOp, type BossState, type BossStep, type BossView, type Wait,
} from './broomBoss'

/** freezes a state deeply: a step that changed it would throw */
function freeze<T>(x: T): T {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) freeze(v) }
  return x
}

const lineOf = (l: BossLine) => ('cue' in l ? 'cue' : l.take ? `${l.line}-${l.take}` : l.line)

/**
 * Plays a boss visit as the run does, on a clock of its own: `send` steps the policy once; `settle` ends each wait it asks
 * for (a sleep after its time, lines at once; `ok` = whether the lines really play) until there is none.
 */
function boss(kind: BossState['kind'] = 'mimic') {
  let st = bossVisit(kind)
  let clock = 0
  let wait: Wait | undefined
  let ok = true
  const d = {
    said: [] as string[], sfx: [] as string[], save: [] as BossSaveOp[], track: [] as { e: string; data: Record<string, unknown> }[],
    view: undefined as BossView | undefined, music: [] as string[], coinPops: 0, end: false, won: false,
    poseFor: undefined as BossStep['poseFor'], phase: undefined as string | undefined,
  }
  const send = (e: BossInput) => {
    const r = stepBoss(freeze(st), { ...e, at: clock })
    st = r.state
    if (r.view) d.view = r.view
    if (r.run?.phase) d.phase = r.run.phase
    if (r.music) d.music.push(r.music)
    d.said.push(...r.say.map(lineOf))
    d.sfx.push(...r.sfx)
    d.save.push(...r.save)
    d.track.push(...r.track)
    if (r.coinPop) d.coinPops++
    if (r.won) d.won = true
    d.poseFor = r.poseFor
    wait = r.wait
    if (r.end) d.end = true
    return r
  }
  const settle = () => {
    for (let i = 0; i < 50 && wait; i++) {
      const w = wait
      clock += w.for === 'sleep' ? w.ms : 0
      send(w.for === 'sleep' ? { type: 'slept' } : { type: 'heard', ok })
    }
  }
  return {
    d, send, settle,
    get state() { return st },
    get wait() { return wait },
    pass(ms: number) { clock += ms },
    silent() { ok = false },
    /** starts the visit and flies until its first catch is due */
    open() {
      send({ type: 'start' }); send({ type: 'fly' }); send({ type: 'arrive' }); settle()
      d.said = []; d.track = []
      return this
    },
    hits(n: number) { for (let i = 0; i < n; i++) send({ type: 'hit', id: 100 + i, lane: i % 3 }) },
  }
}

describe('the flight boss policy', () => {
  describe('which broom visit has a boss', () => {
    const ctx = (c: Partial<BossDueCtx> = {}): BossDueCtx => ({
      session: false, broomSessions: 0, broomVisits: 0, stage: 2, confusions: { letters: {}, vowels: {} }, beaten: [], last: null, rng: () => 0, ...c,
    })

    it('every second broom visit of a run, never the first; the kind is kept as the last boss', () => {
      const first = bossDue(ctx())
      expect(first).toEqual({ kind: null, broomVisits: 1, save: [] })
      const second = bossDue(ctx({ broomVisits: 1 }))
      expect(['mimic', 'bat']).toContain(second.kind)
      expect(second.broomVisits).toBe(2)
      expect(second.save).toEqual([{ op: 'setLastBoss', kind: second.kind }])
      expect(bossDue(ctx({ broomVisits: 2 })).kind).toBeNull()
    })

    it('in sessions from the path: every second broom session (counted in the save)', () => {
      expect(bossDue(ctx({ session: true, broomSessions: 0 }))).toEqual({ kind: null, broomVisits: 0, save: [{ op: 'noteBroomSession' }] })
      const d = bossDue(ctx({ session: true, broomSessions: 1 }))
      expect(d.kind).not.toBeNull()
      expect(d.broomVisits).toBe(0)
      expect(d.save).toEqual([{ op: 'noteBroomSession' }, { op: 'setLastBoss', kind: d.kind }])
    })

    it('the gallery forces its kind (or none), and nothing is counted or saved', () => {
      expect(bossDue(ctx({ force: { boss: 'bat' }, broomVisits: 4 }))).toEqual({ kind: 'bat', broomVisits: 4, save: [] })
      expect(bossDue(ctx({ force: {} })).kind).toBeNull()
    })

    it('stage 1 has no boss (letters only), and never the kind of the boss before', () => {
      expect(bossDue(ctx({ broomVisits: 1, stage: 1 }))).toEqual({ kind: null, broomVisits: 2, save: [] })
      for (let i = 0; i < 5; i++) expect(bossDue(ctx({ broomVisits: 1, last: 'mimic', rng: () => i / 5 })).kind).toBe('bat')
    })
  })

  it('arrives once: it swoops in, then its line and the sound to catch; after a pause only the sound', () => {
    const b = boss()
    b.send({ type: 'start' })
    expect(b.d.track).toEqual([{ e: 'boss-start', data: { kind: 'mimic' } }])
    b.send({ type: 'fly' })
    expect(b.d.view).toEqual({ kind: 'mimic', hitsLeft: BOSS_HITS, arrived: false, pose: 'fly' })
    b.send({ type: 'arrive' })
    expect(b.wait).toEqual({ for: 'sleep', ms: BOSS_ARRIVE_MS })
    b.send({ type: 'slept' })
    expect(b.d.view!.arrived).toBe(true)
    expect(b.d.said).toEqual(['boss-arrive', 'cue'])
    expect(b.wait).toEqual({ for: 'say' })
    b.settle()
    expect(b.wait).toBeUndefined()
    // a pause, then the flight again
    b.d.said = []
    b.send({ type: 'fly' })
    b.send({ type: 'arrive' })
    b.settle()
    expect(b.d.said).toEqual(['cue'])
  })

  it('a pause during its swoop: it swoops in again', () => {
    const b = boss()
    b.send({ type: 'start' })
    b.send({ type: 'fly' })
    b.send({ type: 'arrive' })
    b.send({ type: 'fly' })
    b.send({ type: 'arrive' })
    expect(b.wait).toEqual({ for: 'sleep', ms: BOSS_ARRIVE_MS })
  })

  it('a hit: the bolt, the hit pose for a moment, one segment out, its sound and telemetry', () => {
    const b = boss().open()
    b.send({ type: 'hit', id: 7, lane: 2 })
    expect(b.d.view).toMatchObject({ hitsLeft: BOSS_HITS - 1, pose: 'hit', bolt: { id: 7, lane: 2 } })
    expect(b.d.sfx).toEqual(['spell'])
    expect(b.d.track[b.d.track.length - 1]).toEqual({ e: 'boss-hit', data: { kind: 'mimic', left: BOSS_HITS - 1 } })
    expect(b.d.poseFor).toEqual({ id: 7, ms: BOSS_HIT_MS })
    // a later bolt: the old pose time does nothing
    b.send({ type: 'hit', id: 8, lane: 0 })
    b.send({ type: 'pose', id: 7 })
    expect(b.d.view!.pose).toBe('hit')
    b.send({ type: 'pose', id: 8 })
    expect(b.d.view).toMatchObject({ pose: 'fly', bolt: { id: 8, lane: 0 }, hitsLeft: BOSS_HITS - 2 })
  })

  it('a pause right after a hit: the boss flies again, its bolt kept', () => {
    const b = boss().open()
    b.send({ type: 'hit', id: 3, lane: 1 })
    b.send({ type: 'fly' })
    expect(b.d.view).toMatchObject({ pose: 'fly', bolt: { id: 3, lane: 1 }, hitsLeft: BOSS_HITS - 1 })
  })

  it('8 hits beat it: the last hit says so, with no pose time', () => {
    const b = boss().open()
    b.hits(BOSS_HITS - 1)
    expect(b.d.won).toBe(false)
    b.hits(1)
    expect(b.d.won).toBe(true)
    expect(b.d.poseFor).toBeUndefined()
    expect(b.state.hitsLeft).toBe(0)
  })

  it('the hearts ran out: its loss is tracked with the hits left', () => {
    const b = boss().open()
    b.hits(2)
    b.send({ type: 'lose' })
    expect(b.d.track[b.d.track.length - 1]).toEqual({ e: 'boss-lose', data: { kind: 'mimic', left: BOSS_HITS - 2 } })
  })

  it('the first win: the trophy, the down pose, its sound and music, the praise, 3 coins one by one, the new line, the rest', () => {
    const b = boss().open()
    b.hits(BOSS_HITS)
    b.pass(5000)
    b.d.sfx = []
    b.send({ type: 'win', heardNew: false, praise: true })
    expect(b.d.save).toEqual([{ op: 'markBossBeaten', kind: 'mimic' }])
    expect(b.d.track[b.d.track.length - 1]).toEqual({ e: 'boss-win', data: { kind: 'mimic', ms: BOSS_ARRIVE_MS + 5000, first: true } })
    expect(b.d.view).toMatchObject({ pose: 'down', won: true, first: true, hitsLeft: 0 })
    expect(b.d.phase).toBe('celebrate')
    expect(b.d.music).toEqual(['celebrate'])
    expect(b.d.sfx).toEqual(['boss-win'])
    expect(b.wait).toEqual({ for: 'sleep', ms: WIN_RING_MS })
    b.settle()
    expect(b.d.said).toEqual(['boss-win', 'boss-new-1'])
    expect(b.d.sfx).toEqual(['boss-win', 'lock', 'lock', 'lock'])
    expect(b.d.coinPops).toBe(BOSS_COINS)
    expect(b.d.save).toEqual([
      { op: 'markBossBeaten', kind: 'mimic' }, { op: 'notePraise', kind: 'boss-win' },
      { op: 'addCoins', n: 1 }, { op: 'addCoins', n: 1 }, { op: 'addCoins', n: 1 }, { op: 'markBossNewHeard', kind: 'mimic' },
    ])
    expect(b.d.music).toEqual(['celebrate', 'stop'])
    expect(b.d.end).toBe(true)
  })

  it('the waits of the win, in order', () => {
    const b = boss().open()
    b.hits(BOSS_HITS)
    b.send({ type: 'win', heardNew: false, praise: true })
    const waits: Wait[] = [b.wait!]
    for (let i = 0; i < 20 && b.wait; i++) {
      const w = b.wait
      b.send(w.for === 'sleep' ? { type: 'slept' } : { type: 'heard', ok: true })
      if (b.wait) waits.push(b.wait)
    }
    expect(waits).toEqual([
      { for: 'sleep', ms: WIN_RING_MS }, { for: 'say' },
      { for: 'sleep', ms: BOSS_COIN_MS }, { for: 'sleep', ms: BOSS_COIN_MS }, { for: 'sleep', ms: BOSS_COIN_MS },
      { for: 'say' }, { for: 'sleep', ms: WIN_REST_MS },
    ])
  })

  it('a later win: no praise words (only its sound) and no new line once heard', () => {
    const b = boss('bat').open()
    b.hits(BOSS_HITS)
    b.send({ type: 'win', heardNew: true, praise: false })
    expect(b.d.view).toMatchObject({ won: true, first: false })
    const waits: Wait[] = [b.wait!]
    for (let i = 0; i < 20 && b.wait; i++) {
      b.send(b.wait.for === 'sleep' ? { type: 'slept' } : { type: 'heard', ok: true })
      if (b.wait) waits.push(b.wait)
    }
    expect(waits[1]).toEqual({ for: 'sleep', ms: WIN_SOUND_MS })
    expect(b.d.said).toEqual([])
    expect(b.d.save.map((o) => o.op)).toEqual(['markBossBeaten', 'addCoins', 'addCoins', 'addCoins'])
    expect(b.d.end).toBe(true)
  })

  it('lines that did not play use up neither the praise nor the announcement (the trophy is kept)', () => {
    const b = boss().open()
    b.silent()
    b.hits(BOSS_HITS)
    b.send({ type: 'win', heardNew: false, praise: true })
    b.settle()
    expect(b.d.said).toEqual(['boss-win', 'boss-new-1'])
    expect(b.d.save.map((o) => o.op)).toEqual(['markBossBeaten', 'addCoins', 'addCoins', 'addCoins'])
  })

  it('a pause during the win goes on with the next part: the sound, the praise and each coin happen once', () => {
    const b = boss().open()
    b.hits(BOSS_HITS)
    b.send({ type: 'win', heardNew: false, praise: true })
    // paused during the ring: the win starts again from the praise, without its sound or a second trophy
    b.send({ type: 'fly' })
    expect(b.d.view).toMatchObject({ pose: 'down', won: true })
    b.send({ type: 'win', heardNew: false, praise: true })
    expect(b.d.sfx.filter((x) => x === 'boss-win')).toHaveLength(1)
    expect(b.d.music).toEqual(['celebrate'])
    expect(b.d.said).toEqual(['boss-win'])
    // paused during the praise: it is not said again (and not counted: it did not end)
    b.send({ type: 'win', heardNew: false, praise: true })
    expect(b.d.said).toEqual(['boss-win'])
    expect(b.d.coinPops).toBe(1)
    // paused after the first coin: two more
    b.send({ type: 'win', heardNew: false, praise: true })
    b.settle()
    expect(b.d.coinPops).toBe(BOSS_COINS)
    expect(b.d.save.filter((o) => o.op === 'markBossBeaten')).toHaveLength(1)
    expect(b.d.save.filter((o) => o.op === 'notePraise')).toHaveLength(0)
    expect(b.d.track.filter((t) => t.e === 'boss-win')).toHaveLength(1)
    expect(b.d.end).toBe(true)
  })
})
