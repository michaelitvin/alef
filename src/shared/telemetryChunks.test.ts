// @vitest-environment jsdom

// The chunk store's read side: hand-built storage states (chunks made with the codec) read with no loss and no doubles.
import { beforeEach, describe, expect, it } from 'vitest'
import { encodeChunk } from './telemetryCodec'
import { chunkKey, clearLog, logStats, openJson, readLog, rollupKey } from './telemetryChunks'
import { filterEvents, type TelemetryEvent } from './telemetry'
import { STAGING_PREFIX, prefixedStorage } from './stagingStorage'
import { FROZEN_HISTORY, GOLDEN_SPELLQUEST, GOLDEN_CLOCK, GOLDEN_NOW, goldenExport } from './__fixtures__/telemetry/generate'
import { SPELLQUEST_LOG } from '../spellquest/telemetryLog'
import { CLOCK_LOG } from '../clock/telemetryLog'

const KEY = 'alef-spellquest-he-telemetry'
beforeEach(() => localStorage.clear())

const ev = (s: string, t: number, e = 'x', data: Record<string, unknown> = {}): TelemetryEvent => ({ t, s, run: 1, e, g: 'spellquest-he', ...data })
const seal = (evs: TelemetryEvent[], key = KEY) => {
  const k = chunkKey(key, evs[0]!.t, evs[0]!.s)
  localStorage.setItem(k, encodeChunk(evs))
  return k
}
const putOpen = (evs: TelemetryEvent[], sealed: string[] = [], key = KEY) => localStorage.setItem(key, openJson(evs, sealed))
const str = (x: unknown) => JSON.stringify(x)

describe('reading a log of sealed chunks and an open chunk', () => {
  const A = [1, 2, 3, 4].map((t) => ev('A', t))
  const B = [10, 11].map((t) => ev('B', t))

  it('a seal cut between its writes (the chunk is written, the open chunk still holds its events): no doubles', () => {
    const k = seal(A)
    putOpen([...A, ...B])
    expect(str(readLog(KEY))).toBe(str([...A, ...B]))
    expect(logStats(KEY)).toMatchObject({ events: 6, recent: 6, chunks: 1, unreadable: 0 })
    expect(localStorage.getItem(k)).not.toBeNull() // reading never writes
  })

  it('after the rewrite (the open chunk lists the chunk and lacks its events): no loss', () => {
    const k = seal(A)
    putOpen(B, [k])
    expect(str(readLog(KEY))).toBe(str([...A, ...B]))
    expect(logStats(KEY).events).toBe(6)
  })

  it('an old {v:1,events} open chunk (a build that dropped the list) next to chunks whose events it lacks: no loss', () => {
    seal(A)
    localStorage.setItem(KEY, JSON.stringify({ v: 1, events: B }))
    expect(str(readLog(KEY))).toBe(str([...A, ...B]))
  })

  it('a later event of the session in the open chunk is never taken for the chunk\'s copy', () => {
    seal(A)
    const later = [ev('A', 5), ev('A', 6)]
    localStorage.setItem(KEY, JSON.stringify({ v: 1, events: later })) // the list was lost
    expect(str(readLog(KEY))).toBe(str([...A, ...later]))
  })

  it('two chunks of one session, both still in the open chunk, and an event pair in one ms on the boundary', () => {
    const s1 = [ev('A', 1), ev('A', 2), ev('A', 3, 'tie', { n: 1 })]
    const s2 = [ev('A', 3, 'tie', { n: 2 }), ev('A', 4)]
    seal(s1)
    seal(s2)
    putOpen([...s1, ...s2, ev('A', 5)])
    expect(str(readLog(KEY))).toBe(str([...s1, ...s2, ev('A', 5)]))
    const k1 = chunkKey(KEY, 1, 'A')
    putOpen([...s2, ev('A', 5)], [k1])
    expect(str(readLog(KEY))).toBe(str([...s1, ...s2, ev('A', 5)]))
  })

  it('two identical events in one ms, split by the boundary, keep both', () => {
    const x = ev('A', 7, 'pause')
    seal([ev('A', 6), x])
    const k2 = seal([{ ...x }, ev('A', 8)])
    putOpen([{ ...x }, ev('A', 8)], [chunkKey(KEY, 6, 'A')])
    expect(readLog(KEY)).toHaveLength(4)
    putOpen([], [chunkKey(KEY, 6, 'A'), k2])
    expect(readLog(KEY)).toHaveLength(4)
  })

  it('a tab that holds only the start of a session another tab sealed: the prefix is dropped, not doubled', () => {
    seal(A)
    putOpen([A[0]!, A[1]!, ...B])
    expect(str(readLog(KEY))).toBe(str([...A, ...B]))
  })

  it('order is by time across chunks: A1, B1, A-rest read as A1, A-rest, B1', () => {
    const a1 = [ev('A', 1), ev('A', 2)]
    const b1 = [ev('B', 20), ev('B', 21)]
    const aRest = [ev('A', 5), ev('A', 6)]
    const k1 = seal(a1)
    const k2 = seal(b1)
    putOpen(aRest, [k1, k2])
    expect(readLog(KEY).map((e) => `${e.s}${e.t}`)).toEqual(['A1', 'A2', 'A5', 'A6', 'B20', 'B21'])
  })

  it('an unreadable chunk is skipped, kept and counted', () => {
    const k = seal(A)
    const bad = chunkKey(KEY, 50, 'C')
    localStorage.setItem(bad, '{"v":3,"s":"C","t0":50,"t1":51,"n":2,"enc":"cz1","d":"garbage"}')
    const worse = chunkKey(KEY, 60, 'D')
    localStorage.setItem(worse, 'not json')
    putOpen(B, [k])
    expect(str(readLog(KEY))).toBe(str([...A, ...B]))
    expect(localStorage.getItem(bad)).not.toBeNull()
    expect(logStats(KEY)).toMatchObject({ chunks: 3, unreadable: 2 })
  })

  it('a roll-up key is never read as a chunk', () => {
    localStorage.setItem(rollupKey(KEY), encodeChunk([ev('R', 1)]))
    putOpen(B)
    expect(str(readLog(KEY))).toBe(str(B))
    expect(logStats(KEY).chunks).toBe(0)
  })

  it('the frozen log beside Spell Quest\'s chunks reads byte-equal to today', () => {
    localStorage.setItem('alef-tower-history-telemetry', FROZEN_HISTORY)
    seal(A)
    localStorage.setItem('alef-tower-history~zz~A-telemetry', encodeChunk(A)) // even a stray chunk-shaped key under its base
    expect(str(readLog('alef-tower-history-telemetry'))).toBe(str(JSON.parse(FROZEN_HISTORY).events))
    expect(logStats('alef-tower-history-telemetry')).toMatchObject({ events: 1, chunks: 0 })
    clearLog('alef-tower-history-telemetry')
    expect(localStorage.getItem('alef-tower-history-telemetry')).toBe(FROZEN_HISTORY)
  })

  it('the staging build reads its own prefixed chunks only', () => {
    seal([ev('P', 1)]) // production's
    const real = window.localStorage
    Object.defineProperty(window, 'localStorage', { value: prefixedStorage(real, STAGING_PREFIX), configurable: true })
    try {
      const k = seal(A)
      putOpen(B, [k])
      expect(str(readLog(KEY))).toBe(str([...A, ...B]))
      expect(real.getItem(STAGING_PREFIX + k)).not.toBeNull()
    } finally {
      Object.defineProperty(window, 'localStorage', { value: real, configurable: true })
    }
    expect(readLog(KEY).map((e) => e.s)).toEqual(['P'])
  })

  it('the last-30-days count decodes only the chunk that straddles the cut', () => {
    const k1 = seal([ev('A', 1), ev('A', 2)])
    const k2 = seal([ev('B', 9), ev('B', 12)])
    const k3 = seal([ev('C', 20)])
    putOpen([ev('D', 30)], [k1, k2, k3])
    expect(logStats(KEY, 10)).toMatchObject({ events: 6, recent: 3 })
  })

  it('clear removes the open chunk, every sealed chunk and the roll-up, and nothing of another log', () => {
    const k = seal(A)
    putOpen(B, [k])
    localStorage.setItem(rollupKey(KEY), '{}')
    localStorage.setItem('alef-tower-history-telemetry', FROZEN_HISTORY)
    localStorage.setItem('alef-spellquest-he', '{"save":1}')
    clearLog(KEY)
    expect(Object.keys(localStorage).sort()).toEqual(['alef-spellquest-he', 'alef-tower-history-telemetry'])
  })
})

