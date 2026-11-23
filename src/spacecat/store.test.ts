// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyUnprefixedOver, prefixedStorage, STAGING_PREFIX } from '../shared/stagingStorage'
import { itemById } from './logic/facts'
import { LADDER_START, MIGRATION_JUMP, MIGRATION_PROBES, needsClosure } from './logic/ladder/index'
import { afterProbe } from './logic/ladder/placement'
import { rungDef, type RungId } from './logic/rungs'
import { SPEED_START } from './logic/speed'
import type { RoundResult } from './logic/round'
import { PLACED_V1, RANGE_V1, migrateV1 } from './migrate'
import { memorySavePort } from './savePort'
import { DEFAULT_SAVE, DEFAULT_SETTINGS, SAVE_KEY, SAVE_VERSION, savedShip } from './saveFormat'
import { useSpaceCatStore } from './store'

const it1 = itemById('2+3=5/c')!
const result = (r: Partial<RoundResult> = {}): RoundResult => ({
  result: 'right', end: 'arrival', lane: 1, number: '5', points: 1, lastLaneMs: 1000, endMs: 8000, underMs: 1000, startedUnder: false, ...r,
})
const store = () => useSpaceCatStore.getState()

describe('space cat store', () => {
  beforeEach(() => {
    localStorage.clear()
    useSpaceCatStore.setState({ ...DEFAULT_SAVE })
  })
  it('settings default', () => {
    expect(store().settings).toEqual({ range: 'auto', compare: true, jumps: true, times: true, divide: true, missing100: true, hundreds: true, arrival: 'auto', flightMusic: false })
    expect(DEFAULT_SETTINGS).toEqual(store().settings)
  })
  it('the constants', () => {
    expect(SAVE_VERSION).toBe(2)
  })
  it('a fresh save starts the first placement', () => {
    expect(store().ladder).toEqual(LADDER_START)
    expect(store().ladder.mode).toMatchObject({ kind: 'placement', why: 'first', at: '1', jump: 8, max: 16 })
    expect('history' in store()).toBe(false)
    expect(store().intro).toEqual({ day: 0, mistakes: {}, again: [] })
    expect(store().speed).toEqual({ small: { arrivalMs: 8000, underMs: [], hold: 0 } })
  })
  it('a round updates the tally, the marks, the ladder and the sums after it', () => {
    store().recordRound(it1, result())
    const s = store()
    expect(s.items[it1.id]).toMatchObject({ seen: 1, wrong: 0, timeout: 0, recent: 'o' })
    expect(s.ladder.lastMarks).toBe('o')
    expect(s.ladder.lastAt).toBeTypeOf('number')
    expect(s.speed.small.underMs).toEqual([1000])
    expect(s.lastFact).toBe('+2,3')
    expect(s.sinceZero).toBe(1)
  })
  it('a mistake is saved as a rehearsal; the recent facts and the round count are saved; a demo asks nothing back', () => {
    store().recordRound(it1, result({ result: 'wrong' }), { rng: () => 0 })
    expect(store()).toMatchObject({ recentFacts: ['+2,3'], roundNo: 1, rehearsals: [{ fact: '+2,3', step: 1, due: 4 }] })
    useSpaceCatStore.setState({ ...DEFAULT_SAVE })
    store().recordRound(it1, result({ result: 'wrong' }), { demo: true })
    expect(store().rehearsals).toEqual([])
    expect(store().recentFacts).toEqual(['+2,3'])
  })
  it('a save from before the spacing loads with empty lists', () => {
    expect(DEFAULT_SAVE).toMatchObject({ recentFacts: [], rehearsals: [], roundNo: 0 })
  })
  it('a demo round changes no tally', () => {
    store().recordRound(it1, result(), { demo: true })
    expect(store().items).toEqual({})
    expect(store().ladder).toEqual(DEFAULT_SAVE.ladder)
    expect(store().speed).toEqual(DEFAULT_SAVE.speed)
  })
  it('a demo round still counts as the round before for the next pick', () => {
    store().recordRound(it1, result(), { demo: true })
    expect(store().lastFact).toBe('+2,3')
    expect(store().sinceZero).toBe(1)
  })
  it('a cut round changes no tally', () => {
    store().recordRound(it1, result({ result: 'wrong' }), { cut: true })
    expect(store().items).toEqual({})
  })
  it('a wrong pick is recorded by the number picked', () => {
    store().recordRound(it1, result({ result: 'wrong', number: '8', points: 0, underMs: null }))
    expect(store().items[it1.id].picks['8']).toBe(1)
    expect(store().items[it1.id]).toMatchObject({ wrong: 1, recent: 'x' })
  })
  it('a wrong pick on a comparison is recorded by its sign and moves no old rung', () => {
    const cmp = itemById('7?5')!
    store().recordRound(cmp, result({ result: 'wrong', number: '<', points: 0, underMs: null }))
    expect(store().items[cmp.id].picks['<']).toBe(1)
    expect(store().ladder.lastMarks).toBe('x')
  })
  it('a time-out is marked t', () => {
    store().recordRound(it1, result({ result: 'timeout', points: 0, underMs: null }))
    expect(store().items[it1.id]).toMatchObject({ timeout: 1, wrong: 0, recent: 't' })
  })
  it('a probe answer is tallied by the ladder with the part and the time given', () => {
    const r = store().recordRound(it1, result(), { part: 'probe', fast: true, now: 5000 })
    expect(r.events.some((e) => e.e === 'placement' && e.phase === 'start')).toBe(true)
    expect(store().ladder.lastAt).toBe(5000)
    expect(store().ladder.mode).toMatchObject({ kind: 'placement', probes: 1 })
  })
  it('a rung passed in practice holds its band\'s speed', () => {
    useSpaceCatStore.setState({ ladder: { ...LADDER_START, day: 1, mode: { kind: 'practice' } } })
    let events: unknown[] = []
    for (let i = 0; i < 3; i++) events = store().recordRound(it1, result(), { part: 'frontier', fast: true, now: 1000 + i }).events
    expect(events).toContainEqual({ e: 'ladder', rung: '1', change: 'passed', by: 'fast' })
    expect(store().speed.small.hold).toBeGreaterThan(0)
  })
  it('a demo or cut round changes no ladder or speed', () => {
    const before = { ladder: store().ladder, speed: store().speed }
    store().recordRound(it1, result(), { demo: true })
    store().recordRound(it1, result({ result: 'wrong' }), { cut: true })
    expect({ ladder: store().ladder, speed: store().speed }).toEqual(before)
  })
  it('takeRound gives an item and a part and writes the ladder back', () => {
    const t = store().takeRound(() => 0.3)
    expect(t.part).toBe('probe')
    expect(t.item.rung).toBe('1')
    useSpaceCatStore.setState({ ladder: { ...LADDER_START, day: 1, mode: { kind: 'practice' }, guardLeft: 2 } })
    expect(store().takeRound(() => 0.3).part).toBe('guard')
    expect(store().ladder.guardLeft).toBe(1)
  })
  it('beginRun starts the play day once, and a new intro day', () => {
    const a = store().beginRun(1000)
    expect(a.playDay).toBe(true)
    expect(store().ladder.day).toBe(1)
    expect(store().intro.day).toBe(1)
    store().recordRound(it1, result(), { now: 2000 })
    expect(store().beginRun(3000).playDay).toBe(false)
    expect(store().ladder.day).toBe(1)
    expect(store().beginRun(2000 + 13 * 3600_000).playDay).toBe(true)
    expect(store().ladder.day).toBe(2)
    expect(store().intro.day).toBe(2)
  })
  it('the intros\' mistakes and replays are counted per play day', () => {
    store().beginRun(1000)
    store().noteIntroMistake('compare')
    store().noteIntroMistake('compare')
    store().noteIntroMistake('jumps')
    store().markIntroAgain('compare')
    expect(store().intro).toEqual({ day: 1, mistakes: { compare: 2, jumps: 1 }, again: ['compare'] })
    // a second replay of the same line on one day is written once
    store().markIntroAgain('compare')
    expect(store().intro.again).toEqual(['compare'])
    store().recordRound(it1, result(), { now: 2000 })
    store().beginRun(2000 + 13 * 3600_000)
    expect(store().intro).toEqual({ day: 2, mistakes: {}, again: [] })
  })
  it('an intro counter from another play day starts afresh', () => {
    useSpaceCatStore.setState({ ladder: { ...LADDER_START, day: 3 }, intro: { day: 2, mistakes: { compare: 2 }, again: ['times'] } })
    store().noteIntroMistake('compare')
    expect(store().intro).toEqual({ day: 3, mistakes: { compare: 1 }, again: [] })
    useSpaceCatStore.setState({ intro: { day: 2, mistakes: { compare: 2 }, again: [] } })
    store().markIntroAgain('jumps')
    expect(store().intro).toEqual({ day: 3, mistakes: {}, again: ['jumps'] })
  })
  it('findLevelAgain keeps items, points and settings and starts a placement from rung 1', () => {
    store().recordRound(it1, result())
    store().endRun(7)
    store().setSettings({ times: false })
    useSpaceCatStore.setState({ ladder: { ...store().ladder, mode: { kind: 'practice' }, rungs: { '1': { status: 'passed', recent: '', fastRun: 0, strikes: 0, holds: 0 } } } })
    store().findLevelAgain()
    expect(store().ladder.rungs).toEqual({})
    expect(store().ladder.mode).toMatchObject({ kind: 'placement', why: 'parent', at: '1' })
    expect(store().items[it1.id].seen).toBe(1)
    expect(store().totalPoints).toBe(7)
    expect(store().settings.times).toBe(false)
  })
  it('a new best is reported once', () => {
    expect(store().endRun(10).newBest).toBe(true)
    expect(store().endRun(10).newBest).toBe(false)
    expect(store().endRun(12).newBest).toBe(true)
    expect(store().best).toBe(12)
    expect(store().totalPoints).toBe(32)
    expect(store().runs).toBe(3)
  })
  it('ships start as [1] and stay unlocked', () => {
    expect(store().ships).toEqual([1])
    expect(store().unlockShips(4)).toEqual([2])
    expect(store().unlockShips(4)).toEqual([])
    expect(store().unlockShips(9)).toEqual([3])
    expect(store().ships).toEqual([1, 2, 3])
    store().chooseShip(3)
    expect(store().ship).toBe(3)
  })
  it('a locked ship cannot be chosen', () => {
    store().chooseShip(3)
    expect(store().ship).toBe(1)
  })
  it('bad JSON gives a fresh save', async () => {
    localStorage.setItem(SAVE_KEY, '{x')
    vi.resetModules()
    const fresh = (await import('./store')).useSpaceCatStore
    await Promise.resolve()
    expect(fresh.getState().ladder).toEqual(LADDER_START)
  })
  it('a saved game is read back by a fresh store', async () => {
    store().chooseShip(1)
    store().recordRound(it1, result())
    vi.resetModules()
    const fresh = (await import('./store')).useSpaceCatStore
    expect(fresh.getState().items[it1.id].seen).toBe(1)
  })
  it('savedShip reads a literal save and falls back to 1', () => {
    expect(savedShip(JSON.stringify({ state: { ship: 3 }, version: 1 }))).toBe(3)
    expect(savedShip(JSON.stringify({ state: { ship: 2 } }))).toBe(2)
    expect(savedShip(JSON.stringify({ state: { ship: 7 } }))).toBe(1)
    expect(savedShip('{x')).toBe(1)
    expect(savedShip(null)).toBe(1)
  })
})

