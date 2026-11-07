// Duel sprites: Gemini renders in the approved "night sky magic" style (sheet B), magenta keyed out by
// <scratch>/nikkud-duel/art/export_final.py. Monsters walk right → left: `faces` records the drawing's
// direction and right-facing ones are mirrored (motion cues count — the ghost's trailing tail).
import wizardIdle from './sprites/wizard-idle.webp'
import wizardCast from './sprites/wizard-cast.webp'
import wizardDizzy from './sprites/wizard-dizzy.webp'
import wizardIdleGirl from './sprites/wizard-idle-girl.webp'
import wizardCastGirl from './sprites/wizard-cast-girl.webp'
import wizardDizzyGirl from './sprites/wizard-dizzy-girl.webp'
import { useGender } from '../../shared/player'
import tower from './sprites/tower.webp'
import fuzzy from './sprites/mon-fuzzy.webp'
import blob from './sprites/mon-blob.webp'
import imp from './sprites/mon-imp.webp'
import ghost from './sprites/mon-ghost.webp'
import bat from './sprites/mon-bat.webp'
import mushroom from './sprites/mon-mushroom.webp'
import golem from './sprites/mon-golem.webp'
import octopus from './sprites/mon-octopus.webp'
import dragon from './sprites/boss-dragon.webp'
import troll from './sprites/boss-troll.webp'

export const WIZARD = { idle: wizardIdle, cast: wizardCast, dizzy: wizardDizzy }
/** The girl wizard: the same poses, framing and size as the boy's (spec 2026-11-07 girls). */
export const WIZARD_GIRL = { idle: wizardIdleGirl, cast: wizardCastGirl, dizzy: wizardDizzyGirl }
/** The player's wizard: the girl wizard when a girl plays. */
export const useWizard = () => (useGender() === 'girl' ? WIZARD_GIRL : WIZARD)
export const TOWER = tower

export type Faces = 'left' | 'right' | 'front'

export const MONSTERS: Record<string, { src: string; faces: Faces }> = {
  fuzzy: { src: fuzzy, faces: 'right' },
  blob: { src: blob, faces: 'right' }, // review: walked backwards — the eye looks right as drawn
  imp: { src: imp, faces: 'right' }, // playtest: walked backwards — stride and gaze point right as drawn
  ghost: { src: ghost, faces: 'right' },
  bat: { src: bat, faces: 'left' },
  mushroom: { src: mushroom, faces: 'front' },
  golem: { src: golem, faces: 'front' },
  octopus: { src: octopus, faces: 'front' },
  dragon: { src: dragon, faces: 'left' },
  troll: { src: troll, faces: 'left' },
}

const wordFiles = import.meta.glob('./sprites/word-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

/** Picture-word images keyed by PictureWord.key. */
export const WORD_PICTURE: Record<string, string> = Object.fromEntries(
  Object.entries(wordFiles).map(([p, url]) => [p.replace(/^.*word-/, '').replace('.webp', ''), url]),
)

/** Start loading every sprite and picture word (called on the start screen) so nothing appears blank. */
export function preloadDuelImages(): string[] {
  const srcs = [...Object.values(WIZARD), ...Object.values(WIZARD_GIRL), TOWER, ...Object.values(MONSTERS).map((m) => m.src), ...Object.values(WORD_PICTURE)]
  for (const src of srcs) new Image().src = src
  return srcs
}
