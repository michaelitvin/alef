import { BOSS_HP, MONSTERS_PER_WAVE } from './rules'
import { describe, it, expect } from 'vitest'
import { duelReducer, initialDuelState } from './reducer'
import { markById } from './marks'
import { wordsFor } from './words'
import type { DuelState, Round } from '../../types/duel'

const mk = (over: Partial<Round> = {}): Round => ({
  id: 1, type: 'A', target: markById('kamatz'), runes: [markById('kamatz'), markById('segol')], word: wordsFor('a')[0],
  padWords: [], monster: 'fuzzy', boss: false, walkMs: 9000, ...over,
})
const start = () => duelReducer(initialDuelState, { type: 'START' })
const ready = (s: DuelState, r = mk()) => duelReducer(s, { type: 'ROUND_READY', round: r })
const tap = (s: DuelState, id: string) => duelReducer(s, { type: 'CHOOSE', choice: { kind: 'rune', mark: markById(id) }, effect: 'boom' })
const adv = (s: DuelState) => duelReducer(s, { type: 'ADVANCE' })

describe('round preview (shown while the wizard explains it)', () => {
  it('shows the round without walking, ignores taps and the mega spell, and ROUND_READY starts it', () => {
    const r = mk()
    let s = duelReducer(start(), { type: 'ROUND_PREVIEW', round: r })
    expect(s.round).toBe(r)
    expect(s.walking).toBe(false)
    expect(s.preview).toBe(true)
    expect(tap(s, 'kamatz').outcome).toBeNull()
    expect(duelReducer({ ...s, mega: 99 }, { type: 'MEGA', effect: 'mega' }).outcome).toBeNull()
    s = ready(s, r)
    expect(s.preview).toBe(false)
    expect(tap(s, 'kamatz').outcome).toMatchObject({ kind: 'hit' })
  })
})

describe('boss strength', () => {
  it('the boss takes more hits than a whole wave of monsters (playtest: 3 hits after 5 kills felt like an anticlimax)', () => {
    expect(BOSS_HP).toBeGreaterThan(MONSTERS_PER_WAVE)
  })
})

