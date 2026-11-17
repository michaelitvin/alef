// The Data section: one export with a picker (games, period), a clear per log, and the open game's log read and
// cleared through its instance (ADR 0004).
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataSection } from './Data'
import { createTelemetry, readLog } from '../../shared/telemetry'

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
    expect(picked(render(<DataSection game="book2" />).container)).toEqual(['alef-duel2-telemetry'])
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
    localStorage.setItem('alef-duel-telemetry', HISTORY)
    put('alef-duel2-telemetry', [{ t: NOW, s: 'c', run: 3, e: 'round', g: 'book2', via: 'tower', visit: 1 }])
    const { container } = render(<DataSection game="book2" />)
    fireEvent.click(container.querySelector('[data-log="alef-duel-telemetry"] [data-log-pick]')!)
    fireEvent.click(container.querySelector('[data-log="alef-clock-telemetry"] [data-log-pick]')!)
    fireEvent.click(container.querySelector('[data-period="all"]')!)
    const f = await downloaded(container)
    expect(f.name).toBe('alef-telemetry-book2-duel-clock-2026-11-16.json')
    expect(f.doc.since).toBeNull()
    expect(f.doc.games.map((g) => g.key)).toEqual(['alef-duel2-telemetry', 'alef-duel-telemetry', 'alef-clock-telemetry'])
    expect(f.doc.games[0]!.events[0]).toMatchObject({ via: 'tower', g: 'book2' })
    expect(f.doc.games[1]!.events).toEqual(JSON.parse(HISTORY).events)
    expect(container.querySelector('[data-log="alef-duel-telemetry"] [data-log-clear]')).toBeNull()
    expect(container.querySelector('[data-log="alef-duel-telemetry"] [data-log-history]')).not.toBeNull()
    expect(localStorage.getItem('alef-duel-telemetry')).toBe(HISTORY)
  })

  it('the open game’s log is read through its instance: its unflushed events are in the export', async () => {
    const live = createTelemetry('alef-duel2-telemetry', { game: 'book2' })
    live.track('round', { target: 'bet' }) // not flushed yet
    expect(localStorage.getItem('alef-duel2-telemetry')).toBeNull()
    const { container } = render(<DataSection game="book2" live={live} />)
    expect(container.querySelector('[data-log="alef-duel2-telemetry"] [data-log-count]')!.textContent).toBe('1 events')
    const f = await downloaded(container)
    expect(f.doc.games[0]!.events).toEqual([expect.objectContaining({ e: 'round', target: 'bet', g: 'book2' })])
    live.clear()
  })

  it('the counts read the open game’s log once, not on every render: a tick or a period change does not flush it', () => {
    const events = vi.fn(() => [])
    const live = { key: 'alef-duel2-telemetry', events, clear: vi.fn() }
    const { container } = render(<DataSection game="book2" live={live} />)
    const reads = events.mock.calls.length
    fireEvent.click(container.querySelector('[data-log="alef-clock-telemetry"] [data-log-pick]')!)
    fireEvent.click(container.querySelector('[data-period="all"]')!)
    expect(events.mock.calls.length).toBe(reads)
  })

  it('a clear of the open game’s log goes through its instance, so the cleared events do not come back on its next flush', () => {
    const live = createTelemetry('alef-duel2-telemetry', { game: 'book2' })
    live.track('round', { n: 1 })
    live.flush()
    live.track('round', { n: 2 }) // in memory only
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { container } = render(<DataSection game="book2" live={live} />)
    fireEvent.click(container.querySelector('[data-log="alef-duel2-telemetry"] [data-log-clear]')!)
    expect(readLog('alef-duel2-telemetry')).toEqual([])
    expect(container.querySelector('[data-log="alef-duel2-telemetry"] [data-log-count]')!.textContent).toBe('0 events')
    live.track('round', { n: 3 })
    live.flush()
    expect(JSON.parse(localStorage.getItem('alef-duel2-telemetry')!).events.map((e: { n: number }) => e.n)).toEqual([3])
  })

  it('another game’s log is cleared in storage; a refused confirm clears nothing', () => {
    put('alef-clock-telemetry', [{ t: NOW, s: 'a', run: 0, e: 'x' }])
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { container } = render(<DataSection game="book2" />)
    const btn = container.querySelector('[data-log="alef-clock-telemetry"] [data-log-clear]')!
    fireEvent.click(btn)
    expect(localStorage.getItem('alef-clock-telemetry')).not.toBeNull()
    confirm.mockReturnValue(true)
    fireEvent.click(btn)
    expect(localStorage.getItem('alef-clock-telemetry')).toBeNull()
    expect(container.querySelector('[data-log="alef-clock-telemetry"] [data-log-count]')!.textContent).toBe('0 events')
  })
})
