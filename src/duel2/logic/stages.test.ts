import { describe, expect, it } from 'vitest'
import { START_STAGE, recordStageAnswer, screensOfStage, type StageProgress } from './stages'

const run = (p: StageProgress, answers: boolean[]) => {
  let r = { progress: p, passed: false }
  for (const a of answers) r = recordStageAnswer(r.progress, a)
  return r
}

describe('stages', () => {
  it('stage passes on 5 right first answers', () => {
    const r = run(START_STAGE, [true, true, true, true, true])
    expect(r.passed).toBe(true)
    expect(r.progress).toEqual({ stage: 2, newAnswers: '' })
  })
  it('stage passes on 8 of 10', () => {
    const r = run(START_STAGE, [false, true, true, true, true, true, true, false, true, true])
    expect(r.passed).toBe(true)
    expect(r.progress.stage).toBe(2)
  })
  it('stage does not pass on 7 of 10', () => {
    expect(run(START_STAGE, [false, true, false, true, true, false, true, true, true, true]).progress.stage).toBe(1)
  })
  it('stage 4 never passes', () => {
    expect(run({ stage: 4, newAnswers: '' }, Array(12).fill(true)).progress.stage).toBe(4)
  })
  it('screens per stage', () => {
    expect(screensOfStage(1)).toEqual(['broom', 'ghosts'])
    expect(screensOfStage(2)).toEqual(['broom', 'cauldron', 'ladder', 'ghosts'])
    expect(screensOfStage(3)).toEqual(['broom', 'cauldron', 'ladder', 'ghosts'])
    expect(screensOfStage(4)).toEqual(['broom', 'cauldron', 'ladder', 'ghosts', 'doors'])
  })
})
