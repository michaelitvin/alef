// The lessons' part in the parent area (src/parent): the reading course of the main app. Light on purpose: no store here
// (depcruise: game-parent-index-is-light); the settings and developer tools load with React.lazy, only on the main page.
import { lazy } from 'react'
import { persistedState, type GameParent } from '../../parent/types'
import type { ProgressState } from '../../types/progress'

export const lessonsParent: GameParent = {
  id: 'lessons',
  title: 'Lessons',
  saveKey: 'alef-progress',
  Settings: lazy(() => import('./Settings')),
  DevTools: lazy(() => import('./DevTools')),
  summary: (raw) => {
    const st = persistedState<ProgressState>(raw)?.stats
    if (!st) return null
    return `Letters learned ${st.lettersLearned ?? 0} · answers ${st.totalAttempts ?? 0} · accuracy ${Math.round((st.accuracy ?? 0) * 100)}% · sessions ${st.sessionCount ?? 0}`
  },
  // the lessons keep no mix-up table
  mixups: () => [],
  reset: async () => { (await import('./reset')).default() },
}
