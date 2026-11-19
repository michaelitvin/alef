// The home cards' vector play button (the approved mock): a gold (duel) or brass (clock) rim, a dark centre, and the
// triangle pointing LEFT (rule: with no motion, the play triangle follows the reading direction; Hebrew reads right to
// left). Decorative: the card around it is the link.
import { useId } from 'react'

const THEMES = {
  duel: {
    rim: ['#fff1a8', '#ffd34d', '#b8860b'], centre: ['#8a5cff', '#2a1260'], glow: '#ffd34d99',
    tri: 'M59 31 L29 50 L59 69 Z', triFill: '#fff6d8', triStroke: 6,
  },
  clock: {
    rim: ['#fff1c0', '#e0b26a', '#9a6a28'], centre: ['#b07a3e', '#4a2a10'], glow: '#ffcf7a99',
    tri: 'M60 30 L28 50 L60 70 Z', triFill: '#fff6e0', triStroke: 5,
  },
} as const

/** `dir`: where the triangle points: left for the Hebrew card and the clock (they read right to left), right for the English card */
export function PlayButton({ theme, size, dir = 'left' }: { theme: 'duel' | 'clock'; size?: string; dir?: 'left' | 'right' }) {
  const id = useId().replace(/:/g, '')
  const t = THEMES[theme]
  // pointing right: the triangle's x mirrored in the 100-wide box (the tip on the right, the base on the left)
  const tri = dir === 'right' ? t.tri.replace(/([ML])(\d+) (\d+)/g, (_m, c, x, y) => `${c}${100 - Number(x)} ${y}`) : t.tri
  return (
    <svg viewBox="0 0 100 100" className="home-play" data-play={theme} aria-label="play" role="img"
      style={{ width: size ?? 'var(--home-play-w, clamp(52px, 15vw, 84px))', filter: `drop-shadow(0 0 10px ${t.glow})` }}>
      <defs>
        <radialGradient id={`${id}c`} cx="40%" cy="35%" r="70%"><stop offset="0" stopColor={t.centre[0]} /><stop offset="1" stopColor={t.centre[1]} /></radialGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.rim[0]} /><stop offset=".5" stopColor={t.rim[1]} /><stop offset="1" stopColor={t.rim[2]} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}r)`} />
      <circle cx="50" cy="50" r="38" fill={`url(#${id}c)`} />
      <path data-tri d={tri} fill={t.triFill} stroke={t.triFill} strokeWidth={t.triStroke} strokeLinejoin="round" />
      {theme === 'duel'
        ? <path d="M78 36 A30 30 0 0 0 56 20" transform={dir === 'right' ? 'matrix(-1 0 0 1 100 0)' : undefined} stroke="#ffffff88" strokeWidth="4" fill="none" strokeLinecap="round" />
        : <ellipse cx="62" cy="28" rx="16" ry="7" fill="#ffffff40" transform="rotate(25 62 28)" />}
    </svg>
  )
}
