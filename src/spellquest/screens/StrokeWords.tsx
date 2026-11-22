// The stroke review's Words section (the parent: "review the font as a whole"). Every game word, in print and in
// handwriting, on the writing lines exactly as the drawing screen lays it out: once all in the font, once with its first
// letter drawn from the strokes the game teaches (the first variant), so a letter that does not match the font shows.
import { WordText } from '../components/screens/Draw'
import { strokesOf, type Pt, type Script } from '../data/strokes'
import type { Word } from '../data/words'
import { bare, splitWord } from '../logic/draw'
import { canvasTextMeasure, drawLayout, toStagePt, type DrawLayout } from '../logic/drawLayout'

const poly = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
const SCRIPT_NAME: Record<Script, string> = { print: 'print', hand: 'handwriting' }

function Lines({ L }: { L: DrawLayout }) {
  return (
    <g stroke="#fff6d8" strokeLinecap="round">
      <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.top} y2={L.lines.top} strokeWidth={4} strokeOpacity={0.5} />
      <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.mid} y2={L.lines.mid} strokeWidth={3} strokeOpacity={0.18} strokeDasharray="14 16" />
      <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.base} y2={L.lines.base} strokeWidth={5} strokeOpacity={0.6} />
      <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.below} y2={L.lines.below} strokeWidth={3} strokeOpacity={0.3} strokeDasharray="6 12" />
    </g>
  )
}

function Row({ w, script, taught }: { w: Word; script: Script; taught: boolean }) {
  const sp = splitWord(w, script)
  const def = strokesOf(sp.letter, script)
  const L = drawLayout({ ...sp, script, def, marksAbove: false, marksUnder: false })
  const vb = { x: L.lines.left - 10, y: L.top - 1.0 * L.u, w: L.lines.right - L.lines.left + 20, h: (L.lines.below - L.top) + 1.25 * L.u }
  let body
  if (taught) {
    // the first letter from the taught strokes, about as thick as the font's line, then the rest as the screen shows it
    const width = (script === 'hand' ? 0.07 : 0.11) * L.u
    body = (
      <>
        <g data-taught-letter fill="none" stroke="#fff6d8" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
          {def.variants[0].map((st, i) => <polyline key={i} points={poly(st.pts.map((q) => toStagePt(L, q)))} />)}
        </g>
        <WordText L={L} glowVav={false} />
      </>
    )
  } else {
    // the whole word in the font, its right edge where the first letter's box ends
    const text = script === 'hand' ? bare(w.text) : w.text
    const right = L.x0 + def.w * L.u
    const m = canvasTextMeasure(text, L.rest.font, L.rest.px)
    const full: DrawLayout = { ...L, rest: { ...L.rest, text, cx: m ? right - m.width / 2 : L.rest.cx } }
    delete full.vav
    body = <WordText L={full} glowVav={false} />
  }
  return (
    <svg data-word-font={taught ? undefined : script} data-word-taught={taught ? script : undefined} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      width={460} height={(460 * vb.h) / vb.w} style={{ background: '#160a35', borderRadius: 10, display: 'block' }}>
      <Lines L={L} />
      {body}
    </svg>
  )
}

export function StrokeWords({ words }: { words: Word[] }) {
  return (
    <section data-words-section>
      <h3>Words</h3>
      <p>
        Every word of the game as the drawing screen writes it: on the left all in the font, on the right with its first
        letter drawn from the strokes the game teaches. A first letter that looks different from the font beside it is a
        mismatch. (No game word has ך or a non-final צ.)
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, direction: 'ltr' }}>
        {words.map((w) => (
          <div key={w.id} data-word-card={w.id} className="d2-stroke-card" style={{ borderColor: '#ccc' }}>
            {(['print', 'hand'] as const).map((sc) => (
              <div key={sc} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ width: 80, fontSize: 12, color: '#555' }}>{SCRIPT_NAME[sc]}</span>
                <Row w={w} script={sc} taught={false} />
                <Row w={w} script={sc} taught />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
