import { describe, expect, it } from 'vitest'
import { CHAINS } from './chains.ts'
import { PHRASES } from './phrases.ts'
import { PLACEMENT_ROUNDS, type PlacementText } from './placementRounds.ts'
import { GHOST_WORD_SETS, LOOKALIKE_LETTERS } from './sets.ts'
import { BLENDS, unit } from './units.ts'
import { WORDS, word, type EnWord } from './words.ts'

const BLOCKLIST = ['bod', 'taip', 'grane', 'birp', 'kog', 'clom', 'jome']

/** The asset plan's 1.17: the longest real word of each stage (letters), the plan's examples, and whether they are all of it. */
const LONGEST_1_17: Record<number, { length: number; words: string[]; complete: boolean }> = {
  1: { length: 3, words: ['sat'], complete: false },
  2: { length: 3, words: ['dog'], complete: false },
  3: { length: 4, words: ['quiz'], complete: true },
  4: { length: 5, words: ['chick', 'shell'], complete: true },
  5: { length: 5, words: ['stamp', 'snack', 'smell'], complete: false },
  6: { length: 5, words: ['smile', 'slide', 'globe', 'white'], complete: false },
  7: { length: 7, words: ['jumping', 'kicking', 'licking', 'fishing', 'wishing', 'singing'], complete: true },
  8: { length: 6, words: ['sister', 'winter'], complete: true },
  9: { length: 5, words: ['spoon', 'cloud', 'crown', 'wheel', 'teeth', 'night'], complete: false },
}
/** 1.17, last column: the longest nonsense word of each stage. */
const LONGEST_NONSENSE: Record<number, number> = { 1: 3, 2: 3, 3: 4, 4: 5, 5: 5, 6: 5, 7: 8, 8: 5, 9: 5 }

const count = (kind: EnWord['kind']): number => WORDS.filter((w) => w.kind === kind).length
const decodable = (): EnWord[] => WORDS.filter((w) => w.kind === 'real' || w.kind === 'nonsense')
const stageOfUnit = (id: string): number => unit(id).stage

const START_BLENDS = ['st', 'sp', 'sn', 'sl', 'sk', 'sm', 'sw', 'fr', 'fl', 'tr', 'cr', 'dr', 'br', 'gr', 'pl', 'cl', 'bl', 'gl']
const END_BLENDS = ['nt', 'nd', 'mp', 'st', 'sk', 'ft', 'lk']
const plain = (id: string): boolean => unit(id).kind === 'consonant'

/** The stage-5 patterns a unit list holds, derived from the units: two plain consonants at the start or the end. */
const derivedBlends = (units: string[]): string[] => {
  const letters = units.map((u) => unit(u).text)
  const n = units.length
  const out: string[] = []
  if (n >= 2 && plain(units[0]) && plain(units[1]) && START_BLENDS.includes(letters[0] + letters[1])) out.push(letters[0] + letters[1] + '-')
  if (n >= 2 && plain(units[n - 2]) && plain(units[n - 1]) && END_BLENDS.includes(letters[n - 2] + letters[n - 1])) out.push('-' + letters[n - 2] + letters[n - 1])
  return out
}
/** Any two plain consonant units side by side (a blend, listed or not). */
const adjacentConsonants = (units: string[]): boolean => units.some((u, i) => i > 0 && plain(u) && plain(units[i - 1]))
const blendStages = (w: EnWord): number[] => derivedBlends(w.units).map(() => 5)

/** The letters of a unit list; a magic e wraps the next consonant ('c a_e k' = cake). */
const spell = (units: string[]): string => {
  let out = ''
  for (let i = 0; i < units.length; i++) {
    const u = unit(units[i])
    if (u.kind === 'magic-e') out += u.text[0] + unit(units[++i]).text + 'e'
    else out += u.text.replace(/^-/, '')
  }
  return out
}

const longestPerStage = (): Record<number, Set<string>> => {
  const out: Record<number, Set<string>> = {}
  for (let s = 1; s <= 9; s++) {
    const real = WORDS.filter((w) => w.kind === 'real' && w.stage === s)
    const max = Math.max(...real.map((w) => w.text.length))
    out[s] = new Set(real.filter((w) => w.text.length === max).map((w) => w.text))
  }
  return out
}

/** A word or a placement text as {text, units}. */
const asUnits = (x: string | PlacementText): { text: string; units: string[] } => (typeof x === 'string' ? word(x) : x)

