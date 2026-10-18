// The clock face: SVG so hands, numbers and scaffolds stay crisp and interactive (spec: Exercises).
// The clock kind's case image (when generated) frames it; until then a plain wooden rim.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { type HandPose, angleDelta } from '../logic/time'
import type { ClockKind } from '../logic/workday'
import { IMAGES } from '../assets/images'
import { CASE_DISCS } from '../assets/caseDiscs'

export const HAND_COLORS = { hour: '#c0392b', minute: '#1f5fa8', second: '#e67e22' }
export interface Sector { from: number; to: number; color: string }

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return [r * Math.sin(a), -r * Math.cos(a)] as const
}
export function angleFromPointer(clientX: number, clientY: number, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) {
  const x = clientX - (rect.left + rect.width / 2)
  const y = clientY - (rect.top + rect.height / 2)
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
}
function sectorPath({ from, to }: Sector, r: number) {
  const [x1, y1] = pt(from, r)
  const [x2, y2] = pt(to, r)
  const large = ((to - from + 360) % 360) > 180 ? 1 : 0
  return `M0 0 L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

/**
 * Keeps a displayed angle continuous, so a glide from 350° to 10° turns 20° forward, not 340° back. `forward`: always
 * turn clockwise, as time moves (explanations: QA 2026-10-15, "ten to four" turned the long hand back from 12 to 10).
 */
function useContinuous(angle: number, forward = false) {
  const ref = useRef(angle)
  ref.current = ref.current + (forward ? (((angle - ref.current) % 360) + 360) % 360 : angleDelta(ref.current, angle))
  return ref.current
}

export type Disc = { cx: number; cy: number; r: number; aspect?: number }

/**
 * The box a clock needs, in face sizes: the face plus its whole case (so a case never covers other UI).
 * x, y = where the face sits inside the box. clip = the most the box may grow past the face per axis,
 * centred on the face (small option clocks: the case is cut off there, the face stays big).
 */
export interface Extent { w: number; h: number; x: number; y: number }
export function discExtent(disc: Disc | undefined, hasCase: boolean, clip?: number): Extent {
  let [l, t, r, b] = [0, 0, 1, 1]
  if (hasCase && disc?.aspect) {
    const w = (92 / 110) * 0.5 / disc.r
    const h = w * disc.aspect
    const il = 0.5 - disc.cx * w
    const it = 0.5 - disc.cy * h
    ;[l, t, r, b] = [Math.min(0, il), Math.min(0, it), Math.max(1, il + w), Math.max(1, it + h)]
  } else if (hasCase) [l, t, r, b] = [-0.12, -0.12, 1.12, 1.12] // the CSS-placed case (.ck-case)
  if (clip) {
    const half = clip / 2
    ;[l, t, r, b] = [Math.max(l, 0.5 - half), Math.max(t, 0.5 - half), Math.min(r, 0.5 + half), Math.min(b, 0.5 + half)]
  }
  return { w: r - l, h: b - t, x: 0 - l, y: 0 - t }
}
/** The extent of a clock kind's case art (the plain rim when the kind has no art). */
export const clockExtent = (kind: ClockKind | undefined, clip?: number) =>
  discExtent(kind ? CASE_DISCS[kind] : undefined, !!(kind && IMAGES[`case-${kind}`]), clip)
/** Sizes and places the case image so its face disc sits under the SVG face (radius 92 of 110). */
export function caseImgStyle(disc: Disc, size: number) {
  return {
    position: 'absolute' as const,
    width: ((92 / 110) * (size / 2)) / disc.r,
    height: 'auto' as const,
    left: size / 2,
    top: size / 2,
    transform: `translate(${-disc.cx * 100}%, ${-disc.cy * 100}%)`,
    maxWidth: 'none' as const,
  }
}

export interface ClockFaceProps {
  pose: HandPose
  numbers?: 'all' | 'quarters' | 'none'
  /** the minutes hint: true or 'minutes' = the minutes at every number; 'quarters' = the quarters only */
  ring?: boolean | 'minutes' | 'quarters'
  /** the past (right) / to (left) shading */
  slice?: boolean
  sectors?: Sector[]
  /** a ticking seconds hand starting at this angle; null/undefined = none */
  secondsFrom?: number | null
  /** the seconds hand waits at secondsFrom (while the question is read: the trap must stay where it was set) */
  secondsFrozen?: boolean
  glow?: 'hour' | 'minute' | 'second' | 'quarters' | null
  kind?: ClockKind
  size: number
  /** animate hand moves (feedback, explanations) */
  glide?: boolean
  /** glides always turn clockwise (explanations) */
  forward?: boolean
  /** the glowing hand's halo pulses (Set the clock: the hand to move) */
  pulse?: boolean
  children?: ReactNode
  /** HTML laid over the face (exactly the face's square), e.g. the hand setter's touch layer */
  overlay?: ReactNode
  /** cut the case off at this many face sizes (see discExtent); default: reserve the whole case */
  caseClip?: number
  /** test seam: replace the looked-up case image and disc */
  testCase?: { url: string; disc: Disc | undefined }
}

/**
 * A case cut off around the face fades out at the box edges instead of ending in a hard line (the playtest: "some graphics
 * are cut, especially at the top and bottom"). The fade stays in the margin around the face, so the face is never faded.
 */
function clipFade(clip: number): CSSProperties {
  const pct = Math.max(4, Math.round(((clip - 1) / 2 / clip) * 80))
  const mask = `linear-gradient(to bottom, transparent, #000 ${pct}%, #000 ${100 - pct}%, transparent), linear-gradient(to right, transparent, #000 ${pct}%, #000 ${100 - pct}%, transparent)`
  return { overflow: 'hidden', maskImage: mask, WebkitMaskImage: mask, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' } as CSSProperties
}

export function ClockFace({ pose, numbers = 'all', ring, slice, sectors = [], secondsFrom, secondsFrozen, glow, kind, size, glide, forward, pulse, children, overlay, caseClip, testCase }: ClockFaceProps) {
  const hour = useContinuous(pose.hour, forward)
  const minute = useContinuous(pose.minute, forward)
  const [sec, setSec] = useState(secondsFrom ?? 0)
  useEffect(() => {
    if (secondsFrom == null) return
    setSec(secondsFrom)
    if (secondsFrozen) return
    const id = window.setInterval(() => setSec((s) => s + 6), 1000)
    return () => window.clearInterval(id)
  }, [secondsFrom, secondsFrozen])
  const shownNums = numbers === 'all' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : numbers === 'quarters' ? [12, 3, 6, 9] : []
  const caseImg = testCase ? testCase.url : kind ? IMAGES[`case-${kind}`] : undefined
  const disc = testCase ? testCase.disc : kind ? CASE_DISCS[kind] : undefined
  const handStyle = (deg: number) => ({ transform: `rotate(${deg}deg)`, transition: glide ? 'transform 0.9s ease-in-out' : undefined })
  const glowFilter = (on: boolean) => (on ? 'drop-shadow(0 0 6px #ffd54a) drop-shadow(0 0 12px #ffd54a)' : undefined)
  const ext = discExtent(disc, !!caseImg, caseClip)
  // A glowing hand gets a soft halo drawn under the numerals, so the numeral it passes stays dark and crisp.
  const halo = glow === 'hour' ? { deg: hour, y1: 10, y2: -46, w: 22 } : glow === 'minute' ? { deg: minute, y1: 12, y2: -74, w: 18 }
    : glow === 'second' ? { deg: sec, y1: 16, y2: -82, w: 12 } : null

  return (
    <div className="ck-clock" style={{ width: ext.w * size, height: ext.h * size, position: 'relative', ...(caseClip && caseImg ? clipFade(caseClip) : {}) }}>
      <div className="ck-face" style={{ width: size, height: size, position: 'absolute', left: ext.x * size, top: ext.y * size }}>
        {caseImg && <img src={caseImg} alt="" draggable={false} className="ck-case" style={{ ...((disc ? caseImgStyle(disc, size) : undefined) ?? {}), pointerEvents: 'none' as const }} />}
        {/* overflow visible: the hint badges on the rim must not be cut at the edge of the drawing (the parent 2026-10-17) */}
        <svg viewBox="-110 -110 220 220" width={size} height={size} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {!caseImg && <circle r="104" fill="#8a5a2b" />}
          <circle r="92" fill="#fff8e7" />
          {slice && (
            <>
              <path d={sectorPath({ from: 0, to: 180, color: '' }, 90)} fill="rgba(255, 196, 120, 0.28)" data-slice="past" />
              <path d={sectorPath({ from: 180, to: 360, color: '' }, 90)} fill="rgba(120, 170, 255, 0.22)" data-slice="to" />
            </>
          )}
          {sectors.map((s, i) => (
            <path key={i} d={sectorPath(s, 90)} fill={s.color} />
          ))}
          {Array.from({ length: 60 }, (_, i) => {
            const big = i % 5 === 0
            const [x1, y1] = pt(i * 6, big ? 80 : 85)
            const [x2, y2] = pt(i * 6, 90)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5a3417" strokeWidth={big ? 3 : 1} />
          })}
          {halo && (
            <g data-halo={glow} data-pulse={pulse ? '1' : undefined} className={pulse ? 'ck-halo-pulse' : undefined} style={handStyle(halo.deg)}>
              <line x1="0" y1={halo.y1} x2="0" y2={halo.y2} stroke="#ffd54a" strokeWidth={halo.w} strokeLinecap="round" opacity="0.7"
                style={{ filter: 'blur(4px)' }} />
            </g>
          )}
          {shownNums.map((n) => {
            const [x, y] = pt(n * 30, 66)
            const lit = glow === 'quarters' && n % 3 === 0
            return (
              <text key={n} data-num={n} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="700"
                fill={lit ? '#d35400' : '#3b2412'} style={{ filter: glowFilter(lit) }}>
                {n}
              </text>
            )
          })}
          {numbers !== 'all' && glow === 'quarters' &&
            [0, 90, 180, 270].map((a) => {
              const [x, y] = pt(a, 66)
              return <circle key={a} cx={x} cy={y} r="9" fill="#ffd54a" />
            })}
          {ring === 'quarters' && (
            // the quarters hint: the face cut into four by faint lines, and the minutes at each quarter
            <g data-ring="quarters">
              {[0, 90, 180, 270].map((q) => {
                const [x, y] = pt(q, 90)
                return <line key={q} x1="0" y1="0" x2={x} y2={y} stroke="#1f5fa8" strokeWidth="2" strokeDasharray="5 5" opacity="0.45" />
              })}
              {[0, 90, 180, 270].map((q) => {
                const [x, y] = pt(q, 98)
                return (
                  <g key={q}>
                    <circle cx={x} cy={y} r="10.5" fill="#fff8e7" stroke="#1f5fa8" strokeWidth="1.5" />
                    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="12" fill="#1f5fa8" fontWeight="700">
                      {String(q / 6).padStart(2, '0')}
                    </text>
                  </g>
                )
              })}
            </g>
          )}
          {ring && ring !== 'quarters' && (
            // the minutes hint: the minutes at each number, on light badges so they read on any case
            <g data-ring="minutes">
              {Array.from({ length: 12 }, (_, i) => {
                const [x, y] = pt(i * 30, 99)
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="9" fill="#fff8e7" opacity="0.92" />
                    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="11" fill="#1f5fa8" fontWeight="700">
                      {String(i * 5).padStart(2, '0')}
                    </text>
                  </g>
                )
              })}
            </g>
          )}
          <g data-hand="hour" data-glow={glow === 'hour' ? 'on' : undefined} style={handStyle(hour)}>
            <line x1="0" y1="10" x2="0" y2="-46" stroke={HAND_COLORS.hour} strokeWidth="10" strokeLinecap="round" />
          </g>
          <g data-hand="minute" data-glow={glow === 'minute' ? 'on' : undefined} style={handStyle(minute)}>
            <line x1="0" y1="12" x2="0" y2="-74" stroke={HAND_COLORS.minute} strokeWidth="6" strokeLinecap="round" />
          </g>
          {secondsFrom != null && (
            <g data-hand="second" data-glow={glow === 'second' ? 'on' : undefined} style={{ transform: `rotate(${sec}deg)` }}>
              <line x1="0" y1="16" x2="0" y2="-82" stroke={HAND_COLORS.second} strokeWidth="2" strokeLinecap="round" />
            </g>
          )}
          <circle r="7" fill="#333" />
          {children}
        </svg>
        {overlay}
      </div>
    </div>
  )
}
