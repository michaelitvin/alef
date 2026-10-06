import type { DuelMark, Rng, Round, Tally } from '../../types/duel'
import { DUEL_MARKS, SOUND_GROUPS, twinOf } from './marks'
import { wordsFor } from './words'
import { bossFor, newMonsterAt, padSize, screenTypesFor, unlockedMonsters, walkMs } from './rules'

const pick = <T,>(rng: Rng, xs: T[]) => xs[Math.floor(rng() * xs.length)]
function shuffle<T>(rng: Rng, xs: T[]) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export type LifetimeTally = Partial<Pick<Tally, 'seen' | 'correct' | 'wrong' | 'timeout'>>
export type Confusions = Record<string, Record<string, number>>

/** Desirable difficulty: aim each round at about one mistake in five. */
export const TARGET_MISTAKE_RATE = 0.2

/** Predicted chance he misses this mark: lifetime rate, with this run's misses counted again (recent = more telling). */
export function predictedMistakeRate(t: LifetimeTally | undefined, runMisses = 0) {
  const r = 2 * runMisses
  return ((t?.wrong ?? 0) + (t?.timeout ?? 0) + 0.5 + r) / ((t?.seen ?? 0) + 2 + r)
}

/**
 * Pick the mark whose predicted mistake rate is closest to 1 in 5; when none is that hard, the hardest available.
 * Weight = 0.03 (every mark keeps some chance: variety) + a bell around the aim whose width scales with it.
 */
export function pickTarget(rng: Rng, runMisses: Record<string, number>, lifetime: Record<string, LifetimeTally>): DuelMark {
  const p = DUEL_MARKS.map((m) => predictedMistakeRate(lifetime[m.id], runMisses[m.id] ?? 0))
  const aim = Math.min(TARGET_MISTAKE_RATE, Math.max(...p))
  const width = Math.max(0.03, aim * 0.35)
  const w = p.map((x) => 0.03 + Math.exp(-(((x - aim) / width) ** 2)))
  let r = rng() * w.reduce((s, x) => s + x, 0)
  for (let i = 0; i < DUEL_MARKS.length; i++) {
    r -= w[i]
    if (r <= 0) return DUEL_MARKS[i]
  }
  return DUEL_MARKS[DUEL_MARKS.length - 1]
}

/** A mistake he has made 2+ times is a pattern, not a slip. */
export const CONFUSION_MIN = 2

/**
 * The mark he most often taps when `target` is asked (directional: tapping X for Y says nothing about Y for X).
 * Rows are keyed by target id, columns by the tapped mark id.
 */
export function confusionPartner(target: DuelMark, confusions: Confusions | undefined): DuelMark | undefined {
  const row = confusions?.[target.id]
  if (!row) return undefined
  let best: [string, number] | null = null
  for (const [k, n] of Object.entries(row)) if (k !== target.id && n >= CONFUSION_MIN && (!best || n > best[1])) best = [k, n]
  return best ? DUEL_MARKS.find((m) => m.id === best![0]) : undefined
}

export interface MakeRoundOpts {
  id: number
  wave: number
  /** Kills so far this wave (0 = its first round). */
  kills?: number
  boss: boolean
  rng: Rng
  runMisses: Record<string, number>
  lifetime: Record<string, LifetimeTally>
  /** confusions[target][tapped] = times he tapped `tapped` when `target` was asked */
  confusions?: Confusions
}

/** Sound clues start at wave 3; its first round is a sound screen so the spoken instruction introduces them in context. */
const FIRST_SOUND_WAVE = 3

export function makeRound({ id, wave, kills, boss, rng, runMisses, lifetime, confusions }: MakeRoundOpts): Round {
  const type = wave === FIRST_SOUND_WAVE && kills === 0 && !boss ? 'B' : pick(rng, screenTypesFor(wave))
  const target = pickTarget(rng, runMisses, lifetime)
  const word = pick(rng, wordsFor(target.group))

  let runes: DuelMark[] = []
  if (type !== 'D') {
    runes = [target]
    const twin = twinOf(target)
    if (type === 'C' && twin) runes.push(twin) // the trap on name screens
    // His usual mistake for this target goes on the board: a different sound always; the same sound only on name
    // screens (on picture/sound screens both would be right).
    const partner = confusionPartner(target, confusions)
    if (partner && !runes.includes(partner) && (partner.group !== target.group || type === 'C')) runes.push(partner)
    for (const g of shuffle(rng, SOUND_GROUPS.filter((g) => g !== target.group))) {
      if (runes.length >= padSize(wave)) break
      if (runes.some((m) => m.group === g)) continue
      runes.push(pick(rng, DUEL_MARKS.filter((m) => m.group === g)))
    }
    runes = shuffle(rng, runes)
  }
  const padWords = type === 'D' ? shuffle(rng, SOUND_GROUPS.map((g) => (g === target.group ? word : pick(rng, wordsFor(g))))) : []

  return {
    id, type, target, runes, word, padWords,
    // right after "a new monster!" comes that monster
    monster: boss ? bossFor(wave) : (kills === 0 && newMonsterAt(wave)) || pick(rng, unlockedMonsters(wave)),
    boss,
    walkMs: walkMs(wave, boss),
  }
}
