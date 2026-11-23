// The still screens' icons, drawn as SVG paths (no emoji): the star of the points, the cup of his best, the parent
// button's sliders. The same shapes as the canvas's top bar and the approved mock.

const starPoints = (r: number) =>
  Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r; return `${(Math.cos(a) * q).toFixed(2)},${(Math.sin(a) * q).toFixed(2)}` }).join(' ')

export const Star = ({ size }: { size: number }) => (
  <svg viewBox="-32 -32 64 64" width={size} height={size} aria-hidden data-icon="star">
    <polygon points={starPoints(30)} fill="#ffd84a" stroke="#fff3b0" strokeWidth="2" />
  </svg>
)

export const Cup = ({ size, glow }: { size: number; glow?: boolean }) => (
  <svg viewBox="-32 -32 64 64" width={size} height={size} aria-hidden data-icon="best" className={glow ? 'sc-glow' : undefined}>
    <g fill="#ffc93c" stroke="#fff1b0" strokeWidth="2.5">
      <path d="M-18 -26 L18 -26 L16 -4 Q12 10 0 12 Q-12 10 -16 -4 Z" />
    </g>
    <path d="M-18 -21 A9 9 0 0 0 -18 -3 M18 -21 A9 9 0 0 1 18 -3" fill="none" stroke="#ffc93c" strokeWidth="5" />
    <rect x="-4" y="11" width="8" height="9" fill="#ffc93c" />
    <rect x="-14" y="19" width="28" height="8" rx="3" fill="#ffc93c" />
  </svg>
)

/** the parent button's sliders, in the held button's 56-unit box */
export const SlidersGlyph = () => (
  <g data-icon="parent" stroke="#d8c8ff" strokeWidth="3" strokeLinecap="round" fill="none">
    <path d="M18 22h20M18 34h20M24 18v8M32 30v8" />
  </g>
)