describe('memorySavePort', () => {
  it('writes nothing to localStorage', () => {
    localStorage.clear()
    const port = memorySavePort()
    port.beginRun()
    port.takeRound(() => 0.5)
    port.recordRound(it1, result())
    port.findLevelAgain()
    port.endRun(5)
    port.markHeard('x')
    expect(localStorage.getItem(SAVE_KEY)).toBeNull()
    expect(port.get().items[it1.id].seen).toBe(1)
    expect(port.get().best).toBe(5)
    expect(port.get().heard.x).toBe(1)
  })
  it('starts from the given save', () => {
    expect(memorySavePort({ best: 9 }).get().best).toBe(9)
  })
})

const V1_LADDER = { top: 1, topRecent: '', topMistake: false, streak: 0 }
const v1 = (over: Record<string, unknown> = {}) => ({
  items: { [it1.id]: { seen: 3, wrong: 1, timeout: 0, recent: 'oxo', times: [1000], picks: { 8: 1 } } },
  ladder: V1_LADDER, speed: { arrivalMs: 6400, underMs: [1200, 1500], hold: 2 }, totalPoints: 40, best: 12, ships: [1, 2], ship: 2,
  heard: { demo: 1, missing: 2 }, lastFact: '+2,3', sinceZero: 4, runs: 3,
  settings: { range: 'auto', times: false, divide: false, arrival: 5000, flightMusic: true }, ...over,
})
const placedIds = (s: ReturnType<typeof migrateV1>) => Object.keys(s.ladder.rungs).sort()
const sorted = (xs: string[]) => [...xs].sort()

