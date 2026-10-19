// The game stage: one 1600×900 SVG scaled to fit (letterboxed on a portrait phone, so the glyph stays the largest
// element), with its background and the glyph filters.
import type { ReactNode, SVGProps } from 'react'
import { IMAGES } from '../../assets/images'
import { GlyphDefs } from '../Glyph'

export const W = 1600
export const H = 900
export type Phase = 'demo' | 'question' | 'answer' | 'feedback' | 'mistake' | 'explain' | 'celebrate'

export function Stage({ bg, children, ...rest }: { bg: 'bg-sky' | 'bg-ground'; children: ReactNode } & SVGProps<SVGSVGElement>) {
  return (
    <svg data-stage className="d2-stage" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" {...rest}>
      <GlyphDefs />
      {IMAGES[bg]
        ? <image href={IMAGES[bg]} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" />
        : <rect width={W} height={H} fill="#1b0f3c" />}
      {children}
    </svg>
  )
}

/** Client point → stage point. Falls back to client coordinates when the SVG has no layout (tests). */
export function toStage(el: Element | null, clientX: number, clientY: number): { x: number; y: number } {
  const svg = (el instanceof SVGSVGElement ? el : el?.closest('svg')) as SVGSVGElement | null
  const ctm = svg?.getScreenCTM?.()
  if (svg && ctm && typeof svg.createSVGPoint === 'function') {
    const p = svg.createSVGPoint()
    p.x = clientX
    p.y = clientY
    const q = p.matrixTransform(ctm.inverse())
    return { x: q.x, y: q.y }
  }
  return { x: clientX, y: clientY }
}

/** Mirror a sprite drawn facing `drawn` so that it faces `want`. */
export const faceTransform = (drawn: 'left' | 'right' | 'front', want: 'left' | 'right', cx: number) =>
  drawn !== 'front' && drawn !== want ? `translate(${2 * cx} 0) scale(-1 1)` : undefined
