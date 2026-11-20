import { describe, expect, it } from 'vitest'
import { RUNGS, itemsOfOldRung, oldRungOf } from './ladder'

describe('the adapter to the new rungs (until the longer ladder replaces this file)', () => {
  it('every offered item has one old rung and the old rungs do not overlap', () => {
    const seen = new Set<string>()
    for (const { id } of RUNGS) {
      const items = itemsOfOldRung(id)
      expect(items.length).toBeGreaterThan(0)
      for (const it of items) {
        expect(oldRungOf(it)).toBe(id)
        expect(seen.has(it.id)).toBe(false)
        seen.add(it.id)
      }
    }
  })
  it('old rung 4 is the missing-number sums within 10', () => {
    const ids = itemsOfOldRung(4).map((i) => i.id)
    expect(ids).toContain('3+4=7/b')
    expect(ids).toContain('3+4=7/a')
    expect(ids).toContain('7+3=10/b')
    expect(ids).not.toContain('13+4=17/a')
  })
  it('times and divide are the new T rungs', () => {
    expect(itemsOfOldRung(7).map((i) => i.id)).toContain('3x10=30/c')
    expect(itemsOfOldRung(8).map((i) => i.id)).toContain('6x7=42/c')
    expect(itemsOfOldRung(9).map((i) => i.id)).toContain('42/7=6/c')
  })
})
