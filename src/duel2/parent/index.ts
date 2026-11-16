// Book 2's part in the parent area (src/parent). Light on purpose: no store, audio or telemetry module here (depcruise:
// game-parent-index-is-light); the screens load with React.lazy, only on Book 2's page.
import { lazy } from 'react'
import { confusionList, persistedState, type GameParent } from '../../parent/types'
import { ITEMS } from '../logic/content'
import type { Duel2Save } from '../store'

const glyph = (id: string) => ITEMS.find((i) => i.id === id)?.glyph ?? id

export const book2Parent: GameParent = {
  id: 'book2',
  title: 'Book 2',
  saveKey: 'alef-duel2',
  logs: [{ key: 'alef-duel2-telemetry', label: 'Book 2' }, { key: 'alef-duel-telemetry', label: 'First duel (history)' }],
  Settings: lazy(() => import('./Settings')),
  DevTools: lazy(() => import('./DevTools')),
  summary: (raw) => {
    const s = persistedState<Duel2Save>(raw)
    if (!s) return null
    const stage = s.bookOpen === false ? 0 : s.stage?.stage ?? 1
    return `Stage ${stage} · runs ${s.runs ?? 0} · best run ${s.bestRun ?? 0} · crystals ${s.crystals ?? 0}`
  },
  mixups: (raw) => {
    const c = persistedState<Duel2Save>(raw)?.confusions
    return [...confusionList(c?.letters, glyph), ...confusionList(c?.vowels, (v) => `vowel ${v}`)].sort((a, b) => b.n - a.n)
  },
  reset: async () => { (await import('./reset')).default() },
}
