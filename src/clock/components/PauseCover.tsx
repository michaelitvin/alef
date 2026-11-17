// Opaque cover while paused (rule): the workshop picture (plain brown until it exists), a big play button, and the held
// house in the top-left corner (the way home, as on Book 2's pause cover).
import { PlayIcon } from './icons'
import { IMAGES } from '../assets/images'
import { HomeButton } from '../../shared/HomeButton'
export function PauseCover({ onResume, onHome }: { onResume: () => void; onHome?: () => void }) {
  return (
    <div className="ck-pause" style={IMAGES.workshop ? { backgroundImage: `url(${IMAGES.workshop})` } : undefined}>
      <button aria-label="play" className="ck-play" onClick={onResume}>
        <PlayIcon size={140} />
      </button>
      {onHome && <HomeButton className="ck-home" onHome={onHome} />}
    </div>
  )
}
