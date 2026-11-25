// The home cards' vector play button (the approved mock): a gold (Spell Quest), brass (clock) or silver-blue (Space Cat) rim, a dark centre, and the
// triangle pointing RIGHT on every card (rule: the play triangle is a symbol, not a direction; the parent 2026-11-25: a
// left-pointing one felt unnatural). Decorative: the card around it is the link.
import { useId } from 'react'

const THEMES = {
  spellquest: {
    rim: ['#fff1a8', '#ffd34d', '#b8860b'], centre: ['#8a5cff', '#2a1260'], glow: '#ffd34d99',
    tri: 'M41 31 L71 50 L41 69 Z', triFill: '#fff6d8', triStroke: 6,
  },
  clock: {
    rim: ['#fff1c0', '#e0b26a', '#9a6a28'], centre: ['#b07a3e', '#4a2a10'], glow: '#ffcf7a99',
    tri: 'M40 30 L72 50 L40 70 Z', triFill: '#fff6e0', triStroke: 5,
  },
  spacecat: {
    rim: ['#e8f4ff', '#7fb2ff', '#2b4f9a'], centre: ['#2b4f9a', '#0a1440'], glow: '#7fb2ff99',
    tri: 'M40 30 L72 50 L40 70 Z', triFill: '#eef6ff', triStroke: 5,
  },
} as const

export function PlayButton({ theme, size }: { theme: 'spellquest' | 'clock' | 'spacecat'; size?: string }) {
  const id = useId().replace(/:/g, '')
  const t = THEMES[theme]
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
      <path data-tri d={t.tri} fill={t.triFill} stroke={t.triFill} strokeWidth={t.triStroke} strokeLinejoin="round" />
      {theme === 'spellquest'
        ? <path d="M22 36 A30 30 0 0 1 44 20" stroke="#ffffff88" strokeWidth="4" fill="none" strokeLinecap="round" />
        : <ellipse cx="62" cy="28" rx="16" ry="7" fill="#ffffff40" transform="rotate(25 62 28)" />}
    </svg>
  )
}
