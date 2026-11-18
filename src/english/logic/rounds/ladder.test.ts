// The English ladder's plans (design Part 5, "word chains"): each rung changes one sound of the word below it
// (sat → sit → fit); the chain's first word is the foot, built already; he hears each new word and drags the part that
// makes it. The changed place is marked at stages 1–3;
// from stage 5 a rung may add a consonant (lip → slip). The shared rules of every English screen's rounds.
import { describe, expect, it } from 'vitest'
import type { LadderPlan } from '../../../duel2/course/types'
import type { Choice, RoundCtx } from '../../../duel2/logic/rounds'
import { seeded } from '../../../duel2/testing/runHarness'
import { CHAINS } from '../../content/chains'
import { unit } from '../../content/units'
import { WORDS, word } from '../../content/words'
import { enLadderPlan } from './ladder'

const ctxAt = (stage: number, seed = 1): RoundCtx => ({ rng: seeded(seed), stage, tallies: {}, recent: {}, confusions: { letters: {}, syllables: {} } })

function plans(stage: number, n = 200, rungs = 5): LadderPlan[] {
  const out: LadderPlan[] = []
  for (let seed = 1; seed <= n; seed++) out.push(enLadderPlan(ctxAt(stage, seed), rungs))
  return out
}

/** the plate a step asks for: the changed part */
const rightOf = (s: LadderPlan['steps'][number]): Choice => s.parts![s.at!]
/** the ladder's words: its foot, then each rung's */
const words = (p: LadderPlan) => [p.base!.target.id, ...p.steps.map((s) => s.target.id)]

