// Bonus game "stop on the 12" (spec): the seconds hand sweeps; three taps; gears by closeness. No failure.
// The other hands turn with it, as on a real clock (the parent 2026-10-16): each lap moves the long hand one minute,
// and the short hand a twelfth of that. They start at the time now.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ClockFace } from '../components/ClockFace'
import { BONUS_TRIES, BONUS_TURN_MS, WORKDAY_LENGTH, bonusGears, langForRound } from '../logic/workday'
import { playSfx, playVoice } from '../audio/clockAudio'
import { useClockStore } from '../store'
import { lineAudioId } from '../data/lines'
import { GearIcon } from '../components/icons'

export function Bonus({ onDone, onTry }: { onDone: (gears: number) => void; onTry?: (t: { try: number; angle: number; gears: number }) => void }) {
  const [angle, setAngle] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [tries, setTries] = useState<number[]>([])
  const start = useRef(performance.now())
  const raf = useRef(0)
  const timers = useRef<number[]>([])
  // laps of the seconds hand so far, and the time the clock started at (in minutes past 12)
  const [laps, setLaps] = useState(0)
  const last = useRef(0)
  const [startMin] = useState(() => { const d = new Date(); return (d.getHours() % 12) * 60 + d.getMinutes() })
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)) }, [])

  useEffect(() => {
    const st = useClockStore.getState()
    if (!st.bonusExplained) {
      void playVoice(lineAudioId('bonus-intro', langForRound(WORKDAY_LENGTH - 1, st.settings.langs)))
      st.setBonusExplained()
    }
  }, [])
  useEffect(() => {
    if (stopped) return
    start.current = performance.now() - (angle / 360) * BONUS_TURN_MS
    const tick = () => {
      const a = (((performance.now() - start.current) % BONUS_TURN_MS) / BONUS_TURN_MS) * 360
      if (a < last.current) setLaps((n) => n + 1)
      last.current = a
      setAngle(a)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    const iv = window.setInterval(() => void playSfx('tick'), 1000)
    return () => { cancelAnimationFrame(raf.current); window.clearInterval(iv) }
  }, [stopped]) // eslint-disable-line react-hooks/exhaustive-deps

  const stop = () => {
    if (stopped || tries.length >= BONUS_TRIES) return
    const g = bonusGears(angle)
    const next = [...tries, g]
    setStopped(true)
    setTries(next)
    onTry?.({ try: next.length, angle: Math.round(angle * 10) / 10, gears: g })
    void playSfx(g > 0 ? 'ding' : 'boing')
    timers.current.push(window.setTimeout(() => {
      if (next.length >= BONUS_TRIES) timers.current.push(window.setTimeout(() => onDone(next.reduce((s, x) => s + x, 0)), 1200))
      else setStopped(false)
    }, 1000))
  }

  return (
    <div className="ck-bonus">
      <div className="ck-bonus-tries">
        {Array.from({ length: BONUS_TRIES }, (_, i) => (
          <motion.span key={i} animate={{ scale: tries[i] ? [1, 1.3, 1] : 1, opacity: tries[i] ? 1 : 0.3 }}>
            {Array.from({ length: Math.max(1, tries[i] ?? 1) }, (_, j) => <GearIcon key={j} size={28} />)}
          </motion.span>
        ))}
      </div>
      <button aria-label="stop" className="ck-bonus-face" onPointerDown={stop}>
        <ClockFace pose={posePast(startMin + laps + angle / 360)} sectors={[{ from: 354, to: 6, color: 'rgba(60, 141, 47, 0.45)' }]} size={320} />
        <svg viewBox="-110 -110 220 220" width={320} height={320} style={{ position: 'absolute', inset: 0 }} aria-hidden>
          <line x1="0" y1="16" x2="0" y2="-86" stroke="#e67e22" strokeWidth="4" strokeLinecap="round" transform={`rotate(${angle})`} />
        </svg>
      </button>
    </div>
  )
}

/** The hands at this many minutes past 12 (fractions move the hands smoothly). */
const posePast = (min: number) => ({ minute: (min % 60) * 6, hour: (min % 720) / 2 })
