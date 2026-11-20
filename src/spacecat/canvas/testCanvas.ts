// Test helpers for the canvas: a recording 2D context (jsdom has none) and a clock whose frames are stepped by hand.
import { vi } from 'vitest'
import type { EngineClock } from './engine'

/** a 2D context that accepts every call and property; fillText calls are recorded in `texts`, with their font in `fonts` */
export function recordingContext(): { ctx: CanvasRenderingContext2D; texts: string[]; fonts: string[]; restore: () => void } {
  const texts: string[] = []
  const fonts: string[] = []
  const props: Record<string | symbol, unknown> = {}
  const gradient = { addColorStop: () => {} }
  const special: Record<string, (...a: unknown[]) => unknown> = {
    fillText: (s: unknown) => { texts.push(String(s)); fonts.push(String(props.font)) },
    measureText: (s: unknown) => ({ width: String(s).length * 40 }),
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    createImageData: (w: unknown, h: unknown) => ({ width: w, height: h, data: new Uint8ClampedArray((w as number) * (h as number) * 4) }),
    getImageData: (_x: unknown, _y: unknown, w: unknown, h: unknown) => ({ width: w, height: h, data: new Uint8ClampedArray((w as number) * (h as number) * 4) }),
  }
  const ctx = new Proxy({}, {
    get: (_t, k) => (k in props ? props[k] : typeof k === 'string' && k in special ? special[k] : () => {}),
    set: (_t, k, v) => { props[k] = v; return true },
  }) as CanvasRenderingContext2D
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as never)
  return { ctx, texts, fonts, restore: () => spy.mockRestore() }
}

/** frames run only when the test steps them, 16 ms apart */
export function manualClock(): EngineClock & { tick(ms: number): void; time(): number } {
  let now = 0
  let queue: (() => void)[] = []
  return {
    frame: (fn) => { queue.push(fn); return () => { queue = queue.filter((f) => f !== fn) } },
    now: () => now,
    time: () => now,
    tick(ms) {
      const end = now + ms
      while (now < end) {
        now = Math.min(end, now + 16)
        const q = queue
        queue = []
        for (const f of q) f()
      }
    },
  }
}