describe('duelReducer', () => {
  it('starts a run and asks for the first spawn', () => {
    const s = start()
    expect(s).toMatchObject({ phase: 'playing', hearts: 3, wave: 1, score: 0, round: null })
    expect(s.next).toEqual({ kind: 'spawn', wave: 1, boss: false, announce: null })
  })
  it('A/D walk at once; B/C wait for WALK_START', () => {
    expect(ready(start()).walking).toBe(true)
    const b = ready(start(), mk({ type: 'B' }))
    expect(b.walking).toBe(false)
    expect(duelReducer(b, { type: 'WALK_START' }).walking).toBe(true)
  })
  it('hit: score, combo, mega meter; a second tap is ignored', () => {
    const s = tap(ready(start()), 'patach')
    expect(s.outcome).toMatchObject({ kind: 'hit', final: true, points: 100, effect: 'boom' })
    expect(s).toMatchObject({ score: 100, combo: 1, mega: 1, hearts: 3 })
    expect(tap(s, 'segol')).toBe(s)
  })
  it('miss: heart lost, combo reset, miss counted for the target', () => {
    const s = tap(ready(start()), 'segol')
    expect(s.outcome).toMatchObject({ kind: 'miss', choiceKey: 'segol' })
    expect(s).toMatchObject({ hearts: 2, combo: 0 })
    expect(s.runMisses.kamatz).toBe(1)
  })
  it('timeout counts as a miss with no choice', () => {
    expect(duelReducer(ready(start()), { type: 'TIMEOUT' }).outcome).toMatchObject({ kind: 'miss', choiceKey: null })
  })
  it('twin on C is forgiven once; tapping the same twin again is ignored; a different wrong tap is a miss', () => {
    const c = ready(start(), mk({ type: 'C', runes: [markById('kamatz'), markById('patach'), markById('segol')] }))
    const t1 = tap(c, 'patach')
    expect(t1.outcome).toBeNull()
    expect(t1).toMatchObject({ twinTried: 'patach', hearts: 3, combo: 0 })
    expect(tap(t1, 'patach')).toBe(t1)
    const t3 = tap(t1, 'segol')
    expect(t3.outcome).toMatchObject({ kind: 'miss' })
    expect(t3.hearts).toBe(2)
  })
  it('a wave is 5 kills; misses do not count', () => {
    let s = start()
    for (let i = 0; i < 5; i++) {
      s = tap(ready(s, mk({ id: i })), 'kamatz')
      if (i === 2) s = duelReducer(ready(adv(s), mk({ id: 99 })), { type: 'TIMEOUT' })
      s = adv(s)
    }
    expect(s.wave).toBe(2)
    expect(s.kills).toBe(0)
    expect(s.next).toEqual({ kind: 'spawn', wave: 2, boss: false, announce: 'new-monster' })
  })
  it('wave 3 announces its new monster (the ghost), not "new spells"; wave 5 ends in a boss that keeps damage through a miss', () => {
    let s: DuelState = { ...start(), wave: 2, kills: 4, round: mk(), walking: true, next: null }
    s = adv(tap(s, 'kamatz'))
    expect(s.next).toEqual({ kind: 'spawn', wave: 3, boss: false, announce: 'new-monster' })
    s = { ...s, wave: 5, kills: 4, round: mk(), walking: true, outcome: null, next: null }
    s = adv(tap(s, 'kamatz'))
    expect(s.bossHp).toBe(BOSS_HP)
    expect(s.next).toEqual({ kind: 'spawn', wave: 5, boss: true, announce: 'boss' })
    s = tap(ready(s, mk({ boss: true, monster: 'dragon' })), 'kamatz')
    expect(s.outcome).toMatchObject({ final: false })
    expect(s.bossHp).toBe(BOSS_HP - 1)
    s = tap(ready(adv(s), mk({ boss: true, monster: 'dragon', id: 7 })), 'segol')
    expect(s.bossHp).toBe(BOSS_HP - 1)
    expect(s.hearts).toBe(2)
  })
  it('the last boss hit is final and starts the next wave', () => {
    let s: DuelState = { ...ready(start(), mk({ boss: true, monster: 'dragon' })), wave: 5, bossHp: 1 }
    s = tap(s, 'kamatz')
    expect(s.outcome).toMatchObject({ final: true })
    expect(adv(s).next).toEqual({ kind: 'spawn', wave: 6, boss: false, announce: 'new-monster' })
  })
  it('a second ADVANCE for the same outcome is ignored (no double spawn / kill)', () => {
    const once = adv(tap(ready(start()), 'kamatz'))
    expect(adv(once)).toBe(once)
    expect(once.kills).toBe(1)
  })
  it('MEGA kills, resets the meter and scores +200', () => {
    let s: DuelState = { ...ready(start()), mega: 8, combo: 2 }
    s = duelReducer(s, { type: 'MEGA', effect: 'mega' })
    expect(s.outcome).toMatchObject({ kind: 'hit', mega: true, points: 340, effect: 'mega', choiceKey: null })
    expect(s.mega).toBe(0)
  })
  it('MEGA is ignored until the meter is full', () => {
    const s = ready(start())
    expect(duelReducer(s, { type: 'MEGA', effect: 'mega' })).toBe(s)
  })
  it('game over after the last heart', () => {
    const s = adv(tap({ ...ready(start()), hearts: 1 }, 'segol'))
    expect(s.phase).toBe('over')
    expect(s.next).toEqual({ kind: 'over' })
  })
  it('pause blocks choices and timeouts; resume clears it', () => {
    const p = duelReducer(ready(start()), { type: 'PAUSE' })
    expect(tap(p, 'kamatz')).toBe(p)
    expect(duelReducer(p, { type: 'TIMEOUT' })).toBe(p)
    expect(duelReducer(p, { type: 'RESUME' }).paused).toBe(false)
  })
  it('records explained screens once', () => {
    const s = duelReducer(duelReducer(start(), { type: 'SCREEN_EXPLAINED', key: 'silent' }), { type: 'SCREEN_EXPLAINED', key: 'silent' })
    expect(s.seenScreens).toEqual(['silent'])
  })
})
