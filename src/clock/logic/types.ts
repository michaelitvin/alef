import type { ClockTime } from './time'
import type { Lang } from './phrases'
import type { Option, TrickFamily } from './tricks'
import type { ClockKind } from './workday'

export type Hint = 'quarters' | 'minutes'
export type Exercise = 'find' | 'what' | 'digitalPick' | 'setShort' | 'setLong' | 'setBoth' | 'digitalSet'

export interface Scaffolds {
  /** the numbers on the face: all 12, only 12/3/6/9, or none */
  numbers: 'all' | 'quarters' | 'none'
  /** the light past (right) / to (left) shading */
  slice: boolean
  /**
   * The hint that fits the time (the parent 2026-10-17): where the quarters are (:15, :30, :45), or the minutes at each
   * number (the other five-minute times); none on the hour.
   */
  hint: Hint | null
  /** the hint shows from the start (his first HINT_AUTO rounds with it); after that it waits behind the hint button */
  hintAuto: boolean
  /** a ticking seconds hand */
  seconds: boolean
}

export interface RoundPlan {
  exercise: Exercise
  time: ClockTime
  /** the time is one of the current level's new times (counts for passing the level) */
  isNew: boolean
  lang: Lang
  level: number
  kind: ClockKind
  scaffolds: Scaffolds
  /** choice exercises: three options; set exercises: [] */
  options: Option[]
  correctIndex: number
  families: TrickFamily[]
  /** the short hand creeps with the long hand (levels 2–4) */
  linked: boolean
  /** this round reads :40 as "one forty" (else "twenty to two"); the question, the cards and the feedback agree */
  digital40?: boolean
  /** where the seconds hand starts on the main clock (what / digitalPick with seconds) */
  secondsAt?: number
  features: string[]
  predicted: number
}
