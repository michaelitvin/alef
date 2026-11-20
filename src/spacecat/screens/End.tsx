// The end of a run (spec *The end screen*): built from the parts of level done: his ship, the points of the run, his best
// (a new best gets its own moment: the cup glows, a burst, and the new-best line), the play triangle, and the held house
// (the parent's decision). The end sound, then the out line (the first two times). The tune plays here.
import { useEffect } from 'react'
import { HomeButton } from '../../shared/HomeButton'
import { IMAGES } from '../assets/images'
import { playSfx, quiet, say, sayAfterSfx, startTune, stopVoice } from '../audio/spaceCatAudio'
import type { EndInfo } from '../controller'
import type { Layout } from '../layout'
import { useSpaceCatStore } from '../store'
import { Count } from './Cover'
import { InfoTap } from './InfoTap'
import { PlayTriangle } from './PlayTriangle'
import { At, Stage, useLayout } from './Stage'

/** the out line plays the first this many times */
export const OUT_LINE_TIMES = 2
const GAP_MS = 800

const PLACE: Record<Layout, { ship: [number, number, number]; points: [number, number, number]; best: [number, number, number]; play: [number, number, number] }> = {
  wide: { ship: [470, 470, 330], points: [900, 300, 96], best: [900, 450, 76], play: [1260, 650, 200] },
  portrait: { ship: [270, 330, 230], points: [150, 600, 70], best: [150, 710, 56], play: [270, 860, 132] },
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

export function End({ info, onAgain, onHome }: { info: EndInfo; onAgain: () => void; onHome: () => void }) {
  const layout = useLayout()
  const P = PLACE[layout]
  const ship = useSpaceCatStore((s) => s.ship)
  useEffect(() => {
    let alive = true
    startTune()
    void (async () => {
      const store = useSpaceCatStore.getState
      const end = playSfx('end')
      if ((store().heard.out ?? 0) < OUT_LINE_TIMES) {
        if (await sayAfterSfx(end, 'out', () => alive)) store().markHeard('out')
      } else await end
      if (!info.newBest || !alive) return
      await quiet()
      await wait(GAP_MS)
      if (alive) await say('new-best')
    })()
    return () => { alive = false; stopVoice() }
  }, [info])
  return (
    <Stage layout={layout} name="end" corners={<HomeButton onHome={onHome} className="sc-home" />}>
      <At x={P.ship[0]} y={P.ship[1]} className="sc-float">
        <img src={IMAGES.ships[ship - 1]} alt="" draggable={false} className="sc-ship" data-ship={ship} style={{ width: P.ship[2] }} />
      </At>
      <At x={P.points[0]} y={P.points[1]} className="sc-left"><InfoTap line="info-points"><Count icon="star" value={info.points} size={P.points[2]} /></InfoTap></At>
      <At x={P.best[0]} y={P.best[1]} className="sc-left">
        <InfoTap line="info-best" className={info.newBest ? 'sc-best-new' : undefined}>
          <Count icon="cup" value={info.best} size={P.best[2]} glow={info.newBest} />
          {info.newBest && <span className="sc-burst" aria-hidden data-new-best />}
        </InfoTap>
      </At>
      <At x={P.play[0]} y={P.play[1]}><PlayTriangle onPress={onAgain} size={P.play[2]} /></At>
    </Stage>
  )
}
