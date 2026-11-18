import { describe, expect, it } from 'vitest'
import { UNITS, unit } from '../content/units'
import { word } from '../content/words'
import { introParts, introStep } from './intro'

describe('introStep', () => {
  it('a new unit is asked once before its introduction; right skips it, and the next two decide', () => {
    let s = introStep(undefined, null).state
    expect(introStep(s, 'right')).toMatchObject({ show: 'none', state: { skipped: true, known: false } })
    s = introStep(s, 'right').state
    s = introStep(s, 'right').state
    expect(introStep(s, 'right').state).toMatchObject({ after: 'oo', known: true })
    expect(introStep(introStep(introStep(undefined, null).state, 'right').state, 'wrong')).toMatchObject({ show: 'intro', state: { known: false } })
  })
  it('a miss on the first ask brings the introduction', () => expect(introStep(introStep(undefined, null).state, 'wrong').show).toBe('intro'))
  it('a known unit stays known', () => expect(introStep({ asked: 3, skipped: true, after: 'oo', known: true }, 'wrong')).toMatchObject({ show: 'none', state: { known: true } }))
  it('after the introduction, later answers show nothing', () => {
    const shown = introStep(undefined, 'wrong').state
    expect(introStep(shown, 'wrong').show).toBe('none')
  })
})

describe('introParts', () => {
  it('a unit: its line, its sound and a picture word', () => expect(introParts(unit('m'), false)).toEqual(['intro-sound', 'snd-m', 'w-map']))
  it('the first silent e is introduced with the magic-e line', () => expect(introParts(unit('a_e'), true)[0]).toBe('intro-magic-e'))
  it('the first ending and the first digraph have their lines', () => {
    expect(introParts(unit('-ing'), true)[0]).toBe('intro-ending')
    expect(introParts(unit('ck'), true)[0]).toBe('intro-team')
  })
  it('a unit that is not the first of its kind has the plain line', () => expect(introParts(unit('i_e'), false)[0]).toBe('intro-sound'))
  it('a second reading has intro-second', () => expect(introParts(unit('oo:2'), true)[0]).toBe('intro-second'))
  it('a heart word is introduced with intro-heart and the word', () => expect(introParts(word('the'), true)).toEqual(['intro-heart', 'hw-the']))
  it('the first blend', () => expect(introParts(word('stop'), true)[0]).toBe('intro-blend'))
  it('qu and nk are digraphs by spelling only, and never give the two-letters line', () => {
    expect([unit('qu').kind, unit('nk').kind]).toEqual(['digraph', 'digraph'])
    expect(introParts(unit('qu'), true)).not.toContain('intro-team')
    expect(introParts(unit('nk'), true)).not.toContain('intro-team')
  })
  it('the first true digraph is in stage 4', () => {
    const first = UNITS.find((u) => u.kind === 'digraph' && !['kw', 'nk'].includes(u.sound))
    expect(first?.stage).toBe(4)
  })
})
