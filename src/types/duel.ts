export type SoundGroup = 'a' | 'e' | 'i' | 'o' | 'u' | 'silent'
export type ScreenType = 'A' | 'B' | 'C' | 'D'
export type EffectPreset = 'gentle' | 'boom' | 'mega'
export type RoundResult = 'correct' | 'wrong' | 'timeout' | 'mega'
/** Random source in [0, 1); injectable for tests. */
export type Rng = () => number

export interface DuelMark {
  id: string
  name: string // Hebrew name with nikkud (from nikkud.yaml)
  group: SoundGroup
  vav?: 'holam' | 'shuruk'
}

/** A picture of a Hebrew word that starts with its sound. key → sprites/word-<key>.webp and voice lines wiz-word-<key>, mon-word-<key>. */
export interface PictureWord {
  key: string
  group: SoundGroup
  he: string // '' for the silent "shh" picture
}

export interface Round {
  id: number
  type: ScreenType
  target: DuelMark
  runes: DuelMark[] // A/B/C pad; [] for D
  word: PictureWord // A's sign, D's right answer, the feedback word
  padWords: PictureWord[] // D pad (one per sound group, shuffled); [] otherwise
  monster: string // sprite id
  boss: boolean
  walkMs: number
  /** where along its path it starts (0 = right edge, 1 = tower); a continuing boss picks up where it was */
  startFrac?: number
}

export type Choice = { kind: 'rune'; mark: DuelMark } | { kind: 'sound'; group: SoundGroup }

export interface Outcome {
  kind: 'hit' | 'miss'
  choiceKey: string | null // keyOf(choice); null for timeout / MEGA
  mega: boolean
  final: boolean // destroys the monster (boss hits before the last are not final)
  points: number
  effect: EffectPreset
}

export type Announcement = 'wave' | 'boss' | 'new-monster'

/** What the hook must do after an outcome has played out. */
export type Next = { kind: 'over' } | { kind: 'spawn'; wave: number; boss: boolean; announce: Announcement | null }

export interface DuelState {
  phase: 'idle' | 'playing' | 'over'
  paused: boolean
  hearts: number
  score: number
  combo: number
  bestCombo: number
  wave: number
  kills: number // kills in the current wave
  bossHp: number // > 0 while a boss is on the field
  mega: number // MEGA meter 0..MEGA_MAX
  round: Round | null
  walking: boolean
  twinTried: string | null // choiceKey of the forgiven twin tap this round
  outcome: Outcome | null
  runMisses: Record<string, number> // mark id → misses this run
  seenScreens: string[] // 'A' | 'B' | 'C' | 'D' | 'silent' already explained this run
  /** the round is on screen while the wizard explains it: no walking, taps ignored */
  preview: boolean
  next: Next | null
}

export interface Tally {
  seen: number
  correct: number
  wrong: number
  timeout: number
  twin: number
  mega: number
}

export interface DuelStats {
  sessions: number
  roundsMs: number
  bestScore: number
  bestWave: number
  lastPlayed: number | null
  byMark: Record<string, Tally>
  byType: Partial<Record<ScreenType, Tally>>
  /** confusions[asked][tapped]: how often he tapped `tapped` when `asked` was the answer (wrong taps + forgiven twins) */
  confusions?: Record<string, Record<string, number>>
  /** each mark's last answers, newest last: x = wrong or too slow, o = right */
  recent?: Record<string, string>
  /** adaptive walk-time multiplier carried between games (1 = the wave's normal pace) */
  pace?: number
}
