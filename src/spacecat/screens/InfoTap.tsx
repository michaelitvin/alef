// A thing on a still screen that says what it is when tapped (the hearts, the points, his best, a locked ship): once for
// a burst of taps (the kit's sayInfo).
import type { ReactNode } from 'react'
import { sayInfo } from '../audio/spaceCatAudio'

export function InfoTap({ line, children, className = '' }: { line: string; children: ReactNode; className?: string }) {
  return <div className={`sc-info ${className}`.trim()} data-info={line} onPointerDown={(e) => { e.stopPropagation(); sayInfo(line) }}>{children}</div>
}
