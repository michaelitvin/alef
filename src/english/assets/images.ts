// The English path's pictures: Book 2's until the green look gives some of them a file of its own (./img/).
import { IMAGES } from '../../duel2/assets/images'

export const ENGLISH_IMAGES: Record<string, string> = IMAGES

/** reused Book 2 pictures named for another word (asset plan 2.1: word-a is a lion, word-i a pencil…) */
const RENAMED: Record<string, string> = { lion: 'word-a', chick: 'word-e', pencil: 'word-i', cake: 'word-u', bike: 'word-bicycle' }
/** Book 2 pictures the English path does not reuse (asset plan 2.1: another name, or another first sound) */
const NOT_REUSED = new Set(['ball', 'eye', 'island', 'silent', 'rose'])

/** The file of a word's picture (its EnWord.picture key): Book 2's picture word of that name; undefined: no file yet. */
export function wordPicture(key: string): string | undefined {
  if (NOT_REUSED.has(key)) return undefined
  return (RENAMED[key] && ENGLISH_IMAGES[RENAMED[key]]) || ENGLISH_IMAGES[`pw-${key}`] || ENGLISH_IMAGES[`word-${key}`]
}
