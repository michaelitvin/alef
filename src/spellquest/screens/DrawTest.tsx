// The drawing test board (parent area; spec: Parent area): the parent draws any letter in either script, with or without a
// mark, and sees the check's verdict for each stroke (with its score) and the line feedback, to tune the tolerances
// before the child meets the screen. Nothing here touches his progress or the telemetry.
import { useMemo, useRef, useState } from 'react'
import { Draw } from '../components/screens/Draw'
import type { DrawStroke, DrawView } from '../controller'
import { LETTERS, strokesOf, type Pt, type Script } from '../data/strokes'
import { WORDS } from '../data/words'
import { drawLayout } from '../logic/drawLayout'
import { LetterChecker, PLACE_TOL, SHAPE_TOL, START_TOL, bbox, judgeMarks, lineFeedback, markTargets, pathLength, type MarkSpec, type Verdict } from '../logic/recognizer'

const MARKS: { label: string; specs: MarkSpec[] }[] = [
  { label: 'no mark', specs: [] },
  { label: 'kamatz ָ', specs: [{ zone: 'under', shape: 'T' }] },
  { label: 'patach ַ', specs: [{ zone: 'under', shape: 'bar' }] },
  { label: 'tsere ֵ', specs: [{ zone: 'under', shape: 'dots2' }] },
  { label: 'segol ֶ', specs: [{ zone: 'under', shape: 'dots3-tri' }] },
  { label: 'chirik ִ', specs: [{ zone: 'under', shape: 'dot' }] },
  { label: 'cholam ֹ', specs: [{ zone: 'above-left', shape: 'dot' }] },
  { label: 'kubutz ֻ', specs: [{ zone: 'under', shape: 'dots3-diag' }] },
  { label: 'dagesh + patach', specs: [{ zone: 'inside', shape: 'dot' }, { zone: 'under', shape: 'bar' }] },
  { label: 'shin dot (right)', specs: [{ zone: 'above-right', shape: 'dot' }] },
  { label: 'sin dot (left)', specs: [{ zone: 'above-left', shape: 'dot' }] },
]

interface Row { n: number; text: string; ok: boolean }

