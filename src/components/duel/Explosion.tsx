// Hit effects: a projectile (or MEGA lightning), flash, shockwave ring, a burst of particles, the monster's exit, +points.
// Intensity comes from a preset (rules.pickEffect); the look — projectile, burst, exit, colours — from an FxStyle dealt
// per hit (fxStyle.ts), so no two hits in a row look alike.
import { useMemo } from 'react'
import { motion, type TargetAndTransition } from 'framer-motion'
import type { EffectPreset, Outcome, Round } from '../../types/duel'
import { MONSTERS } from '../../assets/duel/sprites'
import { Icon } from './Icon'
import { DEFAULT_FX, PALETTES, type Exit, type FxStyle } from '../../utils/duel/fxStyle'

export interface Juice {
  particles: number
  shake: number
  flash: number
  hitstopMs: number
  boom: number
}

export const EFFECT_PRESETS: Record<EffectPreset, Juice> = {
  gentle: { particles: 10, shake: 4, flash: 1.6, hitstopMs: 0, boom: 0.6 },
  boom: { particles: 24, shake: 12, flash: 2.8, hitstopMs: 0, boom: 1 },
  mega: { particles: 48, shake: 24, flash: 4.2, hitstopMs: 140, boom: 1.5 },
}

export interface Geo {
  start: number
  end: number
  wizLeft: number
  wizBottom: number
}

/** How the defeated monster leaves. */
const EXIT_ANIM: Record<Exit, { animate: TargetAndTransition; duration: number }> = {
  fly: { animate: { y: -140, x: 60, rotate: 540, opacity: 0, scale: 0.3 }, duration: 0.8 },
  spin: { animate: { rotate: 900, scale: 0, opacity: 0 }, duration: 0.8 },
  pop: { animate: { scale: [1, 1.5, 0], opacity: [1, 1, 0] }, duration: 0.45 },
  launch: { animate: { y: -460, rotate: 30, opacity: [1, 1, 0] }, duration: 0.9 },
  poof: { animate: { scale: 1.8, opacity: 0, filter: 'blur(8px)' }, duration: 0.7 },
}

export function MonsterImg({ id }: { id: string }) {
  const m = MONSTERS[id]
  return <img className="nd-sprite" src={m.src} style={m.faces === 'right' ? { transform: 'scaleX(-1)' } : undefined} alt="" draggable={false} />
}

