// 5 · Door corridor: a two-syllable word on the door's plate; the syllables light one at a time, right to left (no voice
// says the word before he picks). Three keys hang under the door, each with a picture in its handle. When it opens, the
// next door (or, behind the last one, the crystal) shows far away in the doorway's light ("no additional door behind");
// the camera moves into the doorway while its light fills the screen, and the next door comes out of that light (the
// parent found the earlier exact zoom ugly: a stretched picture and a growing box).
import { IMAGES } from '../../assets/images'
import { syllable } from '../../logic/content'
import type { Word } from '../../data/words'
import { DragPick } from '../DragPick'
import { Glyph, canvasMeasurer } from '../Glyph'
import { Plate } from '../Orb'
import { useEffect, useLayoutEffect, useState } from 'react'
import { Stage, type Phase } from './Stage'

export const DOOR_GLYPH_PX = 110
/** the room for the word inside the plate's frame (stage units) */
export const PLATE_INNER = 330
const SYL_GAP = 0.3

/**
 * The word on the plate: syllables right to left, side by side by their ink widths (measured at DOOR_GLYPH_PX) with one
 * gap between them, centred; a word too long for the plate gets smaller letters (the parent: דּוּר ran off the plate).
 */
export function doorWordLayout(widths: number[]): { px: number; cx: number[] } {
  const gap = SYL_GAP * DOOR_GLYPH_PX
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, widths.length - 1)
  const f = Math.min(1, PLATE_INNER / total)
  const cx: number[] = []
  let right = 800 + (total * f) / 2
  for (const w of widths) { cx.push(right - (w * f) / 2); right -= w * f + gap * f }
  return { px: DOOR_GLYPH_PX * f, cx }
}
const inkWidth = (text: string) => {
  const b = canvasMeasurer(text, DOOR_GLYPH_PX)
  if (b) return b.left + b.right
  // no canvas (tests): about two thirds of the size for each letter
  return [...text.normalize('NFD')].filter((ch) => /[\u05d0-\u05ea]/.test(ch)).length * DOOR_GLYPH_PX * 0.62
}
const DH = 560
const DW = DH * (519 / 600)
/** the door on the stage */
export const DOOR_BOX = { x: 800 - DW / 2, top: 95, w: DW, h: DH }
/** the bright gap between the open leaves in s-door-open (fractions of the sprite) */
const GAP = { x0: 0.385, x1: 0.615, y0: 0.18, y1: 0.975 }
/** the next door, small and far away in the doorway */
const NEXT_SCALE = 0.17
const NEXT_TOP = DOOR_BOX.top + GAP.y1 * DH - 10 - NEXT_SCALE * DH
/** the camera moves toward the middle of the doorway */
const ZOOM_C = { x: 800, y: DOOR_BOX.top + ((GAP.y0 + GAP.y1) / 2) * DH }
const ZOOM_K = 2.6
export const ZOOM_MS = 1300
const easeIn = (u: number) => u * u * (3 - 2 * u) * (0.4 + 0.6 * u)
const smooth = (a: number, b: number, u: number) => { const x = Math.min(1, Math.max(0, (u - a) / (b - a))); return x * x * (3 - 2 * x) }

/** Going through at progress u (0–1): the camera's scale about the doorway's middle, and how much its light covers the screen. */
export function throughDoor(u: number): { k: number; light: number } {
  const v = Math.min(1, Math.max(0, u))
  return { k: 1 + (ZOOM_K - 1) * easeIn(v), light: v >= 1 ? 1 : smooth(0.3, 0.92, v) }
}

/** Set when the flight through a door ends in full light: the next door (or the crystal) then comes out of the light. */
let arrived = false
export function markArrivedThroughLight() { arrived = true }
export function takeArrivedThroughLight() { const a = arrived; arrived = false; return a }
/** The light the next room comes out of (it fades away by itself). */
export function ArriveLight() {
  return <rect data-arrive-light className="d2-arrive-light" x={-400} y={-300} width={2400} height={1500} fill="#fff6d8" pointerEvents="none" />
}

