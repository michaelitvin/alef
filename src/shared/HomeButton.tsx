// The way home from a game to alef's home screen (the hub of all the games), the same in every game: a house in a
// plain button (a tap leaves at once, no hold), in the top-left corner of the game's cover, pause and end screens; on the
// play screen the same corner holds the pause button (PauseButton) (rule: docs/minigame-rules/interaction-controls.md).
// Each game places them with its own class.
import './holdButton.css'

/** the house: cream walls, a gold roof, a dark door, in the ring's 56-unit box */
export const HouseGlyph = () => (
  <g data-icon="home">
    <path d="M17 27v11.5a1.5 1.5 0 0 0 1.5 1.5h19a1.5 1.5 0 0 0 1.5-1.5V27" fill="#fff6d8" />
    <path d="M13.5 28.5L28 16.5l14.5 12" fill="none" stroke="#ffd34d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24.5 40v-7a3.5 3.5 0 0 1 7 0v7z" fill="#3a1d78" />
  </g>
)

/** the house: `onHome` runs on a tap; `className` places it on the game's screen */
export function HomeButton({ onHome, className = '' }: { onHome: () => void; className?: string }) {
  return (
    <button type="button" aria-label="home" className={`home-btn ${className}`.trim()} onClick={onHome}>
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true"><HouseGlyph /></svg>
    </button>
  )
}

/** the pause: two cream bars, in the ring's 56-unit box */
export const PauseGlyph = () => (
  <g data-icon="pause" fill="#fff6d8">
    <rect x="18" y="16" width="7" height="24" rx="2.5" />
    <rect x="31" y="16" width="7" height="24" rx="2.5" />
  </g>
)

/** the pause (a plain tap), in the same corner and size as the house, on a game's play screen: it shows the pause cover
 *  (the cover has the house and the play button). `className` places it on the game's screen */
export function PauseButton({ onPause, className = '' }: { onPause: () => void; className?: string }) {
  return (
    <button type="button" aria-label="pause" className={`home-btn pause-btn ${className}`.trim()} onClick={onPause}>
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true"><PauseGlyph /></svg>
    </button>
  )
}
