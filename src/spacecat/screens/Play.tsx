// The play screen: the stage (touch-action: none) with the canvas, the held house as the top bar's first item, and the
// pause cover. His minutes count while the flight shows (the parent area's Progress section).
import { useEffect, useState, type CSSProperties } from 'react'
import { usePlaytime } from '../../shared/playtime'
import { GEOM, fit } from '../canvas/draw'
import { layoutFor } from '../layout'
import { HomeButton } from '../../shared/HomeButton'
import { usePlay, type UsePlayOpts } from '../usePlay'
import { PauseCover } from './PauseCover'

/** the held button's size (CSS px) */
const HOUSE = 56
const INSET = 8

/** where the house sits: on the top bar's row, in the corner the canvas keeps free (it follows the letterboxed game area) */
function housePlace(): CSSProperties {
  const w = window.innerWidth, h = window.innerHeight, G = GEOM[layoutFor(w, h)], f = fit(G, w, h)
  const cx = f.ox + (G.houseW / 2) * f.scale, cy = f.oy + G.topY * f.scale
  return { left: Math.max(INSET, cx - HOUSE / 2), top: Math.max(INSET, cy - HOUSE / 2) }
}

function useHousePlace(): CSSProperties {
  const [at, setAt] = useState(housePlace)
  useEffect(() => {
    const on = () => setAt(housePlace())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return at
}

export function Play(props: UsePlayOpts) {
  const p = usePlay(props)
  const house = useHousePlace()
  usePlaytime('spacecat', !p.view.paused && p.view.phase !== 'between')
  return (
    <div className="sc-stage" data-phase={p.view.phase} data-paused={p.view.paused || undefined}>
      <canvas ref={p.canvasRef} className="sc-canvas" />
      <div className="sc-topbar" style={{ ['--house-x' as string]: `${house.left}px`, ['--house-y' as string]: `${house.top}px` }}>
        <HomeButton onHome={p.leave} className="sc-home sc-home-bar" />
      </div>
      {p.view.paused && <PauseCover onPlay={p.resume} onHome={p.leave} />}
    </div>
  )
}
