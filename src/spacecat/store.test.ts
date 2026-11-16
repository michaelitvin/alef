import { beforeEach, describe, expect, it, vi } from 'vitest'
import { itemById } from './logic/facts'
import type { RoundResult } from './logic/round'
import { memorySavePort } from './savePort'
import { DEFAULT_SAVE, SAVE_KEY, savedShip } from './saveFormat'
import { useSpaceCatStore } from './store'

const it1 = itemById('2+3=5/c')!
const result = (r: Partial<RoundResult> = {}): RoundResult => ({
  result: 'right', end: 'arrival', lane: 1, number: 5, points: 1, lastLaneMs: 1000, endMs: 8000, underMs: 1000, startedUnder: false, ...r,
})
const store = () => useSpaceCatStore.getState()

describe('space cat store', () => {
  beforeEach(() => {
    localStorage.clear()
    useSpaceCatStore.setState({ ...DEFAULT_SAVE })
  })
  it('settings default', () => {
    expect(store().settings).toEqual({ range: 'auto', times: false, divide: false, arrival: 'auto', flightMusic: false })
  })
  it('a round updates the tally, the marks, the ladder and the sums after it', () => {
    store().recordRound(it1, result())
    const s = store()
    expect(s.items[it1.id]).toMatchObject({ seen: 1, wrong: 0, timeout: 0, recent: 'o' })
    expect(s.ladder.streak).toBe(1)
    expect(s.lastFact).toBe('+2,3')
    expect(s.sinceZero).toBe(1)
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
    store().recordRound(it1, result({ result: 'wrong', number: 8, points: 0, underMs: null }))
    expect(store().items[it1.id].picks['8']).toBe(1)
    expect(store().items[it1.id]).toMatchObject({ wrong: 1, recent: 'x' })
  })
  it('a time-out is marked t', () => {
    store().recordRound(it1, result({ result: 'timeout', points: 0, underMs: null }))
    expect(store().items[it1.id]).toMatchObject({ timeout: 1, wrong: 0, recent: 't' })
  })
  it('four right answers open rung 2 and the speed hold starts', () => {
    let opened
    for (let i = 0; i < 4; i++) opened = store().recordRound(it1, result()).opened
    expect(opened).toBe(2)
    expect(store().ladder.top).toBe(2)
    expect(store().speed.hold).toBeGreaterThan(0)
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
    expect(fresh.getState().ladder.top).toBe(1)
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
    port.recordRound(it1, result())
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
