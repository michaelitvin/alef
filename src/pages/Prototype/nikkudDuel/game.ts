// PROTOTYPE — round generation + scoring rules for the Nikkud Wizard Duel.
import { GROUPS, MARKS, randomWord, type Mark, type PictureWord, type SoundGroup } from './marks'

export type ScreenType = 'A' | 'B' | 'C' | 'D'

export interface Round {
  id: number
  type: ScreenType
  target: Mark
  runes: Mark[] // empty for D (answers are picture words)
  word: PictureWord // the target sound's picture: A's sign, D's right answer, and the word in the feedback
  padWords: PictureWord[] // D only: one picture per sound group, shuffled
  monster: string // sprite id
  boss: boolean
  walkMs: number
}

export type Choice = { kind: 'rune'; mark: Mark } | { kind: 'sound'; group: SoundGroup }

export const MONSTERS_PER_WAVE = 5
export const BOSS_EVERY = 5
export const BOSS_HP = 3
export const MEGA_MAX = 8

const MONSTERS = ['fuzzy', 'blob', 'imp', 'ghost', 'bat', 'mushroom', 'golem', 'octopus'] // sprite ids, see sprites.ts

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
function shuffle<T>(xs: T[]) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Missed marks come up more often: weight = 1 + 2 × misses. */
function weightedTarget(missed: Record<string, number>) {
  const weights = MARKS.map((m) => 1 + 2 * (missed[m.id] ?? 0))
  let r = Math.random() * weights.reduce((s, w) => s + w, 0)
  for (let i = 0; i < MARKS.length; i++) {
    r -= weights[i]
    if (r <= 0) return MARKS[i]
  }
  return MARKS[0]
}

export function walkMsFor(wave: number, boss: boolean) {
  return Math.max(3500, 9000 - (wave - 1) * 650) * (boss ? 1.4 : 1)
}

export function makeRound(id: number, wave: number, boss: boolean, missed: Record<string, number>): Round {
  const types: ScreenType[] = wave < 3 ? ['A', 'D'] : ['A', 'B', 'C', 'D']
  const n = wave < 3 ? 4 : 6
  const type = pick(types)
  const target = weightedTarget(missed)

  let runes: Mark[] = []
  if (type !== 'D') {
    runes = [target]
    if (type === 'C') {
      // Name screens include the same-sound twin on purpose: it is the trap.
      const twin = MARKS.find((m) => m.group === target.group && m.id !== target.id)
      if (twin) runes.push(twin)
    }
    for (const g of shuffle(GROUPS.filter((g) => g !== target.group))) {
      if (runes.length >= n) break
      runes.push(pick(MARKS.filter((m) => m.group === g)))
    }
    runes = shuffle(runes)
  }

  const word = randomWord(target.group)
  const padWords = type === 'D' ? shuffle(GROUPS.map((g) => (g === target.group ? word : randomWord(g)))) : []

  return {
    id,
    type,
    target,
    runes,
    word,
    padWords,
    monster: boss ? (wave % (BOSS_EVERY * 2) === 0 ? 'troll' : 'dragon') : pick(MONSTERS),
    boss,
    walkMs: walkMsFor(wave, boss),
  }
}

/** A/B: any mark with the right sound counts. C: only the named mark. D: the sound letter. */
export function isCorrect(round: Round, choice: Choice) {
  if (choice.kind === 'sound') return choice.group === round.target.group
  if (round.type === 'C') return choice.mark.id === round.target.id
  return choice.mark.group === round.target.group
}

export interface Juice {
  label: string
  particles: number
  shake: number
  flash: number
  hitstopMs: number
  boom: number
}

// Effect-intensity presets, switchable via ?variant= to tune the feel with the kid.
export const PRESETS: Record<string, Juice> = {
  A: { label: 'בּוּם', particles: 24, shake: 12, flash: 2.8, hitstopMs: 0, boom: 1 },
  B: { label: 'מֶגָה בּוּם', particles: 48, shake: 24, flash: 4.2, hitstopMs: 140, boom: 1.5 },
  C: { label: 'עָדִין', particles: 10, shake: 4, flash: 1.6, hitstopMs: 0, boom: 0.6 },
}
