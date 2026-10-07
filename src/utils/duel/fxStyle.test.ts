import { describe, it, expect } from 'vitest'
import { makeFxPicker, PROJECTILES, BURSTS, EXITS, PALETTES, CASTS } from './fxStyle'

function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}

describe('hit effects vary', () => {
  it('there is real variety: several projectiles, bursts, exits, palettes and casting moves', () => {
    expect(PROJECTILES.length).toBeGreaterThanOrEqual(4)
    expect(BURSTS.length).toBeGreaterThanOrEqual(4)
    expect(EXITS.length).toBeGreaterThanOrEqual(4)
    expect(Object.keys(PALETTES).length).toBeGreaterThanOrEqual(5)
    expect(CASTS.length).toBeGreaterThanOrEqual(3)
  })
  it('each part cycles through every option before repeating, and never repeats back to back', () => {
    const next = makeFxPicker(seeded(7))
    const picks = Array.from({ length: 300 }, () => next())
    for (const [key, all] of [['projectile', PROJECTILES], ['burst', BURSTS], ['exit', EXITS], ['cast', CASTS]] as const) {
      const seq = picks.map((p) => p[key] as string)
      expect(new Set(seq.slice(0, all.length)).size).toBe(all.length) // a full deck first
      for (let i = 1; i < seq.length; i++) expect(seq[i], `${key} @${i}`).not.toBe(seq[i - 1])
    }
    const pal = picks.map((p) => p.palette)
    for (let i = 1; i < pal.length; i++) expect(pal[i]).not.toBe(pal[i - 1])
  })
  it('no particles that read as game symbols: no hearts (lives), no dots (nikkud)', () => {
    expect(BURSTS).not.toContain('hearts')
    expect(BURSTS).not.toContain('dots')
  })
})
