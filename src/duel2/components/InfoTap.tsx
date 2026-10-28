// A tap on something he collects or keeps (hearts, stars, coins, crystals, his best) says briefly what it is (the parent).
// Taps while the explanation still plays are ignored, so a burst of taps says it once.
import type { ReactNode } from 'react'
import { sayInfo } from '../audio/duel2Audio'

export type InfoLine = 'info-hearts' | 'info-stars' | 'info-coins' | 'info-crystals' | 'info-best'

export function InfoTap(p: { line: InfoLine; children: ReactNode; className?: string }) {
  return (
    <span data-info={p.line} className={`d2-info${p.className ? ` ${p.className}` : ''}`}
      onPointerDown={(e) => { e.preventDefault(); sayInfo(`${p.line}-1`) }}>
      {p.children}
    </span>
  )
}
