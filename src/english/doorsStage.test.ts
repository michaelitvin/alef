// A doors word answer counts towards the stage on every English stage from 4 (the run's `newStage` for a word), not only
// at stage 4 (Book 2's last). The run plays the Hebrew rounds here (the English doors come with Task 20) on the English
// stages and an English save.
import { describe, expect, it } from 'vitest'
import { HEBREW } from '../spellquest/course/hebrew'
import { recordSession } from '../spellquest/testing/runHarness'
import type { SavePort } from '../spellquest/savePort'
import { ENGLISH } from './course'
import { memoryEnglishSavePort } from './savePort'

describe('the doors on an English stage above 4', () => {
  it('a run at stage 5 counts a doors word answer toward the stage pass', async () => {
    const port = memoryEnglishSavePort({ stage: { stage: 5, newAnswers: '' } })
    const flags: boolean[] = []
    const save: SavePort = { ...port, recordAnswer: (a) => { flags.push(!!a.newStage); return port.recordAnswer(a) } }
    await recordSession({ course: { ...HEBREW, stages: ENGLISH.stages }, save, session: { screen: 'doors' }, force: { screen: 'doors', stage: 5 } }, () => 'right')
    expect(flags.length).toBeGreaterThanOrEqual(5)
    expect(flags.slice(0, 5)).toEqual([true, true, true, true, true])
    // five right doors answers on stage 5's new items pass it
    expect(port.read().stage.stage).toBe(6)
  }, 60_000)
})
