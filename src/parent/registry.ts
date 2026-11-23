// The games in the parent area, in the order their lines show. A game registers by declaring
// `src/<game>/parent/index.ts` (a GameParent, see types.ts) and adding it here.
import { spellQuestParent } from '../spellquest/parent'
import { clockParent } from '../clock/parent'
import { lessonsParent } from '../lessons/parent'
import { spaceCatParent } from '../spacecat/parent'
import { ENGLISH_PARENTS } from '../spellquest/english/parent'
import { readSaveValue } from '../shared/keyMigration'
import { registerTelemetryLogs } from '../shared/telemetry'
import type { GameId, GameParent } from './types'

/** English Spell Quest only where it can be opened (production lists no English section) */
export const GAMES: readonly GameParent[] = [spellQuestParent, clockParent, spaceCatParent, lessonsParent, ...ENGLISH_PARENTS]

// Core seals, folds and evicts every game's log, so it must know them all on every page (each game page loads this).
registerTelemetryLogs(GAMES.flatMap((g) => g.logs ?? []))

export const gameParent = (id: GameId): GameParent => GAMES.find((g) => g.id === id)!

/** a save's raw text (under its old key while its move waits for space, as the home reads it), or null (no storage) */
export function rawSave(key: string): string | null {
  try { return readSaveValue(localStorage, key) } catch { return null }
}
