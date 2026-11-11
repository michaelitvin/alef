// 1 · Broom flight: the wizard rides in one of 3 lanes on the left; waves of 3 syllables (or letters) fly in from the right.
// He drags the wizard up or down (or taps a lane). The waves move only in the answer phase; the controller resolves a wave
// when it reaches the wizard.
import { useEffect, useRef, useState } from 'react'
import { IMAGES, useWizardArt } from '../../assets/images'
import { FACING } from '../../assets/facing'
import { laneAt, wavePos } from '../../logic/run'
import type { Choice } from '../../logic/rounds'
import { Glyph } from '../Glyph'
import { Orb, type PickState } from '../Orb'
import { H, Stage, faceTransform, toStage, type Phase } from './Stage'
import type { BossView } from '../../controller'

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
/** the boss's box on the right (stage units): it faces the wizard */
export const BOSS_BOX = { x: 1060, y: 235, w: 460, h: 490 }
export const BOSS_CX = BOSS_BOX.x + BOSS_BOX.w / 2
export const BOSS_CY = BOSS_BOX.y + BOSS_BOX.h / 2
/** the health bar above the boss: below the top bar on a phone */
const HP = { x: BOSS_BOX.x - 6, y: 168, seg: 46, gap: 8, h: 30 }

/** A wave: 3 orbs, one per lane, each with its own delay (fraction of the travel) and height jitter — popcorn style (Michael). */
export interface BroomWave {
  id: number; choices: Choice[]; startMs: number; offsets: number[]; jitter: number[]; resolved: boolean[]
  /** each orb's lane (a two-orb wave uses two of the three lanes); by default an orb's lane is its index */
  lanes?: number[]
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
  /** a boss visit: the boss on the right, its health bar, the bolts, the win */
  boss?: BossView
}) {
  const wiz = useWizardArt()
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
      <Warm boss={p.boss?.kind} />
      {p.boss && <BossSky won={!!p.boss.won} />}
      {p.boss && <Boss boss={p.boss} />}
      {p.waves.map((w) => (
        <g key={w.id} data-wave={w.id}>
          {w.choices.map((c, i) => {
            if (w.resolved[i] && p.reveal?.right !== c.id && p.reveal?.wrong !== c.id) return null
            const lane = w.lanes?.[i] ?? i
            const k = wavePos(w.startMs + w.offsets[i] * p.travelMs, t, p.travelMs)
            const x = orbX(k)
            const y = LANE_Y[lane] + w.jitter[i]
            let state: PickState = 'idle'
            if (p.reveal?.right === c.id) state = 'reveal'
            else if (p.reveal?.wrong === c.id) state = 'wrong'
            return (
              <g key={c.id} data-orb-i={i} data-lane={lane} transform={`translate(${x.toFixed(1)} 0)`}>
                <ellipse cx={BROOM_ORB * 1.05} cy={y} rx={BROOM_ORB * 1.1} ry={BROOM_ORB * 0.3} fill="url(#d2-trail)" />
                <Orb size={BROOM_ORB} x={0} y={y} state={state} testCorrect={c.id === p.correctId}>
                  <Glyph text={c.text} px={BROOM_GLYPH_PX} x={0} y={y} />
                </Orb>
              </g>
            )
          })}
        </g>
      ))}
      {p.boss?.bolt && !p.boss.won && <Bolt key={p.boss.bolt.id} from={{ x: WIZ_X + 70, y: LANE_Y[p.boss.bolt.lane] }} />}
      {p.boss?.won && <BossWin boss={p.boss} />}
      <defs>
        <linearGradient id="d2-trail" x1="0" x2="1"><stop offset="0" stopColor="#c8a0ff" stopOpacity="0.7" /><stop offset="1" stopColor="#8c5aff" stopOpacity="0" /></linearGradient>
        <BossDefs />
      </defs>
      {/* the animation on an outer group: a CSS transform would replace the facing transform attribute */}
      <g data-wizard data-lane={p.lane} className={p.finished ? 'd2-fly-off' : 'd2-bob'}><g transform={faceTransform(FACING['s-wizbroom'], 'right', WIZ_X)}>
        {dizzy && wiz('s-wizard-dizzy')
          ? <image href={wiz('s-wizard-dizzy')} className="d2-dizzy" x={WIZ_X - BROOM_WIZARD_H * 0.55} y={y - BROOM_WIZARD_H * 0.75} width={BROOM_WIZARD_H * 1.1} height={BROOM_WIZARD_H * 1.1} />
          : wiz('s-wizbroom')
          ? <image href={wiz('s-wizbroom')} x={WIZ_X - wizW / 2} y={y - BROOM_WIZARD_H * 0.6} width={wizW} height={BROOM_WIZARD_H} />
          : <circle cx={WIZ_X} cy={y} r={BROOM_WIZARD_H / 2} fill="#7a5ac8" />}
      </g></g>
    </Stage>
  )
}

