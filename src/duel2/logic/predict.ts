// Prediction (spec: Content → the unit): a rate per letter part, per vowel group and per syllable, combined by noisy-or
// (the round is missed if any part trips him), as the clock game does with its features. Answers on every screen feed the
// same rates; the screen is a feature too.
import { pickNearTarget, predictedMistakeRate, type Rng, type Tally } from '../../shared/adaptive'
import type { Item, Mark } from './content.ts'

export type ScreenId = 'broom' | 'cauldron' | 'ladder' | 'ghosts' | 'doors'
export type Target = { item: Item; mark?: Mark } | { wordId: string }

export function features(target: Target, screen: ScreenId): string[] {
  if ('wordId' in target) return [`w:${target.wordId}`, `sc:${screen}`]
  if (!target.mark) return [`l:${target.item.id}`, `sc:${screen}`]
  const g = target.mark.group
  return [`l:${target.item.id}`, `v:${g}`, `s:${target.item.id}-${g}`, `sc:${screen}`]
}

const SCREEN_PRIOR: Record<string, number> = { broom: 0.05, doors: 0.1 }
export function featurePrior(f: string): number {
  const [k, v] = f.split(':')
  if (k === 'l') return 0.1
  if (k === 'v') return 0.08
  if (k === 's') return 0.05
  if (k === 'w') return 0.2
  return SCREEN_PRIOR[v] ?? 0.03
}

export function predict(feats: string[], tallies: Record<string, Tally>, recent: Record<string, string>): number {
  let ok = 1
  for (const f of feats) ok *= 1 - predictedMistakeRate(tallies[f], recent[f], featurePrior(f))
  return 1 - ok
}

export function pickTarget<T>(rng: Rng, candidates: T[], featuresOf: (c: T) => string[], tallies: Record<string, Tally>, recent: Record<string, string>): T {
  return candidates[pickNearTarget(rng, candidates.map((c) => predict(featuresOf(c), tallies, recent)))]
}
