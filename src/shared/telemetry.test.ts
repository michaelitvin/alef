import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FROZEN_LOG_KEYS, LIVE_BUDGET, RAW_FLOOR_DAYS, ROLLUP_BUDGET, SESSION, STAGING_SHARE, chunkKey, createTelemetry, exportDoc, exportFileName,
  filterEvents, isChunkKey, liveBudget, ownsKey, readLog, registerTelemetryLogs, registeredLogs, rollupBudget, rollupKey, type TelemetryLog,
} from './telemetry'
import { STAGING_PREFIX, copyUnprefixedOver, isTelemetryKey, prefixedStorage } from './stagingStorage'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('telemetry export', () => {
  it('carries a note on where the code and the docs are, so an analysis tool can find them', () => {
    const t = createTelemetry('t-about', { game: 'book2', about: { game: 'Test game', docs: ['docs/x.md'] } })
    t.track('run-start')
    const doc = JSON.parse(exportDoc([{ about: t.about!, events: t.events() }])).games[0]
    expect(doc.about.repo).toBe('https://github.com/michaelitvin/alef')
    expect(doc.about.game).toBe('Test game')
    expect(doc.about.docs).toContain('docs/x.md')
    expect(doc.about.docs).toContain('docs/minigame-rules/README.md')
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
    expect(doc.games[0].about.docs).toEqual(['docs/a.md', 'docs/minigame-rules/README.md'])
    expect(doc.games[1].events.map((e: { e: string }) => e.e)).toEqual(['two', 'three'])
    expect(doc.since).toBeNull()
  })

  it('each part can name its key, and the document says the period it covers', () => {
    const doc = JSON.parse(exportDoc([{ key: 'k-1', about: { game: 'A', docs: [] }, events: [] }], { since: Date.UTC(2026, 9, 17) }))
    expect(doc.games[0].key).toBe('k-1')
    expect(doc.since).toBe('2026-10-17T00:00:00.000Z')
  })

  it('the file name lists the games and the date', () => {
    expect(exportFileName(['book2', 'duel'], new Date('2026-11-16T10:00:00Z'))).toBe('alef-telemetry-book2-duel-2026-11-16.json')
  })
})