/** The boss gradients and filters (inside the stage's <defs>). */
function BossDefs() {
  return (
    <>
      <linearGradient id="d2-hp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe07a" /><stop offset="1" stopColor="#ff7a3a" /></linearGradient>
      <linearGradient id="d2-bolt" x1="0" x2="1"><stop offset="0" stopColor="#ffd34d" stopOpacity="0.3" /><stop offset="0.5" stopColor="#ffe9a0" /><stop offset="1" stopColor="#ffffff" /></linearGradient>
      <linearGradient id="d2-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0a8" /><stop offset="0.5" stopColor="#ffc83c" /><stop offset="1" stopColor="#c88a1e" /></linearGradient>
      <radialGradient id="d2-vign" cx="0.7" cy="0.5" r="0.8"><stop offset="0.4" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.55" /></radialGradient>
      <radialGradient id="d2-bossglow"><stop offset="0" stopColor="#b48cff" stopOpacity="0.35" /><stop offset="1" stopColor="#b48cff" stopOpacity="0" /></radialGradient>
      <radialGradient id="d2-burst"><stop offset="0" stopColor="#fff" stopOpacity="0.95" /><stop offset="0.4" stopColor="#ffd34d" stopOpacity="0.6" /><stop offset="1" stopColor="#ffd34d" stopOpacity="0" /></radialGradient>
      <radialGradient id="d2-bigburst"><stop offset="0" stopColor="#fff" stopOpacity="0.9" /><stop offset="0.25" stopColor="#fff3c4" stopOpacity="0.6" /><stop offset="1" stopColor="#ffd34d" stopOpacity="0" /></radialGradient>
      <filter id="d2-soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </>
  )
}

/** The sky darkens while a boss is there and lifts when it is beaten. */
function BossSky({ won }: { won: boolean }) {
  return (
    <g data-boss-sky className={won ? 'd2-sky-lift' : 'd2-sky-dark'} pointerEvents="none">
      <rect x={-1600} y={-900} width={4800} height={2700} fill="#0a0420" opacity={0.45} />
      <rect x={-1600} y={-900} width={4800} height={2700} fill="url(#d2-vign)" />
      <circle cx={BOSS_CX} cy={BOSS_CY} r={330} fill="url(#d2-bossglow)" />
    </g>
  )
}

/** The boss on the right, facing the wizard (FACING), with its health bar of 8 segments above it (no numbers). */
function Boss({ boss }: { boss: BossView }) {
  const img = IMAGES[`boss-${boss.kind}-${boss.pose}`] ?? IMAGES[`boss-${boss.kind}-fly`]
  const motion = !boss.arrived ? 'd2-boss-in' : boss.won ? 'd2-boss-down' : boss.pose === 'hit' ? 'd2-boss-hit' : 'd2-boss-idle'
  return (
    <g pointerEvents="none">
      <g data-boss={boss.kind} data-pose={boss.pose} className={motion}>
        <g data-boss-face transform={faceTransform(FACING[`boss-${boss.kind}`] ?? 'left', 'left', BOSS_CX)}>
          {img
            ? <image href={img} x={BOSS_BOX.x} y={BOSS_BOX.y} width={BOSS_BOX.w} height={BOSS_BOX.h} preserveAspectRatio="xMidYMid meet" />
            : <circle cx={BOSS_CX} cy={BOSS_CY} r={200} fill="#5a2a90" />}
        </g>
      </g>
      {!boss.won && (
        <g data-hp-bar className={boss.arrived ? undefined : 'd2-hp-in'}>
          <rect x={HP.x} y={HP.y - 10} width={8 * HP.seg + 7 * HP.gap + 24} height={HP.h + 20} rx={25} fill="#1b0f3ccc" stroke="#ffd34d99" strokeWidth={3} />
          {Array.from({ length: 8 }, (_, i) => {
            const lit = i >= 8 - boss.hitsLeft
            return (
              <rect key={i} data-hp {...(lit ? { 'data-lit': '' } : {})} x={HP.x + 12 + i * (HP.seg + HP.gap)} y={HP.y} width={HP.seg} height={HP.h} rx={9}
                fill={lit ? 'url(#d2-hp)' : '#3a2a66'} stroke={lit ? undefined : '#6a58a066'} strokeWidth={lit ? undefined : 2} filter={lit ? 'url(#d2-soft)' : undefined} />
            )
          })}
        </g>
      )}
    </g>
  )
}

