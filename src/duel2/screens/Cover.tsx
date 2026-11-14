// The start screen shows the game's world and its learning content (rule): the wizard on his broom and glowing syllable
// orbs drifting by, a big play button, a parent button that needs a 2 s hold, and a way home to alef.
import { IMAGES, useWizardArt } from '../assets/images'
import { syllable } from '../logic/content'
import { Glyph, GlyphDefs } from '../components/Glyph'
import { PlayIcon } from '../components/icons'
import { CoinCount } from '../components/CoinCount'
import { InfoTap } from '../components/InfoTap'
import { BossShelf } from '../components/BossShelf'
import { HoldButton, SlidersGlyph } from '../components/HoldButton'
import { useDuel2Store } from '../store'

const SAMPLE = [syllable('bet', 'kamatz').text, syllable('lamed', 'chirik').text, syllable('mem', 'shuruk').text]

export function Cover({ onPlay, onParent, loading = false }: { onPlay: () => void; onParent: () => void; loading?: boolean }) {
  const wiz = useWizardArt()
  const coins = useDuel2Store((s) => s.coins ?? 0)
  const crystals = useDuel2Store((s) => s.crystals ?? 0)
  const beaten = useDuel2Store((s) => s.bossesBeaten ?? [])
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
          {wiz('s-wizbroom') && <image href={wiz('s-wizbroom')} x={170} y={300} width={380} height={324} />}
        </g>
      </svg>
      {/* all his stars so far (he asked where to see his points); the way back to the alef menu is in the parent area */}
      <div className="d2-cover-stars">
        <InfoTap line="info-coins"><CoinCount n={coins} size="big" /></InfoTap>
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
      {/* the flight bosses: beaten ones in golden frames, the others dark (they still wait for him) */}
      <div className="d2-cover-trophies"><BossShelf beaten={beaten} /></div>
      <button aria-label="play" className={`d2-play${loading ? ' loading' : ''}`} onClick={onPlay} data-loading={loading || undefined}>
        <PlayIcon />
        {loading && <svg className="d2-play-ring" viewBox="0 0 170 170" aria-hidden><circle cx="85" cy="85" r="80" /></svg>}
      </button>
      <HoldButton label="parent settings (hold)" className="d2-parent-btn" onHold={onParent}><SlidersGlyph /></HoldButton>
    </div>
  )
}
