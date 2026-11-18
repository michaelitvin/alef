// Which stages have their content (spec Part 10). Node-loadable, so it takes its inputs: src/english/course.ts
// computes READY_STAGES once from the build and the keys of ENGLISH_VOICE_URLS.
// Erasable TypeScript.
import { PHRASES } from './phrases.ts'
import { UNITS } from './units.ts'
import { heartVoice, nonsenseVoice, phraseVoice, soundVoice, wordVoice } from './voiceIds.ts'
import { WORDS } from './words.ts'

const STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const voiceOf = (w: { kind: string; text: string }): string =>
  w.kind === 'heart' ? heartVoice(w.text) : w.kind === 'nonsense' ? nonsenseVoice(w.text) : wordVoice(w.text)

/** The voice ids a stage needs: its sound units and its words (real, picture-only, heart, nonsense). */
const neededVoices = (stage: number): string[] => [
  ...UNITS.filter((u) => u.stage === stage).map(soundVoice),
  ...WORDS.filter((w) => w.stage === stage).map(voiceOf),
  ...PHRASES.filter((p) => p.stage === stage).map((p) => phraseVoice(p.id)),
]

/**
 * The stages whose content exists. `strict` (staging and production builds): a stage whose words are in WORDS and
 * whose sound units', words' and door phrases' (stages 4–9) voice ids are all in `voices`. Not strict (dev, test, the verify build): every stage
 * with words, so the build can be checked before the audio. Never empty: with no ready stage it is [1], because a
 * missing clip plays nothing.
 */
export const contentStages = (env: { strict: boolean; voices: ReadonlySet<string> }): number[] => {
  const withWords = STAGES.filter((s) => WORDS.some((w) => w.stage === s))
  const ready = env.strict ? withWords.filter((s) => neededVoices(s).every((id) => env.voices.has(id))) : withWords
  return ready.length ? ready : [1]
}

/** The stages the parent has approved asset by asset, edited by hand (Task 36). */
export const REVIEWED_STAGES: number[] = []
