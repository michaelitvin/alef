import { describe, expect, it } from 'vitest'
import { RUNGS, isRungId, rungDef, type RungId } from './rungs'

const ORDER = ['1', '2', '3', '4', '5', '6', '7', 'C1', '8', '9', '10', '11', '12', 'S1', 'T1', '13', '14', 'C2', 'T2', '15', '16', 'S2', 'T3', '17', '18', 'T4a', 'T4b', '19', 'H1', 'T5', 'T6']

const NEEDS: Record<string, string[]> = {
  '1': [], '2': ['1'], '3': ['2'], '4': ['3'], '5': ['4'], '6': ['5'], '7': ['6'], C1: ['7'], '8': ['7'], '9': ['7'], '10': ['9'],
  '11': ['10'], '12': ['11'], S1: ['8'], T1: ['10', 'S1'], '13': ['12', '8'], '14': ['13'], C2: ['C1', '13'], T2: ['T1'],
  '15': ['14'], '16': ['15'], S2: ['S1'], T3: ['T2', 'S2'], '17': ['16'], '18': ['17'], T4a: ['T3', '6'], T4b: ['T4a'],
  '19': ['18'], H1: ['14', '16'], T5: ['T3'], T6: ['T4b', 'T5'],
}

describe('the rung table', () => {
  it('31 rungs in the design order', () => {
    expect(RUNGS.map((r) => r.id)).toEqual(ORDER)
    expect(RUNGS.map((r) => r.order)).toEqual(ORDER.map((_, i) => i + 1))
    expect(RUNGS).toHaveLength(31)
  })
  it('needs as the design', () => {
    for (const r of RUNGS) expect([r.id, r.needs]).toEqual([r.id, NEEDS[r.id]])
  })
  it('every need comes earlier in the order', () => {
    for (const r of RUNGS) for (const n of r.needs) expect(rungDef(n).order).toBeLessThan(r.order)
  })
  it('the strands', () => {
    expect(RUNGS.filter((r) => r.strand === 'compare').map((r) => r.id)).toEqual(['C1', 'C2'])
    expect(RUNGS.filter((r) => r.strand === 'times').map((r) => r.id)).toEqual(['S1', 'T1', 'T2', 'S2', 'T3', 'T4a', 'T4b', 'T5', 'T6'])
    expect(RUNGS.filter((r) => r.strand === 'plus')).toHaveLength(20)
  })
  it('the switches and bands', () => {
    const sw = (s: string) => RUNGS.filter((r) => r.switch === s).map((r) => r.id)
    expect(sw('compare')).toEqual(['C1', 'C2'])
    expect(sw('jumps')).toEqual(['S1', 'S2'])
    expect(sw('times')).toEqual(['T1', 'T2', 'T3', 'T5'])
    expect(sw('divide')).toEqual(['T4a', 'T4b', 'T6'])
    expect(sw('missing100')).toEqual(['19'])
    expect(sw('hundreds')).toEqual(['H1'])
    expect(RUNGS.filter((r) => !r.switch).map((r) => r.id)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'])
    const band = (b: string) => RUNGS.filter((r) => r.band === b).map((r) => r.id).sort()
    expect(band('hundreds')).toEqual(['H1'])
    expect(band('big')).toEqual((['13', '14', '15', '16', '17', '18', '19', 'C2', 'S2', 'T5', 'T6'] as RungId[]).sort())
    expect(band('small')).toHaveLength(19)
    for (const r of ['1', '12', 'C1', 'S1', 'T1', 'T4a', 'T4b']) expect(rungDef(r as RungId).band).toBe('small')
  })
  it('isRungId', () => {
    expect(isRungId('H1')).toBe(true)
    expect(isRungId('20')).toBe(false)
    expect(isRungId(3)).toBe(false)
  })
})
