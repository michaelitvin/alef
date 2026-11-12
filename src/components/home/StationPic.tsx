// A station's picture (spec: one duel, Part 4): the tower for the first duel, an orb with בָּ for the broom, the ghost,
// the cauldron, the ladder, the door, and א in print or in handwriting for the two drawing screens. Used by the home
// screen's path and by Book 2's station cover.
import type { ScreenId } from '../../duel2/logic/predict'
import tower from '../../assets/duel/sprites/tower.webp'
import orb from '../../duel2/assets/img/s-orb.webp'
import ghost from '../../duel2/assets/img/s-ghost.webp'
import cauldron from '../../duel2/assets/img/s-cauldron.webp'
import ladder from '../../duel2/assets/img/s-ladder.webp'
import door from '../../duel2/assets/img/s-door.webp'

const IMG: Partial<Record<ScreenId, string>> = { tower, ghosts: ghost, cauldron, ladder, doors: door }

/** `size`: the picture's box in px (the path's discs: 54) */
export function StationPic({ id, size = 54 }: { id: ScreenId; size?: number }) {
  if (id === 'broom') {
    return (
      <span className="home-orb" data-pic="orb" style={{ width: size, height: size }}>
        <img src={orb} alt="" draggable={false} />
        <span style={{ fontSize: Math.round(size * 0.48) }}>בָּ</span>
      </span>
    )
  }
  if (id === 'draw' || id === 'draw-hand') {
    return (
      <span className={`home-glyph${id === 'draw-hand' ? ' home-glyph-hand' : ''}`} data-pic={id === 'draw' ? 'glyph' : 'hand'}
        style={{ fontSize: Math.round(size * 0.67) }}>א</span>
    )
  }
  return <img src={IMG[id]} alt="" draggable={false} data-pic="img" style={{ maxWidth: size, maxHeight: size }} />
}
