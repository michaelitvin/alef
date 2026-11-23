// The English stages (design Part 5): nine stages; the cycle, its visit lengths and the stage pass. A stage passes as in
// Spell Quest: the first 5 answers on its new items all right, or 8 of the last 10. Stage 9 never passes, and no stage passes
// into one whose content is not ready (content/ready.ts).
import type { ScreenId } from '../../spellquest/logic/predict'
import { SESSION_LENGTH } from '../../spellquest/logic/run'
import { keptAnswers, keptAtLastStage, stagePassed, type StageProgress } from '../../spellquest/logic/stages'

export const EN_MAX_STAGE = 9

/** the cycle's order, tower first; the spell book after the doors; drawing is print only */
export const EN_ORDER: ScreenId[] = ['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell', 'draw']

/** the screen that the drawing setting turns off */
export const EN_DRAWING: ScreenId[] = ['draw']

/** the tower's waves, then answers per visit: 5 on each screen, 6 doors; handwriting is never in the English cycle */
// tower 1, doors 6 (not 2 and 8): spec Part 5 wants 3–4 screens a run and every screen in 2–3 runs; measured 3.35 / 0.83
export const EN_VISIT: Record<ScreenId, number> = { tower: 1, broom: 5, cauldron: 5, ladder: 5, ghosts: 5, doors: 6, spell: 5, draw: 5, 'draw-hand': 0 }

/** a session from the home path: Spell Quest's numbers */
export const EN_SESSION_LENGTH: Record<ScreenId, number> = { ...SESSION_LENGTH }

/** every screen from stage 1, the ghosts from stage 2 (the doors' phrases from stage 4 are a round choice, not a screen) */
export const enScreensOfStage = (stage: number): ScreenId[] => (stage >= 2 ? EN_ORDER : EN_ORDER.filter((s) => s !== 'ghosts'))

/** One answer on the stage's new items. `ready`: the stages whose content exists; the stage after must be one of them. */
export function enRecordStageAnswer(p: StageProgress, correct: boolean, ready: readonly number[]): { progress: StageProgress; passed: boolean } {
  const newAnswers = p.newAnswers + (correct ? 'o' : 'x')
  if (p.stage >= EN_MAX_STAGE || !ready.includes(p.stage + 1)) return { progress: { ...p, newAnswers: keptAtLastStage(newAnswers) }, passed: false }
  if (stagePassed(newAnswers)) return { progress: { stage: p.stage + 1, newAnswers: '' }, passed: true }
  return { progress: { ...p, newAnswers: keptAnswers(newAnswers) }, passed: false }
}
