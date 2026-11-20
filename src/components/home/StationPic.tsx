// A station's picture (spec: one duel, Part 4): the tower for the first duel, an orb with בָּ for the broom, the ghost,
// the cauldron, the ladder, the door, an open book for the spell book, and א in print or in handwriting for the two
// drawing screens. Used by the home screen's path and by Book 2's station cover.
import type { ScreenId } from '../../duel2/logic/predict'
import tower from '../../assets/duel/sprites/tower.webp'
import orb from '../../duel2/assets/img/s-orb.webp'
import ghost from '../../duel2/assets/img/s-ghost.webp'
import cauldron from '../../duel2/assets/img/s-cauldron.webp'
import ladder from '../../duel2/assets/img/s-ladder.webp'
import door from '../../duel2/assets/img/s-door.webp'

/** pictures whose art faces right */
const FACES_RIGHT = new Set<ScreenId>(['ghosts'])

const IMG: Partial<Record<ScreenId, string>> = { tower, ghosts: ghost, cauldron, ladder, doors: door }

/** `size`: the picture's box in px; without it, the path's discs' (--home-pic: 54 px, bigger on a tablet: home.css) */
export function StationPic({ id, size }: { id: ScreenId; size?: number }) {
  const box = size === undefined ? 'var(--home-pic, 54px)' : `${size}px`
  const part = (k: number) => (size === undefined ? `calc(var(--home-pic, 54px) * ${k})` : `${Math.round(size * k)}px`)
  if (id === 'broom') {
    return (
      <span className="home-orb" data-pic="orb" style={{ width: box, height: box }}>
        <img src={orb} alt="" draggable={false} />
        <span style={{ fontSize: part(0.48) }}>בָּ</span>
      </span>
    )
  }
  if (id === 'draw' || id === 'draw-hand') {
    return (
      <span className={`home-glyph${id === 'draw-hand' ? ' home-glyph-hand' : ''}`} data-pic={id === 'draw' ? 'glyph' : 'hand'}
        style={{ fontSize: part(0.67) }}>א</span>
    )
  }
  if (id === 'spell') {
    // the spell book has no art yet (s-book): an open book, drawn as on its screen
    return (
      <svg data-pic="book" viewBox="0 0 120 80" style={{ width: box, height: box }} aria-hidden>
        <rect x="4" y="10" width="112" height="62" rx="8" fill="#5a2d82" stroke="#2a1145" strokeWidth="3" />
        <rect x="10" y="14" width="50" height="52" rx="5" fill="#f6ead0" stroke="#c9b48a" strokeWidth="2" />
        <rect x="60" y="14" width="50" height="52" rx="5" fill="#f6ead0" stroke="#c9b48a" strokeWidth="2" />
        <line x1="60" y1="16" x2="60" y2="64" stroke="#a8905f" strokeWidth="2.5" />
      </svg>
    )
  }
  // the ghost's art faces right: mirrored, it faces the way the path goes (right to left; rule: sprites face their travel)
  return <img src={IMG[id]} alt="" draggable={false} data-pic="img" style={{ maxWidth: box, maxHeight: box, ...(FACES_RIGHT.has(id) ? { transform: 'scaleX(-1)' } : {}) }} />
}
