// The clock's part in the parent area (src/parent). Light on purpose: no store, audio or telemetry module here (depcruise:
// game-parent-index-is-light); the settings load with React.lazy, only on the clock's page.
import { lazy } from 'react'
import { confusionList, persistedState, type GameParent } from '../../parent/types'
import { CLOCK_LOG } from '../telemetryLog'

/** the fields of the clock's save the area reads (src/clock/store.ts ClockSave) */
interface ClockSaveView {
  progress: { level: number; newSetAnswers?: string }
  roundNo: number
  gears: number
  workdays: number
  bestStreak: number
  confusions: Record<string, Record<string, number>>
}

export const clockParent: GameParent = {
  id: 'clock',
  title: 'Clock workshop',
  saveKey: 'alef-clock',
  logs: [CLOCK_LOG],
  Settings: lazy(() => import('./Settings')),
  summary: (raw) => {
    const s = persistedState<ClockSaveView>(raw)
    if (!s) return null
    const set = [...(s.progress?.newSetAnswers ?? '').slice(-5)]
    return `Level ${s.progress?.level ?? 1}${set.length ? ` (set ${set.filter((c) => c === 'o').length}/${set.length})` : ''} · rounds ${s.roundNo ?? 0} · gears ${s.gears ?? 0} · workdays ${s.workdays ?? 0} · best streak ${s.bestStreak ?? 0}`
  },
  mixups: (raw) => confusionList(persistedState<ClockSaveView>(raw)?.confusions),
  reset: async () => { (await import('./reset')).default() },
}
