// While paused, an opaque cover hides the game (rule): the wizard and a big play button.
import { IMAGES } from '../assets/images'
import { PlayIcon } from '../components/icons'

export function PauseCover({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="d2-pause">
      {IMAGES['s-wizard-idle'] && <img src={IMAGES['s-wizard-idle']} alt="" className="d2-pause-wizard" draggable={false} />}
      <button aria-label="play" className="d2-play" onClick={onPlay}><PlayIcon /></button>
    </div>
  )
}
