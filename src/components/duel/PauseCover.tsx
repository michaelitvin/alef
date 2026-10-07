// Pause: an opaque cover hides the whole game — just the wizard and ▶.
import { motion } from 'framer-motion'
import { WIZARD } from '../../assets/duel/sprites'
import { Icon } from './Icon'

export function PauseCover({ onResume, onHome }: { onResume: () => void; onHome: () => void }) {
  return (
    <div className="nd-overlay nd-pause-cover">
      <button className="nd-home-btn" onClick={onHome} aria-label="home">
        <Icon name="home" size={30} />
      </button>
      <motion.img className="nd-title-wizard" src={WIZARD.idle} alt="" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} />
      <button className="nd-big-btn nd-play-btn" onClick={onResume} aria-label="resume">
        <Icon name="play" size={56} />
      </button>
    </div>
  )
}
