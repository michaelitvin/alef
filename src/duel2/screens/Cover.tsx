// The start screen shows the game's world and its learning content (rule): the wizard on his broom and glowing syllable
// orbs drifting by, a big play button, a parent button that needs a 2 s hold, and a way home to alef.
import { useEffect, useRef, useState } from 'react'
import { IMAGES } from '../assets/images'
import { syllable } from '../logic/content'
import { Glyph, GlyphDefs } from '../components/Glyph'
import { PlayIcon } from '../components/icons'
import { CoinCount } from '../components/CoinCount'
import { InfoTap } from '../components/InfoTap'
import { coinsOf, useDuel2Store } from '../store'

const HOLD_MS = 2000
const RING_C = 2 * Math.PI * 25
const SAMPLE = [syllable('bet', 'kamatz').text, syllable('lamed', 'chirik').text, syllable('mem', 'shuruk').text]

export function Cover({ onPlay, onParent, loading = false }: { onPlay: () => void; onParent: () => void; loading?: boolean }) {
  const totalStars = useDuel2Store((s) => s.totalStars ?? 0)
  const crystals = useDuel2Store((s) => s.crystals ?? 0)
  const timer = useRef<number | undefined>(undefined)
  const started = useRef(0)
  const [state, setState] = useState<'idle' | 'holding' | 'hint'>('idle')
  const [frac, setFrac] = useState(0)
  const press = () => {
    window.clearTimeout(timer.current)
    started.current = Date.now()
    setState('holding')
    timer.current = window.setTimeout(() => { setState('idle'); onParent() }, HOLD_MS)
  }
  const release = () => {
    if (state !== 'holding') return
    window.clearTimeout(timer.current)
    setFrac(Math.min(1, (Date.now() - started.current) / HOLD_MS))
    setState('hint')
    timer.current = window.setTimeout(() => setState('idle'), 700)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <div className="d2-root d2-cover" data-screen="cover">
      <svg className="d2-stage" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <GlyphDefs />
        {IMAGES['bg-sky'] ? <image href={IMAGES['bg-sky']} width={1600} height={900} preserveAspectRatio="xMidYMid slice" /> : <rect width={1600} height={900} fill="#1b0f3c" />}
        {SAMPLE.map((t, i) => { const oy = [150, 330, 730][i]; return (
          <g key={t} className="d2-drift" style={{ animationDelay: `${-i * 4}s` }}>
            {IMAGES['s-orb'] ? <image href={IMAGES['s-orb']} x={-80} y={oy - 80} width={160} height={160} /> : <circle cx={0} cy={oy} r={80} fill="#2a1660" />}
            <Glyph text={t} px={92} x={0} y={oy} />
          </g>
        ) })}
        <g className="d2-bob">
          {IMAGES['s-wizbroom'] && <image href={IMAGES['s-wizbroom']} x={170} y={300} width={380} height={324} />}
        </g>
      </svg>
      {/* all his stars so far (he asked where to see his points); the way back to the alef menu is in the parent area */}
      <div className="d2-cover-stars">
        <InfoTap line="info-coins"><CoinCount n={coinsOf(totalStars)} size="big" /></InfoTap>
        {/* his crystals, by kind (the nth crystal won is kind n % 4, as the crystal screen shows it) */}
        {crystals > 0 && (
          <InfoTap line="info-crystals"><div data-crystal-shelf className="d2-crystal-shelf">
            {[1, 2, 3, 0].map((k) => {
              const count = Math.floor(crystals / 4) + (k !== 0 && k <= crystals % 4 ? 1 : 0)
              if (!count) return null
              return (
                <span key={k} data-crystal-kind={k} data-count={count} className="d2-shelf-crystal">
                  {IMAGES[`s-crystal-${k + 1}`] && <img src={IMAGES[`s-crystal-${k + 1}`]} alt="" draggable={false} />}
                  {count > 1 && <span data-num>{count}</span>}
                </span>
              )
            })}
          </div></InfoTap>
        )}
      </div>
      <button aria-label="play" className={`d2-play${loading ? ' loading' : ''}`} onClick={onPlay} data-loading={loading || undefined}>
        <PlayIcon />
        {loading && <svg className="d2-play-ring" viewBox="0 0 170 170" aria-hidden><circle cx="85" cy="85" r="80" /></svg>}
      </button>
      <button type="button" aria-label="parent settings (hold)" className={`d2-parent-btn d2-parent-${state}`}
        onPointerDown={press} onPointerUp={release} onPointerLeave={release} onPointerCancel={release} onContextMenu={(e) => e.preventDefault()}>
        <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden>
          <circle cx="28" cy="28" r="25" fill="none" stroke="#ffffff22" strokeWidth="4" />
          <circle cx="28" cy="28" r="25" fill="none" stroke="#ffd34d" strokeWidth="4" className="d2-parent-ring" data-state={state}
            strokeDasharray={RING_C} style={state === 'hint' ? { strokeDashoffset: RING_C * (1 - frac) } : undefined} transform="rotate(-90 28 28)" />
          <path d="M18 22h20M18 34h20M24 18v8M32 30v8" stroke="#d8c8ff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
