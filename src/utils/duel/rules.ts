import type { Choice, EffectPreset, Rng, Round, ScreenType } from '../../types/duel'
import { twinOf } from './marks'

export const HEARTS = 3
export const MONSTERS_PER_WAVE = 5 // kills per wave
export const BOSS_EVERY = 5
export const BOSS_HP = 8 // more than a wave's 5 kills, so the boss is the climax
export const MEGA_MAX = 8

/** Regular monsters and the wave each one joins (a "new monster!" announcement plays then). */
export const ROSTER: { id: string; fromWave: number }[] = [
  { id: 'fuzzy', fromWave: 1 },
  { id: 'blob', fromWave: 1 },
  { id: 'imp', fromWave: 2 },
  { id: 'ghost', fromWave: 3 },
  { id: 'bat', fromWave: 4 },
  { id: 'mushroom', fromWave: 6 },
  { id: 'golem', fromWave: 7 },
  { id: 'octopus', fromWave: 8 },
]

export const unlockedMonsters = (wave: number) => ROSTER.filter((m) => m.fromWave <= wave).map((m) => m.id)
export const newMonsterAt = (wave: number) => (wave > 1 ? (ROSTER.find((m) => m.fromWave === wave)?.id ?? null) : null)
export const bossFor = (wave: number): 'dragon' | 'troll' => (wave % (BOSS_EVERY * 2) === 0 ? 'troll' : 'dragon')

export const walkMs = (wave: number, boss: boolean) => Math.max(3500, 9000 - 650 * (wave - 1)) * (boss ? 1.4 : 1)
// Screen D (rune → pick one of several pictures) was dropped after playtesting: too hard, even for adults.
export const screenTypesFor = (wave: number): ScreenType[] => (wave < 3 ? ['A'] : ['A', 'B', 'C'])
export const padSize = (wave: number) => (wave < 3 ? 4 : 6)

export const keyOf = (c: Choice) => (c.kind === 'rune' ? c.mark.id : `g-${c.group}`)

/** A/B/D: any mark with the right sound. C: only the named mark. */
export function isCorrect(round: Round, c: Choice): boolean {
  if (c.kind === 'sound') return c.group === round.target.group
  if (round.type === 'C') return c.mark.id === round.target.id
  return c.mark.group === round.target.group
}

/** Tapping the same-sound look-alike on a name screen (kamatz ↔ patach, tzeire ↔ segol). */
export function isTwin(round: Round, c: Choice): boolean {
  return round.type === 'C' && c.kind === 'rune' && twinOf(round.target)?.id === c.mark.id
}

export const points = (combo: number, mega: boolean) => 100 + 20 * combo + (mega ? 200 : 0)

/** Presets used interchangeably: ~25% gentle, 50% boom, 25% mega; a boss's final hit and MEGA always mega. */
export function pickEffect(rng: Rng, o: { final: boolean; mega: boolean; boss?: boolean }): EffectPreset {
  if (o.mega || (o.boss && o.final)) return 'mega'
  const r = rng()
  return r < 0.25 ? 'gentle' : r < 0.75 ? 'boom' : 'mega'
}
