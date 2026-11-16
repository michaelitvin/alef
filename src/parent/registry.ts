// The games in the parent area, in the order their lines show. A game registers by declaring
// `src/<game>/parent/index.ts` (a GameParent, see types.ts) and adding it here.
import { book2Parent } from '../duel2/parent'
import { clockParent } from '../clock/parent'
import { lessonsParent } from '../lessons/parent'
import type { GameId, GameParent } from './types'

export const GAMES: readonly GameParent[] = [book2Parent, clockParent, lessonsParent]

export const gameParent = (id: GameId): GameParent => GAMES.find((g) => g.id === id)!

/** a save's raw text, or null (no storage) */
export function rawSave(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
