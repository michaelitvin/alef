// The cover of a session from the home screen's path (spec: one duel, Part 3): one tap target, the cover's big play
// button, with the station's picture beside it instead of the usual cover art. Browsers allow sound only after a tap,
// so the session never starts without one. No text (rule).
import { IMAGES } from '../assets/images'
import { PlayIcon } from '../components/icons'
import { StationPic } from '../../components/home/StationPic'
import type { ScreenId } from '../logic/predict'

export function StationCover({ station, onPlay, loading = false }: { station: ScreenId; onPlay: () => void; loading?: boolean }) {
  return (
    <div className="d2-root d2-cover d2-station" data-screen="station" data-station={station}>
      <svg className="d2-stage" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {IMAGES['bg-sky'] ? <image href={IMAGES['bg-sky']} width={1600} height={900} preserveAspectRatio="xMidYMid slice" /> : <rect width={1600} height={900} fill="#1b0f3c" />}
      </svg>
      <div className="d2-station-row">
        <span className="d2-station-disc" aria-hidden><StationPic id={station} size={150} /></span>
        <button aria-label="play" data-station-play className={`d2-play d2-play-big${loading ? ' loading' : ''}`} data-loading={loading || undefined}
          onPointerDown={(e) => { e.preventDefault(); onPlay() }}>
          <PlayIcon />
          {loading && <svg className="d2-play-ring" viewBox="0 0 170 170" aria-hidden><circle cx="85" cy="85" r="80" /></svg>}
        </button>
      </div>
    </div>
  )
}
