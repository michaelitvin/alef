// The way home from a game to alef's home screen (the hub of all the games), the same in every game: a house in the
// held button (src/shared/HoldButton.tsx: a 2 s hold, a tap only shows the hint), in the top-left corner of the game's
// child screens (rule: docs/minigame-rules/interaction-controls.md). Each game places it with its own class.
import { HoldButton } from './HoldButton'

/** the house: cream walls, a gold roof, a dark door, in the ring's 56-unit box */
export const HouseGlyph = () => (
  <g data-icon="home">
    <path d="M17 27v11.5a1.5 1.5 0 0 0 1.5 1.5h19a1.5 1.5 0 0 0 1.5-1.5V27" fill="#fff6d8" />
    <path d="M13.5 28.5L28 16.5l14.5 12" fill="none" stroke="#ffd34d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24.5 40v-7a3.5 3.5 0 0 1 7 0v7z" fill="#3a1d78" />
  </g>
)

/** the held house: `onHome` runs after a 2 s hold; `className` places it on the game's screen */
export function HomeButton({ onHome, className = '' }: { onHome: () => void; className?: string }) {
  return <HoldButton label="home (hold)" className={`home-btn ${className}`.trim()} onHold={onHome}><HouseGlyph /></HoldButton>
}
