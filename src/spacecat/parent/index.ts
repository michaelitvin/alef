// Space Cat's part in the parent area (src/parent). Light on purpose: no store, audio or telemetry module here (depcruise:
// game-parent-index-is-light); its settings load with React.lazy, only on Space Cat's page. Its log (`logs`) joins with
// the compact telemetry (plan Task 10B).
import { lazy } from 'react'
import { persistedState, type GameParent, type Mixup } from '../../parent/types'
import { SAVE_KEY, type SpaceCatSave } from '../saveFormat'
import { sumText } from './sumText'

export const spaceCatParent: GameParent = {
  id: 'spacecat',
  title: 'Space Cat',
  saveKey: SAVE_KEY,
  Settings: lazy(() => import('./Settings')),
  summary: (raw) => {
    const s = persistedState<SpaceCatSave>(raw)
    if (!s) return null
    return `Rung ${s.ladder?.top ?? 1} · runs ${s.runs ?? 0} · best ${s.best ?? 0} · points ${s.totalPoints ?? 0}`
  },
  mixups: (raw) => {
    const items = persistedState<SpaceCatSave>(raw)?.items ?? {}
    const out: Mixup[] = []
    for (const [id, st] of Object.entries(items)) {
      for (const [chosen, n] of Object.entries(st?.picks ?? {})) if (Number(n) > 0) out.push({ asked: sumText(id), chosen, n: Number(n) })
    }
    return out.sort((a, b) => b.n - a.n)
  },
  reset: async () => { (await import('./reset')).default() },
}
