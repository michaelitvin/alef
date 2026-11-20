// The still screens' world: the space background over the whole screen, and the game area (the play screen's logical
// size, LOGICAL) centred and scaled inside it, so each part sits where the approved mock puts it, in logical px.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IMAGES } from '../assets/images'
import { PLANET_AIR, PlanetRenderer } from '../canvas/planet'
import { LOGICAL, layoutFor, type Layout } from '../layout'

export function useLayout(): Layout {
  const [l, setL] = useState(() => layoutFor(window.innerWidth, window.innerHeight))
  useEffect(() => {
    const on = () => setL(layoutFor(window.innerWidth, window.innerHeight))
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return l
}

function scaleOf(l: Layout) {
  const { w, h } = LOGICAL[l], W = window.innerWidth, H = window.innerHeight, s = Math.min(W / w, H / h)
  return { s, x: (W - w * s) / 2, y: (H - h * s) / 2 }
}

function useScale(l: Layout) {
  const [f, setF] = useState(() => scaleOf(l))
  useEffect(() => {
    const on = () => setF(scaleOf(l))
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [l])
  return f
}

/** a screen: `children` are placed in the layout's logical px; `corners` (the house, the parent button) in screen px */
export function Stage({ layout, name, children, corners }: { layout: Layout; name: string; children: ReactNode; corners?: ReactNode }) {
  const f = useScale(layout)
  const { w, h } = LOGICAL[layout]
  return (
    <div className="sc-screen" data-screen-part={name} data-layout={layout} style={{ backgroundImage: `url(${IMAGES.bg})` }}>
      <div className="sc-world" style={{ width: w, height: h, transform: `translate(${f.x}px, ${f.y}px) scale(${f.s})` }}>{children}</div>
      {corners}
    </div>
  )
}

/** at (x, y) in logical px, centred */
export function At({ x, y, children, className = '', onPointerDown }: { x: number; y: number; children: ReactNode; className?: string; onPointerDown?: () => void }) {
  return <div className={`sc-at ${className}`.trim()} style={{ left: x, top: y }} onPointerDown={onPointerDown}>{children}</div>
}

/** one of the original's planets, turning (its own canvas; the cover's world) */
export function TurningPlanet({ i, r }: { i: number; r: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const planet = new PlanetRenderer(IMAGES.surfaces[i % 4], PLANET_AIR[i % 4])
    const g = ref.current?.getContext('2d')
    if (!g) return
    let id = 0
    const t0 = performance.now(), speed = 0.04 + 0.015 * i
    const draw = () => {
      g.clearRect(0, 0, 128, 128)
      g.drawImage(planet.render(((performance.now() - t0) / 1000) * speed + i * 0.27), 0, 0, 128, 128)
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(id)
  }, [i])
  return <canvas ref={ref} width={128} height={128} className="sc-planet" style={{ width: r * 2, height: r * 2 }} />
}
