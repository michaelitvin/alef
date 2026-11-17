// The icons of Book 2's held buttons (src/shared/HoldButton.tsx), drawn in the ring's 56-unit box.

/** the parent button's sliders */
export const SlidersGlyph = () => <path d="M18 22h20M18 34h20M24 18v8M32 30v8" stroke="#d8c8ff" strokeWidth="3" strokeLinecap="round" />

/** the way home: a little house (cream walls, a gold roof, a dark door), in the ring's box */
export const HouseGlyph = () => (
  <g data-icon="home">
    <path d="M17 27v11.5a1.5 1.5 0 0 0 1.5 1.5h19a1.5 1.5 0 0 0 1.5-1.5V27" fill="#fff6d8" />
    <path d="M13.5 28.5L28 16.5l14.5 12" fill="none" stroke="#ffd34d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24.5 40v-7a3.5 3.5 0 0 1 7 0v7z" fill="#3a1d78" />
  </g>
)