export function DrawTest({ onBack }: { onBack: () => void }) {
  const [letter, setLetter] = useState('ד')
  const [script, setScript] = useState<Script>('print')
  const [mark, setMark] = useState(0)
  const [run, setRun] = useState(0)
  const def = strokesOf(letter, script)
  const specs = MARKS[mark].specs
  const layout = useMemo(() => drawLayout({ letter, vav: false, rest: '', script, def, marksAbove: true, marksUnder: true }), [letter, script, def])
  const checker = useRef(new LetterChecker(def))
  const [strokes, setStrokes] = useState<DrawStroke[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [mode, setMode] = useState<DrawView['mode']>('letter')
  const [lineFx, setLineFx] = useState<DrawView['lineFx']>()
  const [demo, setDemo] = useState<DrawView['demo']>()
  const markStrokes = useRef<Pt[][]>([])
  const idRef = useRef(0)
  const reset = (l = letter, sc = script) => {
    checker.current = new LetterChecker(strokesOf(l, sc))
    markStrokes.current = []
    setStrokes([]); setRows([]); setMode('letter'); setLineFx(undefined); setDemo(undefined); setRun((r) => r + 1)
  }
  const inkOf = (ss: DrawStroke[]) => bbox(ss.filter((s) => s.state === 'ok' || s.state === 'helped').flatMap((s) => s.pts))
  const word = WORDS[0]
  const view: DrawView = { screen: 'draw', word, script, letter, layout, marks: specs, strokes, mode, lineFx, demo }
  const onStroke = (pts: Pt[]) => {
    setDemo(undefined)
    const id = ++idRef.current
    if (mode === 'mark') {
      markStrokes.current.push(pts)
      const j = judgeMarks(markStrokes.current, specs, { letter: inkOf(strokes) })
      setRows((r) => [...r, { n: r.length + 1, text: `mark: ${j.state}`, ok: j.state !== 'wrong' }])
      const next = [...strokes, { id, pts, state: (j.state === 'wrong' ? 'wrong' : j.state === 'ok' ? 'ok' : 'mark') as DrawStroke['state'] }]
      if (j.state === 'ok') { setStrokes(next.map((s) => (s.state === 'mark' ? { ...s, state: 'ok' } : s))); setMode('done') }
      else if (j.state === 'wrong') { markStrokes.current = []; setStrokes(next.map((s) => (s.state === 'mark' ? { ...s, state: 'wrong' } : s))) }
      else setStrokes(next)
      return
    }
    if (mode !== 'letter' || pathLength(pts) < 0.06) return
    window.clearTimeout(settleTimer.current)
    apply(checker.current.add(pts), [...strokes, { id, pts, state: 'live' }])
  }
  const settleTimer = useRef<number | undefined>(undefined)
  /** the verdict on his strokes, as the game shows it; a waiting piece is settled after a pause, as in the game */
  const apply = (v: Verdict, list: DrawStroke[]) => {
    const text = v.kind === 'ok' ? `stroke ${v.index + 1}: right${v.joined ? ' (joined to the stroke before: a lift inside it)' : v.pieces > 1 ? ` (joined ${v.pieces} pieces)` : ''}`
      : v.kind === 'partial' ? `stroke ${v.index + 1}: a piece, waiting for the rest (pen lift)`
        : `stroke ${v.index + 1}: wrong — ${v.why}`
    setRows((r) => [...r, ...(v.settled ? [{ n: r.length + 1, text: 'the waiting piece was a whole stroke', ok: true }] : []), { n: r.length + 1 + (v.settled ? 1 : 0), text, ok: v.kind !== 'wrong' }])
    const mine: DrawStroke['state'] = v.kind === 'ok' ? 'ok' : v.kind === 'partial' ? 'pending' : 'wrong'
    const next = list.map((s, i, all) => (i >= all.length - v.pieces ? { ...s, state: mine } : s.state === 'pending' ? { ...s, state: (v.settled ? 'ok' : 'wrong') as DrawStroke['state'] } : s))
    setStrokes(next)
    if (v.kind === 'partial') {
      settleTimer.current = window.setTimeout(() => { const sv = checker.current.settle(); if (sv) apply(sv, next) }, 1000)
      return
    }
    if (v.kind === 'wrong' && !checker.current.done) setDemo({ id: ++idRef.current, strokes: [checker.current.expected()] })
    if (checker.current.done) {
      const fb = lineFeedback(inkOf(next), def)
      setLineFx(fb ?? undefined)
      setRows((r) => [...r, { n: r.length + 1, text: `letter done · lines: ${fb ? fb.kind : 'in the lines'}`, ok: true }])
      setMode(specs.length ? 'mark' : 'done')
    }
  }
  return (
    <div className="d2-drawtest" data-drawtest>
      <div className="d2-drawtest-stage d2-root" style={{ position: 'relative' }}>
        <Draw key={run} view={view} phase={mode === 'done' ? 'feedback' : 'answer'} onStroke={onStroke} bare />
      </div>
      <div className="d2-drawtest-side">
        <button onClick={onBack} style={{ float: 'right' }}>Back</button>
        <h3>Drawing test board</h3>
        <p style={{ fontSize: 13 }}>Draw the letter in the slot with a finger or the mouse. Each stroke is judged when you lift.</p>
        <label>Letter{' '}
          <select data-letter value={letter} onChange={(e) => { setLetter(e.target.value); reset(e.target.value, script) }} style={{ fontSize: 22 }}>
            {[...LETTERS].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>{' '}
        <label>Script{' '}
          <select data-script value={script} onChange={(e) => { const sc = e.target.value as Script; setScript(sc); reset(letter, sc) }}>
            <option value="print">print</option><option value="hand">handwriting</option>
          </select>
        </label>
        <p><label>Mark after the letter{' '}
          <select data-mark value={mark} onChange={(e) => { setMark(Number(e.target.value)); reset() }}>
            {MARKS.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
          </select>
        </label></p>
        <p>
          <button onClick={() => reset()}>Clear</button>{' '}
          <button onClick={() => setDemo({ id: ++idRef.current, strokes: mode === 'mark' ? markTargets(specs, { letter: inkOf(strokes) }) : checker.current.remaining() })}>Show the hand</button>
        </p>
        <ol data-verdicts style={{ paddingLeft: 18 }}>
          {rows.map((r) => <li key={r.n} style={{ color: r.ok ? '#226b2e' : '#b0261b' }}>{r.text}</li>)}
        </ol>
        <p style={{ fontSize: 12, color: '#666' }}>
          Tolerances (letter units): shape {SHAPE_TOL} (larger for small strokes), start {START_TOL}, place {PLACE_TOL}.
          The first stroke is judged by shape and direction only (where he writes in the slot does not matter).
        </p>
      </div>
    </div>
  )
}
