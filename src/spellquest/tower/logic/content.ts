// The tower's content seam: what the first duel's flow (controller.ts) asks of the course it plays. The board, the waves,
// the bosses and the מגה spell are the duel's own; the rounds, the runes and the voice ids of what is said come from
// here. HEBREW_TOWER is the first duel as it always was (its rounds, rules and lines, moved here unchanged).
import type { Choice, Round, TowerRune } from '../types'
import type { BlendPlan } from '../../course/types'
import type { LineCue } from '../assets/lineCues'
import { LINE_CUES } from '../assets/lineCues'
import type { FeedbackPlan } from './flow'
import { makeRound, type MakeRoundOpts } from './rounds'
import { isCorrect, isTwin } from './rules'

export interface TowerContent {
  /**
   * builds the round, and decides its rune count (Hebrew: today's pad, 6 from wave 3; English: always 4 letter runes,
   * 3 word runes in the placement and name rounds, spec Parts 4–5)
   */
  makeRound(o: MakeRoundOpts): Round
  isCorrect(r: Round, c: Choice): boolean
  isTwin(r: Round, c: Choice): boolean
  /** the voice ids of a round's question and of its feedback, in order */
  questionParts(r: Round): string[]
  /** the feedback's parts: the first is the sound, the second the name, the third the word (the banner animates them) */
  feedbackParts(r: Round, plan: FeedbackPlan): string[]
  /**
   * the explanation of a round type the first time (Hebrew: `line-how-${key}`) and its glow cues (Hebrew: LINE_CUES);
   * `key` is what the explanation is kept under as seen (the save's `tower-screen-<key>`); null: no explanation
   */
  howLine(r: Round): { id: string; key: string; cues: LineCue[] } | null
  /** a forgiven twin tap (Hebrew: `line-almost` then `wiz-<mark>`) */
  twinParts(r: Round, c: Choice): string[]
  runeOf(r: Round, i: number): TowerRune
  /**
   * an answer was given (right, or a miss or a timeout; never a מגה kill, never in the gallery; in a boss fight only the hit
   * that beats the boss): the voice ids said after its feedback (English: a new unit's introduction). Hebrew: unset.
   */
  answered?(r: Round, right: boolean): string[]
  /**
   * the hint that blends the words of a word round (English; the `?` shows only on a round that asks a nonsense name or a
   * picture's word): one plan per word rune, left to right. Unset (Hebrew, the placement): no `?`.
   */
  hint?(r: Round): BlendPlan[]
}

/** the Hebrew screen a round is explained as: the silent mark's sound screen has its own explanation */
const screenKey = (r: Round) => (r.type === 'B' && r.target.group === 'silent' ? 'silent' : r.type)

export const HEBREW_TOWER: TowerContent = {
  makeRound,
  isCorrect,
  isTwin,
  // Clues are said once, cleanly, by the narrator: the same verified lines as the feedback.
  questionParts(r) {
    if (r.type === 'B') return [r.target.group === 'silent' ? 'sfx-mute' : `wiz-vowel-${r.target.group}`]
    if (r.type === 'C') return [`wiz-${r.target.id}`]
    if (r.type === 'A' && r.word.he) return [`wiz-word-${r.word.key}`]
    return []
  },
  // sound → name → picture word (shva: the silent puff → name); 'sound-name' drops the word, 'sound' says only the sound
  feedbackParts(r, plan) {
    const m = r.target
    const parts = [m.group === 'silent' ? 'sfx-mute' : `wiz-vowel-${m.group}`]
    if (plan.say !== 'sound') parts.push(`wiz-${m.id}`)
    if (m.group !== 'silent' && plan.say === 'full') parts.push(`wiz-word-${r.word.key}`)
    return parts
  },
  howLine(r) {
    const key = screenKey(r)
    const id = `line-how-${key}`
    return { id, key, cues: (LINE_CUES[id] ?? []).map((c) => c.cue) }
  },
  // "almost": hear which mark he tapped, then try again
  twinParts: (_r, c) => (c.kind === 'rune' ? ['line-almost', `wiz-${c.mark.id}`] : []),
  runeOf: (r, i) => ({ id: r.runes[i].id, text: r.runes[i].name, alphabet: 'hebrew' }),
}
