// 5 · Door corridor: a two-syllable word on the door's plate; the syllables light one at a time, right to left (no voice
// says the word before he picks). Three keys hang under the door, each with a picture in its handle.
import { IMAGES } from '../../assets/images'
import { syllable } from '../../logic/content'
import type { Word } from '../../data/words'
import { Glyph } from '../Glyph'
import { Plate } from '../Orb'
import { Stage, type Phase } from './Stage'

export const DOOR_GLYPH_PX = 110
export const KEY_X = [520, 800, 1080]

/** Where the round handle's disc sits in the key sprite (measured): centre and radius as fractions of the sprite width/height. */
export const KEY_BOW = { cx: 0.5, cy: 0.345, r: 0.369 }
const DISC_R = 80
const KEY_W = DISC_R / KEY_BOW.r
const KEY_H = KEY_W * (600 / 428)

function KeyShape(p: { x: number; y: number; picture: string; state: 'idle' | 'reveal' | 'wrong' | 'off'; onPick: () => void; correct: boolean }) {
  const ring = p.state === 'reveal' ? '#ffd34d' : p.state === 'wrong' ? '#ff4d6a' : '#e7b860'
  const pic = DISC_R * 1.5
  return (
    <g data-key className="d2-key" opacity={p.state === 'off' ? 0.4 : 1}>
      {IMAGES['s-key']
        ? <image href={IMAGES['s-key']} x={p.x - KEY_W * KEY_BOW.cx} y={p.y - KEY_H * KEY_BOW.cy} width={KEY_W} height={KEY_H} />
        : <g stroke={ring} strokeWidth={12} fill="none"><circle cx={p.x} cy={p.y} r={DISC_R + 12} /><path d={`M${p.x} ${p.y + DISC_R + 12} v110 m0 -40 h34 m-34 30 h24`} /></g>}
      <circle data-key-disc cx={p.x} cy={p.y} r={DISC_R} fill={IMAGES['s-key'] ? 'none' : '#2a1660'} stroke={ring} strokeWidth={p.state === 'idle' ? 0 : 10} />
      {IMAGES[p.picture] && <image data-key-picture href={IMAGES[p.picture]} x={p.x - pic / 2} y={p.y - pic / 2} width={pic} height={pic} />}
      <rect data-pick x={p.x - 110} y={p.y - 110} width={220} height={KEY_H * (1 - KEY_BOW.cy) + 110} fill="transparent" {...(p.correct ? { 'data-correct': '1' } : {})}
        onPointerDown={(e) => { e.preventDefault(); if (p.state === 'idle') p.onPick() }} />
    </g>
  )
}

export function Doors(p: { word: Word; lit: 0 | 1 | 2; keys: Word[]; onPick: (id: string) => void; phase: Phase; opening: boolean; zooming: boolean; reveal?: { right: string; wrong?: string }; showCorrect?: boolean }) {
  const syls = (p.word.syllables ?? []).map((s) => syllable(s.item, s.mark).text + (s.tail ?? ''))
  // right to left: the first syllable sits on the right
  const cx = syls.length === 2 ? [880, 700] : [790]
  const dh = 560
  const dw = dh * (519 / 600)
  const can = p.phase === 'answer'
  return (
    <Stage bg="bg-ground">
      <g className={p.zooming ? 'd2-zoom' : undefined} style={{ transformOrigin: '800px 400px' }}>
        {IMAGES['s-door']
          ? <image href={IMAGES[p.opening && IMAGES['s-door-open'] ? 's-door-open' : 's-door']} x={800 - dw / 2} y={95} width={dw} height={dh} />
          : <rect x={800 - dw / 2} y={95} width={dw} height={dh} rx={dw / 2} fill={p.opening ? '#fff6d8' : '#2a1660'} stroke="#ffd34d" strokeWidth={8} />}
        {!p.opening && (
          <Plate w={420} x={800} y={340} state="idle">
            {syls.map((t, i) => (
              <g key={i} data-syl={i} data-cx={cx[i]} data-lit={p.lit > i ? '1' : '0'}>
                <Glyph text={t} px={DOOR_GLYPH_PX} x={cx[i]} y={340} dim={p.lit <= i} glow={p.lit > i ? 'soft' : 'none'} />
              </g>
            ))}
          </Plate>
        )}
      </g>
      {!p.opening && p.keys.map((k, i) => (
        <KeyShape key={k.id} x={KEY_X[i]} y={690} picture={k.picture} correct={!!p.showCorrect && k.id === p.word.id}
          state={p.reveal?.right === k.id ? 'reveal' : p.reveal?.wrong === k.id ? 'wrong' : p.phase === 'feedback' ? 'off' : 'idle'}
          onPick={() => { if (can) p.onPick(k.id) }} />
      ))}
    </Stage>
  )
}
