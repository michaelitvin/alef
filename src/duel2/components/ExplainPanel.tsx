// An explanation (two steps of a syllable, a dotted-letter introduction, a demo's words): plays its parts once, each
// part glowing as it is spoken, then stays still with a replay speaker and next until he taps next (rule).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cancelVoice, sayParts, voiceSignal, type VoiceSignal } from '../audio/duel2Audio'
import { NextIcon, SpeakerIcon } from './icons'

export type Highlight = 'letter' | 'vowel' | 'all' | 'left' | 'right' | 'none'
/** `skippable`: a tap anywhere on the explanation (it covers the screen) ends it at once; he tries to pick because he
 *  already knows (Michael: explanations got him stuck). */
/** `autoNext`: a demo goes straight on into play when its words end (Michael: stopping there on a next button was unnatural). */
export function ExplainPanel(p: { parts: { id: string; highlight: Highlight }[]; children: (h: Highlight | null) => ReactNode; onNext: () => void; autoNext?: boolean; skippable?: boolean }) {
  const [h, setH] = useState<Highlight | null>(null)
  const [done, setDone] = useState(false)
  const alive = useRef(true)
  const sig = useRef<VoiceSignal>(voiceSignal())
  const play = () => {
    setDone(false)
    cancelVoice(sig.current)
    sig.current = voiceSignal()
    void sayParts(p.parts.map((x) => ({ id: x.id, onStart: () => alive.current && setH(x.highlight) })), undefined, sig.current).then(() => {
      if (!alive.current) return
      setH(null)
      if (p.autoNext) { window.setTimeout(() => { if (alive.current) p.onNext() }, 500); return }
      setDone(true)
    })
  }
  useEffect(() => {
    alive.current = true
    play()
    return () => { alive.current = false; cancelVoice(sig.current) }
    // plays once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {p.children(h)}
      {p.skippable && <div className="d2-explain-skip" data-skip onPointerDown={(e) => { e.preventDefault(); cancelVoice(sig.current); p.onNext() }} />}
      {done && (
        <div className="d2-explain-controls">
          <button type="button" aria-label="replay" className="d2-btn" onPointerDown={(e) => { e.preventDefault(); play() }}><SpeakerIcon /></button>
          <button type="button" aria-label="next" className="d2-btn d2-btn-next" onPointerDown={(e) => { e.preventDefault(); cancelVoice(sig.current); p.onNext() }}><NextIcon /></button>
        </div>
      )}
    </>
  )
}
