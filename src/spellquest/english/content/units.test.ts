import { describe, expect, it } from 'vitest'
import { BLENDS, SOUND_KEYS, UNITS, unit, unitsOfStage } from './units.ts'
import { heartVoice, letterName, nonsenseVoice, phraseVoice, soundVoice, wordVoice } from './voiceIds.ts'

describe('sound units', () => {
  it('70 tracked items: 62 units and 8 second readings', () => {
    expect(UNITS.length).toBe(70)
    expect(UNITS.filter((u) => u.secondOf).map((u) => u.id).sort())
      .toEqual(['-ed:2', '-ed:3', '-s:2', 'ea:2', 'oo:2', 'ow:2', 'th:2', 'u_e:2'].sort())
  })
  it('47 sound recordings', () => {
    expect(SOUND_KEYS).toHaveLength(47)
    expect(new Set(UNITS.map((u) => u.sound))).toEqual(new Set(SOUND_KEYS))
  })
  it('each stage has its units', () => {
    expect(unitsOfStage(1).filter((u) => !u.secondOf).map((u) => u.id)).toEqual(['a', 'm', 's', 't', 'p', 'f', 'i', 'n'])
    expect(unitsOfStage(3).map((u) => u.id)).toContain('qu')
    expect(UNITS.some((u) => u.id === 'q')).toBe(false)
    expect(unitsOfStage(5)).toEqual([])
    expect([2, 3, 4, 6, 7, 8, 9].map((s) => unitsOfStage(s).filter((u) => !u.secondOf).length)).toEqual([7, 11, 11, 4, 4, 5, 12])
  })
  it('c k ck share /k/', () => expect(new Set(['c', 'k', 'ck'].map((i) => unit(i).sound)).size).toBe(1))
  it('end-only units', () =>
    expect(UNITS.filter((u) => u.endOnly).map((u) => u.id).sort()).toEqual(['ck', 'ff', 'll', 'ng', 'nk', 'ss', 'x', 'zz'].sort()))
  it('a second reading names an existing main unit of the same stage or earlier', () => {
    for (const u of UNITS.filter((x) => x.secondOf)) expect(unit(u.secondOf!).stage).toBeLessThanOrEqual(u.stage)
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(70)
  })
  it('the split magic-e tile text and the unknown id', () => {
    expect(unit('a_e').text).toBe('a e')
    expect(unit('oo:2').text).toBe('oo')
    expect(() => unit('zzzz')).toThrow()
  })
  it('stage 5 blend patterns', () => {
    expect(BLENDS).toHaveLength(25)
    expect(BLENDS.find((b) => b.id === 'st-')).toMatchObject({ letters: ['s', 't'], at: 'start' })
    expect(BLENDS.find((b) => b.id === '-mp')).toMatchObject({ letters: ['m', 'p'], at: 'end' })
  })
})

describe('voice ids', () => {
  it('name the files', () => {
    expect(soundVoice(unit('sh'))).toBe('snd-sh')
    expect([letterName('b'), wordVoice('cat'), heartVoice('the'), nonsenseVoice('vap'), phraseVoice('p1')])
      .toEqual(['ln-b', 'w-cat', 'hw-the', 'nw-vap', 'ph-p1'])
  })
})
