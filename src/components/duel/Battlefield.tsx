// The field: sky, ground, tower + wizard (left), the monster walking in from the right, effects, banners.
// Tower edge and staff tip are measured from the rendered sprites, so stop point and fireball origin are right
// in any aspect ratio, and re-measured on resize/rotation.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Outcome, Round } from '../../types/duel'
import { TOWER, WIZARD } from '../../assets/duel/sprites'
import { Explosion, type Geo } from './Explosion'
import { LungingMonster, WalkingMonster, remainingWalkMs } from './Monster'
import { ResultBanner } from './ResultBanner'

const PORTRAIT: Geo = { start: 78, end: 27, wizLeft: 15, wizBottom: 50 }
const LANDSCAPE: Geo = { start: 84, end: 16, wizLeft: 9, wizBottom: 52 } // start leaves room for the clue bubble
export const LANDSCAPE_QUERY = '(orientation: landscape) and (min-width: 640px) and (min-height: 500px)'

/** Tablet landscape layout; a phone on its side (too short) keeps the portrait layout. */
export function useLandscape() {
  const mq = () => (typeof window.matchMedia === 'function' ? window.matchMedia(LANDSCAPE_QUERY) : null)
  const [on, setOn] = useState(() => mq()?.matches ?? false)
  useEffect(() => {
    const m = mq()
    if (!m) return
    const f = () => setOn(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return on
}

interface Props {
  round: Round | null
  outcome: Outcome | null
  walking: boolean
  paused: boolean
  landscape: boolean
  banner: ReactNode | null
  bossHp?: number
  onReplay?: () => void
}

export function Battlefield({ round, outcome, walking, paused, landscape, banner, bossHp = 0, onReplay = () => {} }: Props) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const towerRef = useRef<HTMLImageElement>(null)
  const wizardRef = useRef<HTMLImageElement>(null)
  const [measured, setMeasured] = useState<Partial<Geo>>({})

  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    const measure = () => {
      const f = field.getBoundingClientRect()
      const t = towerRef.current?.getBoundingClientRect()
      const w = wizardRef.current?.getBoundingClientRect()
      if (!t || !w || !f.width || !t.width) return
      const monsterHalf = ((landscape ? 60 : 48) / f.width) * 100
      setMeasured({
        end: ((t.right - f.left) / f.width) * 100 + monsterHalf,
        wizLeft: ((w.right - f.left) / f.width) * 100 - 3,
        wizBottom: ((f.bottom - w.top) / f.height) * 100 - 8,
      })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(field)
    window.addEventListener('resize', measure) // also fired by the sprites' onLoad
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [landscape])
  const geo: Geo = { ...(landscape ? LANDSCAPE : PORTRAIT), ...measured }

  // Walk clock: set synchronously the first render the round walks, so the tween and the hook's timer agree.
  const walkStart = useRef(0)
  const walkKey = useRef(-1)
  if (walking && round && walkKey.current !== round.id) {
    walkKey.current = round.id
    walkStart.current = performance.now()
  }
  if (!walking) walkKey.current = -1
  const outcomeX = useMemo(() => {
    if (!outcome || !round) return geo.start
    if (!walking) return geo.start
    const frac = Math.min(1, (performance.now() - walkStart.current) / round.walkMs)
    return geo.start - (geo.start - geo.end) * frac
    // freeze at the moment the outcome arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome])

  const pose = outcome?.kind === 'miss' ? WIZARD.dizzy : outcome?.kind === 'hit' ? WIZARD.cast : WIZARD.idle
  const relayout = () => window.dispatchEvent(new Event('resize'))

  return (
    <div className="nd-field" ref={fieldRef}>
      <div className="nd-ground" />
      <img ref={towerRef} className="nd-tower" src={TOWER} alt="" draggable={false} onLoad={relayout} />
      <motion.img
        ref={wizardRef}
        className="nd-wizard"
        src={pose}
        alt=""
        draggable={false}
        onLoad={relayout}
        animate={outcome?.kind === 'hit' ? { scale: [1, 1.12, 1] } : outcome?.kind === 'miss' ? { rotate: [0, -6, 6, -4, 0] } : { y: [0, -3, 0] }}
        transition={outcome ? { duration: 0.4 } : { repeat: Infinity, duration: 1.8 }}
      />

      {round && !outcome && walking && !paused && (
        <div className="nd-timebar">
          <motion.div
            key={round.id}
            className="nd-timebar-fill"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: round.walkMs / 1000, ease: 'linear' }}
          />
        </div>
      )}

      {round && !outcome && (
        <WalkingMonster round={round} walking={walking} startX={geo.start} endX={geo.end} bossHp={bossHp} onReplay={onReplay}
          remainingMs={remainingWalkMs(round.walkMs, walkStart.current, performance.now())} />
      )}
      {round && outcome?.kind === 'miss' && <LungingMonster round={round} fromX={outcomeX} endX={geo.end} />}
      {round && outcome?.kind === 'hit' && <Explosion key={round.id} round={round} outcome={outcome} x={outcomeX} geo={geo} />}
      {round && outcome && <ResultBanner mark={round.target} word={round.word} kind={outcome.kind} />}

      {banner && (
        <motion.div className="nd-wave-banner" initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }}>
          {banner}
        </motion.div>
      )}
    </div>
  )
}
