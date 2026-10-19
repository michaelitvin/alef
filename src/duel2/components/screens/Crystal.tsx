// 6 · The crystal behind the last door, in its own moment: a quartz or amethyst crystal with a burst of light.
import { useEffect } from 'react'
import { IMAGES } from '../../assets/images'
import { Stage } from './Stage'

export const CRYSTAL_MS = 3200
const COLORS = [['#f4f7ff', '#b9c7ff'], ['#e6c8ff', '#8a4fd8'], ['#ffd6ea', '#d86fa8'], ['#e8ddd2', '#8a7660']]

export function Crystal(p: { kind: number; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(p.onDone, CRYSTAL_MS)
    return () => window.clearTimeout(t)
    // once per crystal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const k = ((p.kind % 4) + 4) % 4
  const [a, b] = COLORS[k]
  const img = IMAGES[`s-crystal-${k + 1}`]
  return (
    <Stage bg="bg-sky">
      <defs>
        <radialGradient id="d2-burst"><stop offset="0" stopColor="#fff6d8" stopOpacity="0.95" /><stop offset="1" stopColor="#ffd34d" stopOpacity="0" /></radialGradient>
        <linearGradient id="d2-cry" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
      </defs>
      <circle cx={800} cy={450} r={420} fill="url(#d2-burst)" className="d2-burst" />
      <g data-crystal className="d2-crystal-in">
        {img
          ? <image href={img} x={800 - 200} y={450 - 260} width={400} height={520} />
          : <g stroke="#fff" strokeWidth={4}>
              <polygon points="800,170 900,330 860,690 740,690 700,330" fill="url(#d2-cry)" />
              <polygon points="700,330 800,170 800,690 740,690" fill="#ffffff" opacity={0.25} />
            </g>}
      </g>
    </Stage>
  )
}
