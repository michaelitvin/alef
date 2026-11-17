// The play triangle of every Space Cat screen: the home card's silver-blue button, larger, glowing; the triangle points
// left (spec: the ship moves up, so the triangle follows the reading direction). It acts on pointer-down, so the
// cover's play unlocks the audio inside the tap. `loading`: a turning ring while play waits for the preload.
export const TRIANGLE_PATH = 'M58 30 L24 50 L58 70 Z'

export function PlayTriangle({ onPress, loading, className = '' }: { onPress: () => void; loading?: boolean; className?: string }) {
  return (
    <button type="button" aria-label="play" className={`sc-play ${className}`.trim()} data-loading={loading || undefined}
      onPointerDown={(e) => { e.stopPropagation(); onPress() }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPress() }}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id="sc-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e8f4ff" /><stop offset="0.5" stopColor="#7fb2ff" /><stop offset="1" stopColor="#2b4f9a" />
          </linearGradient>
          <radialGradient id="sc-core" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#2b4f9a" /><stop offset="1" stopColor="#0a1440" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#sc-rim)" />
        <circle cx="50" cy="50" r="40" fill="url(#sc-core)" />
        <path d={TRIANGLE_PATH} fill="#eef6ff" stroke="#eef6ff" strokeWidth="5" strokeLinejoin="round" data-triangle />
        {loading && <circle cx="50" cy="50" r="44" fill="none" stroke="#eef6ff" strokeWidth="4" strokeDasharray="60 220" className="sc-play-spin" />}
      </svg>
    </button>
  )
}