export function Explosion({ round, outcome, x, geo, fx = DEFAULT_FX }: { round: Round; outcome: Outcome; x: number; geo: Geo; fx?: FxStyle }) {
  const colours = PALETTES[fx.palette]
  const juice = EFFECT_PRESETS[outcome.effect]
  const delay = 0.26 + juice.hitstopMs / 1000
  const big = outcome.final
  const scale = (big ? 1 : 0.45) * (outcome.mega ? 1.4 : 1)
  const parts = useMemo(() => {
    const n = Math.round(juice.particles * scale)
    return Array.from({ length: n }, (_, i) => {
      const a = Math.random() * Math.PI * 2
      const d = (70 + Math.random() * 160) * scale
      return {
        i,
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d - 40 * scale,
        rot: Math.random() * 720 - 360,
        sparkle: Math.random() < 0.35,
        color: colours[i % colours.length],
        size: 6 + Math.random() * 10,
      }
    })
  }, [juice.particles, scale, colours])

  return (
    <>
      {outcome.mega ? (
        <motion.svg className="nd-lightning" style={{ left: `${x}%` }} viewBox="0 0 60 300" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.3, 1, 0] }} transition={{ duration: 0.6 }}>
          <polyline points="30,0 18,70 40,110 14,180 38,215 26,300" fill="none" stroke="#fff" strokeWidth="6" />
          <polyline points="30,0 18,70 40,110 14,180 38,215 26,300" fill="none" stroke="#b48cff" strokeWidth="14" opacity="0.5" />
        </motion.svg>
      ) : (
        <motion.div
          className={`nd-proj nd-proj-${fx.projectile}${fx.projectile === 'fireball' ? ' nd-fireball' : ''}`}
          initial={{ left: `${geo.wizLeft}%`, bottom: `${geo.wizBottom}%`, scale: 0.5, opacity: 1 }}
          animate={{ left: `${x}%`, bottom: '20%', scale: 1.2, opacity: [1, 1, 0] }}
          transition={{ duration: 0.26, ease: 'easeIn', opacity: { times: [0, 0.9, 1], duration: 0.3 } }}
        >
          {fx.projectile === 'star' && <Icon name="sparkle" size={34} />}
        </motion.div>
      )}
      {outcome.mega && <motion.div className="nd-whiteout" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
      <div className="nd-blast" style={{ left: `${x}%` }} data-burst={fx.burst}>
        <motion.div className="nd-flash" initial={{ scale: 0, opacity: 1 }} animate={{ scale: juice.flash * scale, opacity: 0 }} transition={{ delay, duration: 0.55 }} />
        <motion.div className="nd-ring" initial={{ scale: 0, opacity: 1 }} animate={{ scale: juice.flash * 1.7 * scale, opacity: 0 }} transition={{ delay, duration: 0.7 }} />
        {parts.map((p) => (
          <motion.span
            key={p.i}
            className="nd-particle"
            style={fx.burst === 'stars' && p.sparkle ? undefined : particleStyle(fx.burst, p.size, p.color)}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
            animate={{ x: p.dx, y: p.dy, opacity: [0, 1, 1, 0], rotate: p.rot }}
            transition={{ delay, duration: 0.9, ease: 'easeOut' }}
          >
            {fx.burst === 'stars' && p.sparkle && <Icon name="sparkle" size={p.size * 2.2} />}
          </motion.span>
        ))}
        {big ? (
          <motion.span className="nd-monster-chunk" data-exit={fx.exit} initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
            animate={EXIT_ANIM[fx.exit].animate} transition={{ delay, duration: EXIT_ANIM[fx.exit].duration }}>
            <MonsterImg id={round.monster} />
          </motion.span>
        ) : (
          <motion.span className={`nd-monster-chunk${round.boss ? ' nd-boss-hurt' : ''}`} initial={{ x: 0 }} animate={{ x: [0, 46, 34] }} transition={{ delay, duration: 0.4 }}>
            <MonsterImg id={round.monster} />
            {round.boss && (
              // the lost heart shatters
              <motion.span className="nd-heart-shatter" initial={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
                animate={{ y: -70, scale: [1, 1.6, 0.4], opacity: [1, 1, 0], rotate: 25 }} transition={{ delay, duration: 0.7 }}>
                <Icon name="bossHeart" size={30} />
              </motion.span>
            )}
          </motion.span>
        )}
        <motion.span className="nd-plus" initial={{ y: 0, opacity: 0 }} animate={{ y: -90, opacity: [0, 1, 0] }} transition={{ delay: delay + 0.1, duration: 1 }}>
          {outcome.mega ? <Icon name="bolt" size={24} /> : null}+{outcome.points}
        </motion.span>
      </div>
    </>
  )
}

/** Particle shapes per burst. No hearts (lives) and no round dots (nikkud). */
function particleStyle(burst: FxStyle['burst'], size: number, color: string): React.CSSProperties {
  const glow = `0 0 10px ${color}`
  switch (burst) {
    case 'confetti': return { width: size, height: size * 0.45, background: color, borderRadius: 2, boxShadow: glow }
    case 'rings': return { width: size * 1.6, height: size * 1.6, border: `3px solid ${color}`, borderRadius: '50%', boxShadow: glow }
    case 'sparks': return { width: size * 2.4, height: 3, background: color, borderRadius: 2, boxShadow: glow }
    case 'petals': return { width: size * 1.3, height: size * 0.7, background: color, borderRadius: '60% 0', boxShadow: glow }
    default: return { width: size, height: size * 0.5, background: color, borderRadius: 2, boxShadow: glow } // stars: the non-sparkle bits
  }
}
