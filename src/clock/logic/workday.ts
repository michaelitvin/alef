// The workshop's cast and the shape of a workday (spec: Workday, rewards and bonus; Characters and voices).
// Loaded by plain Node (export script): erasable TS only, explicit .ts imports.
import { type ClockTime, angleDiff } from './time.ts'
import type { Lang } from './phrases.ts'

type Rng = () => number

export type ClockKind = 'wall' | 'alarm' | 'cuckoo' | 'pocket' | 'grandfather' | 'station' | 'wrist' | 'tower'
export type ClockSfx =
  | 'tick' | 'chime' | 'cuckoo' | 'alarm' | 'bong' | 'beep' | 'gear' | 'boing' | 'doorbell' | 'snap'
  | 'fanfare' | 'ding' | 'wallchime'

export interface KindInfo {
  id: ClockKind
  /** the level that brings it */
  level: number
  /** shows a seconds hand (from level 5) */
  seconds: boolean
  /** the sound it makes when it comes alive */
  sound: ClockSfx
}

export const KINDS: KindInfo[] = [
  { id: 'wall', level: 1, seconds: false, sound: 'chime' },
  { id: 'alarm', level: 1, seconds: false, sound: 'alarm' },
  { id: 'cuckoo', level: 2, seconds: false, sound: 'cuckoo' },
  { id: 'pocket', level: 3, seconds: true, sound: 'chime' },
  { id: 'grandfather', level: 4, seconds: false, sound: 'bong' },
  { id: 'station', level: 5, seconds: true, sound: 'chime' },
  { id: 'wrist', level: 6, seconds: true, sound: 'beep' },
  { id: 'tower', level: 7, seconds: false, sound: 'bong' },
]
export const kindInfo = (k: ClockKind) => KINDS.find((x) => x.id === k)!
export const kindsUpTo = (level: number) => KINDS.filter((k) => k.level <= level)
export const newKindsAt = (level: number) => KINDS.filter((k) => k.level === level)

export interface Customer {
  id: string
  lang: Lang
  /** ElevenLabs premade voice */
  voice: string
}
export const CUSTOMERS: Customer[] = [
  { id: 'hedgehog', lang: 'he', voice: 'cgSgspJ2msm6clMCkdW9' },
  { id: 'cat', lang: 'he', voice: 'XrExE9yKIg1WjnnlVkGX' },
  { id: 'bear', lang: 'he', voice: 'nPczCjzI2devNBz1zQrb' },
  { id: 'turtle', lang: 'he', voice: 'JBFqnCBsd6RMkjVDRZzb' },
  { id: 'owl', lang: 'en', voice: 'Xb7hH8MSUJpSbSDYk0k2' },
  { id: 'fox', lang: 'en', voice: 'IKne3meq5aSn9XLyUdCD' },
  { id: 'rabbit', lang: 'en', voice: 'FGY2WhTYpPnrIDTdsKH5' },
  { id: 'penguin', lang: 'en', voice: 'N2lVS1w4EtoT3dr4eOWO' },
]
/** The cuckoo narrator: Charlotte, chosen by the parent in the style test (2026-10-15); played with the playful tag (eleven_v4). */
export const NARRATOR_VOICE = 'XB0fDUnXU5powFXDhCwa'

export const WORKDAY_LENGTH = 8

/**
 * The language of a workday round: the day is cut into one block per enabled language, in order (Hebrew first), so the
 * child stays in one language for a while (the parent 2026-10-16: do not switch language every question).
 */
export const langForRound = (served: number, langs: Lang[]): Lang => {
  const block = Math.ceil(WORKDAY_LENGTH / langs.length)
  return langs[Math.min(langs.length - 1, Math.floor(served / block))]
}

export function pickCustomer(rng: Rng, lang: Lang, lastId?: string): Customer {
  const pool = CUSTOMERS.filter((c) => c.lang === lang && c.id !== lastId)
  return pool[Math.floor(rng() * pool.length)]
}

export function pickKind(rng: Rng, level: number, forced?: ClockKind): ClockKind {
  if (forced) return forced
  const pool = kindsUpTo(level)
  return pool[Math.floor(rng() * pool.length)].id
}

export const BONUS_TRIES = 3
/** one turn of the bonus game's seconds hand */
export const BONUS_TURN_MS = 5000

/** Gears for stopping the sweeping hand, by degrees of the sweep from 12: within 12 deg → 3, 30 deg → 2, 60 deg → 1, else 0. */
export function bonusGears(stopAngle: number): number {
  const d = angleDiff(stopAngle, 0)
  return d <= 12 ? 3 : d <= 30 ? 2 : d <= 60 ? 1 : 0
}

/** The device time rounded to five minutes, if his levels cover that minute value. */
export function realTimeFor(now: Date, minutes: number[]): ClockTime | null {
  const r = Math.round((now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60) / 5) * 5
  const h24 = Math.floor(r / 60) % 24
  const m = r % 60
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return minutes.includes(m) ? { h, m } : null
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
