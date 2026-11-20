// What the tower reads and writes of the child's answers: the adaptive data its rounds are picked from (each rune's
// tally, recent answers and confusions) and the pace. The Hebrew tower keeps them in the first duel's save
// (`useProgressStore.duel`, alef-progress); another course gives its own, so its answers never land there.
import type { RoundResult, ScreenType, Tally } from '../../types/duel'
import { RECENT_KEEP } from '../../shared/adaptive'
import { useProgressStore } from '../../stores/progressStore'

export interface TowerTallies {
  byMark: Record<string, Tally>
  confusions: Record<string, Record<string, number>>
  recent: Record<string, string>
  pace: number
}

export interface DuelTallies {
  read(): TowerTallies
  // the progress store's own actions, the ones the controller calls
  recordDuelRound(markId: string, type: ScreenType, result: RoundResult, ms: number, opts?: { recent?: boolean }): void
  recordDuelTwin(markId: string, type: ScreenType): void
  recordDuelConfusion(askedId: string, tappedId: string): void
  /**
   * a right answer after the hint blended the word (English): `seen` and `helped` + 1; not right, not wrong, and not in
   * the recent answers. Unset (the Hebrew tower has no hint): the controller never calls it
   */
  recordDuelHelped?(markId: string, type: ScreenType): void
  setDuelPace(pace: number): void
}

/** the first duel's save (alef-progress), looked up on each call: the default */
export const progressTallies: DuelTallies = {
  read() {
    const d = useProgressStore.getState().duel
    return { byMark: d.byMark, confusions: d.confusions ?? {}, recent: d.recent ?? {}, pace: d.pace ?? 1 }
  },
  recordDuelRound: (markId, type, result, ms, opts) => useProgressStore.getState().recordDuelRound(markId, type, result, ms, opts),
  recordDuelTwin: (markId, type) => useProgressStore.getState().recordDuelTwin(markId, type),
  recordDuelConfusion: (askedId, tappedId) => useProgressStore.getState().recordDuelConfusion(askedId, tappedId),
  setDuelPace: (pace) => useProgressStore.getState().setDuelPace(pace),
}

const EMPTY_TALLY: Tally = { seen: 0, correct: 0, wrong: 0, timeout: 0, twin: 0, mega: 0 }

/** tallies kept in memory, recorded as the progress store records them (tests) */
export function memoryTallies(initial: Partial<TowerTallies> = {}): DuelTallies {
  let t: TowerTallies = { byMark: {}, confusions: {}, recent: {}, pace: 1, ...initial }
  return talliesOver(() => t, (next) => { t = next })
}

/**
 * Tallies kept where `get` reads them and `put` writes them (another course's save), recorded as the progress store
 * records them.
 */
export function talliesOver(get: () => TowerTallies, put: (t: TowerTallies) => void): DuelTallies {
  const update = (f: (t: TowerTallies) => TowerTallies) => put(f(get()))
  return {
    read: get,
    recordDuelRound(markId, _type, result, _ms, opts) {
      update((t) => {
        const b = { ...EMPTY_TALLY, ...t.byMark[markId] }
        return {
          ...t,
          byMark: { ...t.byMark, [markId]: { ...b, seen: b.seen + 1, [result]: b[result] + 1 } },
          recent: opts?.recent === false ? t.recent : {
            ...t.recent, [markId]: ((t.recent[markId] ?? '') + (result === 'correct' || result === 'mega' ? 'o' : 'x')).slice(-RECENT_KEEP),
          },
        }
      })
    },
    recordDuelHelped(markId) {
      update((t) => {
        const b = { ...EMPTY_TALLY, ...t.byMark[markId] }
        return { ...t, byMark: { ...t.byMark, [markId]: { ...b, seen: b.seen + 1, helped: (b.helped ?? 0) + 1 } } }
      })
    },
    recordDuelTwin(markId) {
      update((t) => {
        const b = { ...EMPTY_TALLY, ...t.byMark[markId] }
        return { ...t, byMark: { ...t.byMark, [markId]: { ...b, twin: b.twin + 1 } } }
      })
    },
    recordDuelConfusion(askedId, tappedId) {
      update((t) => {
        const row = t.confusions[askedId] ?? {}
        return { ...t, confusions: { ...t.confusions, [askedId]: { ...row, [tappedId]: (row[tappedId] ?? 0) + 1 } } }
      })
    },
    setDuelPace(pace) { update((t) => ({ ...t, pace })) },
  }
}
