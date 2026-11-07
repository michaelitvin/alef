// While paused, an opaque cover hides the game (rule): the wizard and a big play button.
import { useWizardArt } from '../assets/images'
import { PlayIcon } from '../components/icons'

export function PauseCover({ onPlay }: { onPlay: () => void }) {
  const wiz = useWizardArt()
  return (
    <div className="d2-pause">
      {wiz('s-wizard-idle') && <img src={wiz('s-wizard-idle')} alt="" className="d2-pause-wizard" draggable={false} />}
      <button aria-label="play" className="d2-play" onClick={onPlay}><PlayIcon /></button>
    </div>
  )
}