/** Positions of the stage-5 blends in a unit list. */
const blendPositions = (units: string[]): Set<number> => {
  const out = new Set<number>()
  const found = derivedBlends(units)
  if (found.some((b) => b.endsWith('-'))) [0, 1].forEach((i) => out.add(i))
  if (found.some((b) => b.startsWith('-'))) [units.length - 2, units.length - 1].forEach((i) => out.add(i))
  return out
}

/** The one unit position where two unit lists of the same length differ; undefined when they differ elsewhere or twice. */
const oneDifference = (a: string[], b: string[]): number | undefined => {
  if (a.length !== b.length) return undefined
  const at = a.map((u, i) => (u === b[i] ? -1 : i)).filter((i) => i >= 0)
  return at.length === 1 ? at[0] : undefined
}

/** The position of the unit that one list has more than the other; undefined if the lists do not differ by one added unit. */
const oneAdded = (long: string[], short: string[]): number | undefined => {
  if (long.length !== short.length + 1) return undefined
  for (let i = 0; i < long.length; i++) {
    if (long.slice(0, i).join(' ') === short.slice(0, i).join(' ') && long.slice(i + 1).join(' ') === short.slice(i).join(' ')) return i
  }
  return undefined
}

/** Edit distance: one letter changed, added or dropped is 1. */
const distance = (a: string, b: string): number => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

const hasDuplicates = (xs: string[]): boolean => new Set(xs).size !== xs.length

