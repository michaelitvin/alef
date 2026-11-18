// 2 · Cauldron: a letter over a bubbling pot; three vowel orbs above. He drags the vowel he heard into the pot (or taps it);
// the mark joins the letter. The English cauldron (CauldronWord): the word he hears in boxes, one of them empty, and four
// tiles above; the right tile fills the box (after a thrown `e`, the word turns and its picture comes).
import { useRef } from 'react'
import { IMAGES } from '../../assets/images'
import type { Item, Mark, MarkId, Syllable } from '../../logic/content'
import type { Choice } from '../../logic/rounds'
import { DragPick } from '../DragPick'
import { Glyph } from '../Glyph'
import { MarkAlone } from '../MarkAlone'
import { Orb, type PickState } from '../Orb'
import { Stage, type Dir, type Phase } from './Stage'

export const ORB_X = [450, 800, 1150]
export const ORB_Y = 200
const ORB_SIZE = 180
const CAULDRON_GLYPH_PX = 190
const POT = { x: 800, top: 480, w: 330 }

export function Cauldron(p: {
  letter: Item; orbs: Mark[]; onPick: (m: MarkId) => void; phase: Phase; joined?: Syllable; reveal?: { right: MarkId; wrong?: MarkId }; correct?: MarkId
  /** the demo drags this orb to the pot as the hand moves (t from 0 to 1) */
  demo?: { id: MarkId; t: number }
  dir?: Dir
}) {
  const alphabet = p.dir === 'ltr' ? 'latin' : 'hebrew'
  const svgRef = useRef<SVGSVGElement>(null)
  const can = p.phase === 'answer'
  const potH = POT.w * (600 / 496)
  return (
    <Stage bg="bg-ground" dir={p.dir} ref={svgRef}>
      {IMAGES['s-cauldron']
        ? <image href={IMAGES['s-cauldron']} x={POT.x - POT.w / 2} y={875 - potH} width={POT.w} height={potH} />
        : <ellipse cx={POT.x} cy={720} rx={170} ry={130} fill="#1a1230" stroke="#5ef0a6" strokeWidth={6} />}
      <Glyph text={p.joined ? p.joined.text : p.letter.glyph} px={CAULDRON_GLYPH_PX} x={800} y={395} glow={p.joined ? 'hit' : 'soft'} alphabet={alphabet} />
      {p.orbs.map((m, i) => {
        if (p.joined && m.id === p.joined.mark.id) return null
        const dm = p.demo?.id === m.id ? p.demo.t : null
        const x = dm !== null ? ORB_X[i] + (800 - ORB_X[i]) * dm : ORB_X[i]
        const y = dm !== null ? ORB_Y + (650 - ORB_Y) * dm : ORB_Y
        let state: PickState = p.phase === 'feedback' || p.phase === 'celebrate' ? 'off' : 'idle'
        if (p.reveal?.right === m.id) state = 'reveal'
        else if (p.reveal?.wrong === m.id) state = 'wrong'
        return (
          <DragPick key={m.id} attrs={{ 'data-orb': m.id, ...(p.correct === m.id ? { 'data-correct-orb': '1' } : {}) }} enabled={can || (p.phase === 'mistake' && state === 'reveal')}
            onPick={() => p.onPick(m.id)} inZone={(q) => Math.abs(q.x - POT.x) < POT.w * 0.6 && q.y > POT.top}>
            <Orb size={ORB_SIZE} x={x} y={y} state={state} testCorrect={p.correct === m.id}>
              <MarkAlone mark={m} size={ORB_SIZE * 0.62} x={x} y={y} />
            </Orb>
          </DragPick>
        )
      })}
    </Stage>
  )
}

/** the English tiles: four across, above the pot */
export const TILE_X = [380, 660, 940, 1220]
const TILE_SIZE = 170
/** the word's boxes: a row over the pot, as wide as fits */
const BOX_Y = 395
const BOX_H = 150
const BOX_ROW_W = 1100
const BOX_MAX_W = 170
const BOX_GAP = 14
/** Andika's advance per letter, about (as the broom's words) */
const LATIN_ADVANCE = 0.55
const PICTURE = { x: 1340, y: 640, size: 240 }

/** the glyph size of `text` in a box or tile `w` wide: at most `px`, small enough that its letters fit */
const fitPx = (text: string, w: number, px: number) => Math.min(px, Math.floor((w * 0.8) / (LATIN_ADVANCE * Math.max(1, text.length))))

