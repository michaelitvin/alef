import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MS_EDGES, emptyRollup, foldChunk, foldEvents, foldOldDays, msBin, readRollup, trimRollups, weekOf, type Rollup } from './telemetryRollup'
import { chunkKey, rollupKey } from './telemetryChunks'
import { rollupsFor, type RollupFact, type TelemetryEvent } from './telemetry'
import { STAGING_PREFIX, copyUnprefixedOver } from './stagingStorage'
import { book2Events, clockEvents } from './__fixtures__/telemetry/generate'
import { BOOK2_LOG, book2Facts } from '../duel2/telemetryLog'
import { CLOCK_LOG, clockFacts } from '../clock/telemetryLog'
import { lessonsParent } from '../lessons/parent'

beforeEach(() => localStorage.clear())

const bySession = (evs: TelemetryEvent[]) => {
  const m = new Map<string, TelemetryEvent[]>()
  for (const e of evs) m.set(e.s, [...(m.get(e.s) ?? []), e])
  return [...m.values()]
}
const day = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** the counts straight from the facts and the raw events, as an analysis of the raw log would compute them */
function direct(evs: TelemetryEvent[], facts: (e: TelemetryEvent[]) => RollupFact[]) {
  const out: Record<string, { n: number; wrong: number; near: number; special: number; hints: number; replays: number; ms: number[]; chosen: Record<string, number> }> = {}
  const abandons: Record<string, number> = {}
  for (const s of bySession(evs)) {
    for (const f of facts(s)) {
      const k = `${day(f.t!)}|${f.item}`
      const it = (out[k] ??= { n: 0, wrong: 0, near: 0, special: 0, hints: 0, replays: 0, ms: MS_EDGES.map(() => 0).concat(0), chosen: {} })
      if (f.hint) it.hints++
      if (f.replay) it.replays++
      if (f.special) { it.special++; continue }
      if (f.ok === undefined) continue
      it.n++
      if (!f.ok) it.wrong++
      if (f.near) it.near++
      if (typeof f.ms === 'number') it.ms[msBin(f.ms)]!++
      if (!f.ok && f.chosen) it.chosen[f.chosen] = (it.chosen[f.chosen] ?? 0) + 1
    }
    for (const e of s) if (e.e === 'abandon') { const k = `${day(e.t)}|${String(e.screen ?? e.phase ?? '?')}`; abandons[k] = (abandons[k] ?? 0) + 1 }
  }
  return { out, abandons }
}
const flat = (r: Rollup) => {
  const out: Record<string, unknown> = {}
  const abandons: Record<string, number> = {}
  for (const [d, s] of Object.entries(r.days)) {
    for (const [id, it] of Object.entries(s.items)) out[`${d}|${id}`] = it
    for (const [w, n] of Object.entries(s.abandons)) abandons[`${d}|${w}`] = n
  }
  return { out, abandons }
}

