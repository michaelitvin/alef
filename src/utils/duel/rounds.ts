import type { DuelMark, Rng, Round } from '../../types/duel'
import { DUEL_MARKS, SOUND_GROUPS, twinOf } from './marks'
import { wordsFor } from './words'
import { bossFor, padSize, screenTypesFor, unlockedMonsters, walkMs } from './rules'

const pick = <T,>(rng: Rng, xs: T[]) => xs[Math.floor(rng() * xs.length)]
function shuffle<T>(rng: Rng, xs: T[]) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Weight = 1 + 2 × misses this run + min(2, lifetime misses ÷ 5). */
export function pickTarget(rng: Rng, runMisses: Record<string, number>, lifetimeMisses: Record<string, number>): DuelMark {
  const w = DUEL_MARKS.map((m) => 1 + 2 * (runMisses[m.id] ?? 0) + Math.min(2, (lifetimeMisses[m.id] ?? 0) / 5))
  let r = rng() * w.reduce((s, x) => s + x, 0)
  for (let i = 0; i < DUEL_MARKS.length; i++) {
    r -= w[i]
    if (r <= 0) return DUEL_MARKS[i]
  }
  return DUEL_MARKS[DUEL_MARKS.length - 1]
}

export interface MakeRoundOpts {
  id: number
  wave: number
  boss: boolean
  rng: Rng
  runMisses: Record<string, number>
  lifetimeMisses: Record<string, number>
}

export function makeRound({ id, wave, boss, rng, runMisses, lifetimeMisses }: MakeRoundOpts): Round {
  const type = pick(rng, screenTypesFor(wave))
  const target = pickTarget(rng, runMisses, lifetimeMisses)
  const word = pick(rng, wordsFor(target.group))

  let runes: DuelMark[] = []
  if (type !== 'D') {
    runes = [target]
    const twin = twinOf(target)
    if (type === 'C' && twin) runes.push(twin) // the trap on name screens
    for (const g of shuffle(rng, SOUND_GROUPS.filter((g) => g !== target.group))) {
      if (runes.length >= padSize(wave)) break
      runes.push(pick(rng, DUEL_MARKS.filter((m) => m.group === g)))
    }
    runes = shuffle(rng, runes)
  }
  const padWords = type === 'D' ? shuffle(rng, SOUND_GROUPS.map((g) => (g === target.group ? word : pick(rng, wordsFor(g))))) : []

  return {
    id, type, target, runes, word, padWords,
    monster: boss ? bossFor(wave) : pick(rng, unlockedMonsters(wave)),
    boss,
    walkMs: walkMs(wave, boss),
  }
}
