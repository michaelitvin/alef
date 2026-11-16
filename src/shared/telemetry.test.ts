import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SESSION, STAGING_CAP_SHARE, TELEMETRY_CAPS, createTelemetry, exportDoc, filterEvents, readLog, telemetryCap,
} from './telemetry'
import { STAGING_PREFIX, prefixedStorage } from './stagingStorage'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('telemetry export', () => {
  it('carries a note on where the code and the docs are, so an analysis tool can find them', () => {
    const t = createTelemetry('t-about', { game: 'book2', maxChars: 100_000, about: { game: 'Test game', docs: ['docs/x.md'] } })
    t.track('run-start')
    const doc = JSON.parse(t.exportJson())
    expect(doc.about.repo).toBe('https://github.com/michaelitvin/alef')
    expect(doc.about.game).toBe('Test game')
    expect(doc.about.docs).toContain('docs/x.md')
    expect(doc.about.docs).toContain('docs/minigame-rules.md')
    expect(doc.about.howToAnalyse).toMatch(/Claude Code/)
    expect(doc.events).toHaveLength(1)
  })

  it('one document for several games: one about per game, each with its events', () => {
    const a = { game: 'Book 2', docs: ['docs/a.md'] }
    const b = { game: 'Clock', docs: ['docs/b.md'] }
    const ev = (e: string) => ({ t: 1, s: 'x', run: 0, e })
    const doc = JSON.parse(exportDoc([{ about: a, events: [ev('one')] }, { about: b, events: [ev('two'), ev('three')] }]))
    expect(typeof doc.exportedAt).toBe('string')
    expect(doc.games).toHaveLength(2)
    expect(doc.games[0].about).toMatchObject({ game: 'Book 2', repo: 'https://github.com/michaelitvin/alef' })
    expect(doc.games[0].about.docs).toEqual(['docs/a.md', 'docs/minigame-rules.md'])
    expect(doc.games[1].events.map((e: { e: string }) => e.e)).toEqual(['two', 'three'])
  })
})

describe('every event says its game and the page load', () => {
  it('new events carry g, and keep t, s, run, e and their own fields', () => {
    const t = createTelemetry('t-g', { game: 'clock' })
    t.setRun(4)
    t.track('answer', { ok: true, ms: 900 })
    const [ev] = JSON.parse(t.exportJson()).events
    expect(ev).toMatchObject({ s: SESSION, run: 4, e: 'answer', g: 'clock', ok: true, ms: 900 })
    expect(typeof ev.t).toBe('number')
  })

  it('two logs on one page share one session id', () => {
    const a = createTelemetry('t-a', { game: 'book2' })
    const b = createTelemetry('t-b', { game: 'duel' })
    a.track('x')
    b.track('y')
    expect(a.events()[0].s).toBe(b.events()[0].s)
    expect(a.events()[0].s).toBe(SESSION)
  })

  it('old events (no g, an old session) are read and kept unchanged', () => {
    const literal = '{"v":1,"events":[{"t":1760000000000,"s":"mf1abc-x1y2z","run":2,"e":"round","target":"bet","ok":false}]}'
    localStorage.setItem('t-old', literal)
    const t = createTelemetry('t-old', { game: 'book2' })
    t.track('round', { target: 'gimel' })
    const evs = t.events()
    expect(evs[0]).toEqual(JSON.parse(literal).events[0])
    expect(evs[0].g).toBeUndefined()
    expect(evs[1]).toMatchObject({ g: 'book2', target: 'gimel' })
    expect(readLog('t-old')[0]).toEqual(JSON.parse(literal).events[0])
  })
})