describe('the migration of a version 1 save', () => {
  it('migrates a v1 save of each old top rung', () => {
    for (let top = 1; top <= 9; top++) {
      const s = migrateV1(v1({ ladder: { ...V1_LADDER, top } }))
      expect(placedIds(s)).toEqual(sorted(PLACED_V1[top]))
      // closed under needs: no rung is placed while a rung it needs is new
      for (const r of placedIds(s) as RungId[]) for (const n of needsClosure(r)) expect(s.ladder.rungs[n]?.status).toBe('placed')
      for (const st of Object.values(s.ladder.rungs)) expect(st).toMatchObject({ status: 'placed', probation: 0 })
      expect(s.ladder).toMatchObject({ day: 1, checkedOn: 1, lastAt: undefined })
      expect(s.ladder.mode).toMatchObject({ kind: 'placement', why: 'migration', jump: MIGRATION_JUMP, max: MIGRATION_PROBES, probes: 0 })
      expect(s.items).toEqual(v1().items)
    }
    expect(MIGRATION_JUMP).toBe(4)
    expect(MIGRATION_PROBES).toBe(10)
  })
  it('the placed sets are the design\'s table', () => {
    expect(PLACED_V1[1]).toEqual([])
    expect(PLACED_V1[3]).toEqual(['1', '2', '3', '4', '5'])
    expect(PLACED_V1[6]).not.toContain('8')
    expect(PLACED_V1[6]).toEqual(['1', '2', '3', '4', '5', '6', '7', '9', '10', '11'])
    expect(sorted(PLACED_V1[7].filter((r) => !PLACED_V1[6].includes(r)))).toEqual(sorted(['T1', 'T2', '8', 'S1']))
    expect(sorted(PLACED_V1[8].filter((r) => !PLACED_V1[7].includes(r)))).toEqual(sorted(['T3', 'T5', 'S2']))
    expect(sorted(PLACED_V1[9].filter((r) => !PLACED_V1[8].includes(r)))).toEqual(sorted(['T4a', 'T4b', 'T6']))
  })
  it('the placement starts at the offered rung above the highest placed one', () => {
    const at = (top: number) => (migrateV1(v1({ ladder: { ...V1_LADDER, top } })).ladder.mode as { at: RungId }).at
    expect(at(1)).toBe('1')
    expect(at(2)).toBe('4')
    expect(at(5)).toBe('8')
    expect(at(6)).toBe('12')
    expect(rungDef(at(7)).order).toBeGreaterThan(rungDef('T2').order)
    expect(at(8)).toBe('12')
  })
  it('the placement probes only the plus and minus strand that has no switch', () => {
    const m = migrateV1(v1({ ladder: { ...V1_LADDER, top: 8 } })).ladder.mode
    expect(m).toMatchObject({ kind: 'placement', why: 'migration', plusOnly: true })
    // every probe is wrong or slow in turn: the walk never reaches a new strand or a switched rung
    let ladder = migrateV1(v1({ ladder: { ...V1_LADDER, top: 8 } })).ladder
    const set = DEFAULT_SETTINGS
    const probed: RungId[] = []
    for (let i = 0; i < 30 && ladder.mode.kind === 'placement'; i++) {
      probed.push(ladder.mode.at)
      const out = afterProbe(ladder, ladder.mode, { mark: i % 3 === 2 ? 'x' : 'o', fast: i % 2 === 0, set })
      ladder = out.ladder
    }
    for (const r of probed) { expect(rungDef(r).strand).toBe('plus'); expect(rungDef(r).switch).toBeUndefined() }
    expect(probed.some((r) => ['T6', 'H1', 'C1', 'C2', 'S1', 'S2', 'T4b'].includes(r))).toBe(false)
  })
  it('a wrong probe at the top of the plus strand never walks into T6, H1 or C1', () => {
    let ladder = migrateV1(v1({ ladder: { ...V1_LADDER, top: 8 } })).ladder
    const seen: RungId[] = []
    while (ladder.mode.kind === 'placement') {
      seen.push(ladder.mode.at)
      ladder = afterProbe(ladder, ladder.mode, { mark: 'x', fast: false, set: DEFAULT_SETTINGS }).ladder
    }
    expect(seen.filter((r) => ['T6', 'H1', 'C1'].includes(r))).toEqual([])
    expect(ladder.rungs.T6).toBeUndefined()
  })
  it('an old speed with no finite arrival time starts from SPEED_START; a hold that is not a number becomes 0', () => {
    expect(migrateV1(v1({ speed: { underMs: [] } })).speed).toEqual({ small: SPEED_START })
    expect(migrateV1(v1({ speed: { arrivalMs: Infinity, underMs: [1], hold: 1 } })).speed).toEqual({ small: SPEED_START })
    expect(migrateV1(v1({ speed: { arrivalMs: 5000, underMs: [1, 'x'], hold: 'y' } })).speed).toEqual({ small: { arrivalMs: 5000, underMs: [1], hold: 0 } })
  })
  it('a partial item stat is filled in', () => {
    const s = migrateV1(v1({ items: { [it1.id]: { seen: 2 }, '1+1=2/c': null } }))
    expect(s.items[it1.id]).toEqual({ seen: 2, wrong: 0, timeout: 0, recent: '', times: [], picks: {} })
    expect(s.items['1+1=2/c']).toEqual({ seen: 0, wrong: 0, timeout: 0, recent: '', times: [], picks: {} })
  })
  it('the range maps', () => {
    expect(RANGE_V1).toEqual({ 1: '1', 2: '3', 3: '5', 4: '6', 5: '7', 6: '11', 7: 'T2', 8: 'T5', 9: 'T6' })
    for (const [old, now] of Object.entries(RANGE_V1)) {
      expect(migrateV1(v1({ settings: { range: Number(old) } })).settings.range).toBe(now)
    }
    expect(migrateV1(v1()).settings.range).toBe('auto')
  })
  it('times, divide and the new switches turn on; arrival and the tune stay', () => {
    const set = migrateV1(v1()).settings
    expect(set).toMatchObject({ times: true, divide: true, compare: true, jumps: true, missing100: true, hundreds: true, arrival: 5000, flightMusic: true })
  })
  it('the speed becomes the small band\'s', () => {
    expect(migrateV1(v1()).speed).toEqual({ small: { arrivalMs: 6400, underMs: [1200, 1500], hold: 2 } })
  })
  it('points, best, ships, heard and runs stay', () => {
    expect(migrateV1(v1())).toMatchObject({ totalPoints: 40, best: 12, ships: [1, 2], ship: 2, heard: { demo: 1, missing: 2 }, runs: 3, lastFact: '+2,3', sinceZero: 4 })
    expect(migrateV1(v1()).intro).toEqual({ day: 0, mistakes: {}, again: [] })
  })
  it('a save that is not an object, or has no ladder, migrates to the default save with its items kept', () => {
    expect(migrateV1(null)).toEqual(DEFAULT_SAVE)
    expect(migrateV1('x')).toEqual(DEFAULT_SAVE)
    const s = migrateV1({ items: v1().items, best: 5 })
    expect(s.items).toEqual(v1().items)
    expect(s.ladder).toEqual(LADDER_START)
    expect(s.best).toBe(5)
  })
  it('the persisted v1 save is migrated when the store reads it', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state: v1({ ladder: { ...V1_LADDER, top: 5 } }), version: 1 }))
    vi.resetModules()
    const fresh = (await import('./store')).useSpaceCatStore
    await Promise.resolve()
    const s = fresh.getState()
    expect(Object.keys(s.ladder.rungs)).toHaveLength(7)
    expect(s.speed.small.arrivalMs).toBe(6400)
    expect(s.items[it1.id].seen).toBe(3)
    expect(typeof s.takeRound).toBe('function')
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).version).toBe(2)
  })
  it('a v2 save that still has a `history` list is read without it', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state: { best: 7, history: [{ t: 1, rung: '1', change: 'passed' }] }, version: 2 }))
    vi.resetModules()
    const fresh = (await import('./store')).useSpaceCatStore
    await Promise.resolve()
    expect(fresh.getState().best).toBe(7)
    expect('history' in fresh.getState()).toBe(false)
  })
  it('the staging copy migrates the same (a `staging:` key through the prefixed storage)', async () => {
    const real = window.localStorage
    real.setItem(STAGING_PREFIX + SAVE_KEY, JSON.stringify({ state: v1({ ladder: { ...V1_LADDER, top: 6 } }), version: 1 }))
    Object.defineProperty(window, 'localStorage', { value: prefixedStorage(real, STAGING_PREFIX), configurable: true })
    try {
      vi.resetModules()
      const fresh = (await import('./store')).useSpaceCatStore
      await Promise.resolve()
      expect(Object.keys(fresh.getState().ladder.rungs).sort()).toEqual(sorted(PLACED_V1[6]))
      expect(JSON.parse(real.getItem(STAGING_PREFIX + SAVE_KEY)!).version).toBe(2)
    } finally {
      Object.defineProperty(window, 'localStorage', { value: real, configurable: true })
    }
  })
  it('?copy-prod: a v1 production save copied over staging migrates', async () => {
    const real = window.localStorage
    real.setItem(SAVE_KEY, JSON.stringify({ state: v1({ ladder: { ...V1_LADDER, top: 7 } }), version: 1 }))
    copyUnprefixedOver(real, STAGING_PREFIX)
    Object.defineProperty(window, 'localStorage', { value: prefixedStorage(real, STAGING_PREFIX), configurable: true })
    try {
      vi.resetModules()
      const fresh = (await import('./store')).useSpaceCatStore
      await Promise.resolve()
      expect(Object.keys(fresh.getState().ladder.rungs).sort()).toEqual(sorted(PLACED_V1[7]))
      // production's own copy stays a v1 save: staging never writes it
      expect(JSON.parse(real.getItem(SAVE_KEY)!).version).toBe(1)
    } finally {
      Object.defineProperty(window, 'localStorage', { value: real, configurable: true })
    }
  })
})
