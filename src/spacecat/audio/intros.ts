// The four intro lines of the new round kinds (the design's *Voice*): when each plays, the mistake that plays it again,
// and the glows (cues) it shows while it is spoken. Pure: the controller plays the line and runs the cues.
import type { Item } from '../logic/facts'
import { rungDef } from '../logic/rungs'
import type { Cue } from '../canvas/engine'

export type IntroId = 'compare' | 'jumps' | 'times' | 'divide'
export const INTRO_IDS: readonly IntroId[] = ['compare', 'jumps', 'times', 'divide']
/** an intro plays on the first this many rounds of its kind (counted when the line was heard) */
export const INTRO_TIMES = 2
/** it plays again before the next round of its kind after this many of its typical mistake in one play day (once a day) */
export const AGAIN_AFTER = 3

export type { Cue }

/** the game plays speech at this rate (the kit's VOICE_RATE: a test pins that they agree) */
export const SPEECH_RATE = 1.15

/**
 * The shipped take of each line (`<id>-1.mp3`): the start of each spoken token in seconds from the file's start (at rate
 * 1), and the file's length. The request's sentence tags (`[warmly]`, `[playful]`) after the first have a start of their
 * own in the alignment; they are kept so that the list matches it. A NEW TAKE NEEDS NEW TIMES (measure them again).
 */
export const TAKE_WORDS: Record<IntroId, { words: [string, number][]; end: number }> = {
  compare: {
    words: [
      ['אֵיזֶה', 0.08], ['סִימָן', 0.48], ['מַתְאִים', 0.84], ['[warmly]', 2.19], ['הַצַּד', 2.257], ['הַפָּתוּחַ', 2.59], ['פּוֹנֶה', 3.31],
      ['אֶל', 3.603], ['הַמִּסְפָּר', 3.71], ['הַגָּדוֹל', 4.23], ['[warmly]', 5.48], ['וְאִם', 5.547], ['הַמִּסְפָּרִים', 5.773], ['שָׁוִים', 6.36],
      ['בּוֹחֲרִים', 7.16], ['בְּסִימַן', 7.64], ['שָׁוֶה', 8.2],
    ],
    end: 8.93,
  },
  jumps: {
    words: [['סוֹפְרִים', 0.24], ['בִּקְפִיצוֹת', 0.76], ['שָׁווֹת', 1.4], ['[playful]', 2.81], ['אֵיזֶה', 2.877], ['מִסְפָּר', 3.13], ['בָּא', 3.57], ['עַכְשָׁו', 3.71]],
    end: 4.6,
  },
  times: {
    words: [['כָּפוּל', 0.16], ['זֶה', 0.64], ['קְבוּצוֹת', 0.88], ['שָׁווֹת', 1.36], ['[warmly]', 2.66], ['כַּמָּה', 2.74], ['יֵשׁ', 3.0], ['בְּכֻלָּן', 3.16], ['יַחַד', 3.62]],
    end: 4.52,
  },
  divide: {
    words: [['חִלּוּק', 0.16], ['זֶה', 0.56], ['לְחַלֵּק', 0.72], ['לִקְבוּצוֹת', 1.28], ['שָׁווֹת', 1.92], ['[warmly]', 3.24], ['כַּמָּה', 3.307], ['יֵשׁ', 3.56], ['בְּכָל', 3.76], ['קְבוּצָה', 4.04]],
    end: 4.94,
  },
}

/** the word of each cue (the design's *The two new round kinds* and *Voice*) */
const CUE_WORDS: Record<IntroId, [Cue, string][]> = {
  compare: [['signs', 'סִימָן'], ['open', 'הַצַּד'], ['bigger', 'הַגָּדוֹל'], ['equal', 'שָׁוֶה']],
  jumps: [['arcs', 'בִּקְפִיצוֹת'], ['ring', 'עַכְשָׁו']],
  times: [['pods', 'קְבוּצוֹת']],
  divide: [['share', 'לְחַלֵּק']],
}

const toMs = (s: number) => Math.round((s * 1000) / SPEECH_RATE)

/** each cue's start in ms from the line's start, as the game plays it; a cue glows until the next one or the line's end */
export const INTRO_CUES: Record<IntroId, { at: number; cue: Cue }[]> = Object.fromEntries(
  INTRO_IDS.map((id) => [id, CUE_WORDS[id].map(([cue, w]) => ({ at: toMs(TAKE_WORDS[id].words.find(([x]) => x === w)![1]), cue }))]),
) as Record<IntroId, { at: number; cue: Cue }[]>

/** the line's length in ms as the game plays it (the silent path's glows end here) */
export const INTRO_LINE_MS: Record<IntroId, number> = Object.fromEntries(INTRO_IDS.map((id) => [id, toMs(TAKE_WORDS[id].end)])) as Record<IntroId, number>

const T2_ORDER = rungDef('T2').order

/** the intro an item's round belongs to, if any */
export function introOf(it: Item): IntroId | undefined {
  if (it.kind === 'compare') return 'compare'
  if (it.kind === 'jumps') return 'jumps'
  if (it.op === '÷') return 'divide'
  if (it.op === '×' && it.hole === 'c' && rungDef(it.rung).order >= T2_ORDER) return 'times'
  return undefined
}

/**
 * The intro whose typical mistake this wrong pick is (the label he flew to): compare, the mirrored sign; jumps, the
 * number before the ring + 1 (he counted on by one); times, the sum a + b; divide, the divisor or a − b.
 */
export function introMistake(it: Item, picked: string): IntroId | undefined {
  const id = introOf(it)
  if (!id) return undefined
  if (it.kind === 'compare') {
    const mirror = it.answer === '<' ? '>' : it.answer === '>' ? '<' : undefined
    return mirror !== undefined && picked === mirror ? id : undefined
  }
  const n = /^\d+$/.test(picked) ? Number(picked) : NaN
  if (it.kind === 'jumps') return it.hole > 0 && n === it.row[it.hole - 1] + 1 ? id : undefined
  if (it.hole !== 'c') return undefined
  if (id === 'times') return n === it.a + it.b ? id : undefined
  return n === it.b || n === it.a - it.b ? id : undefined
}
