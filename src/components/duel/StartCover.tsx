// Start screen: the wizard and a big ▶. The music toggle is an icon; the parent button (to the stats) is the
// only text, and it is for the parent.
import { motion } from 'framer-motion'
import { WIZARD } from '../../assets/duel/sprites'
import { Icon } from './Icon'

export function StartCover({ onPlay, musicOn, onToggleMusic, onParent, onHome }: {
  onPlay: () => void; musicOn: boolean; onToggleMusic: () => void; onParent: () => void; onHome: () => void
}) {
  return (
    <div className="nd-overlay">
      <button className="nd-home-btn" onClick={onHome} aria-label="home">
        <Icon name="home" size={30} />
      </button>
      <motion.img className="nd-title-wizard" src={WIZARD.cast} alt="" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} />
      <button className="nd-big-btn nd-play-btn" onClick={onPlay} aria-label="play">
        <Icon name="play" size={56} />
      </button>
      <button className="nd-parent-btn" onClick={onToggleMusic} aria-label="music">
        <Icon name={musicOn ? 'music' : 'musicOff'} size={26} />
      </button>
      <button className="nd-parent-btn" onClick={onParent} aria-label="parents">
        <Icon name="chart" size={20} /> לַהוֹרִים
      </button>
    </div>
  )
}
