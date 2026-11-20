// Space Cat's part in the parent area (src/parent). Light on purpose: no store, audio or telemetry module here (depcruise:
// game-parent-index-is-light); its settings load with React.lazy, only on Space Cat's page. Its log is declared here
// (`logs`, from the light telemetryLog.ts, never the instance): the registry registers it on every game page.
import { lazy } from 'react'
import { persistedState, type GameParent, type Mixup } from '../../parent/types'
import { migrateV1 } from '../migrate'
import { RUNGS } from '../logic/rungs'
import { DEFAULT_SETTINGS, SAVE_KEY, type SpaceCatSave } from '../saveFormat'
import { SPACECAT_LOG } from '../telemetryLog'
import { RUNG_TEXT, whereHeIs, workingOn } from './ladderText'
import { rungTallies, shareText } from './rungs'
import { sumText } from './sumText'

/** the saved state; a version 1 save (a child who has not opened Space Cat since the update) is read as migrated, not as fresh */
function readSave(raw: string | null): Partial<SpaceCatSave> | null {
  const s = persistedState<SpaceCatSave>(raw)
  if (!s) return null
  try {
    const v = (JSON.parse(raw as string) as { version?: unknown }).version
    if (typeof v === 'number' && v < 2) return migrateV1(s)
  } catch { /* unreadable: persistedState already returned null */ }
  return s
}

export const spaceCatParent: GameParent = {
  id: 'spacecat',
  title: 'Space Cat',
  saveKey: SAVE_KEY,
  logs: [SPACECAT_LOG],
  Settings: lazy(() => import('./Settings')),
  summary: (raw) => {
    const s = readSave(raw)
    if (!s) return null
    // a save with no new-format ladder (never played, or unreadable) reads as a fresh one
    const w = s.ladder?.rungs ? whereHeIs(s.ladder, { ...DEFAULT_SETTINGS, ...s.settings }) : null
    const on = w ? `Working on: ${workingOn(w)} · passed ${w.passed} of ${RUNGS.length}` : `Working on: ${RUNG_TEXT['1'].name} · passed 0 of ${RUNGS.length}`
    return `${on} · runs ${s.runs ?? 0} · best ${s.best ?? 0} · points ${s.totalPoints ?? 0}`
  },
  // the share of right answers on each rung he has played (time-outs count as not right), as on his settings page
  details: (raw) => {
    const s = readSave(raw)
    if (!s) return []
    const t = rungTallies(s.items ?? {})
    const items = RUNGS.filter((r) => t.get(r.id)?.seen).map((r) => `${RUNG_TEXT[r.id].name}: ${shareText(t.get(r.id))} right`)
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
