// The Data section: one export with a picker (games, period), a clear per log, and the open game's log read and
// cleared through its instance (ADR 0004).
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataSection } from './Data'
import { chunkKey, createTelemetry, readLog, rollupKey, type TelemetryEvent } from '../../shared/telemetry'
import { encodeChunk } from '../../shared/telemetryCodec'
import { openJson } from '../../shared/telemetryChunks'
import { emptyRollup, foldEvents } from '../../shared/telemetryRollup'

const NOW = new Date('2026-11-16T12:00:00Z').getTime()
const DAY = 24 * 60 * 60 * 1000
const put = (key: string, events: object[]) => localStorage.setItem(key, JSON.stringify({ v: 1, events }))
/** the first duel's history as the old build wrote it (no g, no via) */
const HISTORY = '{"v":1,"events":[{"t":1760000000000,"s":"mf1abc-x1y2z","run":2,"e":"choice","key":"segol","pos":2,"ms":1840}]}'

let files: { name: string; doc: Record<string, unknown> }[]
let blobs: Blob[]
beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
  files = []
  blobs = []
  Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => { blobs.push(b); return 'blob:x' }), revokeObjectURL: () => {} })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    files.push({ name: this.download, doc: {} })
  })
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

async function downloaded(c: HTMLElement) {
  fireEvent.click(c.querySelector('[data-telemetry-download]')!)
  const f = files[files.length - 1]!
  f.doc = JSON.parse(await blobs[blobs.length - 1]!.text())
  return f as { name: string; doc: { v: number; since: string | null; games: { key: string; about: { game: string }; events: Record<string, unknown>[] }[] } }
}
const picked = (c: HTMLElement) =>
  [...c.querySelectorAll<HTMLInputElement>('[data-log-pick]')].filter((i) => i.checked).map((i) => i.closest('[data-log]')!.getAttribute('data-log'))

