// The English path's part in the parent area (src/parent). Light on purpose: no store, audio or telemetry module here
// (depcruise: game-parent-index-is-light). Registered from the start, so its log is sealed and budgeted from its first
// event.
import { lazy } from 'react'
import { confusionList, persistedState, type GameParent } from '../../parent/types'
import { ENGLISH_AVAILABLE } from '../available'
import { localDate } from './date'
import { ENGLISH_SAVE_KEY, type EnglishSave } from '../saveFormat'
import { ENGLISH_LOG } from '../telemetryLog'

export const englishParent: GameParent = {
  id: 'english',
  title: 'English path',
  saveKey: ENGLISH_SAVE_KEY,
  logs: [ENGLISH_LOG],
  Settings: lazy(() => import('./Settings')),
  summary: (raw) => {
    const s = persistedState<EnglishSave>(raw)
    if (!s) return null
    const done = s.placement?.done
    const date = done ? localDate(done.at) : null
    const level = done
      ? `Level ${done.level} (placement: ${done.answers} answers${date ? `, ${date}` : ''})`
      : 'Not placed yet'
    return `${level} · stage ${s.stage?.stage ?? 1} · runs ${s.runs ?? 0} · best run ${s.bestRun ?? 0} · crystals ${s.crystals ?? 0}`
  },
  details: (raw) => {
    const words = persistedState<EnglishSave>(raw)?.lastRunWords ?? []
    return words.length ? [{ id: 'last-run-words', title: 'Words of his last run', items: words }] : []
  },
  mixups: (raw) => {
    const c = persistedState<EnglishSave>(raw)?.confusions
    return [...confusionList(c?.letters), ...confusionList(c?.vowels, (v) => `vowel ${v}`)].sort((a, b) => b.n - a.n)
  },
  reset: async () => { (await import('./reset')).default() },
}

/** the English section, only where the English path can be opened (production lists none) */
export const ENGLISH_PARENTS: readonly GameParent[] = ENGLISH_AVAILABLE ? [englishParent] : []
