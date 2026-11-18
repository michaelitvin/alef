// The English path's part in the parent area (src/parent). Light on purpose: no store, audio or telemetry module here
// (depcruise: game-parent-index-is-light). Registered from the start, so its log is sealed and budgeted from its first
// event; its settings, details and mix-ups come later.
import { persistedState, type GameParent } from '../../parent/types'
import { ENGLISH_AVAILABLE } from '../available'
import { ENGLISH_SAVE_KEY, type EnglishSave } from '../saveFormat'
import { ENGLISH_LOG } from '../telemetryLog'

const englishParent: GameParent = {
  id: 'english',
  title: 'English path',
  saveKey: ENGLISH_SAVE_KEY,
  logs: [ENGLISH_LOG],
  summary: (raw) => {
    const s = persistedState<EnglishSave>(raw)
    if (!s) return null
    return `Stage ${s.stage?.stage ?? 1} · runs ${s.runs ?? 0} · best run ${s.bestRun ?? 0}`
  },
  mixups: () => [],
  reset: async () => { (await import('./reset')).default() },
}

/** the English section, only where the English path can be opened (production lists none) */
export const ENGLISH_PARENTS: readonly GameParent[] = ENGLISH_AVAILABLE ? [englishParent] : []
