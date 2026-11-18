// The sound units of the nine stages (design Part 3, asset plan 3.1) and the stage-5 blend patterns.
// Erasable TypeScript: Node loads it as it is.

export type UnitKind = 'vowel' | 'consonant' | 'digraph' | 'double' | 'magic-e' | 'ending' | 'r-vowel' | 'team'

export interface Unit {
  /** display spelling: 'a', 'sh', 'qu', 'a_e', '-ing'; a second reading: 'oo:2', 'th:2', '-ed:3' */
  id: string
  /** as shown on a tile; 'a_e' shows as 'a e', split around the consonant, in words */
  text: string
  stage: number
  kind: UnitKind
  /** one of the 47 sound keys (SOUND_KEYS) */
  sound: string
  /** a second reading: the main unit's id */
  secondOf?: string
  /** never starts a word: asked by its last sound (x ck ff ll ss zz ng nk) */
  endOnly: boolean
}

/** The 47 sound recordings of asset plan 3.1, in that table's order (the files are named `snd-<key>`). */
export const SOUND_KEYS = [
  'ae', 'eh', 'ih', 'ah', 'uh', 'm', 's', 't', 'p', 'f', 'n', 'd', 'k', 'g', 'b', 'h', 'r', 'l', 'w', 'j', 'y', 'ks', 'kw', 'v', 'z', 'sh', 'ch', 'th', 'dh', 'ng', 'nk', 'ay', 'eye', 'oh', 'oo', 'you', 'ee', 'iz', 'id', 'ing', 'ar', 'or', 'er', 'ow', 'oy', 'aw', 'uu',
] as const

const u = (id: string, stage: number, kind: UnitKind, sound: string, secondOf?: string, endOnly = false): Unit => ({
  id,
  text: id.replace(/:\d$/, '').replace('_', ' '),
  stage,
  kind,
  sound,
  ...(secondOf ? { secondOf } : {}),
  endOnly,
})

export const UNITS: Unit[] = [
  u('a', 1, 'vowel', 'ae'),
  u('m', 1, 'consonant', 'm'),
  u('s', 1, 'consonant', 's'),
  u('t', 1, 'consonant', 't'),
  u('p', 1, 'consonant', 'p'),
  u('f', 1, 'consonant', 'f'),
  u('i', 1, 'vowel', 'ih'),
  u('n', 1, 'consonant', 'n'),
  u('o', 2, 'vowel', 'ah'),
  u('d', 2, 'consonant', 'd'),
  u('c', 2, 'consonant', 'k'),
  u('u', 2, 'vowel', 'uh'),
  u('g', 2, 'consonant', 'g'),
  u('b', 2, 'consonant', 'b'),
  u('e', 2, 'vowel', 'eh'),
  u('k', 3, 'consonant', 'k'),
  u('h', 3, 'consonant', 'h'),
  u('r', 3, 'consonant', 'r'),
  u('l', 3, 'consonant', 'l'),
  u('w', 3, 'consonant', 'w'),
  u('j', 3, 'consonant', 'j'),
  u('y', 3, 'consonant', 'y'),
  u('x', 3, 'consonant', 'ks', undefined, true),
  u('qu', 3, 'digraph', 'kw'),
  u('v', 3, 'consonant', 'v'),
  u('z', 3, 'consonant', 'z'),
  u('ck', 4, 'digraph', 'k', undefined, true),
  u('ff', 4, 'double', 'f', undefined, true),
  u('ll', 4, 'double', 'l', undefined, true),
  u('ss', 4, 'double', 's', undefined, true),
  u('zz', 4, 'double', 'z', undefined, true),
  u('sh', 4, 'digraph', 'sh'),
  u('ch', 4, 'digraph', 'ch'),
  u('th', 4, 'digraph', 'th'),
  u('th:2', 4, 'digraph', 'dh', 'th'),
  u('wh', 4, 'digraph', 'w'),
  u('ng', 4, 'digraph', 'ng', undefined, true),
  u('nk', 4, 'digraph', 'nk', undefined, true),
  u('a_e', 6, 'magic-e', 'ay'),
  u('i_e', 6, 'magic-e', 'eye'),
  u('o_e', 6, 'magic-e', 'oh'),
  u('u_e', 6, 'magic-e', 'oo'),
  u('u_e:2', 6, 'magic-e', 'you', 'u_e'),
  u('-s', 7, 'ending', 's'),
  u('-s:2', 7, 'ending', 'z', '-s'),
  u('-es', 7, 'ending', 'iz'),
  u('-ed', 7, 'ending', 't'),
  u('-ed:2', 7, 'ending', 'd', '-ed'),
  u('-ed:3', 7, 'ending', 'id', '-ed'),
  u('-ing', 7, 'ending', 'ing'),
  u('ar', 8, 'r-vowel', 'ar'),
  u('or', 8, 'r-vowel', 'or'),
  u('er', 8, 'r-vowel', 'er'),
  u('ir', 8, 'r-vowel', 'er'),
  u('ur', 8, 'r-vowel', 'er'),
  u('ai', 9, 'team', 'ay'),
  u('ay', 9, 'team', 'ay'),
  u('ee', 9, 'team', 'ee'),
  u('ea', 9, 'team', 'ee'),
  u('ea:2', 9, 'team', 'eh', 'ea'),
  u('oa', 9, 'team', 'oh'),
  u('ow', 9, 'team', 'oh'),
  u('ow:2', 9, 'team', 'ow', 'ow'),
  u('igh', 9, 'team', 'eye'),
  u('oo', 9, 'team', 'oo'),
  u('oo:2', 9, 'team', 'uu', 'oo'),
  u('ou', 9, 'team', 'ow'),
  u('oi', 9, 'team', 'oy'),
  u('oy', 9, 'team', 'oy'),
  u('aw', 9, 'team', 'aw'),
]

const BY_ID = new Map(UNITS.map((x) => [x.id, x]))

export const unit = (id: string): Unit => {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`no sound unit "${id}"`)
  return found
}

export const unitsOfStage = (s: number): Unit[] => UNITS.filter((x) => x.stage === s)

const startBlends = ['st', 'sp', 'sn', 'sl', 'sk', 'sm', 'sw', 'fr', 'fl', 'tr', 'cr', 'dr', 'br', 'gr', 'pl', 'cl', 'bl', 'gl']
const endBlends = ['nt', 'nd', 'mp', 'st', 'sk', 'ft', 'lk']

/** Stage 5: two consonants together. Skills, not units: each letter keeps its own sound. */
export const BLENDS: { id: string; letters: string[]; at: 'start' | 'end'; stage: 5 }[] = [
  ...startBlends.map((b) => ({ id: `${b}-`, letters: [...b], at: 'start' as const, stage: 5 as const })),
  ...endBlends.map((b) => ({ id: `-${b}`, letters: [...b], at: 'end' as const, stage: 5 as const })),
]
