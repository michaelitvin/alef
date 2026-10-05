// The monster: stands at the right edge until `walking`, then walks to the tower in round.walkMs.
// On a miss it lunges at the tower and bonks it.
import { motion } from 'framer-motion'
import type { Round } from '../../types/duel'
import { Clue } from './Clue'
import { Icon } from './Icon'
import { MonsterImg } from './Explosion'

/** Time left on the clock: a re-measure (rotation) re-targets the tween over this, not the full walk. */
export const remainingWalkMs = (walkMs: number, startedAt: number, now: number) => Math.max(0, walkMs - (now - startedAt))

export function WalkingMonster({ round, walking, startX, endX, bossHp, onReplay, remainingMs }: {
  round: Round; walking: boolean; startX: number; endX: number; bossHp: number; onReplay: () => void; remainingMs: number
}) {
  const mute = round.type === 'B' && round.target.group === 'silent'
  return (
    <motion.div
      key={round.id}
      className={`nd-monster${round.boss ? ' nd-boss' : ''}`}
      style={{ x: '-50%' }}
      initial={{ left: `${startX}%`, scale: 0 }}
      animate={{ left: walking ? `${endX}%` : `${startX}%`, scale: 1 }}
      transition={{ left: { duration: walking ? remainingMs / 1000 : 0, ease: 'linear' }, scale: { duration: 0.35, type: 'spring' } }}
    >
      <Clue round={round} onReplay={onReplay} />
      <motion.span
        className="nd-monster-emoji"
        animate={mute ? { scaleY: [1, 1.25, 1] } : { y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: mute ? 0.7 : 0.5 }}
      >
        <MonsterImg id={round.monster} />
      </motion.span>
      {round.boss && (
        <div className="nd-boss-hp">
          {Array.from({ length: Math.max(bossHp, 0) }, (_, i) => (
            <Icon key={i} name="bossHeart" size={22} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function LungingMonster({ round, fromX, endX }: { round: Round; fromX: number; endX: number }) {
  return (
    <motion.div
      className={`nd-monster${round.boss ? ' nd-boss' : ''}`}
      style={{ x: '-50%' }}
      initial={{ left: `${fromX}%` }}
      animate={{ left: [`${fromX}%`, `${endX}%`, `${endX + 7}%`, `${endX}%`] }}
      transition={{ duration: 0.6, times: [0, 0.55, 0.8, 1] }}
    >
      <span className="nd-monster-emoji">
        <MonsterImg id={round.monster} />
      </span>
      <motion.span className="nd-bonk" initial={{ scale: 0 }} animate={{ scale: [0, 1.6, 1] }} transition={{ delay: 0.35 }}>
        <Icon name="bonk" size={34} />
      </motion.span>
    </motion.div>
  )
}
