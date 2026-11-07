// 6 · Drawing: the word's picture, and the word on writing lines with its first letter missing — an empty framed slot
// where he writes the letter from memory (print or handwriting, the script of the word). His strokes are white while he
// draws, gold when right; a wrong one fades while the glowing hand shows it again. After the letter, its marks.
import { useRef } from 'react'
import { IMAGES } from '../../assets/images'
import type { DrawView } from '../../controller'
import type { Pt } from '../../data/strokes'
import { BOARD, PIC, toNorm, toStagePt, type DrawLayout } from '../../logic/drawLayout'
import { canvasMeasurer, shinDots } from '../Glyph'
import { StrokeAnim } from '../StrokeAnim'
import { bbox, markTargets, pathLength } from '../../logic/recognizer'
import { strokesOf } from '../../data/strokes'
import { TEST_HOOKS } from '../../testHooks'
import { Stage, toStage, type Phase } from './Stage'

const poly = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
const INK = { fill: '#fff6d8', stroke: '#1b0f3c', paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const }

/** The word without its first letter, in the word's script, on the baseline (marks drawn by the game for ש: rule). */
function WordText({ L, glowVav }: { L: DrawLayout; glowVav: boolean }) {
  const base = L.lines.base
  const font = L.rest.font
  const px = L.rest.px
  const shin = L.script === 'print' ? shinDots(L.rest.text, px, canvasMeasurer) : null
  const text = (t: string, x: number, attrs: Record<string, unknown> = {}) => (
    <text data-glyph x={x} y={base} fontSize={px} textAnchor="middle" direction="rtl"
      style={{ ...INK, fontFamily: `${font}, 'Noto Sans Hebrew', serif`, strokeWidth: Math.max(2, px * 0.04), unicodeBidi: 'isolate' }} {...attrs}>{t}</text>
  )
  return (
    <g data-word>
      {L.rest.text && text(shin ? shin.text : L.rest.text, L.rest.cx)}
      {shin?.dots.map((d, i) => <circle key={i} data-glyph cx={L.rest.cx + d.dx} cy={base + d.dy} r={d.r} style={{ ...INK, strokeWidth: 2 }} />)}
      {L.vav && text('ו', L.vav.cx, { 'data-vav': '', className: glowVav ? 'd2-vav-glow' : undefined })}
    </g>
  )
}

