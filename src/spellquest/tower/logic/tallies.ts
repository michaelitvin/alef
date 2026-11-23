// What the tower reads and writes of the child's answers: the adaptive data its rounds are picked from (each rune's
// tally, recent answers and confusions) and the pace. The Hebrew tower keeps them in the tower's save
// (`useProgressStore.tower`, alef-progress); another course gives its own, so its answers never land there.
import type { RoundResult, ScreenType, Tally } from '../types'
import { RECENT_KEEP } from '../../../shared/adaptive'
import { useProgressStore } from '../../../stores/progressStore'

export interface TowerTallies {
  byMark: Record<string, Tally>
  confusions: Record<string, Record<string, number>>
  recent: Record<string, string>
  pace: number
}

export interface TowerTallyPort {
  read(): TowerTallies
  // the progress store's own actions, the ones the controller calls
  recordTowerRound(markId: string, type: ScreenType, result: RoundResult, ms: number, opts?: { recent?: boolean }): void
  recordTowerTwin(markId: string, type: ScreenType): void
  recordTowerConfusion(askedId: string, tappedId: string): void
  /**
   * a right answer after the hint blended the word (English): `seen` and `helped` + 1; not right, not wrong, and not in
   * the recent answers. Unset (the Hebrew tower has no hint): the controller never calls it
   */
  recordTowerHelped?(markId: string, type: ScreenType): void
  setTowerPace(pace: number): void
}

/** the tower's save (alef-progress), looked up on each call: the default */
export const progressTallies: TowerTallyPort = {
  read() {
    const d = useProgressStore.getState().tower
    return { byMark: d.byMark, confusions: d.confusions ?? {}, recent: d.recent ?? {}, pace: d.pace ?? 1 }
  },
  recordTowerRound: (markId, type, result, ms, opts) => useProgressStore.getState().recordTowerRound(markId, type, result, ms, opts),
  recordTowerTwin: (markId, type) => useProgressStore.getState().recordTowerTwin(markId, type),
  recordTowerConfusion: (askedId, tappedId) => useProgressStore.getState().recordTowerConfusion(askedId, tappedId),
  setTowerPace: (pace) => useProgressStore.getState().setTowerPace(pace),
}

const EMPTY_TALLY: Tally = { seen: 0, correct: 0, wrong: 0, timeout: 0, twin: 0, mega: 0 }

/** tallies kept in memory, recorded as the progress store records them (tests) */
export function memoryTallies(initial: Partial<TowerTallies> = {}): TowerTallyPort {
  let t: TowerTallies = { byMark: {}, confusions: {}, recent: {}, pace: 1, ...initial }
  return talliesOver(() => t, (next) => { t = next })
}

/**
 * Tallies kept where `get` reads them and `put` writes them (another course's save), recorded as the progress store
 * records them.
 */
export function talliesOver(get: () => TowerTallies, put: (t: TowerTallies) => void): TowerTallyPort {
  const update = (f: (t: TowerTallies) => TowerTallies) => put(f(get()))
  return {
    read: get,
    recordTowerRound(markId, _type, result, _ms, opts) {
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
    recordTowerHelped(markId) {
      update((t) => {
        const b = { ...EMPTY_TALLY, ...t.byMark[markId] }
        return { ...t, byMark: { ...t.byMark, [markId]: { ...b, seen: b.seen + 1, helped: (b.helped ?? 0) + 1 } } }
      })
    },
    recordTowerTwin(markId) {
      update((t) => {
        const b = { ...EMPTY_TALLY, ...t.byMark[markId] }
        return { ...t, byMark: { ...t.byMark, [markId]: { ...b, twin: b.twin + 1 } } }
      })
    },
    recordTowerConfusion(askedId, tappedId) {
      update((t) => {
        const row = t.confusions[askedId] ?? {}
        return { ...t, confusions: { ...t.confusions, [askedId]: { ...row, [tappedId]: (row[tappedId] ?? 0) + 1 } } }
      })
    },
    setTowerPace(pace) { update((t) => ({ ...t, pace })) },
  }
}
