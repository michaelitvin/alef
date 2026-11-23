// The first duel's old event log, 'alef-tower-history-telemetry': the child's history from before the duel became Book 2's tower.
// Nothing writes it any more (the tower's events go to Book 2's log with `via: 'tower'`, ADR 0004), and it is never
// trimmed, cleared or rewritten (owner decision, 2026-11-16: an update does not delete the child's history). The parent
// area's Data section exports it as it is.
import type { TelemetryLog } from '../../../shared/telemetry'
import { TOWER_HISTORY_LOG_KEY } from '../../../shared/saveKeys'

export const TOWER_HISTORY_LOG: TelemetryLog = {
  key: TOWER_HISTORY_LOG_KEY,
  label: 'First duel (history)',
  game: 'tower',
  history: true,
  about: {
    game: 'Nikkud Wizard Duel (vowel marks): its log from before it became the tower of Spell Quest',
    docs: ['docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md', 'docs/adr/0004-one-telemetry-log-per-game.md'],
    code: ['src/spellquest/tower/useTower.ts'],
  },
}
