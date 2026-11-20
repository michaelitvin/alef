// The look-alike sets of asset plan 1.13: letters and words for the ghosts. Erasable TypeScript.

/** Look-alike letters for the ghosts, one set per visit (asset plan 1.13). `q` appears only as `qu`; never `I` against `l`. */
export const LOOKALIKE_LETTERS: { stage: number; letters: string[] }[] = [
  { stage: 2, letters: ['b', 'd', 'p'] },
  { stage: 2, letters: ['n', 'u'] },
  { stage: 3, letters: ['m', 'w'] },
  { stage: 3, letters: ['h', 'n'] },
]

/** Look-alike word sets for the ghosts, from the stage they open at (asset plan 1.13). `no` and `was` are heart words. */
export const GHOST_WORD_SETS: { stage: number; words: string[] }[] = [
  { stage: 2, words: ['on', 'no'] },
  { stage: 2, words: ['top', 'pot'] },
  { stage: 2, words: ['ten', 'net'] },
  { stage: 2, words: ['gum', 'mug'] },
  { stage: 2, words: ['big', 'dig', 'pig'] },
  { stage: 2, words: ['tip', 'pit'] },
  { stage: 3, words: ['hot', 'not'] },
  { stage: 3, words: ['hut', 'nut'] },
  { stage: 3, words: ['hip', 'nip'] },
  { stage: 5, words: ['stop', 'spot'] },
  { stage: 9, words: ['was', 'saw'] },
]
