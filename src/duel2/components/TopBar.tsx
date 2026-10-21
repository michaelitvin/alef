// The top bar (rule: floating buttons in the top bar, never over the content): hearts on the right, the cue's speaker and
// the hint on the left, next in the middle after a mistake or an explanation, the run's points beside the hearts (the child
// asked where to see his points). Every button answers on finger-down.
import type { ReactNode } from 'react'
import { HeartIcon, HintIcon, NextIcon, SpeakerIcon } from './icons'
import { StarCount } from './StarCount'

function Btn(p: { label: string; onPress: () => void; children: ReactNode; big?: boolean }) {
  return (
    <button type="button" aria-label={p.label} className={`d2-btn${p.big ? ' d2-btn-next' : ''}`}
      onPointerDown={(e) => { e.preventDefault(); p.onPress() }}>
      {p.children}
    </button>
  )
}

export function TopBar(p: { hearts: number; score?: number; onReplay?: () => void; onHint?: () => void; onNext?: () => void }) {
  return (
    <div className="d2-topbar">
      <div className="d2-topbar-side">
        {p.onReplay && <Btn label="replay" onPress={p.onReplay}><SpeakerIcon /></Btn>}
        {p.onHint && <Btn label="hint" onPress={p.onHint}><HintIcon /></Btn>}
      </div>
      <div className="d2-topbar-mid">{p.onNext && <Btn label="next" onPress={p.onNext} big><NextIcon /></Btn>}</div>
      <div className="d2-topbar-side d2-hearts">
        {p.score !== undefined && <StarCount n={p.score} attr="data-score" />}
        {Array.from({ length: p.hearts }, (_, i) => <span key={i} data-heart className="d2-heart"><HeartIcon /></span>)}
      </div>
    </div>
  )
}
