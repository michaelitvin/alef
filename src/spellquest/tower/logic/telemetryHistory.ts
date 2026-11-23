// The tower's old event log, 'alef-tower-history-telemetry': the child's history from before the tower became Spell Quest's tower.
// Nothing writes it any more (the tower's events go to Spell Quest's log with `via: 'tower'`, ADR 0004), and it is never
// trimmed, cleared or rewritten (owner decision, 2026-11-16: an update does not delete the child's history). The parent
// area's Data section exports it as it is. While its move to this key waits for space (keyMigration.ts), it is still under
// its old key 'alef-duel-telemetry': the log is then read from there, so the export has it.
import type { TelemetryLog } from '../../../shared/telemetry'
import { OLD_TOWER_HISTORY_LOG_KEY, TOWER_HISTORY_LOG_KEY } from '../../../shared/saveKeys'

const storedKey = (): string => {
  try {
    return localStorage.getItem(TOWER_HISTORY_LOG_KEY) === null && localStorage.getItem(OLD_TOWER_HISTORY_LOG_KEY) !== null
      ? OLD_TOWER_HISTORY_LOG_KEY : TOWER_HISTORY_LOG_KEY
  } catch { return TOWER_HISTORY_LOG_KEY }
}

export const TOWER_HISTORY_LOG: TelemetryLog = {
  /** the new key, or the old one while the move waits for space */
  get key() { return storedKey() },
  label: 'Tower (history)',
  game: 'tower',
  history: true,
  about: {
    game: 'Nikkud Wizard Duel (vowel marks): its log from before it became the tower of Spell Quest',
    docs: ['docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md', 'docs/adr/0004-one-telemetry-log-per-game.md'],
    code: ['src/spellquest/tower/useTower.ts'],
  },
}