describe('readLog and filterEvents (for logs of games that are not on this page)', () => {
  it('reads a stored log without an instance; missing or broken logs read as empty', () => {
    localStorage.setItem('t-r', JSON.stringify({ v: 1, events: [{ t: 5, s: 'a', run: 1, e: 'x' }] }))
    expect(readLog('t-r')).toEqual([{ t: 5, s: 'a', run: 1, e: 'x' }])
    expect(readLog('t-none')).toEqual([])
    localStorage.setItem('t-bad', '{oops')
    expect(readLog('t-bad')).toEqual([])
    expect(localStorage.getItem('t-bad')).toBe('{oops')
  })

  it('reads the staging copy in the staging build (the prefixed storage)', () => {
    localStorage.setItem('t-s', JSON.stringify({ v: 1, events: [{ t: 1, s: 'prod', run: 1, e: 'x' }] }))
    localStorage.setItem(STAGING_PREFIX + 't-s', JSON.stringify({ v: 1, events: [{ t: 1, s: 'staging', run: 1, e: 'x' }] }))
    const real = window.localStorage
    Object.defineProperty(window, 'localStorage', { value: prefixedStorage(real, STAGING_PREFIX), configurable: true })
    try {
      expect(readLog('t-s')[0].s).toBe('staging')
      const t = createTelemetry('t-s', { game: 'book2' })
      t.track('y')
      t.flush()
      expect(JSON.parse(real.getItem(STAGING_PREFIX + 't-s')!).events).toHaveLength(2)
      expect(JSON.parse(real.getItem('t-s')!).events).toHaveLength(1)
    } finally {
      Object.defineProperty(window, 'localStorage', { value: real, configurable: true })
    }
  })

  it('filters by time: since keeps events at or after it', () => {
    const evs = [1, 5, 10].map((t) => ({ t, s: 'a', run: 0, e: 'x' }))
    expect(filterEvents(evs, { since: 5 }).map((e) => e.t)).toEqual([5, 10])
    expect(filterEvents(evs, {})).toEqual(evs)
  })
})

describe('the storage budget', () => {
  // localStorage counts UTF-16 code units; a 5 MB quota is ≈2.5 M of them in the strictest browsers.
  const QUOTA_CHARS = 2_500_000
  const TODAY_CHARS = 3 * 1_000_000 // three logs of 1 M each, before this change
  const games = Object.keys(TELEMETRY_CAPS) as (keyof typeof TELEMETRY_CAPS)[]
  const sum = (staging: boolean) => games.reduce((n, g) => n + telemetryCap(g, staging), 0)

  it('the caps are Book 2 0.7 M, clock 0.5 M and the frozen duel log at its old 1 M', () => {
    expect(TELEMETRY_CAPS).toEqual({ book2: 700_000, clock: 500_000, duel: 1_000_000 })
  })

  it('production\'s logs stay at 2.2 M in all, lower than today, with room for the saves', () => {
    expect(sum(false)).toBeLessThanOrEqual(2_200_000)
    expect(sum(false)).toBeLessThan(TODAY_CHARS)
    expect(QUOTA_CHARS - sum(false)).toBeGreaterThanOrEqual(250_000)
  })

  it('staging shares the quota, so it keeps a quarter of each cap', () => {
    for (const g of games) expect(telemetryCap(g, true)).toBe(Math.floor(TELEMETRY_CAPS[g] * STAGING_CAP_SHARE))
    expect(sum(false) + sum(true)).toBeLessThan(TODAY_CHARS)
  })

  it('the play-time ledger (60 days, 3 games, 10-digit ms) fits in the room left for the saves, with staging\'s copy', async () => {
    const { PLAYTIME_KEEP_DAYS } = await import('./playtime')
    const days: Record<string, unknown> = {}
    for (let i = 0; i < PLAYTIME_KEEP_DAYS; i++) days[`2026-01-${String(i).padStart(2, '0')}`] = { book2: 86_400_000, clock: 86_400_000, lessons: 86_400_000 }
    const one = JSON.stringify({ v: 1, days }).length
    expect(one).toBeLessThan(6_000)
    expect(QUOTA_CHARS - sum(false) - 2 * one).toBeGreaterThanOrEqual(240_000)
  })

  it('a live log past its cap trims its oldest events, as before', () => {
    const t = createTelemetry('t-cap', { game: 'clock', maxChars: 20_000 })
    for (let i = 0; i < 200; i++) t.track('x', { i, pad: 'p'.repeat(200) })
    t.flush()
    expect(localStorage.getItem('t-cap')!.length).toBeLessThanOrEqual(20_000)
    const is = readLog('t-cap').map((e) => e.i as number)
    expect(is[is.length - 1]).toBe(199)
    expect(is[0]).toBeGreaterThan(0)
  })

  it('the instances use their caps: Book 2 0.7 M, clock 0.5 M, duel 1 M', async () => {
    const { duel2Telemetry } = await import('../duel2/telemetry')
    const { clockTelemetry } = await import('../clock/telemetry')
    const { TELEMETRY_MAX_CHARS } = await import('../utils/duel/telemetry')
    expect(duel2Telemetry.maxChars).toBe(700_000)
    expect(clockTelemetry.maxChars).toBe(500_000)
    expect(TELEMETRY_MAX_CHARS).toBe(1_000_000)
    expect([duel2Telemetry.game, clockTelemetry.game]).toEqual(['book2', 'clock'])
  })
})