/** What waits behind the door, far away in its light: the next door (its plate still blank), or the crystal. */
function NextRoom(p: { crystal?: number }) {
  if (p.crystal !== undefined) {
    const k = ((p.crystal % 4) + 4) % 4
    return (
      <g data-next-crystal>
        <circle cx={800} cy={450} r={420} fill="#ffd34d" opacity={0.35} />
        {IMAGES[`s-crystal-${k + 1}`] && <image href={IMAGES[`s-crystal-${k + 1}`]} x={600} y={190} width={400} height={520} />}
      </g>
    )
  }
  return (
    <g data-next-door>
      {IMAGES['s-door'] ? <image href={IMAGES['s-door']} x={DOOR_BOX.x} y={DOOR_BOX.top} width={DW} height={DH} />
        : <rect x={DOOR_BOX.x} y={DOOR_BOX.top} width={DW} height={DH} rx={DW / 2} fill="#2a1660" stroke="#ffd34d" strokeWidth={8} />}
      <Plate w={420} x={800} y={340} state="idle" />
    </g>
  )
}
export const KEY_X = [520, 800, 1080]

/** Where the round handle's disc sits in the key sprite (measured): centre and radius as fractions of the sprite width/height. */
export const KEY_BOW = { cx: 0.5, cy: 0.345, r: 0.369 }
const DISC_R = 80
const KEY_W = DISC_R / KEY_BOW.r
const KEY_H = KEY_W * (600 / 428)

function KeyShape(p: { x: number; y: number; picture: string; state: 'idle' | 'reveal' | 'wrong' | 'off'; correct: boolean }) {
  const ring = p.state === 'reveal' ? '#ffd34d' : p.state === 'wrong' ? '#ff4d6a' : '#e7b860'
  const pic = DISC_R * 1.5
  return (
    <g className="d2-key" opacity={p.state === 'off' ? 0.4 : 1}>
      {IMAGES['s-key']
        ? <image href={IMAGES['s-key']} x={p.x - KEY_W * KEY_BOW.cx} y={p.y - KEY_H * KEY_BOW.cy} width={KEY_W} height={KEY_H} />
        : <g stroke={ring} strokeWidth={12} fill="none"><circle cx={p.x} cy={p.y} r={DISC_R + 12} /><path d={`M${p.x} ${p.y + DISC_R + 12} v110 m0 -40 h34 m-34 30 h24`} /></g>}
      <circle data-key-disc cx={p.x} cy={p.y} r={DISC_R} fill={IMAGES['s-key'] ? 'none' : '#2a1660'} stroke={ring} strokeWidth={p.state === 'idle' ? 0 : 10} />
      {IMAGES[p.picture] && <image data-key-picture href={IMAGES[p.picture]} x={p.x - pic / 2} y={p.y - pic / 2} width={pic} height={pic} />}
      <rect data-pick x={p.x - 110} y={p.y - 110} width={220} height={KEY_H * (1 - KEY_BOW.cy) + 110} fill="transparent" {...(p.correct ? { 'data-correct': '1' } : {})} />
    </g>
  )
}

