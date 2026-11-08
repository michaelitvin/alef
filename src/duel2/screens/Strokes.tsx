// Stroke review (parent area, `#/strokes`; spec: Parent area). Every letter in print and handwriting: its strokes with
// their numbers next to the font's letter, animated by the glowing hand (tap a letter, or animate all), a speaker for the
// letter's name, and a "looks right / wrong" mark kept on this device and exported with the telemetry. The drawing screen
// stays out of the game until the parent has checked these (the setting in the parent area).
import { useEffect, useState } from 'react'
import { GlyphDefs } from '../components/Glyph'
import { StrokeAnim } from '../components/StrokeAnim'
import { SpeakerIcon } from '../components/icons'
import { HAND_DANA, LETTERS, STROKES, strokesOf, type LetterDef, type Script } from '../data/strokes'
import { DRAW_FONT, strokeTiming } from '../logic/drawLayout'
import { ITEMS } from '../logic/content'
import { say } from '../audio/duel2Audio'
import { useDuel2Store } from '../store'
import { WORDS } from '../data/words'
import { StrokeWords } from './StrokeWords'
import { duel2Telemetry } from '../telemetry'

const SCRIPT_NAME: Record<Script, string> = { print: 'Print (כתב דפוס)', hand: 'Handwriting (כתב יד)' }
/** the letter's name file (finals have none) */
const nameOf = (letter: string) => ITEMS.find((i) => i.base === letter && !i.soft)?.id

