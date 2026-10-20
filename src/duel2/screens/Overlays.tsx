// Overlays above a screen: the explanation (two steps), the dotted-letter introduction, a hint, and the word link.
import { IMAGES } from '../assets/images'
import { item as itemOf, mark as markOf, syllable } from '../logic/content'
import type { Choice } from '../logic/rounds'
import type { Word } from '../data/words'
import { Glyph, GlyphDefs } from '../components/Glyph'
import { MarkAlone } from '../components/MarkAlone'
import type { Highlight } from '../components/ExplainPanel'

function Frame({ children, dim = true }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <svg className="d2-stage d2-overlay" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" overflow="visible">
      <GlyphDefs />
      {dim && <rect x={-1600} y={-900} width={4800} height={2700} fill="#0b0824" opacity={0.96} />}
      {children}
    </svg>
  )
}

/** The syllable split into his two steps: the letter, then the vowel, then the whole. */
export function TwoSteps({ target, h, small = false }: { target: Choice; h: Highlight | null; small?: boolean }) {
  const it = itemOf(target.itemId)
  const m = target.mark ? markOf(target.mark) : null
  const y = small ? 250 : 430
  const px = small ? 150 : 240
  return (
    <g data-two-steps>
      {h === 'letter' || h === 'vowel' ? (
        <>
          <Glyph text={it.glyph} px={px} x={small ? 900 : 950} y={y} dim={h !== 'letter'} glow={h === 'letter' ? 'hit' : 'none'} />
          {m && <g opacity={h === 'vowel' ? 1 : 0.35}><MarkAlone mark={m} size={px * 1.1} x={small ? 680 : 600} y={y} /></g>}
        </>
      ) : (
        <Glyph text={target.text} px={px} x={800} y={y} glow={h === 'all' ? 'hit' : 'soft'} />
      )}
    </g>
  )
}

export function ExplainOverlay({ target, h }: { target: Choice; h: Highlight | null }) {
  return <Frame><TwoSteps target={target} h={h} /></Frame>
}

export function DotOverlay({ soft, hard, h }: { soft: string; hard: string; h: Highlight | null }) {
  // both letters from the start (rule: show both in a comparison); the first (soft) on the right
  return (
    <Frame>
      <Glyph text={soft} px={240} x={1050} y={450} glow={h === 'right' ? 'hit' : 'soft'} dim={h === 'left'} />
      <Glyph text={hard} px={240} x={550} y={450} glow={h === 'left' ? 'hit' : 'soft'} dim={h === 'right'} className={h === 'left' ? 'd2-dot-drop' : undefined} />
    </Frame>
  )
}

export function HintCard({ target, glow }: { target: Choice; glow: Highlight | null }) {
  return (
    <svg className="d2-hint-card" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <GlyphDefs />
      <rect x={520} y={110} width={560} height={300} rx={40} fill="#160a35" stroke="#ffd34d" strokeWidth={5} opacity={0.94} />
      <TwoSteps target={target} h={glow ?? 'letter'} small />
    </svg>
  )
}

export function WordLink({ word }: { word: Word }) {
  const first = syllable(word.first.item, word.first.mark).text
  const rest = word.text.normalize('NFC').slice(first.length)
  return (
    <div className="d2-wordlink" data-caption>
      {IMAGES[word.picture] && <img src={IMAGES[word.picture]} alt="" draggable={false} />}
      <span className="d2-wordlink-text"><b>{first}</b>{rest}</span>
    </div>
  )
}