export function Doors(p: { word: Word; lit: 0 | 1 | 2; keys: Word[]; onPick: (id: string) => void; phase: Phase; opening: boolean; zooming: boolean; reveal?: { right: string; wrong?: string }; showCorrect?: boolean
  /** behind the last door: the crystal (its kind); otherwise another door */
  behind?: { crystal: number }
  /** the demo carries this key to the door as the hand moves (t from 0 to 1) */
  demo?: { id: string; t: number }
}) {
  const syls = (p.word.syllables ?? []).map((s) => syllable(s.item, s.mark).text + (s.tail ?? ''))
  // right to left: the first syllable sits on the right
  const lay = doorWordLayout(syls.map(inkWidth))
  const cx = lay.cx
  const dh = DH
  const dw = DW
  const can = p.phase === 'answer'
  // the flight through the doorway, frame by frame (a CSS zoom was flaky)
  const [u, setU] = useState(0)
  useEffect(() => {
    if (!p.zooming) { setU(0); return }
    let raf = 0
    const t0 = performance.now()
    const step = () => {
      const v = Math.min(1, (performance.now() - t0) / ZOOM_MS)
      setU(v)
      if (v < 1) raf = requestAnimationFrame(step)
      else markArrivedThroughLight()
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [p.zooming])
  const z = throughDoor(p.zooming ? u : 0)
  // the next door comes out of the light the last one ended in
  const [arrive, setArrive] = useState(0)
  useLayoutEffect(() => { if (takeArrivedThroughLight()) setArrive((a) => a + 1) }, [p.word.id])
  // the doorway (in the scene's own units)
  const g = { x: DOOR_BOX.x + GAP.x0 * dw, y: DOOR_BOX.top + GAP.y0 * dh, w: (GAP.x1 - GAP.x0) * dw, h: (GAP.y1 - GAP.y0) * dh }
  return (
    <Stage bg="bg-ground">
      <defs>
        <clipPath id="d2-doorway"><rect x={g.x} y={g.y} width={g.w} height={g.h} rx={14} /></clipPath>
        <radialGradient id="d2-door-light" cx={ZOOM_C.x} cy={ZOOM_C.y} r={900} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fffbe8" stopOpacity="1" /><stop offset="0.35" stopColor="#ffe9a8" stopOpacity="0.9" /><stop offset="1" stopColor="#ffd34d" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <g key={arrive} className={arrive ? 'd2-arrive-scene' : undefined}>
      <g data-door-scene transform={`translate(${ZOOM_C.x} ${ZOOM_C.y}) scale(${z.k}) translate(${-ZOOM_C.x} ${-ZOOM_C.y})`}>
        {IMAGES['s-door'] ? (
          <g>
            <image href={IMAGES['s-door']} x={dw ? 800 - dw / 2 : 0} y={95} width={dw} height={dh} style={{ opacity: p.opening ? 0 : 1, transition: 'opacity 0.35s' }} />
            {IMAGES['s-door-open'] && <image href={IMAGES['s-door-open']} x={800 - dw / 2} y={95} width={dw} height={dh} style={{ opacity: p.opening ? 1 : 0, transition: 'opacity 0.35s' }} />}
          </g>
        ) : <rect x={800 - dw / 2} y={95} width={dw} height={dh} rx={dw / 2} fill={p.opening ? 'none' : '#2a1660'} stroke="#ffd34d" strokeWidth={8} />}
        {/* far away in the doorway's light: the next door (or the crystal), with its own glow (no mask: it repainted slowly) */}
        {p.opening && (
          <g clipPath="url(#d2-doorway)" className="d2-doorway-open">
            <rect x={g.x} y={g.y} width={g.w} height={g.h} fill="#fff1c2" />
            <g transform={`translate(800 ${NEXT_TOP}) scale(${NEXT_SCALE}) translate(-800 ${-DOOR_BOX.top})`} opacity={0.85}><NextRoom crystal={p.behind?.crystal} /></g>
            <rect x={g.x} y={g.y} width={g.w} height={g.h} fill="url(#d2-door-light)" opacity={0.45} />
          </g>
        )}
        {!p.opening && (
          <Plate w={420} x={800} y={340} state="idle">
            {syls.map((t, i) => (
              <g key={i} data-syl={i} data-cx={cx[i]} data-lit={p.lit > i ? '1' : '0'}>
                <Glyph text={t} px={lay.px} x={cx[i]} y={340} dim={p.lit <= i} glow={p.lit > i ? 'soft' : 'none'} lineOf={syls.join('')} />
              </g>
            ))}
          </Plate>
        )}
      </g>
      </g>
      {/* going through: the doorway's light fills the screen */}
      {p.zooming && z.light > 0 && <rect data-door-light x={-400} y={-300} width={2400} height={1500} fill="url(#d2-door-light)" opacity={z.light} pointerEvents="none" />}
      {p.zooming && z.light >= 1 && <rect x={-400} y={-300} width={2400} height={1500} fill="#fff6d8" pointerEvents="none" />}
      {arrive > 0 && <ArriveLight key={arrive} />}
      {!p.opening && p.keys.map((k, i) => {
        const state = p.reveal?.right === k.id ? 'reveal' : p.reveal?.wrong === k.id ? 'wrong' : p.phase === 'feedback' ? 'off' : 'idle'
        return (
          <DragPick key={k.id} attrs={{ 'data-key': k.id, ...(state === 'reveal' ? { 'data-reveal': '1' } : {}) }} enabled={(can && state === 'idle') || (p.phase === 'mistake' && state === 'reveal')} onPick={() => p.onPick(k.id)}
            // he brings the key to the door (anywhere on it)
            inZone={(q) => Math.abs(q.x - 800) < dw / 2 && q.y > 95 && q.y < 95 + dh - 20}
            demo={p.demo?.id === k.id ? { t: p.demo.t, dx: 800 - KEY_X[i], dy: 560 - 690 } : undefined}>
            <KeyShape x={KEY_X[i]} y={690} picture={k.picture} correct={!!p.showCorrect && k.id === p.word.id} state={state} />
          </DragPick>
        )
      })}
    </Stage>
  )
}
