// The path of the duel's minigames on the home screen (spec: one duel, Part 4): the stations in path order, each with
// what it teaches (for the parent: never the minigame's name) and how its picture is drawn.
import type { ScreenId } from '../../duel2/logic/predict'

export interface Station {
  id: ScreenId
  /** what is learned there (the caption, for the parent) */
  learn: string
  /** img: a picture; orb: an orb with בָּ; glyph: א in print; hand: א in handwriting */
  pic: 'img' | 'orb' | 'glyph' | 'hand'
}

export const STATIONS: Station[] = [
  { id: 'tower', learn: 'ניקוד לפי צליל', pic: 'img' },
  { id: 'broom', learn: 'אותיות והברות לפי צליל', pic: 'orb' },
  { id: 'ghosts', learn: 'אותיות דומות', pic: 'img' },
  { id: 'cauldron', learn: 'בניית הברה', pic: 'img' },
  { id: 'ladder', learn: 'משפחות הברות, דגש', pic: 'img' },
  { id: 'doors', learn: 'קריאת מילים', pic: 'img' },
  { id: 'draw', learn: 'אותיות דפוס', pic: 'glyph' },
  { id: 'draw-hand', learn: 'אותיות כתב יד', pic: 'hand' },
]
