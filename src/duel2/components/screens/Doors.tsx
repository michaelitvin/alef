// 5 · Door corridor: a two-syllable word on the door's plate; the syllables light one at a time, right to left (no voice
// says the word before he picks). Three keys hang under the door, each with a picture in its handle. When it opens, the
// next door (or, behind the last one, the crystal) shows down the corridor in the doorway, and the camera flies through
// the doorway until that door fills the frame — exactly where the next round draws it, so the corridor runs on (Michael:
// "the zoom doesn't look like you're actually going through the door ... no additional door behind").
import { IMAGES } from '../../assets/images'
import { syllable } from '../../logic/content'
import type { Word } from '../../data/words'
import { DragPick } from '../DragPick'
import { Glyph } from '../Glyph'
import { Plate } from '../Orb'
import { useEffect, useState } from 'react'
import { Stage, type Phase } from './Stage'

export const DOOR_GLYPH_PX = 110
const DH = 560
const DW = DH * (519 / 600)
/** the door on the stage */
export const DOOR_BOX = { x: 800 - DW / 2, top: 95, w: DW, h: DH }
/** the bright gap between the open leaves in s-door-open (fractions of the sprite) */
const GAP = { x0: 0.385, x1: 0.615, y0: 0.18, y1: 0.975 }
/** the next door, small at the end of the corridor, standing on the doorway's floor */
export const NEXT_DOOR = { scale: 0.2, top: DOOR_BOX.top + GAP.y1 * DH - 4 - 0.2 * DH }
export const ZOOM_MS = 1300
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2)
const smooth = (a: number, b: number, u: number) => { const x = Math.min(1, Math.max(0, (u - a) / (b - a))); return x * x * (3 - 2 * x) }

/** The camera through the doorway at progress u (0–1): scale k about (800, oy); at 1 the small next door is the full door. */
export function throughDoor(u: number): { k: number; oy: number } {
  const K = 1 / NEXT_DOOR.scale
  const oy = (DOOR_BOX.top - K * NEXT_DOOR.top) / (1 - K)
  return { k: K ** ease(Math.min(1, Math.max(0, u))), oy }
}

/** The next room as the next round will draw it: the door (its plate still blank), or the crystal behind the last door. */
function NextRoom(p: { crystal?: number }) {
  if (p.crystal !== undefined) {
    const k = ((p.crystal % 4) + 4) % 4
    return (
      <g data-next-crystal>
        {IMAGES['bg-sky'] ? <image href={IMAGES['bg-sky']} width={1600} height={900} preserveAspectRatio="none" /> : <rect width={1600} height={900} fill="#1b0f3c" />}
        <circle cx={800} cy={450} r={420} fill="#ffd34d" opacity={0.35} />
        {IMAGES[`s-crystal-${k + 1}`] && <image href={IMAGES[`s-crystal-${k + 1}`]} x={600} y={190} width={400} height={520} />}
      </g>
    )
  }
  return (
    <g data-next-door>
      {IMAGES['bg-ground'] ? <image href={IMAGES['bg-ground']} width={1600} height={900} preserveAspectRatio="none" /> : <rect width={1600} height={900} fill="#1b0f3c" />}
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
  const cx = syls.length === 2 ? [880, 700] : [790]
  const dh = DH
  const dw = DW
  const can = p.phase === 'answer'
  // the flight through the doorway, frame by frame (a CSS zoom was flaky)
  const [u, setU] = useState(0)
  useEffect(() => {
    if (!p.zooming) { setU(0); return }
    let raf = 0
    const t0 = performance.now()
    const step = () => { const v = Math.min(1, (performance.now() - t0) / ZOOM_MS); setU(v); if (v < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [p.zooming])
  const z = throughDoor(p.zooming ? u : 0)
  const s = NEXT_DOOR.scale
  // the doorway (in the scene's own units); near the end it opens to the whole view, as the next room fills the frame
  const g = { x: DOOR_BOX.x + GAP.x0 * dw, y: DOOR_BOX.top + GAP.y0 * dh, w: (GAP.x1 - GAP.x0) * dw, h: (GAP.y1 - GAP.y0) * dh }
  const K = 1 / s
  const view = { x: 800 + (-1600 - 800) / K, y: z.oy + (-900 - z.oy) / K, w: 4800 / K, h: 2700 / K }
  const o = smooth(0.35, 0.8, p.zooming ? u : 0)
  const clip = { x: g.x + (view.x - g.x) * o, y: g.y + (view.y - g.y) * o, w: g.w + (view.w - g.w) * o, h: g.h + (view.h - g.h) * o }
  const frameOpacity = 1 - smooth(0.45, 0.8, p.zooming ? u : 0)
  return (
    <Stage bg="bg-ground">
      <defs>
        <clipPath id="d2-doorway"><rect x={clip.x} y={clip.y} width={clip.w} height={clip.h} rx={o < 0.05 ? 18 : 0} /></clipPath>
      </defs>
      <g data-door-scene transform={`translate(800 ${z.oy}) scale(${z.k}) translate(-800 ${-z.oy})`}>
        {IMAGES['s-door'] ? (
          <g opacity={frameOpacity}>
            <image href={IMAGES['s-door']} x={dw ? 800 - dw / 2 : 0} y={95} width={dw} height={dh} style={{ opacity: p.opening ? 0 : 1, transition: 'opacity 0.35s' }} />
            {IMAGES['s-door-open'] && <image href={IMAGES['s-door-open']} x={800 - dw / 2} y={95} width={dw} height={dh} style={{ opacity: p.opening ? 1 : 0, transition: 'opacity 0.35s' }} />}
          </g>
        ) : <rect x={800 - dw / 2} y={95} width={dw} height={dh} rx={dw / 2} fill={p.opening ? 'none' : '#2a1660'} stroke="#ffd34d" strokeWidth={8} opacity={frameOpacity} />}
        {/* the corridor, over the bright gap between the open leaves (no mask: a mask repainted too slowly) */}
        {p.opening && (
          <g clipPath="url(#d2-doorway)">
            <g transform={`translate(800 ${z.oy}) scale(${s}) translate(-800 ${-z.oy})`}><NextRoom crystal={p.behind?.crystal} /></g>
            {/* the light of the open doorway, fading as he goes through */}
            <rect x={g.x} y={g.y} width={g.w} height={g.h} fill="#fff6d8" opacity={0.25 * (1 - o)} />
          </g>
        )}
        {!p.opening && (
          <Plate w={420} x={800} y={340} state="idle">
            {syls.map((t, i) => (
              <g key={i} data-syl={i} data-cx={cx[i]} data-lit={p.lit > i ? '1' : '0'}>
                <Glyph text={t} px={DOOR_GLYPH_PX} x={cx[i]} y={340} dim={p.lit <= i} glow={p.lit > i ? 'soft' : 'none'} lineOf={syls.join('')} />
              </g>
            ))}
          </Plate>
        )}
      </g>
      {!p.opening && p.keys.map((k, i) => {
        const state = p.reveal?.right === k.id ? 'reveal' : p.reveal?.wrong === k.id ? 'wrong' : p.phase === 'feedback' ? 'off' : 'idle'
        return (
          <DragPick key={k.id} attrs={{ 'data-key': k.id }} enabled={can && state === 'idle'} onPick={() => p.onPick(k.id)}
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
