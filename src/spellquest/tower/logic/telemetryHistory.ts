// The first duel's old event log, 'alef-duel-telemetry': the child's history from before the duel became Book 2's tower.
// Nothing writes it any more (the tower's events go to Book 2's log with `via: 'tower'`, ADR 0004), and it is never
// trimmed, cleared or rewritten (owner decision, 2026-11-16: an update does not delete the child's history). The parent
// area's Data section exports it as it is.
import type { TelemetryLog } from '../../../shared/telemetry'

export const DUEL_HISTORY_LOG: TelemetryLog = {
  key: 'alef-duel-telemetry',
  label: 'First duel (history)',
  game: 'duel',
  history: true,
  about: {
    game: 'Nikkud Wizard Duel (vowel marks): its log from before it became the tower of Book 2',
    docs: ['docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md', 'docs/adr/0004-one-telemetry-log-per-game.md'],
    code: ['src/hooks/useDuelGame.ts'],
  },
}
