import { describe, expect, it, vi } from 'vitest'
import { DRAW_FONT } from '../logic/drawLayout'
import { FONTS, READY_MS, preloadDuel2Assets } from './preload'

describe('preloadDuel2Assets', () => {
  it('waits for fonts and images, at most READY_MS', async () => {
    vi.useFakeTimers()
    const p = preloadDuel2Assets()
    let done = false
    void p.then(() => { done = true })
    await vi.advanceTimersByTimeAsync(READY_MS - 100)
    await vi.advanceTimersByTimeAsync(200)
    expect(done).toBe(true)
    expect(preloadDuel2Assets()).toBe(p)
    vi.useRealTimers()
  })
  it('loads the fonts of both drawing scripts before the first screen (the words in handwriting are Dana Yad)', () => {
    for (const f of Object.values(DRAW_FONT)) expect(FONTS.some(([spec]) => spec.includes(f.replace(/'/g, ''))), f).toBe(true)
    expect(DRAW_FONT.hand).toMatch(/Dana Yad/)
  })
})
