// The hint's blend (design Part 5, "the hint blends a word"): the plan of a word, which the run plays and the hint card
// (BlendWord) lights. PROVISIONAL: the method in use, `lightsOnNormalWord`, is the spec's last fallback (no slowed
// audio: the units light in turn while the normal word plays). It is here only so that the hint works while the parent
// picks the method by ear. A later method (a slowed take, the units' own sounds) replaces `BLEND_METHOD` and nothing else.
import type { BlendPart, BlendPlan } from '../../duel2/course/types'
import { unit } from '../content/units'
import type { EnWord } from '../content/words'
import { wordChoice } from './rounds/broom'

/** where each unit of a word's clip starts and ends (ms), and the clip's length: forced alignment of its take */
export interface WordTiming { units: { startMs: number; endMs: number }[]; durationMs: number }

/** the timings of the word clips, by voice id; the asset track fills it from forced alignment (empty now) */
export const WORD_TIMINGS: Record<string, WordTiming> = {}

/** a word's length when its clip has no timing (or is missing): the lights still go through it and end */
export const FALLBACK_WORD_MS = 700

export type BlendMethod = (w: EnWord, timing: WordTiming | null) => BlendPlan

/**
 * The word's letters in reading order, each with the unit it belongs to: `fish` is f, i, sh (sh is one part, two
 * letters); a silent e is lit with its vowel (`cake`: c, a, k, e, where a and e are unit 1). A heart word is one part (he
 * reads it whole). A word whose units do not spell its text is one part too.
 */
export function blendParts(w: EnWord): BlendPart[] {
  const whole = [{ text: w.text, unit: 0 }]
  if (!w.units.length) return whole
  const out: BlendPart[] = []
  let at = 0
  let silent: number | null = null
  const take = (s: string, u: number) => {
    if (w.text.slice(at, at + s.length) !== s) return false
    out.push({ text: s, unit: u })
    at += s.length
    return true
  }
  for (let i = 0; i < w.units.length; i++) {
    const text = unit(w.units[i]).text.replace(/^-/, '')
    const [first, e] = text.split(' ')
    if (!take(first, i)) return whole
    // the silent e of the unit before comes after this unit (c a_e k: c, a, k, e); dropped before an ending (hoping)
    if (silent !== null) { if (w.text[at] === 'e') take('e', silent); silent = null }
    if (e) silent = i
  }
  if (silent !== null) take('e', silent)
  return at === w.text.length ? out : whole
}

/** how many units light (a heart word: one, the whole word) */
const unitCount = (w: EnWord) => Math.max(1, w.units.length)

/**
 * PROVISIONAL (the spec's last fallback, until the parent picks the method by ear): no slowed audio; the units light
 * one after another while the normal word plays. With a timing, each unit lights where it starts in the clip; without
 * one, the clip's length (FALLBACK_WORD_MS) is split evenly by unit, a two-letter unit being one part.
 */
export const lightsOnNormalWord: BlendMethod = (w, timing) => {
  const n = unitCount(w)
  const fits = timing && timing.units.length === n
  const totalMs = fits ? timing.durationMs : FALLBACK_WORD_MS
  const lights = Array.from({ length: n }, (_, i) => ({ unit: i, atMs: fits ? timing.units[i].startMs : Math.round((i * totalMs) / n) }))
  return { audio: [wordChoice(w).soundId], lights, totalMs, parts: blendParts(w) }
}

/**
 * the method in use (swap this one line for another method)
 * @alias
 */
export const BLEND_METHOD: BlendMethod = lightsOnNormalWord

/** the plan of a word by the method in use, with its clip's timing when the asset track has one */
export const blendOf = (w: EnWord): BlendPlan => BLEND_METHOD(w, WORD_TIMINGS[wordChoice(w).soundId] ?? null)
