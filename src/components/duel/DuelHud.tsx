// Heads-up display, no words: hearts, wave progress bar, pause, score, MEGA meter, combo.
import { motion } from 'framer-motion'
import { Icon } from './Icon'

interface Props {
  hearts: number
  score: number
  combo: number
  mega: number
  megaMax: number
  kills: number
  killsPerWave: number
  onPause: () => void
}

export function DuelHud({ hearts, score, combo, mega, megaMax, kills, killsPerWave, onPause }: Props) {
  return (
    <>
      <div className="nd-hud">
        <div className="nd-hearts">
          {[0, 1, 2].map((i) => (
            <Icon key={i} name={i < hearts ? 'heart' : 'heartEmpty'} size={26} />
          ))}
        </div>
        {/* wave progress: one continuous bar (dots/stars/short bars would read as nikkud or picture words) */}
        <div className="nd-wave-bar" aria-label="wave progress">
          <div style={{ width: `${(kills / killsPerWave) * 100}%` }} />
        </div>
        <div className="nd-hud-left">
          <button className="nd-pause-btn" onClick={onPause} aria-label="pause">
            <Icon name="pause" size={22} />
          </button>
          <div className="nd-score">
            <Icon name="sparkle" size={20} /> {score.toLocaleString('en-US')}
          </div>
        </div>
      </div>
      <div className="nd-hud2">
        <div className="nd-mega-meter">
          <div className="nd-mega-fill" style={{ width: `${(mega / megaMax) * 100}%` }} />
        </div>
        {combo >= 2 && (
          <motion.div key={combo} className="nd-combo" initial={{ scale: 1.8 }} animate={{ scale: 1 }}>
            <Icon name="flame" size={22} /> ×{combo}
          </motion.div>
        )}
      </div>
    </>
  )
}
