// The introductions: a new unit or heart word is asked once before it is introduced. A right answer skips the
// introduction, and the next two answers decide: both right and he knows it; a miss brings the introduction after all.
import type { Unit } from '../content/units'
import { WORDS, type EnWord } from '../content/words'
import { heartVoice, nonsenseVoice, soundVoice, wordVoice } from '../content/voiceIds'
import type { IntroState } from '../saveFormat'

const DECIDING = 2

const FRESH: IntroState = { asked: 0, skipped: false, after: '', known: false }

/** One step: `answer` is his answer when the item was asked (null: it is about to be asked). */
export function introStep(s: IntroState | undefined, answer: 'right' | 'wrong' | null): { state: IntroState; show: 'intro' | 'none' } {
  const cur = s ?? FRESH
  if (answer === null || cur.known) return { state: cur, show: 'none' }
  const asked = cur.asked + 1
  if (cur.asked === 0) {
    return answer === 'right'
      ? { state: { ...cur, asked, skipped: true }, show: 'none' }
      : { state: { ...cur, asked }, show: 'intro' }
  }
  if (!cur.skipped) return { state: { ...cur, asked }, show: 'none' }
  if (answer === 'wrong') return { state: { ...cur, asked, skipped: false, after: '' }, show: 'intro' }
  const after = cur.after + 'o'
  return { state: { ...cur, asked, after, known: after.length >= DECIDING }, show: 'none' }
}

/** the word that shows a unit: the one the plan marks for its tile ('Tl:<unit>'), else any word with a picture that has the unit */
function pictureOf(u: Unit): string | undefined {
  const withPicture = WORDS.filter((w) => w.picture)
  return (withPicture.find((w) => w.uses.includes(`Tl:${u.id}`)) ?? withPicture.find((w) => w.units.includes(u.id)))?.id
}

/** qu and nk are digraphs by spelling only (each makes two sounds): the first two-letter, one-sound unit is in stage 4 */
const TWO_SOUNDS = ['kw', 'nk']

/** The kind of introduction line a unit starts a kind with (null: none). The one place for "first of its kind". */
export function introKind(u: Unit): 'team' | 'magic-e' | 'ending' | null {
  if (u.kind === 'digraph' && !TWO_SOUNDS.includes(u.sound)) return 'team'
  if (u.kind === 'magic-e') return 'magic-e'
  if (u.kind === 'ending') return 'ending'
  return null
}

/**
 * The voice ids of an introduction (empty: none). A unit: its line, its sound, a picture word. A heart word: `intro-heart`,
 * the word. `firstOfKind`: the first digraph, silent e or ending starts with its own line; for a word, it is the stage's
 * first blend word (its `introSeen` key is 'blend'). Any other word has no introduction.
 */
export function introParts(item: Unit | EnWord, firstOfKind: boolean): string[] {
  if ('units' in item) {
    if (item.kind === 'heart') return ['intro-heart', heartVoice(item.id)]
    // (the tower's first blend word may be a nonsense name: its own voice)
    return firstOfKind && item.blends?.length ? ['intro-blend', item.kind === 'nonsense' ? nonsenseVoice(item.id) : wordVoice(item.id)] : []
  }
  const pic = pictureOf(item)
  const tail = [soundVoice(item), ...(pic ? [wordVoice(pic)] : [])]
  if (item.secondOf) return ['intro-second', ...tail]
  const kind = firstOfKind ? introKind(item) : null
  return [...(kind ? [`intro-${kind}`] : []), 'intro-sound', ...tail]
}