function LetterCard({ def, ms, playing, onPlay }: { def: LetterDef; ms?: number; playing: boolean; onPlay: () => void }) {
  const marks = useDuel2Store((s) => s.strokeMarks ?? {})
  const markStrokes = useDuel2Store((s) => s.markStrokes)
  const key = `${def.letter}-${def.script}`
  const mark = marks[key]
  const pts = def.variants.flatMap((v) => v.flatMap((s) => s.pts))
  const top = Math.min(-0.25, ...pts.map((q) => q[1])) - 0.2
  const bottom = Math.max(1.5, ...pts.map((q) => q[1])) + 0.2
  const U = 100
  const cellW = (def.w + 0.6) * U
  const H = (bottom - top) * U
  const name = nameOf(def.letter)
  // the big glyph is the font the strokes follow; the game writes the words in DRAW_FONT
  const ref = (f: string, name: string, main: boolean) => ({ font: `${f}, serif`, name, main, game: f === DRAW_FONT[def.script] })
  const dana = (main: boolean) => ref("'Dana Yad'", 'Dana Yad', main)
  const ktav = (main: boolean) => ref("'Ktav Yad'", 'Ktav Yad', main)
  const refs = def.script === 'print' ? [ref(DRAW_FONT.print, 'Sigalit', true)]
    : HAND_DANA.includes(def.letter) ? [dana(true), ktav(false)] : [ktav(true), dana(false)]
  const setMark = (m: 'ok' | 'wrong') => {
    const next = mark === m ? null : m
    markStrokes(key, next)
    duel2Telemetry.track('stroke-mark', { letter: def.letter, script: def.script, mark: next })
  }
  return (
    <div data-stroke-card={key} className="d2-stroke-card" style={{ direction: 'ltr', borderColor: mark === 'ok' ? '#3c9a4c' : mark === 'wrong' ? '#c0392b' : '#ccc' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, direction: 'rtl' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* the game's handwriting font is slanted; an upright school font beside it (the parent's review). The letters
              drawn after it show it big (the main reference), the game's font small and grey */}
          {refs.map(({ font, name, main, game }) => (
            <span key={name} data-ref-glyph={name} data-main={main ? '1' : '0'} data-game={game ? '1' : '0'} title={game ? `${name} (the game's font)` : name}
              style={{ fontFamily: font, fontSize: main ? 64 : 44, lineHeight: main ? 1 : 1.2, minWidth: 60, textAlign: 'center', padding: '0 16px', color: main ? '#222' : '#777' }}>{def.letter}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, direction: 'ltr' }}>
          {def.variants.map((v, vi) => (
            <div key={vi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg data-variant={vi + 1} width={cellW * 0.9} height={H * 0.9} viewBox={`${-0.3 * U} ${top * U} ${cellW} ${H}`}
              onClick={onPlay} style={{ background: '#160a35', borderRadius: 10, cursor: 'pointer' }}>
              <GlyphDefs />
              {[0, 1].map((y) => <line key={y} x1={-0.3 * U} x2={cellW} y1={y * U} y2={y * U} stroke="#fff6d8" strokeOpacity={0.45} strokeWidth={2} />)}
              <line x1={-0.3 * U} x2={cellW} y1={0.5 * U} y2={0.5 * U} stroke="#fff6d8" strokeOpacity={0.15} strokeWidth={2} strokeDasharray="5 6" />
              <StrokeAnim key={playing ? 'p' : 's'} strokes={v.map((s) => s.pts)} map={([x, y]) => [x * U, y * U]} width={7} numbers
                handScale={0.35} {...(playing ? { ms } : { still: true })} />
            </svg>
            {def.variants.length > 1 && <span data-variant-label={vi + 1} style={{ fontSize: 12, color: '#555' }}>{vi === 0 ? '1 · taught' : `${vi + 1} · also passes`}</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 13, color: '#555' }}>
        {[...new Set(def.variants.map((v) => v.length))].join(' or ')} stroke{def.variants.some((v) => v.length > 1) ? 's' : ''}
        {def.variants.length > 1 ? ' (any of them passes; the hand teaches the first)' : ''}
        {def.variants.some((v) => v.some((s) => s.either)) ? ' · either direction' : ''}
        {def.variants.some((v) => v.some((s) => s.end)) ? ` · its end must go ${def.variants[0].find((s) => s.end)?.end}` : ''}
        {def.strict ? ' · no pen-lift joining' : ''}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {name && <button aria-label="letter name" onClick={() => void say([`ln-${name}`])} style={{ width: 40, height: 34, padding: 2, background: '#28145a' }}><SpeakerIcon /></button>}
        <button onClick={onPlay}>{playing ? 'Stop' : 'Play'}</button>
        <button data-mark-ok onClick={() => setMark('ok')} style={{ fontWeight: mark === 'ok' ? 700 : 400 }}>Looks right</button>
        <button data-mark-wrong onClick={() => setMark('wrong')} style={{ fontWeight: mark === 'wrong' ? 700 : 400 }}>Wrong</button>
      </div>
    </div>
  )
}

export function Strokes({ onBack }: { onBack: () => void }) {
  const [script, setScript] = useState<Script | 'both' | 'words'>('print')
  const [playing, setPlaying] = useState<string | 'all' | null>(null)
  const [ms, setMs] = useState(0)
  const marks = useDuel2Store((s) => s.strokeMarks ?? {})
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = 0
    const t0 = performance.now()
    // one clock for every card, at about 30 frames a second (the tablet is old)
    const step = (now: number) => {
      if (now - last > 33) { last = now; setMs(now - t0) }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  const scripts: Script[] = script === 'words' ? [] : script === 'both' ? ['print', 'hand'] : [script]
  const done = Object.keys(marks).length
  const wrong = Object.values(marks).filter((m) => m === 'wrong').length
  return (
    <div className="d2-parent" data-strokes-page>
      <button onClick={onBack} style={{ float: 'right', fontSize: 18 }}>Back</button>
      <h2>Book 2 — stroke order</h2>
      <p>
        Every letter as the drawing screen teaches and checks it: the glowing hand writes each stroke in order (the numbers
        are the order; the first point of a line is where it starts). Tap a letter to play it, or animate all. Mark each one;
        the drawing screen joins the game only when you turn it on in the parent area.
      </p>
      <p data-reviewed>Checked: {done} of {STROKES.length}{wrong ? ` · marked wrong: ${wrong}` : ''}</p>
      <p>
        {(['print', 'hand', 'both', 'words'] as const).map((s) => (
          <button key={s} onClick={() => setScript(s)} style={{ fontWeight: script === s ? 700 : 400, marginRight: 6 }}>{s === 'both' ? 'Both' : s === 'words' ? 'Words' : SCRIPT_NAME[s]}</button>
        ))}
        <button onClick={() => setPlaying(playing === 'all' ? null : 'all')} style={{ marginLeft: 16 }}>{playing === 'all' ? 'Stop all' : 'Animate all'}</button>
      </p>
      {script === 'words' && <StrokeWords words={WORDS} />}
      {scripts.map((sc) => (
        <section key={sc}>
          <h3>{SCRIPT_NAME[sc]}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, direction: 'rtl' }}>
            {[...LETTERS].map((l) => {
              const def = strokesOf(l, sc)
              const key = `${l}-${sc}`
              const on = playing === 'all' || playing === key
              return <LetterCard key={key} def={def} ms={on ? ms : undefined} playing={on} onPlay={() => setPlaying(playing === key ? null : key)} />
            })}
          </div>
        </section>
      ))}
      <p style={{ color: '#666', fontSize: 13 }}>
        Timing per letter: {Math.round(strokeTiming(strokesOf('א', 'print').variants[0].map((s) => s.pts)).total / 100) / 10} s for print א.
        Sources: etze.co.il, shlomitoltchik.com, likro.co.il, 2times2.com, Hebrew4Christians, C. Abzug (JMU); see the stroke data file. Handwriting: the big glyph is the font the strokes follow (Dana Yad or Ktav Yad); the game writes the words in Dana Yad.
      </p>
    </div>
  )
}
