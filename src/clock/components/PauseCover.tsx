// Opaque cover while paused (rule): the workshop picture (plain brown until it exists) and a big play button.
import { PlayIcon } from './icons'
import { IMAGES } from '../assets/images'
export function PauseCover({ onResume }: { onResume: () => void }) {
  return (
    <div className="ck-pause" style={IMAGES.workshop ? { backgroundImage: `url(${IMAGES.workshop})` } : undefined}>
      <button aria-label="play" className="ck-play" onClick={onResume}>
        <PlayIcon size={140} />
      </button>
    </div>
  )
}