describe('word lists', () => {
  it('totals', () => {
    expect(count('real')).toBe(313)
    expect(count('picture-only')).toBe(38)
    expect(count('heart')).toBe(33)
    expect(count('nonsense')).toBe(102)
    expect(PHRASES.length).toBe(18)
  })

  it('every id is unique, the text of the word', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length)
    for (const w of WORDS) expect(w.id).toBe(w.text)
    expect(() => word('nope')).toThrow()
  })

  it('a word belongs to the stage of its highest unit', () => {
    for (const w of decodable()) {
      expect(w.stage, w.text).toBe(Math.max(...w.units.map(stageOfUnit), ...blendStages(w)))
    }
  })

  it('units spell the word', () => {
    for (const w of decodable()) expect(spell(w.units), w.text).toBe(w.text)
  })

  it('the blend flags equal the blends derived from the units; below stage 5 no two consonants meet', () => {
    for (const w of decodable()) {
      const derived = derivedBlends(w.units).sort()
      if (w.stage === 5) {
        expect(derived.length, w.text).toBeGreaterThan(0)
        expect([...(w.blends ?? [])].sort(), w.text).toEqual(derived)
        // every pair of consonants side by side is a listed blend
        const covered = blendPositions(w.units)
        w.units.forEach((u, i) => {
          if (i > 0 && plain(u) && plain(w.units[i - 1])) expect(covered.has(i) && covered.has(i - 1), `${w.text} at ${i}`).toBe(true)
        })
      } else {
        expect(w.blends, w.text).toBeUndefined()
        if (w.stage < 5) expect(adjacentConsonants(w.units), `${w.text} has two consonants together before stage 5`).toBe(false)
      }
    }
  })

  it('heart words and picture-only words have no units; pictures exist where the plan says', () => {
    for (const w of WORDS.filter((x) => x.kind === 'heart' || x.kind === 'picture-only')) expect(w.units).toEqual([])
    for (const w of WORDS.filter((x) => x.kind === 'picture-only')) expect(w.picture).toBe(w.text)
    for (const w of WORDS.filter((x) => x.kind === 'heart')) expect(w.uses).toEqual([])
  })

  it('heart words are never in chains, placement, nonsense sets or spelling', () => {
    const hearts = new Set(WORDS.filter((w) => w.kind === 'heart').map((w) => w.text))
    for (const c of CHAINS) for (const w of c.words) expect(hearts.has(w), `chain ${w}`).toBe(false)
    for (const r of PLACEMENT_ROUNDS) for (const w of [r.target, ...r.others]) expect(typeof w === 'string' && hearts.has(w), 'placement').toBe(false)
    for (const w of WORDS.filter((x) => x.kind === 'heart')) {
      expect(w.picture).toBeUndefined()
      expect(w.uses.some((u) => u === 'S-pic' || u.startsWith('L'))).toBe(false)
    }
    for (const w of WORDS.filter((x) => x.kind === 'nonsense')) expect(hearts.has(w.text)).toBe(false)
  })

  it('no capital before stage 4: I is a stage-4 heart word', () => {
    expect(word('I').stage).toBe(4)
    expect(word('I').kind).toBe('heart')
    for (const w of WORDS.filter((x) => x.stage < 4)) expect(w.text).toBe(w.text.toLowerCase())
    expect(WORDS.filter((x) => x.kind === 'heart' && x.stage < 4).map((x) => x.text)).toEqual(['the', 'a', 'is', 'to', 'do', 'of', 'no', 'was', 'you', 'he', 'we'])
  })

  it('spell-book words have at most 5 boxes', () => {
    for (const w of WORDS.filter((x) => x.kind === 'real')) expect(w.units.length, w.text).toBeLessThanOrEqual(5)
    for (const w of WORDS.filter((x) => x.uses.includes('S-pic'))) expect(w.picture, w.text).toBeDefined()
  })

  it('a first-sound picture starts with its unit main sound; end-only units by their last sound', () => {
    let checked = 0
    for (const w of WORDS) {
      for (const use of w.uses.filter((u) => u.startsWith('Tl:'))) {
        const target = unit(use.slice(3))
        expect(w.picture, w.text).toBeDefined()
        checked++
        if (w.units.length === 0) {
          expect(target.endOnly).toBe(false)
          expect(w.text.startsWith(target.text), `${w.text} ${use}`).toBe(true)
        } else if (target.endOnly) {
          expect(unit(w.units[w.units.length - 1]).sound, `${w.text} ${use}`).toBe(target.sound)
        } else {
          expect(unit(w.units[0]).sound, `${w.text} ${use}`).toBe(target.sound)
        }
      }
    }
    expect(checked).toBeGreaterThan(60)
  })

  it('nonsense words are not real words, not in the blocklist, and not one letter changed, added or dropped from a heart word', () => {
    const real = new Set(WORDS.filter((w) => w.kind !== 'nonsense').map((w) => w.text.toLowerCase()))
    const hearts = WORDS.filter((w) => w.kind === 'heart').map((w) => w.text.toLowerCase())
    for (const w of WORDS.filter((x) => x.kind === 'nonsense')) {
      expect(real.has(w.text), w.text).toBe(false)
      expect(BLOCKLIST.includes(w.text), w.text).toBe(false)
      for (const h of hearts.filter((x) => x.length >= 2)) expect(distance(w.text, h), `${w.text} next to ${h}`).toBeGreaterThan(1)
    }
    for (const w of BLOCKLIST) expect(WORDS.some((x) => x.text === w)).toBe(false)
  })

  it('the longest words per stage are the asset plan 1.17', () => {
    const longest = longestPerStage()
    for (const [stage, plan] of Object.entries(LONGEST_1_17)) {
      const set = longest[+stage]
      expect([...set][0].length, `stage ${stage}`).toBe(plan.length)
      for (const w of plan.words) expect(set.has(w), `${w} is longest at stage ${stage}`).toBe(true)
      if (plan.complete) expect(set).toEqual(new Set(plan.words))
    }
    for (const [stage, length] of Object.entries(LONGEST_NONSENSE)) {
      const lengths = WORDS.filter((w) => w.kind === 'nonsense' && w.stage === +stage).map((w) => w.text.length)
      expect(Math.max(...lengths), `nonsense stage ${stage}`).toBe(length)
    }
  })

  it('no Hebrew character anywhere', () =>
    expect(JSON.stringify([WORDS, PHRASES, CHAINS, GHOST_WORD_SETS, LOOKALIKE_LETTERS, PLACEMENT_ROUNDS])).not.toMatch(/[֐-׿]/))
})

