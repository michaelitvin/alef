// A tap on something he collects or keeps (hearts, stars, coins, the coins' ×2/×3, crystals, his best) says briefly what it is (the parent).
// Taps while the explanation still plays are ignored, so a burst of taps says it once.
import type { ReactNode } from 'react'
import { useCourse } from '../course/CourseContext'

type InfoLine = 'info-hearts' | 'info-stars' | 'info-coins' | 'info-crystals' | 'info-best' | 'info-bosses' | 'info-mult'

export function InfoTap(p: { line: InfoLine; children: ReactNode; className?: string }) {
  // the open course's voice and log
  const { audio, telemetry } = useCourse()
  return (
    <span data-info={p.line} className={`d2-info${p.className ? ` ${p.className}` : ''}`}
      onPointerDown={(e) => { e.preventDefault(); telemetry.track('info', { what: p.line }); audio.sayInfo(`${p.line}-1`) }}>
      {p.children}
    </span>
  )
}
