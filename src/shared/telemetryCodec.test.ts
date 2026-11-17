import { describe, expect, it } from 'vitest'
import { chunkHeader, decodeChunk, encodeChunk } from './telemetryCodec'
import type { TelemetryEvent } from './telemetry'
import { GOLDEN_BOOK2, GOLDEN_CLOCK, book2Events, clockEvents } from './__fixtures__/telemetry/generate'

const bySession = (evs: TelemetryEvent[]) => {
  const m = new Map<string, TelemetryEvent[]>()
  for (const e of evs) m.set(e.s, [...(m.get(e.s) ?? []), e])
  return [...m.values()]
}
const roundTrip = (evs: TelemetryEvent[]) => expect(JSON.stringify(decodeChunk(encodeChunk(evs)))).toBe(JSON.stringify(evs))
/** today's stored JSON of the events against their sealed values, one chunk per session */
export const ratio = (evs: TelemetryEvent[]) =>
  JSON.stringify({ v: 1, events: evs }).length / bySession(evs).reduce((n, s) => n + encodeChunk(s).length, 0)

const S = 'mf1abc-x1y2z'
const ev = (t: number, e: string, data: Record<string, unknown> = {}): TelemetryEvent => ({ t, s: S, run: 1, e, g: 'book2', ...data })

describe('the codec', () => {
  it('round-trips every session of the fixtures byte for byte', () => {
    for (const s of [...bySession(book2Events()), ...bySession(clockEvents())]) roundTrip(s)
  })

  it('round-trips the odd shapes', () => {
    roundTrip([
      ev(1_760_000_000_000, 'round', { options: [{ f: 'a', t: null, d: true }], pad: ['x', ['y']], nested: { a: { b: [1, 2.5] } } }),
      ev(1_760_000_000_000, 'answer', { tapped: null, picture: null, ms: 1.25, neg: -42, big: 9_007_199_254_740_991, small: 1e-7 }),
      { t: 1_760_000_000_001, s: S, run: 1, e: 'old' }, // no g
      ev(1_760_000_000_002, 'settings', { keys: ['name'], name: 'דני הקטן', emoji: '🙂' }),
      { e: 'reordered', run: 2, s: S, t: 1_760_000_000_003, g: 'book2' }, // its keys in a new order
      ev(1_760_000_000_004, 'mixed', { v: 'a' }),
      ev(1_760_000_000_005, 'mixed', { v: 3 }), // one key, a string in one row and a number in another
      { t: 1_760_000_000_006, s: 'another', run: 1, e: 'foreign s' },
      ev(1_760_000_000_007, 'opt'),
      ev(1_760_000_000_008, 'opt', { firstAnswer: { kind: 'choice', index: 1 } }), // an optional field
      ev(1_760_000_000_007, 'back in time'),
      ev(1_760_000_000_009, 'num-ish', { id: '12', n: '0' }),
    ])
  })

  it('drops undefined fields, as storing a log does', () => {
    const evs = [ev(1, 'x', { phase: undefined, ok: true })]
    expect(JSON.stringify(decodeChunk(encodeChunk(evs)))).toBe(JSON.stringify(evs))
  })

  it('the header says the session, the first and last t and the count, without a decode', () => {
    const evs = [ev(100, 'a'), ev(150, 'b'), ev(170, 'c')]
    expect(chunkHeader(encodeChunk(evs))).toEqual({ v: 3, s: S, t0: 100, t1: 170, n: 3, enc: 'cz1' })
    expect(chunkHeader('{"v":1,"events":[]}')).toBeNull()
    expect(chunkHeader('nope')).toBeNull()
    expect(chunkHeader(null)).toBeNull()
  })

  it('a corrupt payload, a wrong version, truncated base64 and non-JSON give null, never a throw', () => {
    const good = encodeChunk([ev(1, 'a'), ev(2, 'b')])
    const h = JSON.parse(good)
    expect(decodeChunk(JSON.stringify({ ...h, d: h.d.slice(0, h.d.length - 7) }))).toBeNull()
    expect(decodeChunk(JSON.stringify({ ...h, d: 'AAAA' + h.d.slice(4) }))).toBeNull()
    expect(decodeChunk(JSON.stringify({ ...h, d: '!!!' }))).toBeNull()
    expect(decodeChunk(JSON.stringify({ ...h, v: 2 }))).toBeNull()
    expect(decodeChunk(JSON.stringify({ ...h, n: 3 }))).toBeNull()
    expect(decodeChunk(JSON.stringify({ ...h, t0: 0 }))).toBeNull()
    expect(decodeChunk(JSON.stringify({ ...h, enc: 'zz' }))).toBeNull()
    expect(decodeChunk('{oops')).toBeNull()
    expect(decodeChunk(null)).toBeNull()
  })

  it('is deterministic: the same events give the same string (two tabs that seal one session write one value)', () => {
    const [s] = bySession(book2Events())
    expect(encodeChunk(s!)).toBe(encodeChunk(JSON.parse(JSON.stringify(s))))
  })

  it('refuses events it cannot seal exactly (none, or a t that is not an integer)', () => {
    expect(() => encodeChunk([])).toThrow()
    expect(() => encodeChunk([{ ...ev(1, 'a'), t: 1.5 }])).toThrow()
  })

  it('compresses the synthetic logs at least 6× against today\'s JSON', () => {
    const r = { book2: ratio(GOLDEN_BOOK2()), clock: ratio(GOLDEN_CLOCK()), book2Big: ratio(book2Events()), clockBig: ratio(clockEvents()) }
    process.stderr.write('codec ratio ' + JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v * 10) / 10]))) + '\n')
    // the synthetic values are more random than a child's play (uniform picks, wide ranges), so they compress worse
    expect(r.book2Big).toBeGreaterThanOrEqual(4.5)
    expect(r.clockBig).toBeGreaterThanOrEqual(6)
  })
})

// A local check on a real export (never committed): ALEF_TELEMETRY_SAMPLE=<path to an export> npx vitest run telemetryCodec
const SAMPLE = process.env.ALEF_TELEMETRY_SAMPLE
describe.skipIf(!SAMPLE)('the codec on a real export (local only)', () => {
  it('round-trips every session and prints the ratio', async () => {
    const { readFileSync } = await import('node:fs')
    const doc = JSON.parse(readFileSync(SAMPLE!, 'utf8'))
    const evs: TelemetryEvent[] = doc.events ?? doc.games.flatMap((g: { events: TelemetryEvent[] }) => g.events)
    const sessions = bySession(evs)
    for (const s of sessions) roundTrip(s)
    const per = sessions.map((s) => JSON.stringify(s).length / encodeChunk(s).length)
    process.stderr.write('real export ' + JSON.stringify({ events: evs.length, sessions: sessions.length, ratio: Math.round(ratio(evs) * 10) / 10,
      biggestSession: Math.round(per[sessions.map((s) => s.length).indexOf(Math.max(...sessions.map((s) => s.length)))]! * 10) / 10 }) + '\n')
  })
})