describe('look-alike sets', () => {
  it('letters are real units of the stage; q never alone; I never against l', () => {
    for (const s of LOOKALIKE_LETTERS) {
      expect(s.letters.length).toBeGreaterThanOrEqual(2)
      for (const l of s.letters) expect(unit(l).stage, l).toBeLessThanOrEqual(s.stage)
      expect(s.letters).not.toContain('q')
      expect(s.letters.includes('i') && s.letters.includes('l')).toBe(false)
    }
    expect(LOOKALIKE_LETTERS.map((s) => s.letters.join(' '))).toEqual(['b d p', 'n u', 'm w', 'h n'])
  })

  it('ghost word sets: words exist, open at their latest word, and match the G uses', () => {
    for (const set of GHOST_WORD_SETS) {
      expect(set.words.length).toBeGreaterThanOrEqual(2)
      expect(Math.max(...set.words.map((w) => word(w).stage)), set.words.join(' ')).toBeLessThanOrEqual(set.stage)
    }
    const inSets = new Set(GHOST_WORD_SETS.flatMap((s) => s.words).filter((w) => word(w).kind === 'real'))
    const marked = new Set(WORDS.filter((w) => w.uses.includes('G')).map((w) => w.text))
    expect(inSets).toEqual(marked)
  })
})

describe('chains', () => {
  it('a chain rung changes one unit (from stage 5 also adds or drops one consonant or ending), and asks no word twice', () => {
    for (const c of CHAINS) {
      expect(hasDuplicates(c.words), `${c.stage} ${c.id}`).toBe(false)
      expect(c.words.length).toBeGreaterThanOrEqual(3)
      for (const w of c.words) {
        expect(word(w).kind, w).toBe('real')
        expect(word(w).stage, `${w} in ${c.stage} ${c.id}`).toBeLessThanOrEqual(c.stage)
      }
      for (let i = 1; i < c.words.length; i++) {
        const a = word(c.words[i - 1]).units
        const b = word(c.words[i]).units
        const changed = oneDifference(a, b) !== undefined
        const grown = [oneAdded(a, b), oneAdded(b, a)].some((at) => {
          if (at === undefined) return false
          const added = unit((a.length > b.length ? a : b)[at])
          return added.kind === 'consonant' || added.kind === 'ending'
        })
        expect(changed || (c.stage >= 5 && grown), `${c.words[i - 1]} -> ${c.words[i]} (${c.stage} ${c.id})`).toBe(true)
      }
    }
  })

  it('every stage has the four chains, and a word carries the L uses of exactly the chains it is in', () => {
    for (let s = 1; s <= 9; s++) expect(CHAINS.filter((c) => c.stage === s).map((c) => c.id)).toEqual(['L1', 'L2', 'L3', 'L4'])
    for (const w of WORDS) {
      const inChains = [...new Set(CHAINS.filter((c) => c.words.includes(w.text)).map((c) => c.id))].sort()
      expect(w.uses.filter((u) => /^L[1-4]$/.test(u)).sort(), w.text).toEqual(inChains)
    }
  })
})

