// The start screen shows the game's world and its learning content (rule): the wizard on his broom and glowing syllable
// orbs drifting by, a big play button, a parent button behind the parent gate (a 2 s hold, then the year of birth), and the held house home to alef
// (a 2 s hold, top left, the same in every game: src/shared/HomeButton.tsx).
import { Glyph, GlyphDefs, latinOrbPx } from '../components/Glyph'
import { PlayIcon } from '../components/icons'
import { CoinCount } from '../components/CoinCount'
import { InfoTap } from '../components/InfoTap'
import { BossShelf } from '../components/BossShelf'
import { ParentGate } from '../../shared/parentGate/ParentGate'
import { SlidersGlyph } from '../components/holdGlyphs'
import { useCourse, useCourseSave, useWizardArt } from '../course/CourseContext'
import { HomeButton } from '../../shared/HomeButton'

export function Cover({ onPlay, onParent, onHome, loading = false }: { onPlay: () => void; onParent: () => void; onHome?: () => void; loading?: boolean }) {
  const wiz = useWizardArt()
  const course = useCourse()
  const images = course.images
  // the open course's purse, crystals and bosses (English has its own: never Spell Quest's)
  const coins = useCourseSave((s) => s.coins ?? 0)
  const crystals = useCourseSave((s) => s.crystals ?? 0)
  const beaten = useCourseSave((s) => s.bossesBeaten ?? [])
  return (
    <div {...(course.dir === 'ltr' ? { dir: 'ltr' } : {})} data-course={course.id} className="d2-root d2-cover" data-screen="cover" data-testid="cover">
      <svg className="d2-stage" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <GlyphDefs />
        {images['bg-sky'] ? <image href={images['bg-sky']} width={1600} height={900} preserveAspectRatio="xMidYMid slice" /> : <rect width={1600} height={900} fill="#1b0f3c" />}
        {course.coverSample.texts.map((t, i) => { const oy = [150, 330, 730][i]; return (
          <g key={t} className="d2-drift" style={{ animationDelay: `${-i * 4}s` }}>
            {images['s-orb'] ? <image href={images['s-orb']} x={-80} y={oy - 80} width={160} height={160} /> : <circle cx={0} cy={oy} r={80} fill="#2a1660" />}
            <Glyph text={t} px={course.coverSample.alphabet === 'latin' ? latinOrbPx(t, 160, 92) : 92} x={0} y={oy} alphabet={course.coverSample.alphabet} />
          </g>
        ) })}
        <g className="d2-bob">
          {wiz('s-wizbroom') && <image href={wiz('s-wizbroom')} x={170} y={300} width={380} height={324} />}
        </g>
      </svg>
      {onHome && <HomeButton className="d2-home-btn" onHome={onHome} />}
      {/* all his stars so far (he asked where to see his points), right of the house */}
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
                  {images[`s-crystal-${k + 1}`] && <img src={images[`s-crystal-${k + 1}`]} alt="" draggable={false} />}
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
      <ParentGate label="parent settings (hold)" className="d2-parent-btn" onOpen={onParent}><SlidersGlyph /></ParentGate>
    </div>
  )
}
