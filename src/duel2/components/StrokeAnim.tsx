// The glowing hand writes strokes one by one (spec: demo first): each stroke is a glowing line that follows the
// fingertip; a one-point stroke is a tap that leaves a dot. Its pace is strokeTiming (the controller waits the same time).
// Points are in letter units (the timing is the controller's); `map` puts them on the stage. `loop` repeats (the review page); `numbers` shows each stroke's number at its start.
import { useEffect, useState } from 'react'
import type { Pt } from '../data/strokes'
import { DEMO_FADE_MS, strokeTiming } from '../logic/drawLayout'
import { pathLength, subpath } from '../logic/recognizer'
import { HandShape } from './DemoHand'

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)
const poly = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/** where the pen is at time `ms`, and how much of each stroke is drawn (pure; tested) */
export function penAt(strokes: Pt[][], ms: number): { drawn: number[]; tip: Pt; pressing: boolean } {
  const { start, dur } = strokeTiming(strokes)
  const drawn = strokes.map((_, i) => Math.min(1, Math.max(0, (ms - start[i]) / dur[i])))
  let tip: Pt = strokes[0]?.[0] ?? [0, 0]
  let pressing = false
  for (let i = 0; i < strokes.length; i++) {
    const s = strokes[i]
    if (ms < start[i]) {
      // between strokes the hand glides to the next start
      const prevEnd = i > 0 ? strokes[i - 1][strokes[i - 1].length - 1] : s[0]
      const gapFrom = i > 0 ? start[i - 1] + dur[i - 1] : 0
      const k = i > 0 ? ease(Math.min(1, Math.max(0, (ms - gapFrom) / (start[i] - gapFrom)))) : 1
      tip = [prevEnd[0] + (s[0][0] - prevEnd[0]) * k, prevEnd[1] + (s[0][1] - prevEnd[1]) * k]
      break
    }
    if (ms <= start[i] + dur[i]) {
      pressing = true
      const sub = s.length > 1 ? subpath(s, drawn[i]) : s
      tip = sub[sub.length - 1]
      break
    }
    tip = s[s.length - 1]
  }
  return { drawn, tip, pressing }
}

/** `ms`: an outside clock (the review page drives many at once); `still`: drawn in full, no hand */
export function StrokeAnim(p: { strokes: Pt[][]; map: (q: Pt) => Pt; width: number; loop?: boolean; numbers?: boolean; handScale?: number; ms?: number; still?: boolean }) {
  const [own, setMs] = useState(0)
  const { total } = strokeTiming(p.strokes)
  const outside = p.ms !== undefined || !!p.still
  useEffect(() => {
    if (outside) return
    let raf = 0
    let t0 = performance.now()
    const step = (now: number) => {
      let e = now - t0
      if (p.loop && e > total + 700) { t0 = now; e = 0 }
      setMs(e)
      if (p.loop || e < total) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // one run per mount (the parent keys it by the demo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const ms = p.still ? total - DEMO_FADE_MS - 1 : p.ms !== undefined ? p.ms % (total + 700) : own
  const { drawn, tip: tipN, pressing } = penAt(p.strokes, ms)
  const tip = p.map(tipN)
  const M = (q: Pt[]) => q.map(p.map)
  const fade = Math.min(1, Math.max(0, (total - ms) / DEMO_FADE_MS))
  const { start } = strokeTiming(p.strokes)
  return (
    <g data-stroke-anim style={{ opacity: fade, pointerEvents: 'none' }}>
      {p.strokes.map((s, i) => {
        if (drawn[i] <= 0) return null
        const tap = s.length < 2 || pathLength(s) < 0.02
        const [cx, cy] = p.map(s[0])
        return tap
          ? <g key={i} data-demo-stroke>
            <circle cx={cx} cy={cy} r={p.width * 1.5 * Math.min(1, drawn[i] * 2)} fill="#ffd34d" opacity={0.3} />
            <circle cx={cx} cy={cy} r={p.width * 0.75 * Math.min(1, drawn[i] * 2)} fill="#fff1a0" />
          </g>
          : <g key={i} data-demo-stroke>
            {/* a halo under the line: a glow without a blur filter (it repaints every frame; the tablet is old) */}
            <polyline points={poly(M(subpath(s, drawn[i])))} fill="none" stroke="#ffd34d" strokeOpacity={0.3} strokeWidth={p.width * 2.6} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={poly(M(subpath(s, drawn[i])))} fill="none" stroke="#fff1a0" strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" />
          </g>
      })}
      {p.numbers && p.strokes.map((s, i) => { const [nx, ny] = p.map(s[0]); return ms >= start[i] - 200 ? (
        <g key={`n${i}`} data-stroke-number={i + 1}>
          <circle cx={nx} cy={ny} r={p.width * 1.1} fill="#7a3fd0" stroke="#fff6d8" strokeWidth={2} />
          <text x={nx} y={ny + p.width * 0.45} fontSize={p.width * 1.3} textAnchor="middle" fill="#fff6d8" fontFamily="sans-serif">{i + 1}</text>
        </g>
      ) : null })}
      {fade > 0 && !p.still && <HandShape x={tip[0]} y={tip[1]} scale={p.handScale ?? 1} press={pressing} />}
    </g>
  )
}
