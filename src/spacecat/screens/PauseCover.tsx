// While paused, an opaque cover hides the game (rule): the space background and the play triangle, the held house in the
// top-left corner where it is during flight. usePauseHold keeps the audio silent until the triangle is pressed.
import { HomeButton } from '../../shared/HomeButton'
import { usePauseHold } from '../../shared/shell/usePauseHold'
import { unlockAudioOutput } from '../../shared/gameAudio/output'
import { IMAGES } from '../assets/images'
import { PlayTriangle } from './PlayTriangle'

export function PauseCover({ onPlay, onHome }: { onPlay: () => void; onHome: () => void }) {
  usePauseHold(true)
  return (
    <div className="sc-pause" data-screen-part="pause" style={{ backgroundImage: `url(${IMAGES.bg})` }}>
      <HomeButton onHome={onHome} className="sc-home" />
      <PlayTriangle className="sc-play-center" onPress={() => { unlockAudioOutput(); onPlay() }} />
    </div>
  )
}
