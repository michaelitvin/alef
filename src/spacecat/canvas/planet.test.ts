import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PLANET_AIR, PLANET_TEX, PlanetRenderer, TEX_H, TEX_W, fallbackTexture, hexRgb, sphereTables } from './planet'

// jsdom has no 2D canvas: a minimal context backed by plain ImageData-like objects, recording each put
const puts: Uint8ClampedArray[] = []
function fakeContext() {
  return {
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img: { data: Uint8ClampedArray }) => { puts.push(img.data.slice()) },
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    drawImage: () => {},
  }
}

describe('the planet renderer', () => {
  beforeEach(() => {
    puts.length = 0
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeContext() as unknown as CanvasRenderingContext2D)
  })
  afterEach(() => vi.restoreAllMocks())

  it('the sphere mask is round', () => {
    const { alpha } = sphereTables()
    const at = (x: number, y: number) => alpha[y * PLANET_TEX + x]
    for (const [x, y] of [[0, 0], [PLANET_TEX - 1, 0], [0, PLANET_TEX - 1], [PLANET_TEX - 1, PLANET_TEX - 1]]) expect(at(x, y)).toBe(0)
    expect(at(PLANET_TEX / 2, PLANET_TEX / 2)).toBe(1)
  })
  it('render wraps the phase', () => {
    const p = new PlanetRenderer('surface.png', PLANET_AIR[0])
    const a = p.render(1.25)
    expect(p.render(0.25)).toBe(a)
    expect(p.render(-0.75)).toBe(a)
    expect(puts).toHaveLength(1)
    p.render(0.5)
    expect(puts).toHaveLength(2)
    expect(puts[1]).not.toEqual(puts[0])
  })
  it('falls back to a banded texture before the image loads', () => {
    const p = new PlanetRenderer('surface.png', PLANET_AIR[1])
    const out = p.render(0)
    expect(out.width).toBe(PLANET_TEX)
    const px = puts[0], c = (PLANET_TEX / 2) * PLANET_TEX + PLANET_TEX / 2
    expect(px[c * 4 + 3]).toBe(255)
    expect(px[c * 4] + px[c * 4 + 1] + px[c * 4 + 2]).toBeGreaterThan(0)
    const tex = fallbackTexture(hexRgb(PLANET_AIR[1]))
    expect(tex).toHaveLength(TEX_W * TEX_H * 4)
    const rows = new Set(Array.from({ length: TEX_H }, (_, y) => tex[y * TEX_W * 4]))
    expect(rows.size).toBeGreaterThan(5)
  })
})
