// The game stage: one 1600×900 SVG scaled to fit (letterboxed on a portrait phone, so the glyph stays the largest
// element), with its background and the glyph filters.
import type { ReactNode, SVGProps } from 'react'
import { IMAGES } from '../../assets/images'
import { GlyphDefs } from '../Glyph'

export const W = 1600
export const H = 900
export type Phase = 'demo' | 'question' | 'answer' | 'feedback' | 'mistake' | 'explain' | 'celebrate'

/**
 * The background around the stage: the stage keeps its 16:9 shape (the game never moves), and mirrored copies of the
 * background fill the rest of a wider or taller screen, so no black bars show (Michael).
 */
function Backdrop({ bg }: { bg: string }) {
  const url = IMAGES[bg]
  const tiles: { x: number; y: number }[] = []
  for (const x of [-W, 0, W]) for (const y of [-H, 0, H]) tiles.push({ x, y })
  return (
    <g aria-hidden>
      {tiles.map(({ x, y }) => {
        // mirror the copies so their edges meet the stage's edges seamlessly
        const fx = x === 0 ? 1 : -1
        const fy = y === 0 ? 1 : -1
        const t = `translate(${x + (fx < 0 ? W : 0)} ${y + (fy < 0 ? H : 0)}) scale(${fx} ${fy})`
        return url
          ? <image key={`${x},${y}`} data-bg-tile data-x={x} data-y={y} href={url} width={W} height={H} preserveAspectRatio="none" transform={t} />
          : <rect key={`${x},${y}`} data-bg-tile data-x={x} data-y={y} width={W} height={H} fill="#1b0f3c" transform={t} />
      })}
    </g>
  )
}

export function Stage({ bg, children, style, ...rest }: { bg: 'bg-sky' | 'bg-ground'; children: ReactNode } & SVGProps<SVGSVGElement>) {
  return (
    <svg data-stage className="d2-stage" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" overflow="visible" {...rest}
      // no screen scrolls; without this the browser takes a drag as a pan and cancels it (touch-action on inner SVG parts is ignored)
      style={{ touchAction: 'none', ...style }}>
      <GlyphDefs />
      <Backdrop bg={bg} />
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
