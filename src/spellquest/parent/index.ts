// Spell Quest's part in the parent area (src/parent). Light on purpose: no store, audio or telemetry module here (depcruise:
// game-parent-index-is-light); the screens load with React.lazy, only on Spell Quest's page.
import { lazy } from 'react'
import { confusionList, persistedState, type GameParent } from '../../parent/types'
import { ITEMS } from '../logic/content'
import type { SpellQuestSave } from '../store'
import { SPELLQUEST_LOG } from '../telemetryLog'
import { TOWER_HISTORY_LOG } from '../tower/logic/telemetryHistory'
import { SPELLQUEST_SAVE_KEY } from '../../shared/saveKeys'

const glyph = (id: string) => ITEMS.find((i) => i.id === id)?.glyph ?? id

export const spellQuestParent: GameParent = {
  id: 'spellquest',
  title: 'Book 2',
  saveKey: SPELLQUEST_SAVE_KEY,
  logs: [SPELLQUEST_LOG, TOWER_HISTORY_LOG],
  Settings: lazy(() => import('./Settings')),
  DevTools: lazy(() => import('./DevTools')),
  summary: (raw) => {
    const s = persistedState<SpellQuestSave>(raw)
    if (!s) return null
    const stage = s.screensOpen === false ? 0 : s.stage?.stage ?? 1
    return `Stage ${stage} · runs ${s.runs ?? 0} · best run ${s.bestRun ?? 0} · crystals ${s.crystals ?? 0}`
  },
  mixups: (raw) => {
    const c = persistedState<SpellQuestSave>(raw)?.confusions
    return [...confusionList(c?.letters, glyph), ...confusionList(c?.vowels, (v) => `vowel ${v}`)].sort((a, b) => b.n - a.n)
  },
  reset: async () => { (await import('./reset')).default() },
}
