// The saves' version steps that `?migrate-check` runs (game code, so this one file is the only way from `src/shared` to the
// games; the page loads it only when the check runs: `import()` in stagingStorage.ts).
import { PROGRESS_PERSIST_VERSION, migrateProgress } from '../stores/progressMigrate'
import { SAVE_VERSION, migrateSave } from '../spellquest/saveFormat'
import { ENGLISH_SAVE_VERSION, migrateEnglishSave } from '../spellquest/english/saveFormat'
import type { SaveStep } from './migrateCheck'

/** by the save's key after the move */
export const SAVE_STEPS: Record<string, SaveStep> = {
  'alef-progress': { version: PROGRESS_PERSIST_VERSION, migrate: migrateProgress },
  'alef-spellquest-he': { version: SAVE_VERSION, migrate: migrateSave },
  'alef-spellquest-en': { version: ENGLISH_SAVE_VERSION, migrate: migrateEnglishSave },
}
