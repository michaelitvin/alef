// While paused, an opaque cover hides the game (rule): the wizard and a big play button; in a full run also the home button
// (a 2 s hold) in the top bar's corner, where it is during the game.
import { useWizardArt } from '../assets/images'
import { PlayIcon } from '../components/icons'
import { HomeButton } from '../components/TopBar'

export function PauseCover({ onPlay, onHome }: { onPlay: () => void; onHome?: () => void }) {
  const wiz = useWizardArt()
  return (
    <div className="d2-pause">
      {wiz('s-wizard-idle') && <img src={wiz('s-wizard-idle')} alt="" className="d2-pause-wizard" draggable={false} />}
      <button aria-label="play" className="d2-play" onClick={onPlay}><PlayIcon /></button>
      {onHome && <HomeButton onHome={onHome} />}
    </div>
  )
}
