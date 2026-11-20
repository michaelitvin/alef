import { describe, expect, it, vi } from 'vitest'
import { SIGN_STROKE, drawSign, isSign, openSide, signPath } from './signs'

/** a context that records which drawing calls were made */
function spyContext() {
  const calls: string[] = []
  const props: Record<string, unknown> = {}
  const ctx = new Proxy({}, {
    get: (_t, k) => (k in props ? props[k as string] : (...a: unknown[]) => {
      calls.push(String(k))
      if (k === 'createRadialGradient') return { addColorStop: () => {} }
      return a.length ? undefined : undefined
    }),
    set: (_t, k, v) => { props[k as string] = v; calls.push(`set ${String(k)}`); return true },
  }) as CanvasRenderingContext2D
  return { ctx, calls, props }
}

describe('the comparison signs', () => {
  it('< is > mirrored', () => {
    const lt = signPath('<', 100), gt = signPath('>', 100)
    expect(gt).toEqual(lt.map((line) => line.map(([x, y]) => [-x, y])))
    // the point of < is on the left, its open side on the right
    expect(lt[0][1][0]).toBeLessThan(0)
    expect(openSide('<', 100).x).toBeGreaterThan(0)
    expect(openSide('>', 100).x).toBe(-openSide('<', 100).x)
  })
  it('every sign is open strokes: < and > one bent stroke, = two bars, none closed', () => {
    expect(signPath('<', 10)).toHaveLength(1)
    expect(signPath('<', 10)[0]).toHaveLength(3)
    const eq = signPath('=', 10)
    expect(eq).toHaveLength(2)
    for (const bar of eq) expect(bar[0][1]).toBe(bar[1][1])
    for (const s of ['<', '=', '>'] as const) for (const line of signPath(s, 10)) expect(line[0]).not.toEqual(line[line.length - 1])
  })
  it('the signs are drawn as paths: stroked, never filled, never text, in one colour and stroke', () => {
    const seen: { color: unknown; width: unknown }[] = []
    for (const s of ['<', '=', '>'] as const) {
      const { ctx, calls, props } = spyContext()
      const stroke = vi.fn(() => seen.push({ color: props.strokeStyle, width: props.lineWidth }))
      props.stroke = stroke
      drawSign(ctx, s, 50, 50, 100)
      expect(stroke).toHaveBeenCalled()
      expect(calls).not.toContain('fillText')
      expect(calls).not.toContain('fill')
      expect(calls).not.toContain('closePath')
    }
    expect(new Set(seen.map((x) => x.color)).size).toBe(1)
    expect(new Set(seen.map((x) => x.width))).toEqual(new Set([SIGN_STROKE * 100]))
  })
  it('knows a sign from a number', () => {
    expect(['<', '=', '>'].every(isSign)).toBe(true)
    expect(['5', '+', '×', ''].some(isSign)).toBe(false)
  })
})
