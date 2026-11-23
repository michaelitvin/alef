// The localStorage keys that more than one module names, defined once (the names after the Spell Quest rename, ADR 0009,
// and its 2026-11-23 addendum: Hebrew Spell Quest and English Spell Quest). The old names live in keyMigration.ts only:
// it moves them.
export const SPELLQUEST_HE_SAVE_KEY = 'alef-spellquest-he'
export const SPELLQUEST_HE_LOG_KEY = 'alef-spellquest-he-telemetry'
export const SPELLQUEST_EN_SAVE_KEY = 'alef-spellquest-en'
export const SPELLQUEST_EN_LOG_KEY = 'alef-spellquest-en-telemetry'
/** the tower's old event log, frozen (ADR 0004): once `alef-duel-telemetry` */
export const TOWER_HISTORY_LOG_KEY = 'alef-tower-history-telemetry'
/** the log's key before the move: while the move waits for space, the frozen log is still there and is still never trimmed */
export const OLD_TOWER_HISTORY_LOG_KEY = 'alef-duel-telemetry'
