// Space Cat's part in the parent area (src/parent). Light on purpose: no store, audio or telemetry module here (depcruise:
// game-parent-index-is-light); its settings load with React.lazy, only on Space Cat's page. Its log is declared here
// (`logs`, from the light telemetryLog.ts, never the instance): the registry registers it on every game page.
import { lazy } from 'react'
import { persistedState, type GameParent, type Mixup } from '../../parent/types'
import { RUNGS } from '../logic/facts'
import { SAVE_KEY, type SpaceCatSave } from '../saveFormat'
import { SPACECAT_LOG } from '../telemetryLog'
import { RUNG_NAME, rungTallies, shareText } from './rungs'
import { sumText } from './sumText'

export const spaceCatParent: GameParent = {
  id: 'spacecat',
  title: 'Space Cat',
  saveKey: SAVE_KEY,
  logs: [SPACECAT_LOG],
  Settings: lazy(() => import('./Settings')),
  summary: (raw) => {
    const s = persistedState<SpaceCatSave>(raw)
    if (!s) return null
    return `Rung ${s.ladder?.top ?? 1} · runs ${s.runs ?? 0} · best ${s.best ?? 0} · points ${s.totalPoints ?? 0}`
  },
  // the share of right answers on each rung he has played (time-outs count as not right), as on his settings page
  details: (raw) => {
    const s = persistedState<SpaceCatSave>(raw)
    if (!s) return []
    const t = rungTallies(s.items ?? {})
    const items = RUNGS.filter((r) => t.get(r.id)?.seen).map((r) => `${r.id}. ${RUNG_NAME[r.id]}: ${shareText(t.get(r.id))} right`)
    return items.length ? [{ id: 'spacecat-rungs', title: 'Right answers per rung', items }] : []
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
