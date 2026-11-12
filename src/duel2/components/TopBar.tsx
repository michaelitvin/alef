// The top bar (rule: floating buttons in the top bar, never over the content): hearts on the right, the cue's speaker and
// the hint on the left, next in the middle after a mistake or an explanation, the run's points beside the hearts (the child
// asked where to see his points), and the streak multiplier of the coins (×2, ×3) beside them. Every button answers on
// finger-down.
import type { ReactNode } from 'react'
import { HeartIcon, HintIcon, NextIcon, SpeakerIcon } from './icons'
import { StarCount } from './StarCount'
import { CoinCount } from './CoinCount'
import { InfoTap } from './InfoTap'

function Btn(p: { label: string; onPress: () => void; children: ReactNode; big?: boolean; glow?: boolean }) {
  return (
    <button type="button" aria-label={p.label} className={`d2-btn${p.big ? ' d2-btn-next' : ''}`} data-glow={p.glow ? 'true' : undefined}
      onPointerDown={(e) => { e.preventDefault(); p.onPress() }}>
      {p.children}
    </button>
  )
}

export function TopBar(p: {
  /** none in a session from the path (no hearts at stake) */
  hearts?: number; score?: number; coins?: number; mult?: 1 | 2 | 3; onReplay?: () => void; onHint?: () => void; onNext?: () => void
  /** the wand glows (the merchant: two wrong payments in a row); it never opens the hint by itself */
  hintGlow?: boolean
}) {
  return (
    <div className="d2-topbar">
      <div className="d2-topbar-side">
        {p.onReplay && <Btn label="replay" onPress={p.onReplay}><SpeakerIcon /></Btn>}
        {p.onHint && <Btn label="hint" onPress={p.onHint} glow={p.hintGlow}><HintIcon /></Btn>}
      </div>
      <div className="d2-topbar-mid">{p.onNext && <Btn label="next" onPress={p.onNext} big><NextIcon /></Btn>}</div>
      <div className="d2-topbar-side d2-hearts">
        {p.coins !== undefined && <InfoTap line="info-coins"><CoinCount n={p.coins} /></InfoTap>}
        {p.score !== undefined && <InfoTap line="info-stars"><StarCount n={p.score} attr="data-score" /></InfoTap>}
        {/* the streak multiplier of the coins (digits only); it pops when it rises (a new key) */}
        {p.mult !== undefined && p.mult > 1 && <span key={p.mult} data-num data-mult={p.mult} className="d2-mult">×{p.mult}</span>}
        {p.hearts !== undefined && (
          <InfoTap line="info-hearts" className="d2-hearts-row">
            {Array.from({ length: p.hearts }, (_, i) => <span key={i} data-heart className="d2-heart"><HeartIcon /></span>)}
          </InfoTap>
        )}
      </div>
    </div>
  )
}
