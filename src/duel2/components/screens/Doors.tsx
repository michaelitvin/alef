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

function KeyShape(p: { x: number; y: number; picture: string; state: 'idle' | 'reveal' | 'wrong' | 'off'; onPick: () => void; correct: boolean }) {
  const ring = p.state === 'reveal' ? '#ffd34d' : p.state === 'wrong' ? '#ff4d6a' : '#e7b860'
  return (
    <g data-key className="d2-key" opacity={p.state === 'off' ? 0.4 : 1}>
      {IMAGES['s-key']
        ? <image href={IMAGES['s-key']} x={p.x - 95} y={p.y - 100} width={190} height={250} />
        : <g stroke={ring} strokeWidth={12} fill="none"><circle cx={p.x} cy={p.y} r={92} /><path d={`M${p.x} ${p.y + 92} v110 m0 -40 h34 m-34 30 h24`} /></g>}
      <circle cx={p.x} cy={p.y} r={80} fill="#2a1660" stroke={ring} strokeWidth={p.state === 'idle' ? 0 : 8} />
      {IMAGES[p.picture] && <image href={IMAGES[p.picture]} x={p.x - 66} y={p.y - 66} width={132} height={132} />}
      <rect data-pick x={p.x - 105} y={p.y - 105} width={210} height={330} fill="transparent" {...(p.correct ? { 'data-correct': '1' } : {})}
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
          ? <image href={IMAGES['s-door']} x={800 - dw / 2} y={95} width={dw} height={dh} opacity={p.opening ? 0 : 1} style={{ transition: 'opacity 500ms' }} />
          : <rect x={800 - dw / 2} y={95} width={dw} height={dh} rx={dw / 2} fill="#2a1660" stroke="#ffd34d" strokeWidth={8} />}
        {p.opening && <rect x={800 - dw / 2 + 40} y={150} width={dw - 80} height={dh - 60} rx={120} fill="#fff6d8" opacity={0.85} className="d2-door-light" />}
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
        <KeyShape key={k.id} x={KEY_X[i]} y={740} picture={k.picture} correct={!!p.showCorrect && k.id === p.word.id}
          state={p.reveal?.right === k.id ? 'reveal' : p.reveal?.wrong === k.id ? 'wrong' : can ? 'idle' : 'off'}
          onPick={() => p.onPick(k.id)} />
      ))}
    </Stage>
  )
}