describe('the English ladder', () => {
  it('sat → sit marks position 1', () => {
    const p = plans(1).find((x) => x.base!.target.id === 'sat')
    expect(p).toBeDefined()
    expect(p!.marked).toBe(true)
    expect(p!.fixed).toBeUndefined()
    // the foot is the chain's first word, built already (its boxes for the rung above)
    expect(p!.base!.target.soundId).toBe('w-sat')
    expect(p!.base!.parts.map((x) => x.text)).toEqual(['s', 'a', 't'])
    const sit = p!.steps[0]
    expect(sit.target.id).toBe('sit')
    expect(sit.target.soundId).toBe('w-sit')
    expect(sit.at).toBe(1)
    expect(sit.grow).toBeUndefined()
    expect(sit.parts!.map((x) => x.text)).toEqual(['s', 'i', 't'])
    expect(rightOf(sit).id).toBe('i')
    expect(sit.plates.map((x) => x.id)).toContain('i')
  })

  it('from stage 4 the place is not marked', () => {
    for (let stage = 1; stage <= 3; stage++) for (const p of plans(stage, 20)) expect(p.marked).toBe(true)
    for (let stage = 4; stage <= 9; stage++) for (const p of plans(stage, 20)) expect(p.marked).toBe(false)
  })

  it('lip → slip adds one box', () => {
    const p = plans(5, 300).find((x) => x.base!.target.id === 'lip')
    expect(p).toBeDefined()
    const slip = p!.steps[0]
    expect(slip.target.id).toBe('slip')
    expect(slip.grow).toBe(1)
    expect(slip.at).toBe(0)
    expect(slip.parts).toHaveLength(p!.base!.parts.length + 1)
    expect(rightOf(slip).text).toBe('s')
    // no rung grows before stage 5
    for (let stage = 1; stage <= 4; stage++) for (const q of plans(stage, 40)) expect(q.steps.some((s) => s.grow)).toBe(false)
  })

  it('no word twice in a ladder', () => {
    for (let stage = 1; stage <= 9; stage++) {
      for (let rungs = 2; rungs <= 5; rungs++) {
        for (const p of plans(stage, 30, rungs)) {
          expect(p.steps.length).toBeLessThanOrEqual(rungs)
          expect(new Set(words(p)).size).toBe(p.steps.length + 1)
        }
      }
    }
  })

  it('a ladder is the start of a chain of his own stage; a short chain makes a short ladder', () => {
    for (let stage = 1; stage <= 9; stage++) {
      for (let rungs = 2; rungs <= 5; rungs++) {
        for (const p of plans(stage, 30, rungs)) {
          const chain = CHAINS.find((c) => c.stage === stage && c.words.slice(0, p.steps.length + 1).join() === words(p).join())
          expect(chain).toBeDefined()
          expect(p.steps).toHaveLength(Math.min(rungs, chain!.words.length - 1))
        }
      }
    }
    // every chain of a stage comes (stage 4 has four ladders, stage 9 its own chains)
    for (let stage = 1; stage <= 9; stage++) {
      const seen = new Set(plans(stage, 200).map((p) => words(p)[0] + words(p)[1]))
      expect(seen.size).toBe(CHAINS.filter((c) => c.stage === stage).length)
    }
  })

  it('every chain runs at full length through the plan', () => {
    for (const chain of CHAINS) {
      const p = plans(chain.stage, 400).find((x) => x.base!.target.id === chain.words[0] && x.steps[0].target.id === chain.words[1])
      expect(p, `${chain.stage}${chain.id}`).toBeDefined()
      expect(words(p!)).toEqual(chain.words)
      // grow -1 is reserved: no chain drops a box
      expect(p!.steps.every((s) => s.at !== undefined && (s.grow === undefined || s.grow === 1))).toBe(true)
    }
  })

  it('a magic e is the e he adds (pin → pine), and counts for its silent e', () => {
    const p = plans(6, 200).find((x) => x.base!.target.id === 'pin')
    expect(p).toBeDefined()
    const pine = p!.steps[0]
    expect(pine.parts!.map((x) => x.text)).toEqual(['p', 'i', 'n', 'e'])
    expect(pine.at).toBe(3)
    expect(rightOf(pine)).toMatchObject({ id: 'i_e', text: 'e', soundId: 'snd-eye' })
    // the rest of the chain keeps the e at the end: pine → line changes the first box
    expect(p!.steps[1].at).toBe(0)
  })

  it('keeps the shared rules at every stage', () => {
    for (let stage = 1; stage <= 9; stage++) {
      for (const p of plans(stage, 80)) {
        expect(WORDS).toContain(word(p.base!.target.id))
        expect(p.base!.parts.map((x) => x.text).join('')).toBe(word(p.base!.target.id).text)
        p.steps.forEach((s, k) => {
          const w = word(s.target.id)
          expect(WORDS).toContain(w)
          expect(w.kind).toBe('real')
          expect(s.target.picture).toBeUndefined()
          expect(s.plates).toHaveLength(3)
          const right = rightOf(s)
          // the right plate once, among plates that never sound alike, never look alike, never I against l
          expect(s.plates.filter((x) => x.id === right.id)).toHaveLength(1)
          expect(new Set(s.plates.map((x) => x.soundId)).size).toBe(3)
          expect(new Set(s.plates.map((x) => x.text)).size).toBe(3)
          const texts = s.plates.map((x) => x.text).join(' ')
          expect(texts.includes('I') && texts.includes('l')).toBe(false)
          for (const x of s.plates) {
            expect(x.picture).toBeUndefined()
            expect(unit(x.id).stage).toBeLessThanOrEqual(stage)
          }
          // a part shows a unit's letters (no hyphen of an ending); the parts spell the word
          expect(s.parts!.map((x) => x.text).join('')).toBe(w.text)
          for (const x of s.parts!) expect(x.text).not.toMatch(/^-/)
          // one box changed, or one added, from the word below
          const below = (k === 0 ? p.base!.parts : p.steps[k - 1].parts!).map((x) => x.text)
          const now = s.parts!.map((x) => x.text)
          if (s.grow === 1) expect(now.filter((_, i) => i !== s.at)).toEqual(below)
          else {
            expect(s.grow).toBeUndefined()
            expect(now.length).toBe(below.length)
            expect(now.filter((x, i) => x !== below[i])).toEqual([now[s.at!]])
          }
        })
      }
    }
  })
})
