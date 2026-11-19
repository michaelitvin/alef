// The English cauldron's answer event names its `word`; the Hebrew run's never has that key (its goldens and roll-up stay as they were).
import { describe, expect, it } from 'vitest'
import { alternate, recordSession, seeded } from './testing/runHarness'
import { duel2Telemetry } from './telemetry'

describe('the Hebrew run\'s answer events', () => {
  it('carry no `word` key', async () => {
    for (const screen of ['cauldron', 'ghosts'] as const) {
      await recordSession({ session: { screen }, rng: seeded(3) }, alternate(3))
      const answers = (duel2Telemetry.events() as Record<string, unknown>[]).filter((e) => e.e === 'answer')
      expect(answers.length).toBeGreaterThan(0)
      for (const a of answers) expect(a).not.toHaveProperty('word')
    }
  })
})
