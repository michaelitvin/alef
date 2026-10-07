// The monster: stands at the right edge until `walking`, then walks to the tower in round.walkMs.
// On a miss it lunges at the tower and bonks it.
import { motion } from 'framer-motion'
import type { Round } from '../../types/duel'
import { Clue } from './Clue'
import { Icon } from './Icon'
import { MonsterImg } from './Explosion'

/** Time left on the clock: a re-measure (rotation) re-targets the tween over this, not the full walk. */
export const remainingWalkMs = (walkMs: number, startedAt: number, now: number) => Math.max(0, walkMs - (now - startedAt))

/** A boss's own move while it walks: the dragon breathes fire toward the tower, the troll stomps up dust. */
function BossMove({ id }: { id: string }) {
  if (id === 'dragon')
    return (
      <motion.span
        className="nd-dragon-fire"
        initial={{ opacity: 0, x: 0, scale: 0.4 }}
        animate={{ opacity: [0, 1, 1, 0], x: [0, -40, -80, -110], scale: [0.4, 1.2, 1.5, 1.8] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.6 }}
      >
        <Icon name="flame" size={40} />
      </motion.span>
    )
  return (
    <span className="nd-troll-stomp" aria-hidden>
      <span className="nd-troll-cloud left" />
      <span className="nd-troll-cloud right" />
    </span>
  )
}

export function WalkingMonster({ round, walking, startX, endX, bossHp, onReplay, remainingMs }: {
  round: Round; walking: boolean; startX: number; endX: number; bossHp: number; onReplay: () => void; remainingMs: number
}) {
  const mute = round.type === 'B' && round.target.group === 'silent'
  const continuing = Boolean(round.startFrac) // a boss picking up where it stood: no pop-in
  // bosses stomp: heavier, slower, with a sway; others bob
  const gait = round.boss ? { y: [0, -12, 0, -2, 0], rotate: [-3, 0, 3, 0, -3] } : mute ? { scaleY: [1, 1.25, 1] } : { y: [0, -6, 0] }
  return (
    <motion.div
      key={round.id}
      className={`nd-monster${round.boss ? ` nd-boss nd-boss-${round.monster}` : ''}`}
      style={{ x: '-50%' }}
      initial={{ left: `${startX}%`, scale: continuing ? 1 : 0 }}
      animate={{ left: walking ? `${endX}%` : `${startX}%`, scale: 1 }}
      transition={{
        left: { duration: walking ? remainingMs / 1000 : 0, ease: 'linear' },
        scale: round.boss ? { duration: 0.7, type: 'spring', bounce: 0.55 } : { duration: 0.35, type: 'spring' },
      }}
    >
      <Clue round={round} onReplay={onReplay} />
      {round.boss && <span className="nd-boss-aura" aria-hidden />}
      <motion.span
        className="nd-monster-emoji"
        animate={gait}
        transition={{ repeat: Infinity, duration: round.boss ? 0.9 : mute ? 0.7 : 0.5 }}
      >
        <MonsterImg id={round.monster} />
      </motion.span>
      {round.boss && <span className="nd-boss-dust" aria-hidden />}
      {round.boss && walking && <BossMove id={round.monster} />}
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
