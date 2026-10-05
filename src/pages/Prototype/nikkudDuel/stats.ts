// PROTOTYPE — parent stats (per mark / per screen type / sessions), kept in localStorage
// so playtests on the tablet accumulate. The real game would put this in progressStore.
import type { Round } from './game'

const KEY = 'nd-proto-stats-v1'

export interface Tally {
  seen: number
  correct: number
  wrong: number
  timeout: number
  mega: number // finished by the MEGA spell: not an answer, so not "correct"
  twin: number // tapped the same-sound twin on a name screen (forgiven, then retried)
}

export interface Stats {
  sessions: number
  roundsMs: number
  bestScore: number
  bestWave: number
  lastPlayed: string | null
  byMark: Record<string, Tally>
  byType: Record<string, Tally>
}

const empty = (): Stats => ({ sessions: 0, roundsMs: 0, bestScore: 0, bestWave: 0, lastPlayed: null, byMark: {}, byType: {} })
const tally = (): Tally => ({ seen: 0, correct: 0, wrong: 0, timeout: 0, mega: 0, twin: 0 })

export function loadStats(): Stats {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return empty()
  }
}

function save(s: Stats) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function recordSession() {
  const s = loadStats()
  s.sessions += 1
  s.lastPlayed = new Date().toISOString()
  save(s)
}

export function recordRound(r: Round, result: 'correct' | 'wrong' | 'timeout' | 'mega', ms: number) {
  const s = loadStats()
  for (const [bucket, key] of [[s.byMark, r.target.id], [s.byType, r.type]] as const) {
    const t = (bucket[key] = { ...tally(), ...bucket[key] })
    t.seen += 1
    t[result] += 1
  }
  s.roundsMs += ms
  s.lastPlayed = new Date().toISOString()
  save(s)
}

export function recordRunEnd(score: number, wave: number) {
  const s = loadStats()
  s.bestScore = Math.max(s.bestScore, score)
  s.bestWave = Math.max(s.bestWave, wave)
  save(s)
}

export function resetStats() {
  localStorage.removeItem(KEY)
}

/** A forgiven twin tap; the round's final result is recorded separately by recordRound. */
export function recordTwin(r: Round) {
  const s = loadStats()
  for (const [bucket, key] of [[s.byMark, r.target.id], [s.byType, r.type]] as const) {
    const t = (bucket[key] = { ...tally(), ...bucket[key] })
    t.twin += 1
  }
  save(s)
}
