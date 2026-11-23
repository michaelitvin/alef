// The Hebrew ladder says "and now" (target-new-1) before each new word after the first rung, and not before the first.
import { describe, expect, it } from 'vitest'
import { alternate, recordSession, seeded } from './testing/runHarness'

describe('the Hebrew ladder: "and now"', () => {
  it('comes before each rung after the first, not before the first', async () => {
    const log = await recordSession({ session: { screen: 'ladder' }, force: { screen: 'ladder', stage: 2, fixed: 'letter' }, rng: seeded(7) }, alternate(3))
    const rungs = new Set(log.views.filter((v) => v.startsWith('ladder:answer:'))).size
    expect(rungs).toBeGreaterThanOrEqual(2)
    expect(log.voice.filter((id) => id === 'target-new-1')).toHaveLength(rungs - 1)
    expect(log.voice.indexOf('target-new-1')).toBeGreaterThan(0)
  })
})
