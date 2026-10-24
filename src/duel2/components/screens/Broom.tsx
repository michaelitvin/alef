// 1 · Broom flight: the wizard rides in one of 3 lanes on the left; waves of 3 syllables (or letters) fly in from the right.
// He drags the wizard up or down (or taps a lane). The waves move only in the answer phase; the controller resolves a wave
// when it reaches the wizard.
import { useEffect, useRef, useState } from 'react'
import { IMAGES } from '../../assets/images'
import { FACING } from '../../assets/facing'
import { laneAt, wavePos } from '../../logic/run'
import type { Choice } from '../../logic/rounds'
import { Glyph } from '../Glyph'
import { Orb, type PickState } from '../Orb'
import { H, Stage, faceTransform, toStage, type Phase } from './Stage'

export const LANE_Y = [250, 470, 690]
export const LANE_H = 220
/** the wizard's centre (stage x) */
export const WIZ_X = 170
/** about two thirds of a lane high: big enough to see, small enough to dodge (Michael: first too big, then too small) */
export const BROOM_WIZARD_H = 150
export const BROOM_ORB = 170
export const BROOM_GLYPH_PX = 100
// beyond the widest screen edge (the background extends past the stage on wide screens), so orbs fly in, never pop in
const START_X = 2000
const WIZ_W = BROOM_WIZARD_H * (600 / 512)
/** the wizard sprite's box (stage x) */
export const wizardBox = () => ({ left: WIZ_X - WIZ_W / 2, right: WIZ_X + WIZ_W / 2, width: WIZ_W })
/** the orbs' centre x for a wave position k (1 = right edge, 0 = touching the wizard's front) */
export const orbX = (k: number) => WIZ_X + WIZ_W / 2 - BROOM_ORB * 0.3 + k * (START_X - WIZ_X)

