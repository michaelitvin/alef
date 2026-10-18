// A narrated explanation (rule: explain new elements and repeated mistakes). Each cue fires when its word is
// spoken, so the thing named glows or moves at that moment.
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { lineById, parseLine, type Cue } from '../data/lines'
import type { ExplainId } from '../logic/levels'
import type { Lang } from '../logic/phrases'
import { type ClockTime, type HandPose, digital, parseTimeId, poseOf } from '../logic/time'
import { ClockFace, type Sector } from './ClockFace'
import { Caption, type CaptionScript } from './Caption'
import { DigitalCard } from './DigitalCard'
import { CheckIcon, SpeakerIcon } from './icons'

export const explainLineId = (id: ExplainId) => `exp-${id}`

export interface ExplainPlayerProps {
  id: ExplainId
  lang: Lang
  script: CaptionScript
  /** caption word being spoken */
  word: number
  /** cues fired so far, in order */
  cues: Cue[]
  /** the clock to show when the line has no example time (the current round's time) */
  fallback: ClockTime
  size: number
  /** set when the explanation has finished: its speaker plays it again */
  onReplay?: () => void
}

export function ExplainPlayer({ id, lang, script, word, cues, fallback, size, onReplay }: ExplainPlayerProps) {
  const line = lineById(explainLineId(id))!
  const { words } = parseLine(line[lang])
  const t = line.example ? parseTimeId(line.example) : fallback
  const has = (c: Cue) => cues.includes(c)
  const lastCue = cues[cues.length - 1]

  let pose: HandPose = poseOf(t)
  const sectors: Sector[] = []
  // half past and quarter past start on the hour and the long hand travels on its word; quarter to starts on its own time,
  // as the line names it first (QA 2026-10-15: "quarter to four" was said over three o'clock)
  if (id === 'level-2' || id === 'level-3' || id === 'level-6') pose = poseOf({ h: t.h, m: 0 })
  if (has('half')) { pose = poseOf({ h: t.h, m: 30 }); sectors.push({ from: 0, to: 180, color: 'rgba(255, 196, 120, 0.45)' }) }
  if (has('quarterRight')) { pose = poseOf({ h: t.h, m: 15 }); sectors.push({ from: 0, to: 90, color: 'rgba(255, 196, 120, 0.45)' }) }
  if (has('quarterLeft')) { pose = poseOf({ h: t.h, m: 45 }); sectors.push({ from: 270, to: 360, color: 'rgba(120, 170, 255, 0.45)' }) }
  if (has('to') && id === 'level-6') pose = poseOf(t)
  if (has('past')) sectors.push({ from: 0, to: 180, color: 'rgba(255, 196, 120, 0.4)' })
  if (has('to')) sectors.push({ from: 180, to: 360, color: 'rgba(120, 170, 255, 0.4)' })
  const fivesAt = parseLine(line[lang]).cues.find((c) => c.cue === 'fives')?.word
  // "each number is five minutes": the count starts from 12 and goes up, so the hand only moves forward
  if (id === 'level-5' && !has('fives')) pose = poseOf({ h: t.h, m: 0 })
  if (has('fives') && fivesAt !== undefined) pose = { ...pose, minute: Math.min(4, Math.max(1, word - fivesAt + 1)) * 30 }
  if (has('creep')) pose = poseOf(t)
  else if (id === 'fix-notAdvanced') pose = poseOf({ h: t.h, m: 0 })
  // the finger demo turns the long hand itself (the short hand goes with it, as on a real clock)
  const sweep = useFingerSweep(has('finger'))
  if (sweep) pose = { minute: sweep.angle, hour: (t.h % 12) * 30 + sweep.angle / 12 }
  const faceSize = size * 0.55

  const glow = lastCue === 'short' ? 'hour' : lastCue === 'long' ? 'minute' : lastCue === 'seconds' ? 'second' : lastCue === 'quarters' ? 'quarters' : null
  return (
    <div className="ck-explain">
      <div className="ck-explain-row">
        {/* forward, except into the five-minute count, which starts again from the 5 (a short step back, not a lap) */}
        <ClockFace pose={pose} sectors={sectors} glow={glow} glide={!sweep} forward={!has('fives')} size={faceSize}
          numbers={id === 'nonumbers' ? 'none' : 'all'} ring={has('ring') || has('fives')}
          secondsFrom={has('seconds') ? 0 : null}
          overlay={sweep && <Finger angle={sweep.angle} opacity={sweep.opacity} face={faceSize} />} />
        {/* the playtest: both clocks show from the start; the one being named glows and pulses as the voice names it */}
        {line[lang].includes('{digital}') && (
          <motion.div animate={has('digital') ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={has('digital') ? { repeat: Infinity, duration: 1.2 } : {}}>
            <DigitalCard text={digital(t.h, t.m)} glow={has('digital')} />
          </motion.div>
        )}
        {line[lang].includes('{check}') && (
          <motion.div animate={has('check') ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={has('check') ? { repeat: Infinity, duration: 1 } : {}}
            style={{ opacity: has('check') ? 1 : 0.6 }}>
            <CheckIcon />
          </motion.div>
        )}
      </div>
      <div className="ck-prompt-row" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <Caption words={words} lang={lang} script={script} active={word} size="explain" onTap={onReplay} />
        {/* the speaker is always there; it works once the explanation has finished (rule: a speaker on all that plays) */}
        <button aria-label="listen again" className="ck-listen" disabled={!onReplay} style={onReplay ? undefined : { opacity: 0.45 }}
          onPointerDown={(e) => { e.stopPropagation(); onReplay?.() }}>
          <SpeakerIcon />
        </button>
      </div>
    </div>
  )
}

/** The finger demo's loop: the finger comes down on the 12, turns the long hand to the 5, lifts, and starts again. */
const SWEEP = { down: 300, turn: 1800, hold: 600, lift: 400, to: 150 }
function useFingerSweep(on: boolean): { angle: number; opacity: number } | null {
  const [s, set] = useState<{ angle: number; opacity: number } | null>(null)
  useEffect(() => {
    if (!on) { set(null); return }
    const t0 = performance.now()
    const cycle = SWEEP.down + SWEEP.turn + SWEEP.hold + SWEEP.lift
    let raf = 0
    const tick = (now: number) => {
      const e = (now - t0) % cycle
      const k = Math.min(1, Math.max(0, (e - SWEEP.down) / SWEEP.turn))
      const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      const opacity = e < SWEEP.down ? e / SWEEP.down : e > cycle - SWEEP.lift ? (cycle - e) / SWEEP.lift : 1
      set({ angle: eased * SWEEP.to, opacity })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return s
}

/** The tip of the long hand, as a share of the face size (the hand reaches 74 of the face's 110 radius units). */
const TIP = 74 / 220
/** A pointing hand (index finger up, the other fingers curled, a sleeve), its fingertip on the tip of the long hand. */
function Finger({ angle, opacity, face }: { angle: number; opacity: number; face: number }) {
  const w = face * 0.42
  const k = w / 100
  const rad = (angle * Math.PI) / 180
  const x = face / 2 + Math.sin(rad) * face * TIP
  const y = face / 2 - Math.cos(rad) * face * TIP
  return (
    <svg viewBox="0 0 100 140" width={w} height={w * 1.4} className="ck-finger" aria-hidden
      style={{ position: 'absolute', left: x - 37 * k, top: y - 4 * k, opacity, pointerEvents: 'none', transformOrigin: `${37 * k}px ${4 * k}px`, transform: 'rotate(-18deg)' }}>
      <g stroke="#7a4a1e" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M30 108 L74 108 L78 136 L26 136 Z" fill="#3f7fc4" />
        <path d="M28 104 L76 104 L76 114 L28 114 Z" fill="#2f63a0" />
        <path d="M24 60 Q22 50 32 50 L72 50 Q84 50 84 64 L82 92 Q80 106 64 106 L40 106 Q26 106 25 92 Z" fill="#ffd2a6" />
        <path d="M44 50 Q44 40 52 40 Q60 40 60 50" fill="#ffd2a6" />
        <path d="M58 52 Q58 43 66 43 Q74 43 74 53" fill="#ffd2a6" />
        <path d="M71 56 Q72 48 78 49 Q85 50 84 60" fill="#ffd2a6" />
        <path d="M52 56 L52 62 M66 58 L66 64 M78 61 L78 66" fill="none" strokeWidth="2.5" />
        <path d="M28 60 L28 14 Q28 4 37 4 Q46 4 46 14 L46 62" fill="#ffd2a6" />
        <path d="M32 18 Q32 9 37 9 Q42 9 42 18 Q37 21 32 18 Z" fill="#fff0e0" strokeWidth="2" />
        <path d="M31 38 Q37 41 43 38" fill="none" strokeWidth="2" />
        <path d="M24 70 Q26 62 36 66 L58 78 Q64 84 57 88 Q50 90 42 86 L28 80 Q22 77 24 70 Z" fill="#ffc690" />
      </g>
    </svg>
  )
}
