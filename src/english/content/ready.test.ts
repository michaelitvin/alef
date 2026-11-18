import { describe, expect, it } from 'vitest'
import { contentStages, REVIEWED_STAGES } from './ready.ts'
import { PHRASES } from './phrases.ts'
import { UNITS } from './units.ts'
import { heartVoice, nonsenseVoice, phraseVoice, soundVoice, wordVoice } from './voiceIds.ts'
import { WORDS } from './words.ts'

const idsOfStages = (stages: number[]): Set<string> =>
  new Set([
    ...UNITS.filter((u) => stages.includes(u.stage)).map(soundVoice),
    ...PHRASES.filter((p) => stages.includes(p.stage)).map((p) => phraseVoice(p.id)),
    ...WORDS.filter((w) => stages.includes(w.stage)).map((w) =>
      w.kind === 'heart' ? heartVoice(w.text) : w.kind === 'nonsense' ? nonsenseVoice(w.text) : wordVoice(w.text),
    ),
  ])

describe('contentStages', () => {
  it('strict with no voices: stage 1 only, never empty', () => {
    expect(contentStages({ strict: true, voices: new Set() })).toEqual([1])
  })
  it('strict with every stage-1 and stage-2 id: stages 1 and 2', () => {
    expect(contentStages({ strict: true, voices: idsOfStages([1, 2]) })).toEqual([1, 2])
  })
  it('strict: a stage missing one id is not ready, and a later full stage is skipped over it', () => {
    const voices = idsOfStages([1, 3])
    voices.delete(wordVoice('sat'))
    expect(contentStages({ strict: true, voices })).toEqual([3])
  })
  it('strict: a heart word, a nonsense word and a sound each count', () => {
    for (const missing of [heartVoice('the'), nonsenseVoice('tam'), soundVoice(UNITS[0]), wordVoice('apple')]) {
      const voices = idsOfStages([1, 2])
      expect(voices.has(missing)).toBe(true)
      voices.delete(missing)
      expect(contentStages({ strict: true, voices })).toEqual([2])
    }
  })
  it('strict: a stage 4–9 also needs its door-phrase clips', () => {
    const voices = idsOfStages([1, 2, 3, 4])
    expect(contentStages({ strict: true, voices })).toEqual([1, 2, 3, 4])
    voices.delete(phraseVoice('a-big-duck'))
    expect(contentStages({ strict: true, voices })).toEqual([1, 2, 3])
  })
  it('not strict: every stage 1 to 9', () => {
    expect(contentStages({ strict: false, voices: new Set() })).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
  it('reviewed stages start empty, edited by hand', () => {
    expect(REVIEWED_STAGES).toEqual([])
  })
})