/** A wave: 3 orbs, one per lane, each with its own delay (fraction of the travel) and height jitter — popcorn style (Michael). */
export interface BroomWave {
  id: number; choices: Choice[]; startMs: number; offsets: number[]; jitter: number[]; resolved: boolean[]
  /** a mistake happened in this wave: its other orbs no longer count */
  spent?: boolean
}
export function Broom(p: {
  waves: BroomWave[]; travelMs: number; lane: 0 | 1 | 2; onLane: (l: 0 | 1 | 2) => void; phase: Phase
  reveal?: { right: string; wrong?: string }; clock?: () => number; correctId?: string
  /** the target flew past in another lane: nothing hit him, so no dizzy wizard */
  missed?: boolean
  /** the last hit or miss during the flight (it goes on): a hit makes the wizard dizzy for a moment */
  fx?: { id: number; kind: 'hit' | 'miss'; at: number }
  /** the flight is over: the wizard swoops away */
  finished?: boolean
}) {
  const clock = p.clock ?? (() => performance.now())
  const [now, setNow] = useState(clock)
  const frozen = useRef<number | null>(null)
  useEffect(() => {
    if (p.phase !== 'answer') {
      frozen.current ??= now
      return
    }
    frozen.current = null
    let raf = 0
    const tick = () => { setNow(clock()); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // the clock function is stable per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.phase])
  const t = frozen.current ?? now
  const [dizzyFx, setDizzyFx] = useState<number | null>(() => (p.fx?.kind === 'hit' ? p.fx.id : null))
  useEffect(() => {
    if (p.fx?.kind !== 'hit') return
    setDizzyFx(p.fx.id)
    const id = p.fx.id
    const timer = window.setTimeout(() => setDizzyFx((d) => (d === id ? null : d)), 900)
    return () => window.clearTimeout(timer)
  }, [p.fx?.id, p.fx?.kind])
  const dizzy = (p.phase === 'mistake' && !p.missed) || dizzyFx !== null
  const [dragY, setDragY] = useState<number | null>(null)
  const down = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const y = dragY ?? LANE_Y[p.lane]
  const stageY = (e: React.PointerEvent) => toStage(svgRef.current, e.clientX, e.clientY).y
  const laneOf = (y: number) => laneAt(Math.min(1, Math.max(0, (y - 140) / (H - 140 - 30))))
  const lastLane = useRef<0 | 1 | 2>(p.lane)
  const release = (e: React.PointerEvent) => {
    if (down.current === null) return
    down.current = null
    setDragY(null)
    const l = laneOf(stageY(e))
    lastLane.current = l
    p.onLane(l)
  }
  const wizW = WIZ_W
  return (
    <Stage bg="bg-sky" ref={svgRef}
      onPointerDown={(e) => { down.current = e.pointerId; (e.target as Element).setPointerCapture?.(e.pointerId); setDragY(stageY(e)) }}
      onPointerMove={(e) => {
        if (down.current === null) return
        const y = stageY(e)
        setDragY(Math.min(LANE_Y[2], Math.max(LANE_Y[0], y)))
        // the game scores the lane he holds now, not the one he will let go in
        const l = laneOf(y)
        if (l !== lastLane.current) { lastLane.current = l; p.onLane(l) }
      }}
      onPointerUp={release} onPointerCancel={release}
      style={{ touchAction: 'none' }}>
      {LANE_Y.map((ly) => <rect key={ly} data-lane-band x={-1600} y={ly - LANE_H / 2} width={4800} height={LANE_H} fill="#ffd34d" opacity={0.035} />)}
      {p.waves.map((w) => (
        <g key={w.id} data-wave={w.id}>
          {w.choices.map((c, lane) => {
            if (w.resolved[lane] && p.reveal?.right !== c.id && p.reveal?.wrong !== c.id) return null
            const k = wavePos(w.startMs + w.offsets[lane] * p.travelMs, t, p.travelMs)
            const x = orbX(k)
            const y = LANE_Y[lane] + w.jitter[lane]
            let state: PickState = 'idle'
            if (p.reveal?.right === c.id) state = 'reveal'
            else if (p.reveal?.wrong === c.id) state = 'wrong'
            return (
              <g key={c.id} data-orb-i={lane} transform={`translate(${x.toFixed(1)} 0)`}>
                <ellipse cx={BROOM_ORB * 1.05} cy={y} rx={BROOM_ORB * 1.1} ry={BROOM_ORB * 0.3} fill="url(#d2-trail)" />
                <Orb size={BROOM_ORB} x={0} y={y} state={state} testCorrect={c.id === p.correctId}>
                  <Glyph text={c.text} px={BROOM_GLYPH_PX} x={0} y={y} />
                </Orb>
              </g>
            )
          })}
        </g>
      ))}
      <defs>
        <linearGradient id="d2-trail" x1="0" x2="1"><stop offset="0" stopColor="#c8a0ff" stopOpacity="0.7" /><stop offset="1" stopColor="#8c5aff" stopOpacity="0" /></linearGradient>
      </defs>
      {/* the animation on an outer group: a CSS transform would replace the facing transform attribute */}
      <g data-wizard data-lane={p.lane} className={p.finished ? 'd2-fly-off' : 'd2-bob'}><g transform={faceTransform(FACING['s-wizbroom'], 'right', WIZ_X)}>
        {dizzy && IMAGES['s-wizard-dizzy']
          ? <image href={IMAGES['s-wizard-dizzy']} className="d2-dizzy" x={WIZ_X - BROOM_WIZARD_H * 0.55} y={y - BROOM_WIZARD_H * 0.75} width={BROOM_WIZARD_H * 1.1} height={BROOM_WIZARD_H * 1.1} />
          : IMAGES['s-wizbroom']
          ? <image href={IMAGES['s-wizbroom']} x={WIZ_X - wizW / 2} y={y - BROOM_WIZARD_H * 0.6} width={wizW} height={BROOM_WIZARD_H} />
          : <circle cx={WIZ_X} cy={y} r={BROOM_WIZARD_H / 2} fill="#7a5ac8" />}
      </g></g>
    </Stage>
  )
}
