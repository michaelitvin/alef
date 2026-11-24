// The play screen: the stage (touch-action: none) with the canvas, the pause button as the top bar's first item, and the
// pause cover. His minutes count while the flight shows (the parent area's Progress section).
import { useEffect, useState } from 'react'
import { usePlaytime } from '../../shared/playtime'
import { housePlace } from '../canvas/draw'
import { PauseButton } from '../../shared/HomeButton'
import { usePlay, type UsePlayOpts } from '../usePlay'
import { PauseCover } from './PauseCover'

function useHousePlace() {
  const [at, setAt] = useState(() => housePlace(window.innerWidth, window.innerHeight))
  useEffect(() => {
    const on = () => setAt(housePlace(window.innerWidth, window.innerHeight))
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
        <PauseButton onPause={p.pause} className="sc-home sc-home-bar" />
      </div>
      {p.view.paused && <PauseCover onPlay={p.resume} onHome={p.leave} />}
    </div>
  )
}