describe('every event says its game and the page load', () => {
  it('new events carry g, and keep t, s, run, e and their own fields', () => {
    const t = createTelemetry('t-g', { game: 'clock' })
    t.setRun(4)
    t.track('answer', { ok: true, ms: 900 })
    const [ev] = t.events()
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
  const FROZEN_WORST = 1_000_000 // the frozen first-duel log at its old cap, the most it can hold

  it('one live budget of 0.8 M for every game, 0.15 M of roll-ups, and staging keeps a quarter of each', () => {
    expect(LIVE_BUDGET).toBe(800_000)
    expect(ROLLUP_BUDGET).toBe(150_000)
    expect(STAGING_SHARE).toBe(0.25)
    expect(RAW_FLOOR_DAYS).toBe(30)
    expect(liveBudget(true)).toBe(200_000)
    expect(rollupBudget(true)).toBe(37_500)
  })

  it('production 0.8 M + 0.15 M + the frozen log (1 M) = 1.95 M; with staging\'s quarters (0.2 M + 0.0375 M) 2.1875 M, leaving ≥ 0.3 M for the saves', () => {
    const prod = liveBudget(false) + rollupBudget(false) + FROZEN_WORST
    expect(prod).toBe(1_950_000)
    const all = prod + liveBudget(true) + rollupBudget(true)
    expect(all).toBe(2_187_500)
    expect(all).toBeLessThanOrEqual(2_200_000)
    expect(QUOTA_CHARS - all).toBeGreaterThanOrEqual(300_000)
  })

  it('staging\'s own frozen copy (up to 0.25 M) is not in that sum: with it the saves still have ≥ 0.05 M (and the staging build deletes it)', () => {
    const all = liveBudget(false) + rollupBudget(false) + FROZEN_WORST + liveBudget(true) + rollupBudget(true)
    expect(QUOTA_CHARS - all - 250_000).toBeGreaterThanOrEqual(50_000)
  })

  it('the play-time ledger (60 days, 4 games, 10-digit ms) fits in the room left for the saves, with staging\'s copy', async () => {
    const { PLAYTIME_KEEP_DAYS } = await import('./playtime')
    const days: Record<string, unknown> = {}
    for (let i = 0; i < PLAYTIME_KEEP_DAYS; i++) days[`2026-01-${String(i).padStart(2, '0')}`] = { book2: 86_400_000, clock: 86_400_000, lessons: 86_400_000, spacecat: 86_400_000 }
    const one = JSON.stringify({ v: 1, days }).length
    expect(one).toBeLessThan(6_000)
    const all = liveBudget(false) + rollupBudget(false) + FROZEN_WORST + liveBudget(true) + rollupBudget(true)
    expect(QUOTA_CHARS - all - 2 * one).toBeGreaterThanOrEqual(290_000)
  })

  it('the budget does not grow with the number of games: the instances have no cap of their own', async () => {
    const { duel2Telemetry } = await import('../duel2/telemetry')
    const { clockTelemetry } = await import('../clock/telemetry')
    expect('maxChars' in duel2Telemetry).toBe(false)
    expect([duel2Telemetry.game, clockTelemetry.game]).toEqual(['book2', 'clock'])
  })
})

describe('the keys of a log\'s chunks and roll-up', () => {
  it('chunk and roll-up keys sit under the log\'s base and end in -telemetry', () => {
    expect(chunkKey('alef-duel2-telemetry', 1_760_000_000_000, 'mf1abc-x1y2z')).toBe(`alef-duel2~${(1_760_000_000_000).toString(36)}~mf1abc-x1y2z-telemetry`)
    expect(rollupKey('alef-clock-telemetry')).toBe('alef-clock~sum-telemetry')
  })

  it('a key belongs to its own log only: alef-duel~ never matches alef-duel2~', () => {
    const c2 = chunkKey('alef-duel2-telemetry', 5, 'a-b')
    expect(ownsKey('alef-duel2-telemetry', c2)).toBe(true)
    expect(ownsKey('alef-duel-telemetry', c2)).toBe(false)
    expect(ownsKey('alef-duel-telemetry', 'alef-duel2~x~y-telemetry')).toBe(false)
    expect(ownsKey('alef-duel2-telemetry', 'alef-duel2-telemetry')).toBe(false)
    expect(ownsKey('alef-duel2-telemetry', rollupKey('alef-duel2-telemetry'))).toBe(true)
    expect(ownsKey('alef-duel2-telemetry', STAGING_PREFIX + c2)).toBe(false)
  })

  it('a roll-up key is not a chunk key', () => {
    expect(isChunkKey(chunkKey('alef-clock-telemetry', 1, 's-1'))).toBe(true)
    expect(isChunkKey(rollupKey('alef-clock-telemetry'))).toBe(false)
    expect(isChunkKey('alef-clock-telemetry')).toBe(false)
    expect(isChunkKey('alef-duel2')).toBe(false)
  })

  it('every new key shape is a telemetry key, with and without the staging prefix, so ?copy-prod copies none', () => {
    const keys = [chunkKey('alef-duel2-telemetry', 9, 'q-w'), rollupKey('alef-duel2-telemetry'), 'alef-clock-telemetry']
    for (const k of keys) {
      expect(isTelemetryKey(k)).toBe(true)
      expect(isTelemetryKey(STAGING_PREFIX + k)).toBe(true)
    }
    for (const k of keys) localStorage.setItem(k, 'x')
    localStorage.setItem('alef-duel2', '{"save":1}')
    copyUnprefixedOver(localStorage, STAGING_PREFIX)
    expect(localStorage.getItem(STAGING_PREFIX + 'alef-duel2')).toBe('{"save":1}')
    for (const k of keys) expect(localStorage.getItem(STAGING_PREFIX + k)).toBeNull()
  })
})

describe('the log registry', () => {
  it('a new game registers its log with no change in core (a string game, its own key)', () => {
    const spacecat: TelemetryLog = { key: 'alef-spacecat-telemetry', label: 'Space Cat', game: 'spacecat', about: { game: 'Space Cat', docs: [] } }
    registerTelemetryLogs([spacecat])
    expect(registeredLogs()).toContainEqual(spacecat)
    const t = createTelemetry(spacecat.key, { game: spacecat.game })
    t.track('answer', { ok: true })
    expect(t.events()[0]).toMatchObject({ g: 'spacecat', e: 'answer' })
    t.clear()
  })

  it('the parent registry registers every game\'s logs, the frozen one too', async () => {
    await import('../parent/registry')
    const keys = registeredLogs().map((l) => l.key)
    expect(keys).toEqual(expect.arrayContaining(['alef-duel2-telemetry', 'alef-clock-telemetry', 'alef-duel-telemetry']))
    expect(FROZEN_LOG_KEYS).toContain('alef-duel-telemetry')
  })
})
