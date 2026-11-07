// The boy/girl question (spec 2026-11-07 girls), before the first round while the setting is unset. No text (rule): the
// voice asks "מִי מְשַׂחֵק? בֵּן אוֹ בַּת?" and two big pictures, the boy wizard and the girl wizard, glow as each is named
// (rule: a named object glows). A tap waits until the question ends (it is an instruction); if the child waits, it asks
// again. The boy stands on the right: he is named first, and the child reads right to left.
import { useEffect, useRef, useState } from 'react'
import type { Gender } from './player'

export const ASK_AGAIN_MS = 8000
/** asks at most this many times in all (the first time and the re-asks), then waits quietly */
export const MAX_ASKS = 3
const CSS = `
.gq-root{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;gap:6vmin;direction:rtl;
  background:radial-gradient(ellipse at 50% 35%,#3a2386 0%,#1b0f3c 70%);touch-action:manipulation;user-select:none}
.gq-pick{all:unset;cursor:pointer;display:flex;align-items:flex-end;justify-content:center;width:min(38vw,62vh);height:min(78vh,72vw);
  border-radius:6vmin;background:radial-gradient(ellipse at 50% 60%,#ffffff22,#ffffff08 70%);border:4px solid #ffffff22;
  transition:transform .25s,box-shadow .3s,border-color .3s;-webkit-tap-highlight-color:transparent}
.gq-pick img{height:92%;max-width:92%;object-fit:contain;pointer-events:none;animation:gq-in .6s ease-out both}
.gq-pick[data-gender="girl"] img{animation-delay:.12s}
.gq-pick[data-glow="true"]{border-color:#ffd34d;box-shadow:0 0 40px #ffd34daa,inset 0 0 30px #ffd34d44;transform:scale(1.05)}
.gq-pick[data-chosen="true"]{border-color:#ffd34d;box-shadow:0 0 60px #ffd34d;animation:gq-pop .4s ease-out}
.gq-pick[data-chosen="false"]{opacity:.35;transform:scale(.92)}
@keyframes gq-in{from{transform:translateY(30px) scale(.8);opacity:0}to{transform:none;opacity:1}}
@keyframes gq-pop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1.04)}}
`

export interface GenderQuestionProps {
  boySrc: string
  girlSrc: string
  /** the question's voice id */
  line: string
  /** plays a voice id; resolves when it ends (or at once when the file is missing) */
  play: (id: string) => Promise<unknown>
  /** stops the voice (the screen closes, or the child chose during a re-ask) */
  stop?: () => void
  /** when (s, real time from the start) the voice says בֵּן and בַּת */
  cues: { boy: number; girl: number }
  onChoose: (g: Gender) => void
}

export function GenderQuestion({ boySrc, girlSrc, line, play, stop, cues, onChoose }: GenderQuestionProps) {
  const [glow, setGlow] = useState<Gender | null>(null)
  /** taps count once the child has heard the question one time (then also during the re-asks) */
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState<Gender | null>(null)
  const done = useRef(false)
  const props = useRef({ play, stop, onChoose, cues, line })
  props.current = { play, stop, onChoose, cues, line }
  const timers = useRef<number[]>([])
  useEffect(() => {
    // everything this mount starts belongs to it: a StrictMode remount (or leaving) stops the voice and its timers
    let alive = true
    const later = (f: () => void, ms: number) => { timers.current.push(window.setTimeout(() => { if (alive && !done.current) f() }, ms)) }
    const ask = (n: number) => {
      const { cues: c, line: id } = props.current
      later(() => setGlow('boy'), c.boy * 1000)
      later(() => setGlow('girl'), c.girl * 1000)
      void props.current.play(id).catch(() => {}).finally(() => {
        if (!alive || done.current) return
        setGlow(null)
        setOpen(true)
        if (n < MAX_ASKS) later(() => ask(n + 1), ASK_AGAIN_MS)
      })
    }
    ask(1)
    return () => {
      alive = false
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []
      // after a choice the voice is already stopped, and the next screen may be speaking: leave it alone
      if (!done.current) props.current.stop?.()
    }
  }, [])
  const pick = (g: Gender) => {
    if (!open || done.current) return
    done.current = true
    timers.current.forEach((t) => window.clearTimeout(t))
    props.current.stop?.()
    setGlow(null)
    setChosen(g)
    timers.current.push(window.setTimeout(() => props.current.onChoose(g), 450))
  }
  // a choice is a click (finger down and up on the picture): a long press cannot leave its release for the next screen
  const btn = (g: Gender, src: string) => (
    <button type="button" className="gq-pick" data-gender={g} aria-label={g} data-glow={glow === g || undefined}
      data-chosen={chosen ? chosen === g : undefined} onClick={() => pick(g)}>
      <img src={src} alt="" draggable={false} />
    </button>
  )
  return (
    <div className="gq-root" data-screen="gender-question">
      <style>{CSS}</style>
      {btn('boy', boySrc)}
      {btn('girl', girlSrc)}
    </div>
  )
}
