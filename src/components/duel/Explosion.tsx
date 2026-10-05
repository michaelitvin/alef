// Hit effects: fireball (or MEGA lightning), flash, shockwave ring, particles, the monster flying away, +points.
// Intensity comes from a preset; presets are mixed at random per hit (rules.pickEffect).
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { EffectPreset, Outcome, Round } from '../../types/duel'
import { MONSTERS } from '../../assets/duel/sprites'
import { Icon } from './Icon'

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

const COLORS = ['#ffd34d', '#ff7ae0', '#8fd8ff', '#b48cff', '#ffffff', '#ff9a3c']

export function MonsterImg({ id }: { id: string }) {
  const m = MONSTERS[id]
  return <img className="nd-sprite" src={m.src} style={m.faces === 'right' ? { transform: 'scaleX(-1)' } : undefined} alt="" draggable={false} />
}

export function Explosion({ round, outcome, x, geo }: { round: Round; outcome: Outcome; x: number; geo: Geo }) {
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
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 10,
      }
    })
  }, [juice.particles, scale])

  return (
    <>
      {outcome.mega ? (
        <motion.svg className="nd-lightning" style={{ left: `${x}%` }} viewBox="0 0 60 300" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.3, 1, 0] }} transition={{ duration: 0.6 }}>
          <polyline points="30,0 18,70 40,110 14,180 38,215 26,300" fill="none" stroke="#fff" strokeWidth="6" />
          <polyline points="30,0 18,70 40,110 14,180 38,215 26,300" fill="none" stroke="#b48cff" strokeWidth="14" opacity="0.5" />
        </motion.svg>
      ) : (
        <motion.div
          className="nd-fireball"
          initial={{ left: `${geo.wizLeft}%`, bottom: `${geo.wizBottom}%`, scale: 0.5, opacity: 1 }}
          animate={{ left: `${x}%`, bottom: '20%', scale: 1.2, opacity: [1, 1, 0] }}
          transition={{ duration: 0.26, ease: 'easeIn', opacity: { times: [0, 0.9, 1], duration: 0.3 } }}
        />
      )}
      {outcome.mega && <motion.div className="nd-whiteout" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
      <div className="nd-blast" style={{ left: `${x}%` }}>
        <motion.div className="nd-flash" initial={{ scale: 0, opacity: 1 }} animate={{ scale: juice.flash * scale, opacity: 0 }} transition={{ delay, duration: 0.55 }} />
        <motion.div className="nd-ring" initial={{ scale: 0, opacity: 1 }} animate={{ scale: juice.flash * 1.7 * scale, opacity: 0 }} transition={{ delay, duration: 0.7 }} />
        {parts.map((p) => (
          <motion.span
            key={p.i}
            className="nd-particle"
            style={p.sparkle ? undefined : { width: p.size, height: p.size, background: p.color, boxShadow: `0 0 10px ${p.color}` }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
            animate={{ x: p.dx, y: p.dy, opacity: [0, 1, 1, 0], rotate: p.rot }}
            transition={{ delay, duration: 0.9, ease: 'easeOut' }}
          >
            {p.sparkle && <Icon name="sparkle" size={p.size * 2.2} />}
          </motion.span>
        ))}
        {big ? (
          <motion.span className="nd-monster-chunk" initial={{ y: 0, rotate: 0, opacity: 1 }} animate={{ y: -140, x: 60, rotate: 540, opacity: 0, scale: 0.3 }} transition={{ delay, duration: 0.8 }}>
            <MonsterImg id={round.monster} />
          </motion.span>
        ) : (
          <motion.span className="nd-monster-chunk" initial={{ x: 0 }} animate={{ x: [0, 40, 30] }} transition={{ delay, duration: 0.4 }}>
            <MonsterImg id={round.monster} />
          </motion.span>
        )}
        <motion.span className="nd-plus" initial={{ y: 0, opacity: 0 }} animate={{ y: -90, opacity: [0, 1, 0] }} transition={{ delay: delay + 0.1, duration: 1 }}>
          {outcome.mega ? <Icon name="bolt" size={24} /> : null}+{outcome.points}
        </motion.span>
      </div>
    </>
  )
}
