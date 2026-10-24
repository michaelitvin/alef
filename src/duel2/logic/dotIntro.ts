// The dotted-letter introduction: the two forms side by side, each named before its sound. ב/כ/פ differ by a dot (without,
// then with); ש has a dot either way and differs by its side (the parent): the dot on the right (שׁ), then on the left (שׂ).
import { item as itemOf, syllable } from './content'
import { lineAudioId } from '../data/lines'

export type Side = 'right' | 'left'
/** `words`: say "without/with a dot" (or right/left) before each sound — only on his first introduction; after that the
 *  screen shows the difference and the words only slow him down (the parent). */
export function dotIntroParts(hard: string, words = true): { parts: { id: string; highlight: Side }[]; right: string; left: string } {
  const h = itemOf(hard)
  const other = syllable(h.pair!, 'kamatz')
  const self = syllable(h.id, 'kamatz')
  // the first one spoken sits on the right (Hebrew reads right to left)
  const [first, second, lead1, lead2] = h.base === 'ש'
    ? [self, other, 'dot-right', 'dot-left']
    : [other, self, 'dot-without', 'dot-with']
  return {
    parts: [
      ...(words ? [{ id: lineAudioId(lead1, 1), highlight: 'right' as Side }] : []), { id: first.soundId, highlight: 'right' },
      ...(words ? [{ id: lineAudioId(lead2, 1), highlight: 'left' as Side }] : []), { id: second.soundId, highlight: 'left' },
    ],
    right: first.text,
    left: second.text,
  }
}

/** The dotted pair to introduce before a round that asks about `targetItem` (by its hard form's id), or null: only from
 *  stage 3, once per pair, and only when the asked letter is one of the pair (the parent: an introduction of ב followed by
 *  a question about another letter was confusing). */
export function dotIntroFor(targetItem: string, stage: number, seen: string[]): string | null {
  if (stage < 3) return null
  const it = itemOf(targetItem)
  if (!it.pair) return null
  const hard = it.soft ? it.pair : it.id
  return seen.includes(hard) ? null : hard
}
