// The English path's pictures: Book 2's, with the green look's own file (./img/<key>.webp) in place of each one that has it.
import { IMAGES } from '../../duel2/assets/images'

/** the pictures that never turn green: the monsters, bosses, merchant, potion, coins, hearts, stars and the picture words */
const STAYS = /^(boss-|merchant-|pw-|word-|s-potion|coin|heart|star)/

/** `base` with each green file of the same key in its place (a key with no green file keeps the base's); a picture that stays is never replaced */
export function greenImages(base: Record<string, string>, green: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(base).map(([k, url]) => [k, STAYS.test(k) ? url : green[k] ?? url]))
}

const GREEN: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
    .map(([p, url]) => [p.split('/').pop()!.replace('.webp', ''), url]),
)

export const ENGLISH_IMAGES: Record<string, string> = greenImages(IMAGES, GREEN)

/** reused Book 2 pictures named for another word (asset plan 2.1: word-a is a lion, word-i a pencil…) */
const RENAMED: Record<string, string> = { lion: 'word-a', chick: 'word-e', pencil: 'word-i', cake: 'word-u', bike: 'word-bicycle' }
/** Book 2 pictures the English path does not reuse (asset plan 2.1: another name, or another first sound) */
const NOT_REUSED = new Set(['ball', 'eye', 'island', 'silent', 'rose'])

/** The file of a word's picture (its EnWord.picture key): the English path's own `img/pw-<key>.webp`, else Book 2's picture word of that name; undefined: no file yet. */
export function wordPicture(key: string): string | undefined {
  if (NOT_REUSED.has(key)) return undefined
  return GREEN[`pw-${key}`] || (RENAMED[key] && ENGLISH_IMAGES[RENAMED[key]]) || ENGLISH_IMAGES[`pw-${key}`] || ENGLISH_IMAGES[`word-${key}`]
}
