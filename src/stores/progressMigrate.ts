// The lessons' save (`alef-progress`): its persist-version steps. Pure, with no store, so a check can call them.

/** the persist version of `alef-progress`: raise it when a save must be converted, and convert older saves in migrateProgress */
export const PROGRESS_PERSIST_VERSION = 1

/**
 * Persist version 1 (Spell Quest rename): `duel` (the first duel's stats) is now `tower`, and `settings.duelMusic` is now
 * `settings.towerMusic`. The values stay as they are. A no-op for a save that has only the new names (or none of them).
 */
export function renameTowerFieldsProgress(state: unknown): Record<string, unknown> {
  const s = { ...((state ?? {}) as Record<string, unknown>) }
  if ('duel' in s) {
    if (s.tower === undefined) s.tower = s.duel
    delete s.duel
  }
  const settings = s.settings
  if (settings && typeof settings === 'object' && 'duelMusic' in settings) {
    const { duelMusic, ...rest } = settings as Record<string, unknown>
    s.settings = rest.towerMusic === undefined ? { ...rest, towerMusic: duelMusic } : rest
  }
  return s
}

/** converts an older `alef-progress` save, step by step (the first step is persist version 1) */
export function migrateProgress(state: unknown, version: number): unknown {
  return version < 1 ? renameTowerFieldsProgress(state) : state
}
