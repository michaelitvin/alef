// The English ladder's plans (design Part 5, "word chains"): each rung changes one sound of the word below it
// (sat → sit → fit); he hears the new word and drags the part that makes it. The changed place is marked at stages 1–3;
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

/** the plate a step asks for: the changed part, or (the first rung) the word itself */
const rightOf = (s: LadderPlan['steps'][number]): Choice => (s.at !== undefined ? s.parts![s.at] : s.target)
const words = (p: LadderPlan) => p.steps.map((s) => s.target.id)

describe('the English ladder', () => {
  it('sat → sit marks position 1', () => {
    const p = plans(1).find((x) => x.steps[0].target.id === 'sat')
    expect(p).toBeDefined()
    expect(p!.marked).toBe(true)
    expect(p!.fixed).toBeUndefined()
    const sit = p!.steps[1]
    expect(sit.target.id).toBe('sit')
    expect(sit.target.soundId).toBe('w-sit')
    expect(sit.at).toBe(1)
    expect(sit.grow).toBeUndefined()
    expect(sit.parts!.map((x) => x.text)).toEqual(['s', 'i', 't'])
    expect(rightOf(sit).id).toBe('i')
    expect(sit.plates.map((x) => x.id)).toContain('i')
    // the first rung is the chain's first word, asked whole among words
    expect(p!.steps[0].at).toBeUndefined()
    expect(p!.steps[0].plates.every((x) => x.kind === 'word')).toBe(true)
  })

  it('from stage 4 the place is not marked', () => {
    for (let stage = 1; stage <= 3; stage++) for (const p of plans(stage, 20)) expect(p.marked).toBe(true)
    for (let stage = 4; stage <= 9; stage++) for (const p of plans(stage, 20)) expect(p.marked).toBe(false)
  })

  it('lip → slip adds one box', () => {
    const p = plans(5, 300).find((x) => x.steps[0].target.id === 'lip')
    expect(p).toBeDefined()
    const slip = p!.steps[1]
    expect(slip.target.id).toBe('slip')
    expect(slip.grow).toBe(1)
    expect(slip.at).toBe(0)
    expect(slip.parts).toHaveLength(p!.steps[0].parts!.length + 1)
    expect(rightOf(slip).text).toBe('s')
    // no rung grows before stage 5
    for (let stage = 1; stage <= 4; stage++) for (const q of plans(stage, 40)) expect(q.steps.some((s) => s.grow)).toBe(false)
  })

  it('no word twice in a ladder', () => {
    for (let stage = 1; stage <= 9; stage++) {
      for (let rungs = 2; rungs <= 5; rungs++) {
        for (const p of plans(stage, 30, rungs)) {
          expect(p.steps).toHaveLength(rungs)
          expect(new Set(words(p)).size).toBe(rungs)
        }
      }
    }
  })

  it('a ladder is the start of a chain of his stage when one is long enough', () => {
    for (let stage = 1; stage <= 9; stage++) {
      for (let rungs = 2; rungs <= 5; rungs++) {
        const own = CHAINS.filter((c) => c.stage === stage && c.words.length >= rungs)
        for (const p of plans(stage, 30, rungs)) {
          const chain = CHAINS.find((c) => c.words.slice(0, rungs).join() === words(p).join())
          expect(chain).toBeDefined()
          expect(chain!.stage).toBeLessThanOrEqual(stage)
          if (own.length) expect(chain!.stage).toBe(stage)
        }
      }
    }
  })

  it('a magic e is the e he adds (pin → pine), and counts for its silent e', () => {
    const p = plans(6, 200).find((x) => x.steps[0].target.id === 'pin')
    expect(p).toBeDefined()
    const pine = p!.steps[1]
    expect(pine.parts!.map((x) => x.text)).toEqual(['p', 'i', 'n', 'e'])
    expect(pine.at).toBe(3)
    expect(rightOf(pine)).toMatchObject({ id: 'i_e', text: 'e', soundId: 'snd-eye' })
    // the rest of the chain keeps the e at the end: pine → line changes the first box
    expect(p!.steps[2].at).toBe(0)
  })

  it('keeps the shared rules at every stage', () => {
    for (let stage = 1; stage <= 9; stage++) {
      for (const p of plans(stage, 80)) {
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
            if (x.kind === 'word') {
              expect(WORDS).toContain(word(x.id))
              expect(word(x.id).stage).toBeLessThanOrEqual(stage)
            } else expect(unit(x.id).stage).toBeLessThanOrEqual(stage)
          }
          // a part shows a unit's letters (no hyphen of an ending); the parts spell the word
          expect(s.parts!.map((x) => x.text).join('')).toBe(w.text)
          for (const x of s.parts!) expect(x.text).not.toMatch(/^-/)
          if (k === 0) return
          // one box changed, or one added, from the word below
          const below = p.steps[k - 1].parts!.map((x) => x.text)
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
