// 1 · Broom flight: the wizard rides in one of 3 lanes on the left; waves of 3 syllables (or letters) fly in from the right.
// He drags the wizard up or down (or taps a lane). The waves move only in the answer phase; the controller resolves a wave
// when it reaches the wizard.
import { useEffect, useRef, useState } from 'react'
import { IMAGES } from '../../assets/images'
import { FACING } from '../../assets/facing'
import { laneAt, waveX } from '../../logic/run'
import type { Choice } from '../../logic/rounds'
import { Glyph } from '../Glyph'
import { Orb, type PickState } from '../Orb'
import { H, Stage, faceTransform, toStage, type Phase } from './Stage'

export const LANE_Y = [250, 470, 690]
export const LANE_H = 220
export const WIZ_X = 250
/** the wizard is about half a lane high, so dodging is clear (Michael) */
export const BROOM_WIZARD_H = 110
export const BROOM_ORB = 170
export const BROOM_GLYPH_PX = 100
const START_X = 1720

export interface BroomWave { id: number; choices: Choice[]; startMs: number }
export function Broom(p: {
  waves: BroomWave[]; travelMs: number; lane: 0 | 1 | 2; onLane: (l: 0 | 1 | 2) => void; phase: Phase
  reveal?: { right: string; wrong?: string }; clock?: () => number; correctId?: string
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
  const [dragY, setDragY] = useState<number | null>(null)
  const down = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const y = dragY ?? LANE_Y[p.lane]
  const stageY = (e: React.PointerEvent) => toStage(svgRef.current, e.clientX, e.clientY).y
  const release = (e: React.PointerEvent) => {
    if (down.current === null) return
    down.current = null
    setDragY(null)
    p.onLane(laneAt(Math.min(1, Math.max(0, (stageY(e) - 140) / (H - 140 - 30)))))
  }
  const wizW = BROOM_WIZARD_H * (600 / 512)
  return (
    <Stage bg="bg-sky" ref={svgRef}
      onPointerDown={(e) => { down.current = e.pointerId; (e.target as Element).setPointerCapture?.(e.pointerId); setDragY(stageY(e)) }}
      onPointerMove={(e) => { if (down.current !== null) setDragY(Math.min(LANE_Y[2], Math.max(LANE_Y[0], stageY(e)))) }}
      onPointerUp={release} onPointerCancel={release}
      style={{ touchAction: 'none' }}>
      {LANE_Y.map((ly) => <rect key={ly} x={0} y={ly - LANE_H / 2} width={1600} height={LANE_H} fill="#ffd34d" opacity={0.035} />)}
      {p.waves.map((w) => {
        const k = waveX(w.startMs, t, p.travelMs)
        const x = WIZ_X + k * (START_X - WIZ_X)
        return (
          <g key={w.id} data-wave={w.id} transform={`translate(${x.toFixed(1)} 0)`}>
            {w.choices.map((c, lane) => {
              let state: PickState = 'idle'
              if (p.reveal?.right === c.id) state = 'reveal'
              else if (p.reveal?.wrong === c.id) state = 'wrong'
              return (
                <g key={c.id}>
                  <ellipse cx={BROOM_ORB * 1.05} cy={LANE_Y[lane]} rx={BROOM_ORB * 1.1} ry={BROOM_ORB * 0.3} fill="url(#d2-trail)" />
                  <Orb size={BROOM_ORB} x={0} y={LANE_Y[lane]} state={state} testCorrect={c.id === p.correctId}>
                    <Glyph text={c.text} px={BROOM_GLYPH_PX} x={0} y={LANE_Y[lane]} />
                  </Orb>
                </g>
              )
            })}
          </g>
        )
      })}
      <defs>
        <linearGradient id="d2-trail" x1="0" x2="1"><stop offset="0" stopColor="#c8a0ff" stopOpacity="0.7" /><stop offset="1" stopColor="#8c5aff" stopOpacity="0" /></linearGradient>
      </defs>
      <g data-wizard className="d2-bob" transform={faceTransform(FACING['s-wizbroom'], 'right', WIZ_X - wizW / 2)}>
        {IMAGES['s-wizbroom']
          ? <image href={IMAGES['s-wizbroom']} x={WIZ_X - wizW - 30} y={y - BROOM_WIZARD_H * 0.6} width={wizW} height={BROOM_WIZARD_H} />
          : <circle cx={WIZ_X - 90} cy={y} r={BROOM_WIZARD_H / 2} fill="#7a5ac8" />}
      </g>
    </Stage>
  )
}