/** A four-pointed sparkle (never a dot: a dot reads as a nikkud mark). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y} Q${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r} Q${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y} Q${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r}Z`

/** The spell bolt from the wizard's broom to the boss, with a burst where it hits. */
function Bolt({ from }: { from: { x: number; y: number } }) {
  const to = { x: BOSS_CX - 70, y: BOSS_CY - 40 }
  const d = `M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 90} ${to.x} ${to.y}`
  return (
    <g data-bolt className="d2-bolt" pointerEvents="none">
      <path d={d} stroke="#ffd34d" strokeWidth={34} fill="none" opacity={0.35} filter="url(#d2-soft)" strokeLinecap="round" />
      <path d={d} stroke="url(#d2-bolt)" strokeWidth={14} fill="none" strokeLinecap="round" />
      <path d={d} stroke="#fff" strokeWidth={5} fill="none" strokeLinecap="round" />
      <circle cx={to.x} cy={to.y} r={80} fill="url(#d2-burst)" />
      <path d={sparkle(to.x, to.y, 46)} fill="#fff6d8" />
      <path d={sparkle(to.x - 50, to.y - 40, 18)} fill="#ffd34d" />
      <path d={sparkle(to.x - 30, to.y + 50, 14)} fill="#ffd34d" />
    </g>
  )
}

/** The win: a big burst of light with rays and sparkles; on a first win the boss in a golden frame flies up to the shelf. */
function BossWin({ boss }: { boss: BossView }) {
  const rays = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2
    const a2 = a + 0.12
    return `${BOSS_CX},${BOSS_CY} ${BOSS_CX + Math.cos(a) * 1100},${BOSS_CY + Math.sin(a) * 1100} ${BOSS_CX + Math.cos(a2) * 1100},${BOSS_CY + Math.sin(a2) * 1100}`
  })
  const fly = IMAGES[`boss-${boss.kind}-fly`]
  return (
    <g pointerEvents="none">
      <g data-boss-burst className="d2-boss-burst">
        {rays.map((pts, i) => <polygon key={i} points={pts} fill="#fff3c4" opacity={0.16} />)}
        <circle cx={BOSS_CX} cy={BOSS_CY} r={430} fill="url(#d2-bigburst)" />
        {[[-280, -280, 30], [130, -240, 24], [-200, 230, 22], [100, 200, 34], [-420, 0, 18], [0, -340, 20]].map(([dx, dy, r], i) => (
          <path key={i} d={sparkle(BOSS_CX + dx, BOSS_CY + dy, r)} fill="#fff6d8" className="d2-twinkle" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </g>
      {boss.first && (
        <g data-trophy-frame className="d2-trophy-fly">
          <circle cx={BOSS_CX} cy={BOSS_CY} r={190} fill="url(#d2-gold)" />
          <circle cx={BOSS_CX} cy={BOSS_CY} r={165} fill="#2a1660" />
          <clipPath id="d2-trophy-clip"><circle cx={BOSS_CX} cy={BOSS_CY} r={165} /></clipPath>
          <g clipPath="url(#d2-trophy-clip)">
            <g transform={faceTransform(FACING[`boss-${boss.kind}`] ?? 'left', 'left', BOSS_CX)}>
              {fly && <image href={fly} x={BOSS_CX - 150} y={BOSS_CY - 150} width={300} height={300} preserveAspectRatio="xMidYMid meet" />}
            </g>
          </g>
          <path d={sparkle(BOSS_CX + 140, BOSS_CY - 150, 30)} fill="#fff6d8" />
        </g>
      )}
    </g>
  )
}

/**
 * The pictures a flight can need suddenly (the boss's poses), drawn all the time at near-zero opacity so the browser has
 * them decoded: a picture must never appear after the rest (rule; the old potion's first frames were empty).
 */
function Warm({ boss }: { boss?: string }) {
  const ids = (boss ? ['fly', 'hit', 'down'].map((p) => `boss-${boss}-${p}`) : []).filter((id) => IMAGES[id])
  return (
    <g data-warm opacity={0.004} pointerEvents="none" aria-hidden>
      {ids.map((id) => <image key={id} href={IMAGES[id]} x={WIZ_X - 40} y={LANE_Y[1] - 40} width={BOSS_BOX.w} height={BOSS_BOX.h} />)}
    </g>
  )
}