describe('folding chunks into a roll-up', () => {
  it.each([['Book 2', book2Events, book2Facts], ['the clock', clockEvents, clockFacts]] as const)(
    '%s: per item and day, the same counts, wrongs, nears, mix-ups, abandons and histogram as the raw events', (_, gen, facts) => {
      const evs = gen({ days: 20 })
      const r = emptyRollup()
      for (const s of bySession(evs)) foldEvents(r, s, facts(s))
      const want = direct(evs, facts)
      const got = flat(r)
      expect(got.abandons).toEqual(want.abandons)
      // the mix-ups keep the 5 most frequent; the fixtures have fewer per item and day
      expect(got.out).toEqual(want.out)
      expect(Object.keys(want.out).length).toBeGreaterThan(20)
    })

  it('a session folded in two chunks equals it folded in one, minutes and runs too', () => {
    const [s] = bySession(book2Events({ days: 1, eventsPerSession: 200 }))
    const one = emptyRollup()
    foldEvents(one, s!, book2Facts(s!))
    const two = emptyRollup()
    const a = s!.slice(0, 77)
    const b = s!.slice(77)
    foldEvents(two, a, book2Facts(a))
    foldEvents(two, b, book2Facts(b))
    expect(two.days).toEqual(one.days)
    const d = Object.values(one.days)[0]!
    expect(d.minutes).toBeGreaterThan(10)
    expect(d.runs.length).toBeGreaterThan(0)
  })

  it('gallery events count nowhere', () => {
    const e = (t: number, data: Record<string, unknown>): TelemetryEvent => ({ t, s: 'x', run: 1, e: 'answer', g: 'book2', ...data })
    expect(book2Facts([e(1, { screen: 'letters', target: 'bet', result: 'right', ms: 900, tapped: 'bet', gallery: true }),
      e(2, { screen: 'tower', target: 'segol', result: 'wrong', gallery: true })])).toEqual([])
  })

  it('Book 2: the tower answer takes its latency, near and pick from the tower\'s choice of the same round', () => {
    const tw = (t: number, e: string, data: Record<string, unknown>): TelemetryEvent => ({ t, s: 'x', run: 1, e, g: 'book2', ...data, via: 'tower', visit: 1 })
    const facts = book2Facts([
      tw(1, 'round', { round: 4, target: 'segol' }),
      tw(2, 'choice', { round: 4, key: 'tsere', correct: false, twin: true, msShown: 2300 }),
      { t: 3, s: 'x', run: 1, e: 'answer', g: 'book2', screen: 'tower', target: 'segol', result: 'wrong', clock: 3 },
      tw(4, 'replay', { round: 4 }),
      { t: 5, s: 'x', run: 1, e: 'answer', g: 'book2', screen: 'letters', stage: 1, target: 'bet', tapped: 'kaf', result: 'near', ms: 1200 },
      { t: 6, s: 'x', run: 1, e: 'hint', g: 'book2', target: 'bet', auto: true },
    ])
    expect(facts).toEqual([
      { item: 'tower:segol', ok: false, near: true, t: 3, ms: 2300, chosen: 'tsere' },
      { item: 'tower:segol', replay: true, t: 4 },
      { item: 'letters:bet', ok: false, near: true, t: 5, ms: 1200, chosen: 'kaf' },
      { item: 'letters:bet', hint: true, t: 6 },
    ])
  })

  it('the clock: the real-time round counts apart, never as right or wrong; a picked option is the mix-up', () => {
    const round = (t: number, data: Record<string, unknown>): TelemetryEvent => ({
      t, s: 'x', run: 1, e: 'round', g: 'clock', exercise: 'what', time: '3-00', scaffolds: [], ms: 1500,
      options: [{ f: 'right', t: '3-00', d: false }, { f: 'hour1', t: '4-00', d: false }], ...data,
    })
    const r = emptyRollup()
    const evs = [round(1, { answer: { kind: 'choice', index: 1 }, correct: false, forgiven: false, real: false }),
      round(2, { answer: { kind: 'choice', index: 0 }, correct: true, forgiven: false, real: true })]
    foldEvents(r, evs, clockFacts(evs))
    expect(Object.values(r.days)[0]!.items['what:3-00']).toMatchObject({ n: 1, wrong: 1, special: 1, chosen: { '4-00': 1 } })
  })

  it('days past 90 fold into ISO weeks, with the same totals', () => {
    const evs = clockEvents({ days: 30 })
    const r = emptyRollup()
    for (const s of bySession(evs)) foldEvents(r, s, clockFacts(s))
    const total = (x: Rollup) => Object.values(x.days).reduce((n, d) => n + Object.values(d.items).reduce((m, i) => m + i.n + i.special, 0), 0)
    const before = total(r)
    foldOldDays(r, evs[evs.length - 1]!.t + 200 * 86_400_000)
    expect(Object.keys(r.days).every((k) => k.includes('-W'))).toBe(true)
    expect(total(r)).toBe(before)
    expect(weekOf('2026-01-01')).toBe('2026-W01')
    expect(weekOf('2027-01-01')).toBe('2026-W53')
  })
})

