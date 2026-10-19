// An explanation (two steps of a syllable, a dotted-letter introduction, a demo's words): plays its parts once, each
// part glowing as it is spoken, then stays still with a replay speaker and next until he taps next (rule).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { sayParts, stopVoice } from '../audio/duel2Audio'
import { NextIcon, SpeakerIcon } from './icons'

export type Highlight = 'letter' | 'vowel' | 'all' | 'left' | 'right' | 'none'
export function ExplainPanel(p: { parts: { id: string; highlight: Highlight }[]; children: (h: Highlight | null) => ReactNode; onNext: () => void }) {
  const [h, setH] = useState<Highlight | null>(null)
  const [done, setDone] = useState(false)
  const alive = useRef(true)
  const play = () => {
    setDone(false)
    void sayParts(p.parts.map((x) => ({ id: x.id, onStart: () => alive.current && setH(x.highlight) }))).then(() => {
      if (!alive.current) return
      setH(null)
      setDone(true)
    })
  }
  useEffect(() => {
    alive.current = true
    play()
    return () => { alive.current = false; stopVoice() }
    // plays once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {p.children(h)}
      {done && (
        <div className="d2-explain-controls">
          <button type="button" aria-label="replay" className="d2-btn" onPointerDown={(e) => { e.preventDefault(); stopVoice(); play() }}><SpeakerIcon /></button>
          <button type="button" aria-label="next" className="d2-btn d2-btn-next" onPointerDown={(e) => { e.preventDefault(); stopVoice(); p.onNext() }}><NextIcon /></button>
        </div>
      )}
    </>
  )
}