describe('the Data section', () => {
  it('ticks the open game’s logs at first (not the first duel’s history); the lessons have none, so nothing to download', () => {
    expect(picked(render(<DataSection game="spellquest" />).container)).toEqual(['alef-spellquest-telemetry'])
    expect(picked(render(<DataSection game="clock" />).container)).toEqual(['alef-clock-telemetry'])
    const { container } = render(<DataSection game="lessons" />)
    expect(picked(container)).toEqual([])
    expect((container.querySelector('[data-telemetry-download]') as HTMLButtonElement).disabled).toBe(true)
  })

  it('one file for the open game, the last 30 days by default: alef-telemetry-<games>-<date>.json, one part per log', async () => {
    put('alef-clock-telemetry', [{ t: NOW - 40 * DAY, s: 'a', run: 1, e: 'old', g: 'clock' }, { t: NOW - DAY, s: 'b', run: 2, e: 'new', g: 'clock' }])
    const { container } = render(<DataSection game="clock" />)
    expect(container.querySelector('[data-log="alef-clock-telemetry"] [data-log-count]')!.textContent).toBe('2 events')
    expect(container.querySelector('[data-log="alef-clock-telemetry"] [data-log-recent]')!.textContent).toBe('1 in the last 30 days')
    const f = await downloaded(container)
    expect(f.name).toBe('alef-telemetry-clock-2026-11-16.json')
    expect(f.doc.v).toBe(2)
    expect(f.doc.since).toBe(new Date(NOW - 30 * DAY).toISOString())
    expect(f.doc.games).toHaveLength(1)
    expect(f.doc.games[0]!.key).toBe('alef-clock-telemetry')
    expect(f.doc.games[0]!.about.game).toMatch(/Clock/)
    expect(f.doc.games[0]!.events.map((e) => e.e)).toEqual(['new'])
    fireEvent.click(container.querySelector('[data-period="all"]')!)
    expect((await downloaded(container)).doc.games[0]!.events.map((e) => e.e)).toEqual(['old', 'new'])
  })

  it('several games in one file; the first duel’s history comes out exactly as it is stored, and it has no Clear', async () => {
    localStorage.setItem('alef-tower-history-telemetry', HISTORY)
    put('alef-spellquest-telemetry', [{ t: NOW, s: 'c', run: 3, e: 'round', g: 'spellquest', via: 'tower', visit: 1 }])
    const { container } = render(<DataSection game="spellquest" />)
    fireEvent.click(container.querySelector('[data-log="alef-tower-history-telemetry"] [data-log-pick]')!)
    fireEvent.click(container.querySelector('[data-log="alef-clock-telemetry"] [data-log-pick]')!)
    fireEvent.click(container.querySelector('[data-period="all"]')!)
    const f = await downloaded(container)
    expect(f.name).toBe('alef-telemetry-spellquest-tower-clock-2026-11-16.json')
    expect(f.doc.since).toBeNull()
    expect(f.doc.games.map((g) => g.key)).toEqual(['alef-spellquest-telemetry', 'alef-tower-history-telemetry', 'alef-clock-telemetry'])
    expect(f.doc.games[0]!.events[0]).toMatchObject({ via: 'tower', g: 'spellquest' })
    expect(f.doc.games[1]!.events).toEqual(JSON.parse(HISTORY).events)
    expect(container.querySelector('[data-log="alef-tower-history-telemetry"] [data-log-clear]')).toBeNull()
    expect(container.querySelector('[data-log="alef-tower-history-telemetry"] [data-log-history]')).not.toBeNull()
    expect(localStorage.getItem('alef-tower-history-telemetry')).toBe(HISTORY)
  })

  it('the open game’s log is read through its instance: its unflushed events are in the export', async () => {
    const live = createTelemetry('alef-spellquest-telemetry', { game: 'spellquest' })
    live.track('round', { target: 'bet' }) // not flushed yet
    expect(localStorage.getItem('alef-spellquest-telemetry')).toBeNull()
    const { container } = render(<DataSection game="spellquest" live={live} />)
    expect(container.querySelector('[data-log="alef-spellquest-telemetry"] [data-log-count]')!.textContent).toBe('1 events')
    const f = await downloaded(container)
    expect(f.doc.games[0]!.events).toEqual([expect.objectContaining({ e: 'round', target: 'bet', g: 'spellquest' })])
    live.clear()
  })

  it('the counts read the open game’s log once, not on every render: a tick or a period change does not flush it', () => {
    const events = vi.fn(() => [])
    const flush = vi.fn()
    const live = { key: 'alef-spellquest-telemetry', events, flush, clear: vi.fn() }
    const { container } = render(<DataSection game="spellquest" live={live} />)
    const reads = flush.mock.calls.length
    expect(events).not.toHaveBeenCalled() // the counts come from storage, after a flush
    fireEvent.click(container.querySelector('[data-log="alef-clock-telemetry"] [data-log-pick]')!)
    fireEvent.click(container.querySelector('[data-period="all"]')!)
    expect(flush.mock.calls.length).toBe(reads)
  })

  it('a clear of the open game’s log goes through its instance, so the cleared events do not come back on its next flush', () => {
    const live = createTelemetry('alef-spellquest-telemetry', { game: 'spellquest' })
    live.track('round', { n: 1 })
    live.flush()
    live.track('round', { n: 2 }) // in memory only
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { container } = render(<DataSection game="spellquest" live={live} />)
    fireEvent.click(container.querySelector('[data-log="alef-spellquest-telemetry"] [data-log-clear]')!)
    expect(readLog('alef-spellquest-telemetry')).toEqual([])
    expect(container.querySelector('[data-log="alef-spellquest-telemetry"] [data-log-count]')!.textContent).toBe('0 events')
    live.track('round', { n: 3 })
    live.flush()
    expect(JSON.parse(localStorage.getItem('alef-spellquest-telemetry')!).events.map((e: { n: number }) => e.n)).toEqual([3])
  })

  it('another game’s log is cleared in storage; a refused confirm clears nothing', () => {
    put('alef-clock-telemetry', [{ t: NOW, s: 'a', run: 0, e: 'x' }])
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { container } = render(<DataSection game="spellquest" />)
    const btn = container.querySelector('[data-log="alef-clock-telemetry"] [data-log-clear]')!
    fireEvent.click(btn)
    expect(localStorage.getItem('alef-clock-telemetry')).not.toBeNull()
    confirm.mockReturnValue(true)
    fireEvent.click(btn)
    expect(localStorage.getItem('alef-clock-telemetry')).toBeNull()
    expect(container.querySelector('[data-log="alef-clock-telemetry"] [data-log-count]')!.textContent).toBe('0 events')
  })

  describe('a log of sealed chunks', () => {
    const KEY = 'alef-clock-telemetry'
    const ev = (s: string, t: number, e = 'round'): TelemetryEvent => ({ t, s, run: 1, e, g: 'clock' })
    const seal = (evs: TelemetryEvent[]) => { const k = chunkKey(KEY, evs[0]!.t, evs[0]!.s); localStorage.setItem(k, encodeChunk(evs)); return k }

    it('counts span the chunks and the open chunk; the 30-day count reads across them; the export is the same as for a plain log', async () => {
      const a = [ev('a', NOW - 50 * DAY), ev('a', NOW - 50 * DAY + 5)]
      const b = [ev('b', NOW - 31 * DAY), ev('b', NOW - 29 * DAY)] // straddles the cut
      const c = [ev('c', NOW - 2 * DAY)]
      const keys = [seal(a), seal(b)]
      localStorage.setItem(KEY, openJson(c, keys))
      const { container } = render(<DataSection game="clock" />)
      expect(container.querySelector(`[data-log="${KEY}"] [data-log-count]`)!.textContent).toBe('5 events')
      expect(container.querySelector(`[data-log="${KEY}"] [data-log-recent]`)!.textContent).toBe('2 in the last 30 days')
      fireEvent.click(container.querySelector('[data-period="all"]')!)
      const chunked = (await downloaded(container)).doc
      localStorage.clear()
      put(KEY, [...a, ...b, ...c])
      const second = render(<DataSection game="clock" />).container
      fireEvent.click(second.querySelector('[data-period="all"]')!)
      const plain = (await downloaded(second)).doc
      expect(chunked.games[0]!.events).toEqual(plain.games[0]!.events)
    })

    it('opening the section decodes no chunk wholly before the cut (a corrupt one counts as readable until a download)', () => {
      const old = seal([ev('a', NOW - 60 * DAY), ev('a', NOW - 60 * DAY + 1)])
      const v = JSON.parse(localStorage.getItem(old)!)
      localStorage.setItem(old, JSON.stringify({ ...v, d: 'broken' }))
      localStorage.setItem(KEY, openJson([ev('c', NOW)], [old]))
      const { container } = render(<DataSection game="clock" />)
      expect(container.querySelector(`[data-log="${KEY}"] [data-log-unreadable]`)).toBeNull()
      expect(container.querySelector(`[data-log="${KEY}"] [data-log-count]`)!.textContent).toBe('3 events')
    })

    it('shows the older days a roll-up summarizes, and exports them only for a period before the raw events', async () => {
      const r = emptyRollup()
      const gone = [ev('z', NOW - 120 * DAY), ev('z', NOW - 119 * DAY)]
      foldEvents(r, gone, [{ item: 'what:3-00', ok: true, t: gone[0]!.t }])
      localStorage.setItem(rollupKey(KEY), JSON.stringify(r))
      put(KEY, [ev('c', NOW - 40 * DAY), ev('c', NOW)])
      const { container } = render(<DataSection game="clock" />)
      expect(container.querySelector(`[data-log="${KEY}"] [data-log-summarized]`)!.textContent).toMatch(/^2 older days summarized/)
      expect((await downloaded(container)).doc.games[0]).not.toHaveProperty('rollups')
      fireEvent.click(container.querySelector('[data-period="all"]')!)
      const part = (await downloaded(container)).doc.games[0] as unknown as { rollups: Record<string, unknown>; rollupsNote: string }
      expect(Object.keys(part.rollups)).toHaveLength(2)
      expect(part.rollupsNote).toMatch(/counted exactly by adding/)
    })

    it('Clear removes the open chunk, the chunks and the roll-up, and never the frozen log', () => {
      const k = seal([ev('a', NOW - DAY)])
      localStorage.setItem(KEY, openJson([], [k]))
      localStorage.setItem(rollupKey(KEY), JSON.stringify(emptyRollup()))
      localStorage.setItem('alef-tower-history-telemetry', HISTORY)
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const { container } = render(<DataSection game="spellquest" />)
      fireEvent.click(container.querySelector(`[data-log="${KEY}"] [data-log-clear]`)!)
      expect(Object.keys(localStorage)).toEqual(['alef-tower-history-telemetry'])
      expect(localStorage.getItem('alef-tower-history-telemetry')).toBe(HISTORY)
    })

    it('the storage line shows the telemetry against its budget and each frozen log\'s size', () => {
      localStorage.setItem('alef-tower-history-telemetry', HISTORY)
      put(KEY, [ev('c', NOW)])
      const { container } = render(<DataSection game="clock" />)
      expect(container.querySelector('[data-storage]')!.textContent).toMatch(/of 800k chars/)
      expect(container.querySelector('[data-storage-persisted]')!.textContent).toBe('not known')
      expect(container.querySelector('[data-log="alef-tower-history-telemetry"] [data-log-size]')!.textContent).toBe(`${((HISTORY.length + 19) / 1000).toFixed(1)}k chars`)
    })
  })
})
