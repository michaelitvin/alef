// The spoken time for every clock time, in Hebrew and English (spec: Phrases). One phrase per time per language, and a
// second, digital-style one for :40 ("one forty").
// Loaded by plain Node (export script): erasable TS only, explicit .ts imports.
import { type ClockTime, nextHour, timeId } from './time.ts'

export type Lang = 'he' | 'en'
export const LANGS: Lang[] = ['he', 'en']

export interface Phrase {
  /** "he-3-45" */
  id: string
  lang: Lang
  /** the caption: the correct spelling, with nikkud in Hebrew; English in small letters */
  text: string
  /** caption words in reading order (a maqaf or hyphen keeps a compound as one word) */
  words: string[]
  /** the voice file id */
  audioId: string
}

const HE_HOUR = ['', 'אַחַת', 'שְׁתַּיִם', 'שָׁלוֹשׁ', 'אַרְבַּע', 'חָמֵשׁ', 'שֵׁשׁ', 'שֶׁבַע', 'שְׁמוֹנֶה', 'תֵּשַׁע', 'עֶשֶׂר', 'אַחַת־עֶשְׂרֵה', 'שְׁתֵּים־עֶשְׂרֵה']
/** "to <hour>": the prefix לְ, which becomes לִ before a shva. */
const HE_TO_HOUR = ['', 'לְאַחַת', 'לִשְׁתַּיִם', 'לְשָׁלוֹשׁ', 'לְאַרְבַּע', 'לְחָמֵשׁ', 'לְשֵׁשׁ', 'לְשֶׁבַע', 'לִשְׁמוֹנֶה', 'לְתֵשַׁע', 'לְעֶשֶׂר', 'לְאַחַת־עֶשְׂרֵה', 'לִשְׁתֵּים־עֶשְׂרֵה']
const HE_PAST: Record<number, string> = { 5: 'וַחֲמִשָּׁה', 10: 'וַעֲשָׂרָה', 15: 'וָרֶבַע', 20: 'וְעֶשְׂרִים', 25: 'עֶשְׂרִים וְחָמֵשׁ', 30: 'וָחֵצִי' }
const HE_TO: Record<number, string> = { 40: 'עֶשְׂרִים', 45: 'רֶבַע', 50: 'עֲשָׂרָה', 55: 'חֲמִשָּׁה' }
/**
 * Read as on a digital clock: the parent's review 2026-10-16, "nobody says this (עֶשְׂרִים וְחָמֵשׁ לְשֶׁבַע) - you would say
 * שֵׁשׁ שְׁלוֹשִׁים וְחָמֵשׁ"; "twenty-five to eight" sounds unnatural in English too. So :35 is always read this way, and :40
 * also has this form ("one forty") besides "twenty to two".
 */
const HE_DIGITAL: Record<number, string> = { 35: 'שְׁלוֹשִׁים וְחָמֵשׁ', 40: 'אַרְבָּעִים' }
const EN_DIGITAL: Record<number, string> = { 35: 'thirty-five', 40: 'forty' }
/** The minutes a phrase reads as digits: always :35; :40 when the round chose its digital form. */
const readsDigital = (m: number, digital40: boolean) => m === 35 || (m === 40 && digital40)

const EN_HOUR = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const EN_MIN: Record<number, string> = { 5: 'five', 10: 'ten', 15: 'quarter', 20: 'twenty', 25: 'twenty-five', 30: 'half' }

export function phraseText(t: ClockTime, lang: Lang, digital40 = false): string {
  const { h, m } = t
  if (readsDigital(m, digital40)) return lang === 'he' ? `${HE_HOUR[h]} ${HE_DIGITAL[m]}` : `${EN_HOUR[h]} ${EN_DIGITAL[m]}`
  if (lang === 'he') {
    if (m === 0) return HE_HOUR[h]
    if (m <= 30) return `${HE_HOUR[h]} ${HE_PAST[m]}`
    return `${HE_TO[m]} ${HE_TO_HOUR[nextHour(h)]}`
  }
  if (m === 0) return `${EN_HOUR[h]} o'clock`
  if (m <= 30) return `${EN_MIN[m]} past ${EN_HOUR[h]}`
  return `${EN_MIN[60 - m]} to ${EN_HOUR[nextHour(h)]}`
}

/** `digital40`: the round reads :40 as "one forty" (its own voice file, "...-40d"). */
export function phrase(t: ClockTime, lang: Lang, digital40 = false): Phrase {
  const text = phraseText(t, lang, digital40)
  const id = `${lang}-${timeId(t)}${t.m === 40 && digital40 ? 'd' : ''}`
  return { id, lang, text, words: text.split(' '), audioId: `ph-${id}` }
}

/** The minutes number a phrase names: "twenty past" → 20, "quarter to" → 15, "half" → 30, o'clock → 0, "six thirty-five" → 35. */
export const phraseMinuteNumber = (m: number) => (m <= 30 || m === 35 ? m : 60 - m)

/** Hebrew points and cantillation, but not the maqaf (U+05BE). */
const NIKKUD = /[֑-ֽֿ-ׇ]/g
export const stripNikkud = (s: string) => s.replace(NIKKUD, '')
