// The English page waits for Andika (its letters' font); Book 2's Hebrew page does not load it.
import { describe, expect, it, vi } from 'vitest'
const { configs } = vi.hoisted(() => ({ configs: [] as { fonts: [string, string][] }[] }))
vi.mock('../../shared/shell/preload', () => ({
  READY_MS: 8000,
  createPreloader: (c: { fonts: [string, string][] }) => { configs.push(c); return () => Promise.resolve() },
}))
import { ENGLISH_FONTS } from './preload'
import { FONTS } from '../../duel2/assets/preload'

describe('the preloads\' fonts', () => {
  it('the English preload waits for ENGLISH_FONTS, and they are Andika', () => {
    expect(configs.some((c) => c.fonts === ENGLISH_FONTS)).toBe(true)
    expect(ENGLISH_FONTS.map(([f]) => f)).toEqual(["1em 'Andika'"])
  })
  it('Book 2\'s Hebrew preload has no Andika', () => {
    const hebrew = configs.find((c) => c.fonts === FONTS)!
    expect(hebrew).toBeDefined()
    expect(hebrew.fonts.some(([f]) => f.includes('Andika'))).toBe(false)
  })
})