describe('foldChunk', () => {
  const evs = bySession(book2Events({ days: 2 }))[0]!
  const k = chunkKey(BOOK2_LOG.key, evs[0]!.t, evs[0]!.s)
  const span = { s: evs[0]!.s, t0: evs[0]!.t, t1: evs[evs.length - 1]!.t, n: evs.length }

  it('folds once: a second fold of the same chunk counts nothing', () => {
    localStorage.setItem(k, 'x')
    expect(foldChunk(BOOK2_LOG.key, BOOK2_LOG, k, span, evs)).toBe(true)
    const once = localStorage.getItem(rollupKey(BOOK2_LOG.key))
    expect(foldChunk(BOOK2_LOG.key, BOOK2_LOG, k, span, evs)).toBe(true)
    expect(localStorage.getItem(rollupKey(BOOK2_LOG.key))).toBe(once)
    expect(readRollup(BOOK2_LOG.key).folded.map((t) => t.k)).toEqual([k])
  })

  it('a chunk of an unregistered log only adds its count to dropped', () => {
    expect(foldChunk('alef-gone-telemetry', undefined, 'alef-gone~1~s-telemetry', { s: 's', t0: 1, t1: 2, n: 12 }, null)).toBe(true)
    expect(readRollup('alef-gone-telemetry')).toMatchObject({ dropped: 12, days: {} })
  })

  it('a roll-up key is never copied by ?copy-prod', () => {
    foldChunk(CLOCK_LOG.key, CLOCK_LOG, 'c', { s: 's', t0: 1, t1: 1, n: 0 }, [])
    localStorage.setItem(rollupKey(CLOCK_LOG.key), '{}')
    copyUnprefixedOver(localStorage, STAGING_PREFIX)
    expect(localStorage.getItem(STAGING_PREFIX + rollupKey(CLOCK_LOG.key))).toBeNull()
  })

  it('the lessons have no log and so no roll-up', () => {
    expect(lessonsParent.logs ?? []).toEqual([])
  })
})

describe('the roll-up budget', () => {
  it('6 games over a year stay under the budget: the oldest weeks of the largest go', () => {
    const BUDGET = 150_000
    const logs = Array.from({ length: 6 }, (_, i) => `alef-g${i}-telemetry`)
    const year = book2Events({ days: 365, eventsPerSession: 40 })
    for (const [i, key] of logs.entries()) {
      const r = emptyRollup()
      for (const s of bySession(year).slice(0, 120 + i * 30)) foldEvents(r, s, book2Facts(s))
      foldOldDays(r, year[year.length - 1]!.t)
      localStorage.setItem(rollupKey(key), JSON.stringify(r))
    }
    const total = () => logs.reduce((n, k) => n + localStorage.getItem(rollupKey(k))!.length, 0)
    expect(total()).toBeGreaterThan(BUDGET)
    const newest = Object.keys(readRollup(logs[5]!).days).filter((d) => !d.includes('W')).sort().pop()
    trimRollups(logs, BUDGET)
    expect(total()).toBeLessThanOrEqual(BUDGET)
    expect(Object.keys(readRollup(logs[5]!).days)).toContain(newest)
  }, 60_000)
})

describe('rollupsFor', () => {
  const tz = process.env.TZ
  afterEach(() => { if (tz === undefined) delete process.env.TZ; else process.env.TZ = tz })

  it('picks the days from `since` by the device\'s local date, as the roll-up days are (a timezone east of UTC)', () => {
    process.env.TZ = 'Asia/Jerusalem'
    const since = Date.UTC(2026, 10, 9, 22) // local midnight of 2026-11-10 in Jerusalem (UTC+2)
    expect(new Date(since).getDate()).toBe(10) // the timezone took effect
    const key = 'alef-tz-telemetry'
    const r = emptyRollup()
    const d = (): Rollup['days'][string] => ({ minutes: 1, runs: [], abandons: {}, items: {} })
    r.days = { '2026-11-09': d(), '2026-11-10': d(), '2026-11-11': d() }
    localStorage.setItem(rollupKey(key), JSON.stringify(r))
    const raw: TelemetryEvent[] = [{ t: Date.UTC(2026, 10, 12, 10), s: 'x', run: 1, e: 'answer' }]
    expect(Object.keys(rollupsFor(key, raw, since) ?? {})).toEqual(['2026-11-10', '2026-11-11'])
  })
})
