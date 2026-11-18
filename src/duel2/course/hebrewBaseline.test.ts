// The baseline of the Hebrew path, taken before the course seam: a seeded session of each screen at each stage that
// holds it, the cycles, and a fresh save. Only the stage 4 sessions and the stage 4 cycle may change (the spell book).
import { describe, expect, it } from 'vitest'
import { CASES, alternate, recordSession, seeded } from '../testing/runHarness'
import { cycleOf } from '../logic/run'
import { memorySavePort } from '../savePort'

describe('the Hebrew baseline', () => {
  it.each(CASES)('Hebrew %s at stage %i', async (screen, stage) => {
    const log = await recordSession({ session: { screen }, force: { screen, stage: stage as 1 | 2 | 3 | 4 }, rng: seeded(7) }, alternate(3))
    expect(log).toMatchSnapshot()
  }, 120_000)
  it.each([1, 2, 3, 4] as const)('the cycle at stage %i', (st) => expect(cycleOf(st, true)).toMatchSnapshot())
  it('a fresh Hebrew save', () => expect(JSON.stringify(memorySavePort().read())).toMatchSnapshot())
})
