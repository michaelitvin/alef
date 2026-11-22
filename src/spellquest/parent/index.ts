// Spell Quest's part in the parent area (src/parent). Light on purpose: no store, audio or telemetry module here (depcruise:
// game-parent-index-is-light); the screens load with React.lazy, only on Spell Quest's page.
import { lazy } from 'react'
import { confusionList, persistedState, type GameParent } from '../../parent/types'
import { ITEMS } from '../logic/content'
import type { SpellQuestSave } from '../store'
import { SPELLQUEST_LOG } from '../telemetryLog'
import { DUEL_HISTORY_LOG } from '../../utils/duel/telemetryHistory'

const glyph = (id: string) => ITEMS.find((i) => i.id === id)?.glyph ?? id

export const spellQuestParent: GameParent = {
  id: 'book2',
  title: 'Book 2',
  saveKey: 'alef-duel2',
  logs: [SPELLQUEST_LOG, DUEL_HISTORY_LOG],
  Settings: lazy(() => import('./Settings')),
  DevTools: lazy(() => import('./DevTools')),
  summary: (raw) => {
    const s = persistedState<SpellQuestSave>(raw)
    if (!s) return null
    const stage = s.bookOpen === false ? 0 : s.stage?.stage ?? 1
    return `Stage ${stage} · runs ${s.runs ?? 0} · best run ${s.bestRun ?? 0} · crystals ${s.crystals ?? 0}`
  },
  mixups: (raw) => {
    const c = persistedState<SpellQuestSave>(raw)?.confusions
    return [...confusionList(c?.letters, glyph), ...confusionList(c?.vowels, (v) => `vowel ${v}`)].sort((a, b) => b.n - a.n)
  },
  reset: async () => { (await import('./reset')).default() },
}