/** the box row's centres, left to right (the stage is ltr on the English path) */
export function boxXs(n: number): { xs: number[]; w: number } {
  const w = Math.min(BOX_MAX_W, (BOX_ROW_W - BOX_GAP * (n - 1)) / n)
  const left = 800 - (n * w + (n - 1) * BOX_GAP) / 2 + w / 2
  return { xs: Array.from({ length: n }, (_, i) => left + i * (w + BOX_GAP)), w }
}

/**
 * The English cauldron: the word's parts in boxes over the pot (`boxes[gap]` empty until it is made), four tiles above.
 * He drags the missing part into the pot (or taps it); when it is made, the box fills, and after a thrown `e` the
 * picture of the word it makes shows (`shown`: the word before it, with its own picture, if any).
 */
export function CauldronWord(p: {
  boxes: Choice[]; gap: number; tiles: Choice[]; target: Choice; shown?: Choice; onPick: (id: string) => void; phase: Phase; joined?: boolean
  reveal?: { right: string; wrong?: string }; correct?: string
  /** the demo drags this tile to the pot as the hand moves (t from 0 to 1) */
  demo?: { id: string; t: number }
  dir?: Dir
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const can = p.phase === 'answer'
  const potH = POT.w * (600 / 496)
  const { xs, w } = boxXs(p.boxes.length)
  const picture = p.joined ? p.target.picture : (p.shown ?? p.target).picture
  return (
    <Stage bg="bg-ground" dir={p.dir} ref={svgRef}>
      {IMAGES['s-cauldron']
        ? <image href={IMAGES['s-cauldron']} x={POT.x - POT.w / 2} y={875 - potH} width={POT.w} height={potH} />
        : <ellipse cx={POT.x} cy={720} rx={170} ry={130} fill="#1a1230" stroke="#5ef0a6" strokeWidth={6} />}
      {picture && <image data-cauldron-picture href={picture} x={PICTURE.x - PICTURE.size / 2} y={PICTURE.y - PICTURE.size / 2} width={PICTURE.size} height={PICTURE.size} />}
      {p.boxes.map((b, i) => {
        const empty = i === p.gap && !p.joined
        return (
          <g key={i} data-box={empty ? '_' : b.text}>
            <rect x={xs[i] - w / 2} y={BOX_Y - BOX_H / 2} width={w} height={BOX_H} rx={18} fill="#1b0f3c" fillOpacity={0.55}
              stroke={i === p.gap ? '#ffd34d' : '#fff6d8'} strokeWidth={6} strokeDasharray={empty ? '18 12' : undefined} />
            {!empty && <Glyph text={b.text} px={fitPx(b.text, w, 120)} x={xs[i]} y={BOX_Y} glow={p.joined && i === p.gap ? 'hit' : 'soft'} alphabet="latin" />}
          </g>
        )
      })}
      {p.tiles.map((c, i) => {
        if (p.joined && i === p.tiles.findIndex((x) => x.id === p.boxes[p.gap].id)) return null
        const dm = p.demo?.id === c.id ? p.demo.t : null
        const x = dm !== null ? TILE_X[i] + (800 - TILE_X[i]) * dm : TILE_X[i]
        const y = dm !== null ? ORB_Y + (650 - ORB_Y) * dm : ORB_Y
        let state: PickState = p.phase === 'feedback' || p.phase === 'celebrate' ? 'off' : 'idle'
        if (p.reveal?.right === c.id) state = 'reveal'
        else if (p.reveal?.wrong === c.id) state = 'wrong'
        return (
          <DragPick key={c.id} attrs={{ 'data-tile': c.id, ...(p.correct === c.id ? { 'data-correct-orb': '1' } : {}) }} enabled={can || (p.phase === 'mistake' && state === 'reveal')}
            onPick={() => p.onPick(c.id)} inZone={(q) => Math.abs(q.x - POT.x) < POT.w * 0.6 && q.y > POT.top}>
            <Orb size={TILE_SIZE} x={x} y={y} state={state} testCorrect={p.correct === c.id}>
              <Glyph text={c.text} px={fitPx(c.text, TILE_SIZE, 110)} x={x} y={y} alphabet="latin" />
            </Orb>
          </DragPick>
        )
      })}
    </Stage>
  )
}
