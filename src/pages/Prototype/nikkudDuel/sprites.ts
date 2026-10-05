// PROTOTYPE — final sprites: one Gemini render each, styled from the approved sheet B (night sky magic),
// magenta keyed out by art/export_final.py on the Jetson.
import wizardIdle from './sprites/wizard-idle.webp'
import wizardCast from './sprites/wizard-cast.webp'
import wizardDizzy from './sprites/wizard-dizzy.webp'
import tower from './sprites/tower.webp'
import fuzzy from './sprites/mon-fuzzy.webp'
import blob from './sprites/mon-blob.webp'
import imp from './sprites/mon-imp.webp'
import ghost from './sprites/mon-ghost.webp'
import dragon from './sprites/boss-dragon.webp'
import troll from './sprites/boss-troll.webp'
import bat from './sprites/mon-bat.webp'
import mushroom from './sprites/mon-mushroom.webp'
import golem from './sprites/mon-golem.webp'
import octopus from './sprites/mon-octopus.webp'

export const WIZARD = { idle: wizardIdle, cast: wizardCast, dizzy: wizardDizzy }
export const TOWER = tower
export const MONSTER_SPRITES: Record<string, string> = { fuzzy, blob, imp, ghost, bat, mushroom, golem, octopus, dragon, troll }

// Monsters walk right → left, so they must face left. These renders face right (or move right) → mirror.
export const FLIP = new Set(['fuzzy', 'ghost'])

// Picture words: sprites/word-<key>.webp, keyed by PictureWord.key (marks.ts).
const wordFiles = import.meta.glob('./sprites/word-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const WORD_PICTURE: Record<string, string> = Object.fromEntries(
  Object.entries(wordFiles).map(([path, url]) => [path.replace(/^.*word-/, '').replace('.webp', ''), url]),
)
