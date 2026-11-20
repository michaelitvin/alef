// The ladder's 31 rungs: their order, strand, needs, switch and band. Pure data (the design's *The rungs*).
export type RungId =
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19'
  | 'H1' | 'C1' | 'C2' | 'S1' | 'S2' | 'T1' | 'T2' | 'T3' | 'T4a' | 'T4b' | 'T5' | 'T6'
/** the design's strands A (plus and minus), C (comparison) and M (jumps, times, divide) */
export type Strand = 'plus' | 'compare' | 'times'
export type Switch = 'compare' | 'jumps' | 'times' | 'divide' | 'missing100' | 'hundreds'
/** one arrival time is kept per band */
export type Band = 'small' | 'big' | 'hundreds'
export interface RungDef { id: RungId; order: number; strand: Strand; needs: RungId[]; switch?: Switch; band: Band }

/** the rungs in the order the frontier and placement walk, with what each needs */
const TABLE: [RungId, Strand, RungId[], Switch | undefined][] = [
  ['1', 'plus', [], undefined],
  ['2', 'plus', ['1'], undefined],
  ['3', 'plus', ['2'], undefined],
  ['4', 'plus', ['3'], undefined],
  ['5', 'plus', ['4'], undefined],
  ['6', 'plus', ['5'], undefined],
  ['7', 'plus', ['6'], undefined],
  ['C1', 'compare', ['7'], 'compare'],
  ['8', 'plus', ['7'], undefined],
  ['9', 'plus', ['7'], undefined],
  ['10', 'plus', ['9'], undefined],
  ['11', 'plus', ['10'], undefined],
  ['12', 'plus', ['11'], undefined],
  ['S1', 'times', ['8'], 'jumps'],
  ['T1', 'times', ['10', 'S1'], 'times'],
  ['13', 'plus', ['12', '8'], undefined],
  ['14', 'plus', ['13'], undefined],
  ['C2', 'compare', ['C1', '13'], 'compare'],
  ['T2', 'times', ['T1'], 'times'],
  ['15', 'plus', ['14'], undefined],
  ['16', 'plus', ['15'], undefined],
  ['S2', 'times', ['S1'], 'jumps'],
  ['T3', 'times', ['T2', 'S2'], 'times'],
  ['17', 'plus', ['16'], undefined],
  ['18', 'plus', ['17'], undefined],
  ['T4a', 'times', ['T3', '6'], 'divide'],
  ['T4b', 'times', ['T4a'], 'divide'],
  ['19', 'plus', ['18'], 'missing100'],
  ['H1', 'plus', ['14', '16'], 'hundreds'],
  ['T5', 'times', ['T3'], 'times'],
  ['T6', 'times', ['T4b', 'T5'], 'divide'],
]

const BIG: RungId[] = ['13', '14', '15', '16', '17', '18', '19', 'C2', 'S2', 'T5', 'T6']

export const RUNGS: readonly RungDef[] = TABLE.map(([id, strand, needs, sw], i) => ({
  id, order: i + 1, strand, needs, ...(sw ? { switch: sw } : {}),
  band: id === 'H1' ? 'hundreds' : BIG.includes(id) ? 'big' : 'small',
}))

const BY_ID = new Map<RungId, RungDef>(RUNGS.map((r) => [r.id, r]))

export const rungDef = (id: RungId): RungDef => BY_ID.get(id)!
export const isRungId = (s: unknown): s is RungId => typeof s === 'string' && BY_ID.has(s as RungId)
