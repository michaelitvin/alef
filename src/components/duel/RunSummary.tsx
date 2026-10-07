// End of run: the tower tips over with the dazed wizard; stats as icons + numbers; the most-missed marks are
// buttons that speak name → sound → word; ↻ plays again. No words.
import { motion } from 'framer-motion'
import type { DuelMark } from '../../types/duel'
import { TOWER, WIZARD } from '../../assets/duel/sprites'
import { Icon } from './Icon'
import { RuneGlyph } from './RuneGlyph'

export function RunSummary({ wave, score, bestCombo, best, newBest, missed, onSay, onReplay, onHome }: {
  wave: number; score: number; bestCombo: number; best: number; newBest: boolean; missed: DuelMark[]
  onSay: (m: DuelMark) => void; onReplay: () => void; onHome: () => void
}) {
  return (
    <div className="nd-overlay">
      <button className="nd-home-btn" onClick={onHome} aria-label="home">
        <Icon name="home" size={30} />
      </button>
      <div className="nd-over-scene">
        <motion.img className="nd-over-tower" src={TOWER} alt="" initial={{ rotate: 0 }} animate={{ rotate: -14, y: 10 }} transition={{ type: 'spring', stiffness: 60 }} />
        <img className="nd-over-wizard" src={WIZARD.dizzy} alt="" />
      </div>
      <div className="nd-stats" dir="ltr">
        <div><Icon name="swords" size={30} /> {wave}</div>
        <div><Icon name="sparkle" size={30} /> {score.toLocaleString('en-US')}</div>
        <div><Icon name="flame" size={30} /> ×{bestCombo}</div>
        {/* a new record glows; the sparkle icon only ever means "score" */}
        <div className={newBest ? 'nd-new-best' : ''}><Icon name="trophy" size={30} /> {(newBest ? score : best).toLocaleString('en-US')}</div>
      </div>
      {missed.length > 0 && (
        <div className="nd-practice-row">
          {missed.map((m) => (
            <button key={m.id} className="nd-practice-item" onClick={() => onSay(m)} aria-label="hear again">
              <RuneGlyph mark={m} size={56} />
              <Icon name="speaker" size={24} />
            </button>
          ))}
        </div>
      )}
      <button className="nd-big-btn nd-play-btn" onClick={onReplay} aria-label="play again">
        <Icon name="replay" size={56} />
      </button>
    </div>
  )
}
