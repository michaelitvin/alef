import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { addPlaytime, createMeter, dayKey, lastDays, PLAYTIME_KEY, readPlaytime, usePlaytime } from './playtime'
import { copyUnprefixedOver } from './stagingStorage'

const at = (s: string) => new Date(s).getTime() // local time: 'YYYY-MM-DDTHH:mm:ss'
const MIN = 60_000

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('the play-time ledger', () => {
  it('adds a span to its day and game', () => {
    addPlaytime('clock', at('2026-11-10T10:00:00'), at('2026-11-10T10:03:00'))
    expect(readPlaytime().days['2026-11-10']).toEqual({ clock: 3 * MIN })
  })

  it('splits a span over midnight between the two days', () => {
    addPlaytime('book2', at('2026-11-10T23:58:00'), at('2026-11-11T00:03:00'))
    const d = readPlaytime().days
    expect(d['2026-11-10']!.book2).toBe(2 * MIN)
    expect(d['2026-11-11']!.book2).toBe(3 * MIN)
  })

  it('drops days older than 60 days and keeps the rest', () => {
    const now = at('2026-11-16T12:00:00')
    localStorage.setItem(PLAYTIME_KEY, JSON.stringify({ v: 1, days: { '2026-09-10': { clock: 5 }, '2026-09-20': { clock: 7 } } }))
    addPlaytime('clock', now - MIN, now)
    const days = Object.keys(readPlaytime().days)
    expect(days).not.toContain('2026-09-10') // 67 days old
    expect(days).toContain('2026-09-20') // 57 days old
    expect(days).toContain('2026-11-16')
  })

  it('two writers interleaved keep both totals', () => {
    const a = createMeter('book2', () => clockA)
    const b = createMeter('lessons', () => clockB)
    let clockA = at('2026-11-10T10:00:00')
    let clockB = clockA
    a.setRunning(true)
    b.setRunning(true)
    clockA += 15_000; a.flush()
    clockB += 20_000; b.flush()
    clockA += 15_000; a.flush()
    clockB += 10_000; b.flush()
    expect(readPlaytime().days['2026-11-10']).toEqual({ book2: 30_000, lessons: 30_000 })
  })

  it('a hidden page adds nothing, and counts again when shown', () => {
    let t = at('2026-11-10T10:00:00')
    const m = createMeter('clock', () => t)
    m.setRunning(true)
    t += 10_000
    m.setVisible(false) // flushes the visible 10 s
    t += 5 * MIN
    m.flush()
    m.setVisible(true)
    t += 20_000
    m.flush()
    expect(readPlaytime().days['2026-11-10']!.clock).toBe(30_000)
  })

  it('a paused game (not running) adds nothing', () => {
    let t = at('2026-11-10T10:00:00')
    const m = createMeter('book2', () => t)
    m.setRunning(true); t += 5_000
    m.setRunning(false); t += 10 * MIN
    m.flush()
    expect(readPlaytime().days['2026-11-10']!.book2).toBe(5_000)
  })

  it('lastDays gives 7 days, oldest first, zero where nothing was played', () => {
    addPlaytime('clock', at('2026-11-16T09:00:00'), at('2026-11-16T09:02:00'))
    const rows = lastDays(7, at('2026-11-16T12:00:00'))
    expect(rows).toHaveLength(7)
    expect(rows[0]!.day).toBe('2026-11-10')
    expect(rows[6]).toEqual({ day: '2026-11-16', ms: { book2: 0, clock: 2 * MIN, lessons: 0, english: 0 } })
    expect(dayKey(at('2026-11-16T00:00:00'))).toBe('2026-11-16')
  })

  it('survives an unreadable key', () => {
    localStorage.setItem(PLAYTIME_KEY, '{nope')
    addPlaytime('clock', 0, 1000)
    expect(readPlaytime().v).toBe(1)
  })

  it('?copy-prod copies it (a save-like record of a few hundred bytes)', () => {
    localStorage.setItem(PLAYTIME_KEY, '{"v":1,"days":{}}')
    copyUnprefixedOver(localStorage, 'staging:')
    expect(localStorage.getItem('staging:' + PLAYTIME_KEY)).toBe('{"v":1,"days":{}}')
  })

  it('stays small: 60 days of three games is under 10 000 characters', () => {
    const days: Record<string, unknown> = {}
    for (let i = 0; i < 60; i++) days[`2026-0${1 + (i % 9)}-${String(10 + (i % 18))}-${i}`] = { book2: 99_999_999, clock: 99_999_999, lessons: 99_999_999 }
    expect(JSON.stringify({ v: 1, days }).length).toBeLessThan(10_000)
  })
})

describe('usePlaytime', () => {
  function Probe({ active }: { active: boolean }) { usePlaytime('clock', active); return null }
  const setVisibility = (v: 'hidden' | 'visible') => {
    Object.defineProperty(document, 'visibilityState', { value: v, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }
  afterEach(() => setVisibility('visible'))

  it('writes each 15 s while visible and running, nothing while hidden or paused', () => {
    vi.useFakeTimers({ now: at('2026-11-10T10:00:00') })
    const { rerender, unmount } = render(<Probe active />)
    act(() => { vi.advanceTimersByTime(15_000) })
    expect(readPlaytime().days['2026-11-10']!.clock).toBe(15_000)
    act(() => { vi.advanceTimersByTime(5_000); setVisibility('hidden') })
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(readPlaytime().days['2026-11-10']!.clock).toBe(20_000)
    act(() => { setVisibility('visible'); rerender(<Probe active={false} />) })
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(readPlaytime().days['2026-11-10']!.clock).toBe(20_000)
    unmount()
  })
})
