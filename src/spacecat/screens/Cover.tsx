// The cover (spec *The cover*): the space background with turning planets; all his points (star) and his best (cup) at
// the top; the ship shelf with his ship large in its middle and the two others small beside it (a locked one a dark
// outline); the play triangle; the parent button (the shared gate) and the held house, inset from the corners. No text
// but digits. The tune plays here once he has touched the screen (browsers allow sound only after a tap).
import { useEffect, type PointerEvent } from 'react'
import { HomeButton } from '../../shared/HomeButton'
import { ParentGate } from '../../shared/parentGate/ParentGate'
import { unlockAudioOutput } from '../../shared/gameAudio/output'
import { IMAGES } from '../assets/images'
import { sayInfo, startTune, stopTune } from '../audio/spaceCatAudio'
import type { Layout } from '../layout'
import { useSpaceCatStore } from '../store'
import { InfoTap } from './InfoTap'
import { Cup, SlidersGlyph, Star } from './icons'
import { PlayTriangle } from './PlayTriangle'
import { At, Stage, TurningPlanet, useLayout } from './Stage'

/** the mock's places, in logical px */
const PLACE: Record<Layout, {
  planets: [number, number, number][]; points: [number, number]; best: [number, number]; row: number
  shelf: { base: number; cx: number; big: number; small: number; dx: number; w: number; h: number }; play: [number, number, number]
}> = {
  wide: {
    planets: [[230, 240, 110], [1400, 180, 80], [1410, 730, 100], [170, 720, 60]], points: [600, 95], best: [880, 95], row: 64,
    shelf: { base: 610, cx: 620, big: 300, small: 150, dx: 255, w: 740, h: 30 }, play: [1150, 450, 110],
  },
  portrait: {
    planets: [[70, 230, 46], [475, 200, 52], [470, 670, 50], [75, 720, 44]], points: [105, 80], best: [325, 80], row: 50,
    shelf: { base: 520, cx: 270, big: 230, small: 112, dx: 172, w: 476, h: 24 }, play: [270, 700, 76],
  },
}

/** he has touched a screen of the game on this page: the tune may start at once */
let tapped = false

/** a number with its icon in front (star: points, cup: best) */
export function Count({ icon, value, size, glow }: { icon: 'star' | 'cup'; value: number; size: number; glow?: boolean }) {
  return (
    <span className={glow ? 'sc-count sc-count-glow' : 'sc-count'} style={{ fontSize: size }}>
      {icon === 'star' ? <Star size={size * 1.24} /> : <Cup size={size * 1.24} glow={glow} />}
      <span className="sc-num">{value}</span>
    </span>
  )
}

export function Cover({ onPlay, loading, onParent, onHome }: { onPlay: () => void; loading: boolean; onParent: () => void; onHome: () => void }) {
  const layout = useLayout()
  const P = PLACE[layout]
  const { totalPoints, best, ships, ship, chooseShip } = useSpaceCatStore()
  useEffect(() => {
    if (tapped) startTune()
    return () => stopTune()
  }, [])
  const firstTap = (e: PointerEvent) => {
    if (tapped || (e.target instanceof Element && e.target.closest('.home-btn, .sc-parent-btn, [data-year-pad]'))) return
    tapped = true
    unlockAudioOutput()
    startTune()
  }
  const others = ([1, 2, 3] as const).filter((n) => n !== ship)
  const S = P.shelf
  const shelf: [1 | 2 | 3, number, number][] = [[others[0], S.cx - S.dx, S.small], [ship, S.cx, S.big], [others[1], S.cx + S.dx, S.small]]
  return (
    <div onPointerDownCapture={firstTap}>
      <Stage layout={layout} name="cover" corners={<>
        <HomeButton onHome={onHome} className="sc-home" />
        <ParentGate label="parent settings (hold)" className="sc-parent-btn" onOpen={onParent}><SlidersGlyph /></ParentGate>
      </>}>
        {P.planets.map(([x, y, r], i) => <At key={i} x={x} y={y} className="sc-float"><TurningPlanet i={i} r={r} /></At>)}
        <At x={P.points[0]} y={P.points[1]}><InfoTap line="info-points"><Count icon="star" value={totalPoints} size={P.row} /></InfoTap></At>
        <At x={P.best[0]} y={P.best[1]}><InfoTap line="info-best"><Count icon="cup" value={best} size={P.row} /></InfoTap></At>
        <div className="sc-shelf" style={{ left: S.cx - S.w / 2, top: S.base, width: S.w, height: S.h }} />
        {shelf.map(([n, x, size]) => {
          const mine = ships.includes(n)
          return (
            <At key={n} x={x} y={S.base - size * 0.5} className={n === ship ? 'sc-ship-current' : 'sc-ship-other'}>
              <img src={IMAGES.ships[n - 1]} alt="" draggable={false} data-ship={n} data-locked={mine ? undefined : true}
                className={mine ? 'sc-ship' : 'sc-ship sc-ship-locked'} style={{ width: size, height: size }}
                onPointerDown={(e) => { e.stopPropagation(); if (mine) chooseShip(n); else sayInfo('info-ship-locked') }} />
            </At>
          )
        })}
        <At x={P.play[0]} y={P.play[1]}>
          <PlayTriangle onPress={onPlay} loading={loading} size={P.play[2] * 2} />
        </At>
      </Stage>
    </div>
  )
}
