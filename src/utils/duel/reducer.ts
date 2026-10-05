import type { Choice, DuelState, EffectPreset, Next, Round } from '../../types/duel'
import { BOSS_EVERY, BOSS_HP, HEARTS, MEGA_MAX, MONSTERS_PER_WAVE, isCorrect, isTwin, keyOf, newMonsterAt, points } from './rules'

export type DuelAction =
  | { type: 'START' }
  | { type: 'ROUND_READY'; round: Round }
  | { type: 'WALK_START' }
  | { type: 'CHOOSE'; choice: Choice; effect: EffectPreset }
  | { type: 'TIMEOUT' }
  | { type: 'MEGA'; effect: EffectPreset }
  | { type: 'SCREEN_EXPLAINED'; key: string }
  | { type: 'ADVANCE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }

export const initialDuelState: DuelState = {
  phase: 'idle', paused: false, hearts: HEARTS, score: 0, combo: 0, bestCombo: 0, wave: 1, kills: 0, bossHp: 0, mega: 0,
  round: null, walking: false, twinTried: null, outcome: null, runMisses: {}, seenScreens: [], next: null,
}

const canAnswer = (s: DuelState) => s.phase === 'playing' && !s.paused && s.round !== null && s.outcome === null

function hit(s: DuelState, choiceKey: string | null, mega: boolean, effect: EffectPreset): DuelState {
  const round = s.round!
  const dmg = mega ? 2 : 1
  const final = !round.boss || s.bossHp - dmg <= 0
  const pts = points(s.combo, mega)
  const combo = s.combo + 1
  return {
    ...s,
    outcome: { kind: 'hit', choiceKey, mega, final, points: pts, effect },
    score: s.score + pts,
    combo,
    bestCombo: Math.max(s.bestCombo, combo),
    mega: mega ? 0 : Math.min(MEGA_MAX, s.mega + 1),
    bossHp: round.boss ? Math.max(0, s.bossHp - dmg) : s.bossHp,
  }
}

/** A miss costs a heart and the combo; a boss keeps the damage it already took. */
function miss(s: DuelState, choiceKey: string | null): DuelState {
  const id = s.round!.target.id
  return {
    ...s,
    outcome: { kind: 'miss', choiceKey, mega: false, final: false, points: 0, effect: 'gentle' },
    hearts: s.hearts - 1,
    combo: 0,
    runMisses: { ...s.runMisses, [id]: (s.runMisses[id] ?? 0) + 1 },
  }
}

function newWave(wave: number): { state: Partial<DuelState>; next: Next } {
  const announce = wave === 3 ? 'new-spells' : newMonsterAt(wave) ? 'new-monster' : 'wave'
  return { state: { wave, kills: 0 }, next: { kind: 'spawn', wave, boss: false, announce } }
}

function nextAfter(s: DuelState): { state: Partial<DuelState>; next: Next } {
  const o = s.outcome!
  const r = s.round!
  if (s.hearts <= 0) return { state: { phase: 'over' }, next: { kind: 'over' } }
  if (o.kind === 'miss') return { state: {}, next: { kind: 'spawn', wave: s.wave, boss: r.boss, announce: null } }
  if (r.boss) {
    if (s.bossHp > 0) return { state: {}, next: { kind: 'spawn', wave: s.wave, boss: true, announce: null } }
    return newWave(s.wave + 1)
  }
  const kills = s.kills + 1
  if (kills < MONSTERS_PER_WAVE) return { state: { kills }, next: { kind: 'spawn', wave: s.wave, boss: false, announce: null } }
  if (s.wave % BOSS_EVERY === 0) return { state: { kills, bossHp: BOSS_HP }, next: { kind: 'spawn', wave: s.wave, boss: true, announce: 'boss' } }
  return newWave(s.wave + 1)
}

export function duelReducer(s: DuelState, a: DuelAction): DuelState {
  switch (a.type) {
    case 'START':
      return { ...initialDuelState, phase: 'playing', next: { kind: 'spawn', wave: 1, boss: false, announce: null } }
    case 'ROUND_READY':
      return { ...s, round: a.round, outcome: null, twinTried: null, next: null, walking: a.round.type === 'A' || a.round.type === 'D' }
    case 'WALK_START':
      return s.round && !s.outcome ? { ...s, walking: true } : s
    case 'CHOOSE': {
      if (!canAnswer(s)) return s
      const r = s.round!
      if (isCorrect(r, a.choice)) return hit(s, keyOf(a.choice), false, a.effect)
      if (isTwin(r, a.choice) && !s.twinTried) return { ...s, twinTried: keyOf(a.choice) }
      return miss(s, keyOf(a.choice))
    }
    case 'TIMEOUT':
      return canAnswer(s) ? miss(s, null) : s
    case 'MEGA':
      return canAnswer(s) && s.mega >= MEGA_MAX ? hit(s, null, true, a.effect) : s
    case 'SCREEN_EXPLAINED':
      return s.seenScreens.includes(a.key) ? s : { ...s, seenScreens: [...s.seenScreens, a.key] }
    case 'ADVANCE': {
      if (!s.outcome || s.phase !== 'playing' || s.next) return s
      const { state, next } = nextAfter(s)
      return { ...s, ...state, next, round: next.kind === 'over' ? s.round : null }
    }
    case 'PAUSE':
      return s.phase === 'playing' ? { ...s, paused: true } : s
    case 'RESUME':
      return { ...s, paused: false }
  }
}