/** `bare`: no picture (the parent's test board) */
export function Draw(p: { view: DrawView; phase: Phase; onStroke: (pts: Pt[]) => void; bare?: boolean }) {
  const v = p.view
  const L = v.layout
  const can = p.phase === 'answer'
  const live = useRef<{ id: number; pts: Pt[] } | null>(null)
  const liveEl = useRef<SVGPolylineElement | null>(null)
  const w = Math.max(9, L.u * 0.085)
  const map = (q: Pt) => toStagePt(L, q)
  const at = (e: React.PointerEvent): Pt => { const q = toStage(e.currentTarget as Element, e.clientX, e.clientY); return [q.x, q.y] }
  const show = () => { if (liveEl.current) liveEl.current.setAttribute('points', live.current ? poly(live.current.pts) : '') }
  const end = (e: React.PointerEvent) => {
    const s = live.current
    if (!s || s.id !== e.pointerId) return
    live.current = null
    show()
    p.onStroke(s.pts.map((q) => toNorm(L, q)))
  }
  const ok = v.strokes.filter((s) => s.state === 'ok' || s.state === 'helped')
  const markVav = v.glow === 'marks' && v.marks.some((m) => m.zone.startsWith('vav'))
  const pic = IMAGES[v.word.picture]
  if (TEST_HOOKS && typeof window !== 'undefined') {
    // the verify build draws the right strokes and marks with real touches (never in a release build)
    ;(window as unknown as { __d2draw?: unknown }).__d2draw = {
      layout: { x0: L.x0, top: L.top, u: L.u }, letter: v.letter, script: v.script, mode: v.mode,
      expected: strokesOf(v.letter, v.script).variants[0].map((s) => s.pts),
      marks: () => markTargets(v.marks, { letter: bbox(ok.flatMap((s) => s.pts)), vav: L.vav?.box }),
    }
  }
  const lineY = (y: number) => L.top + y * L.u
  return (
    <Stage bg="bg-ground">
      {!p.bare && <g data-picture>
        <rect x={PIC.x - PIC.size / 2 - 14} y={PIC.y - PIC.size / 2 - 14} width={PIC.size + 28} height={PIC.size + 28} rx={36} fill="#fff6d8" opacity={0.92} stroke="#ffd34d" strokeWidth={6} />
        {pic ? <image href={pic} x={PIC.x - PIC.size / 2} y={PIC.y - PIC.size / 2} width={PIC.size} height={PIC.size} />
          : <circle cx={PIC.x} cy={PIC.y} r={PIC.size / 3} fill="#c9b6ff" />}
      </g>}
      <rect data-draw-board x={BOARD.left} y={BOARD.top} width={BOARD.right - BOARD.left} height={BOARD.bottom - BOARD.top} rx={30}
        fill="#160a35" fillOpacity={0.86} stroke="#ffd34d" strokeOpacity={0.55} strokeWidth={5} />
      {/* the writing lines: top, middle (faint), baseline, and the line below for descenders */}
      <g data-lines stroke="#fff6d8" strokeLinecap="round">
        <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.top} y2={L.lines.top} strokeWidth={4} strokeOpacity={0.5} />
        <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.mid} y2={L.lines.mid} strokeWidth={3} strokeOpacity={0.18} strokeDasharray="14 16" />
        <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.base} y2={L.lines.base} strokeWidth={5} strokeOpacity={0.6} />
        <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.below} y2={L.lines.below} strokeWidth={3} strokeOpacity={0.3} strokeDasharray="6 12" />
      </g>
      <rect data-slot x={L.slot.left} y={L.slot.top} width={L.slot.right - L.slot.left} height={L.slot.bottom - L.slot.top} rx={24}
        className={can && v.mode === 'letter' ? 'd2-slot-pulse' : undefined}
        fill="#ffd34d" fillOpacity={0.06} stroke="#ffd34d" strokeWidth={5} strokeDasharray="22 14" strokeOpacity={v.mode === 'done' ? 0.25 : 0.85} />
      <WordText L={L} glowVav={markVav} />
      <g data-strokes className={v.mode === 'done' ? 'd2-drawn' : v.glow === 'marks' ? 'd2-drawn-soft' : undefined}>
        {v.strokes.map((s) => {
          const pts = s.pts.map(map)
          const gold = s.state === 'ok' || s.state === 'helped'
          const color = gold ? '#ffd34d' : s.state === 'wrong' ? '#ff8a7a' : '#ffffff'
          const tap = s.pts.length < 2 || pathLength(s.pts) < 0.05
          const cls = s.state === 'wrong' ? 'd2-stroke-fade' : undefined
          // gold strokes glow with a halo under them (no blur filter: cheap on the old tablet)
          return tap
            ? <g key={s.id} className={cls}>
              {gold && <circle className="d2-halo" cx={pts[0][0]} cy={pts[0][1]} r={w * 1.4} fill="#ffd34d" opacity={0.3} />}
              <circle data-stroke={s.state} cx={pts[0][0]} cy={pts[0][1]} r={w * 0.7} fill={color} />
            </g>
            : <g key={s.id} className={cls} opacity={s.state === 'pending' ? 0.75 : 1}>
              {gold && <polyline className="d2-halo" points={poly(pts)} fill="none" stroke="#ffd34d" strokeOpacity={0.3} strokeWidth={w * 2.6} strokeLinecap="round" strokeLinejoin="round" />}
              <polyline data-stroke={s.state} points={poly(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
            </g>
        })}
      </g>
      {v.lineFx && (
        <g data-linefx={v.lineFx.kind} className="d2-linefx">
          {v.lineFx.outside && (
            <clipPath id="d2-outside">
              <rect x={0} width={1600} y={Math.max(-900, lineY(Math.max(-5, v.lineFx.outside.from)))}
                height={Math.min(2700, lineY(Math.min(6, v.lineFx.outside.to)) - Math.max(-900, lineY(Math.max(-5, v.lineFx.outside.from))))} />
            </clipPath>
          )}
          <g clipPath={v.lineFx.outside ? 'url(#d2-outside)' : undefined}>
            {ok.map((s) => <polyline key={s.id} points={poly(s.pts.map(map))} fill="none" stroke="#ff9a2e" strokeWidth={w * 1.6} strokeLinecap="round" strokeLinejoin="round" />)}
          </g>
        </g>
      )}
      {v.demo && <StrokeAnim key={v.demo.id} strokes={v.demo.strokes} map={map} width={w} handScale={Math.max(0.8, L.u / 260)} />}
      {/* his finger: all the stage beside the picture takes strokes (a letter may poke out of the slot, or above the board);
          a tap is a dot (marks) */}
      <rect data-draw-pad x={0} y={95} width={PIC.x - PIC.size / 2 - 20} height={805} fill="transparent"
        style={{ cursor: can ? 'crosshair' : 'default' }}
        onPointerDown={(e) => {
          if (!can || live.current) return
          e.preventDefault()
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          live.current = { id: e.pointerId, pts: [at(e)] }
          show()
        }}
        onPointerMove={(e) => {
          const s = live.current
          if (!s || s.id !== e.pointerId) return
          const q = at(e)
          const last = s.pts[s.pts.length - 1]
          if (Math.hypot(q[0] - last[0], q[1] - last[1]) < 3) return
          s.pts.push(q)
          show()
        }}
        onPointerUp={end}
        onPointerCancel={() => { live.current = null; show() }} />
      <polyline ref={liveEl} data-live points="" fill="none" stroke="#ffffff" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
    </Stage>
  )
}