describe('the goldens through chunks', () => {
  const bySession = (evs: TelemetryEvent[]) => {
    const order: string[] = []
    const m = new Map<string, TelemetryEvent[]>()
    for (const e of evs) { if (!m.has(e.s)) order.push(e.s); m.set(e.s, [...(m.get(e.s) ?? []), e]) }
    return order.map((s) => m.get(s)!)
  }

  it.each([
    ['all sealed', 1],
    ['every second session sealed, the rest open', 2],
    ['the last sessions open, the rest sealed', 3],
  ] as const)('the exports match when the events are stored as chunks and an open chunk: %s', (_, mode) => {
    for (const [log, evs] of [[SPELLQUEST_LOG, GOLDEN_SPELLQUEST()], [CLOCK_LOG, GOLDEN_CLOCK()]] as const) {
      localStorage.clear()
      const sessions = bySession(evs)
      const keys: string[] = []
      const open: TelemetryEvent[] = []
      sessions.forEach((s, i) => {
        const sealIt = mode === 1 || (mode === 2 && i % 2 === 0) || (mode === 3 && i < sessions.length - 3)
        if (sealIt) keys.push(seal(s, log.key))
        else open.push(...s)
      })
      // mode 2 also keeps a copy of the first sealed session in the open chunk, as a cut seal leaves it
      putOpen(mode === 2 ? [...sessions[0]!, ...open] : open, mode === 2 ? keys.slice(1) : keys, log.key)
      const golden = goldenExport(log, evs)
      expect(goldenExport(log, readLog(log.key))).toBe(golden)
      const since = GOLDEN_NOW.getTime() - 30 * 24 * 60 * 60 * 1000
      expect(logStats(log.key, since)).toMatchObject({ events: evs.length, recent: filterEvents(evs, { since }).length })
    }
  })
})