describe('placement rounds', () => {
  it('three picture and three name rounds per stage; stage 1 asks two and four', () => {
    for (let s = 1; s <= 9; s++) {
      const rounds = PLACEMENT_ROUNDS.filter((r) => r.stage === s)
      expect(rounds.filter((r) => r.kind === 'picture').length).toBe(s === 1 ? 2 : 3)
      expect(rounds.filter((r) => r.kind === 'name').length).toBe(s === 1 ? 4 : 3)
    }
    expect(PLACEMENT_ROUNDS.length).toBe(54)
  })

  it('targets: a picture round asks a pictured real word, a name round a nonsense word; no target twice', () => {
    for (const r of PLACEMENT_ROUNDS) {
      const w = word(r.target)
      if (r.kind === 'picture') {
        expect(w.kind).toBe('real')
        expect(w.picture, r.target).toBeDefined()
        expect(w.uses, r.target).toContain('P★')
      } else {
        expect(w.kind).toBe('nonsense')
      }
      expect(w.stage, r.target).toBeLessThanOrEqual(r.stage)
    }
    expect(hasDuplicates(PLACEMENT_ROUNDS.map((r) => r.target))).toBe(false)
    const pictureRounds = PLACEMENT_ROUNDS.filter((r) => r.kind === 'picture')
    expect(pictureRounds.map((r) => r.target).sort()).toEqual(WORDS.filter((w) => w.uses.includes('P★')).map((w) => w.text).sort())
    // P★ is the target and Pd a wrong choice of a picture round, as in the plan's 1.4 notes
    const wrong = pictureRounds.flatMap((r) => r.others).filter((o): o is string => typeof o === 'string')
    expect([...new Set(wrong)].sort()).toEqual(WORDS.filter((w) => w.uses.includes('Pd')).map((w) => w.text).sort())
  })

  it("each round's tested unit is of its stage and in its word (a stage-5 round tests one of its word's blends)", () => {
    for (const r of PLACEMENT_ROUNDS) {
      const w = word(r.target)
      if (r.stage === 5) {
        expect(BLENDS.map((b) => b.id), r.target).toContain(r.stageUnit)
        expect(w.blends ?? [], r.target).toContain(r.stageUnit)
      } else {
        expect(unit(r.stageUnit).stage, r.target).toBe(r.stage)
        expect(w.units, r.target).toContain(r.stageUnit)
      }
    }
  })

  it("placement words differ only in a unit of the round's stage, and use no unit above it", () => {
    for (const r of PLACEMENT_ROUNDS) {
      const target = asUnits(r.target)
      expect(r.others.length).toBe(2)
      const seen = [r.target]
      for (const o of r.others) {
        const other = asUnits(o)
        seen.push(other.text)
        if (typeof o !== 'string') {
          expect(o.noVoice).toBe(true)
          expect(spell(o.units), o.text).toBe(o.text)
          expect(WORDS.some((w) => w.text === o.text), `${o.text} must not be in WORDS`).toBe(false)
        } else {
          expect(word(o).kind, o).not.toBe('heart')
        }
        for (const x of [target, other]) {
          for (const u of x.units) expect(stageOfUnit(u), `${x.text} in round ${r.target}`).toBeLessThanOrEqual(r.stage)
        }
        const where = `${r.target} / ${other.text}`
        const swap = oneDifference(target.units, other.units)
        if (swap !== undefined) {
          const pair = [target.units[swap], other.units[swap]]
          const inBlend = r.stage === 5 && (blendPositions(target.units).has(swap) || blendPositions(other.units).has(swap))
          expect(pair.some((u) => stageOfUnit(u) === r.stage) || inBlend, where).toBe(true)
        } else {
          // an added or dropped unit: the stage's ending (7), or a consonant of a stage-5 blend
          const long = target.units.length > other.units.length ? target : other
          const at = oneAdded(long.units, (long === target ? other : target).units)
          expect(at, where).toBeDefined()
          const added = unit(long.units[at!])
          expect(r.stage === 7 ? added.kind === 'ending' : r.stage === 5 && blendPositions(long.units).has(at!), where).toBe(true)
        }
      }
      expect(hasDuplicates(seen), r.target).toBe(false)
    }
  })

  it('a placement text is shown only: no voice, never in WORDS', () => {
    const texts = PLACEMENT_ROUNDS.flatMap((r) => r.others).filter((o): o is PlacementText => typeof o !== 'string')
    expect(texts.length).toBeGreaterThan(40)
    for (const t of texts) expect(t.noVoice).toBe(true)
  })
})

describe('door phrases', () => {
  it('2 or 3 words, never a heart word alone, one noun with a picture, from stage 4, three per stage', () => {
    for (const p of PHRASES) {
      expect(p.words.length).toBeGreaterThanOrEqual(2)
      expect(p.words.length).toBeLessThanOrEqual(3)
      expect(p.stage).toBeGreaterThanOrEqual(4)
      const ws = p.words.map((w) => word(w))
      expect(ws.some((w) => w.kind === 'real'), p.id).toBe(true)
      expect(p.words.filter((w) => w === p.noun).length).toBe(1)
      expect(word(p.noun).picture, p.id).toBeDefined()
      for (const w of ws) expect(w.stage, `${w.text} in ${p.id}`).toBeLessThanOrEqual(p.stage)
      expect(ws.some((w) => w.stage === p.stage), p.id).toBe(true)
      expect(p.id).toBe(p.words.join('-').toLowerCase())
    }
    for (let s = 4; s <= 9; s++) expect(PHRASES.filter((p) => p.stage === s).length).toBe(3)
    expect(new Set(PHRASES.map((p) => p.id)).size).toBe(18)
  })

  it('a phrase word that is not a heart word carries the Dp use', () => {
    for (const p of PHRASES) for (const w of p.words.map((x) => word(x)).filter((x) => x.kind === 'real')) expect(w.uses, `${w.text} in ${p.id}`).toContain('Dp')
    const inPhrases = new Set(PHRASES.flatMap((p) => p.words))
    for (const w of WORDS.filter((x) => x.uses.includes('Dp'))) expect(inPhrases.has(w.text), w.text).toBe(true)
  })
})
