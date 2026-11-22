// The course seam (Task 3): the run takes its rounds, its log and its voice from the course it is given.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { alternate, recordSession } from '../testing/runHarness'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { spellQuestTelemetry } from '../telemetry'
import { HEBREW } from './hebrew'

describe('the course seam', () => {
  const fake = installFakeAudio()
  afterEach(() => { vi.restoreAllMocks() })

  it('the run asks its course for rounds', async () => {
    const spy = vi.fn(HEBREW.rounds.cauldronRound)
    const course = { ...HEBREW, rounds: { ...HEBREW.rounds, cauldronRound: spy } }
    await recordSession({ course, session: { screen: 'cauldron' }, force: { screen: 'cauldron', stage: 2 } }, alternate(3))
    expect(spy).toHaveBeenCalled()
  }, 120_000)
  it("the run tracks through its course's log", async () => {
    const telemetry = { ...spellQuestTelemetry, track: vi.fn() }
    const real = vi.spyOn(spellQuestTelemetry, 'track')
    await recordSession({ course: { ...HEBREW, telemetry }, session: { screen: 'broom' }, force: { screen: 'broom', stage: 1 } }, alternate(3))
    expect(telemetry.track).toHaveBeenCalledWith('answer', expect.anything())
    expect(real).not.toHaveBeenCalled()
  }, 120_000)
  it("the run speaks through its course's audio", async () => {
    const audio = { ...HEBREW.audio, sayParts: vi.fn(async () => true) }
    await recordSession({ course: { ...HEBREW, audio }, session: { screen: 'broom' }, force: { screen: 'broom', stage: 1 } }, alternate(3))
    expect(audio.sayParts).toHaveBeenCalled()
    // nothing reached spellQuestAudio's kit directly
    expect(fake.said()).toEqual([])
  }, 120_000)
})
