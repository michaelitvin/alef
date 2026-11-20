// Level done (spec *Levels*): the thumbs-up cat (a new ship flies in and takes its place: each character once on a
// screen), the three hearts filling again, the points of the run, the play triangle. The sounds in order: the fanfare,
// then the level line (the first two times), then each new ship's sound and its line. The tune plays here.
import { useEffect } from 'react'
import { IMAGES } from '../assets/images'
import { playSfx, quiet, sayAfterSfx, startTune, stopVoice } from '../audio/spaceCatAudio'
import type { LevelDoneInfo } from '../controller'
import type { Layout } from '../layout'
import { useSpaceCatStore } from '../store'
import { Count } from './Cover'
import { Heart } from './icons'
import { InfoTap } from './InfoTap'
import { PlayTriangle } from './PlayTriangle'
import { At, Stage, useLayout } from './Stage'

/** the level line plays the first this many times (then only the fanfare) */
export const LEVEL_LINE_TIMES = 2
/** the gap between one sound and the next (spec: two audio events never touch) */
const GAP_MS = 400

const PLACE: Record<Layout, { cat: [number, number, number]; hearts: [number, number, number]; points: [number, number, number]; play: [number, number, number] }> = {
  wide: { cat: [520, 470, 470], hearts: [1150, 230, 1.9], points: [1040, 400, 84], play: [1150, 640, 200] },
  portrait: { cat: [270, 420, 330], hearts: [270, 640, 1.4], points: [175, 730, 62], play: [270, 855, 140] },
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

export function LevelDone({ info, onNext }: { info: LevelDoneInfo; onNext: () => void }) {
  const layout = useLayout()
  const P = PLACE[layout]
  const newShip = info.newShips[info.newShips.length - 1]
  useEffect(() => {
    let alive = true
    startTune()
    void (async () => {
      const store = useSpaceCatStore.getState
      const fanfare = playSfx('level')
      if ((store().heard['level-done'] ?? 0) < LEVEL_LINE_TIMES) {
        if (await sayAfterSfx(fanfare, 'level-done', () => alive)) store().markHeard('level-done')
      } else await fanfare
      for (let i = 0; i < info.newShips.length && alive; i++) {
        await quiet()
        await wait(GAP_MS)
        if (alive) await sayAfterSfx(playSfx('ship'), 'new-ship', () => alive)
      }
    })()
    return () => { alive = false; stopVoice() }
  }, [info])
  const [hx, hy, hs] = P.hearts
  return (
    <Stage layout={layout} name="level">
      <At x={P.cat[0]} y={P.cat[1]}>
        {newShip
          ? <img src={IMAGES.ships[newShip - 1]} alt="" draggable={false} className="sc-new-ship" data-ship={newShip} style={{ width: P.cat[2] * 0.62 }} />
          : <img src={IMAGES.thumbs} alt="" draggable={false} className="sc-thumbs" data-cat style={{ width: P.cat[2] }} />}
      </At>
      <At x={hx} y={hy}>
        <InfoTap line="info-hearts" className="sc-hearts">
          {[0, 1, 2].map((i) => <Heart key={i} size={64 * hs} className="sc-heart-fill" />)}
        </InfoTap>
      </At>
      <At x={P.points[0]} y={P.points[1]}><InfoTap line="info-points"><Count icon="star" value={info.points} size={P.points[2]} /></InfoTap></At>
      <At x={P.play[0]} y={P.play[1]}><PlayTriangle onPress={onNext} size={P.play[2]} /></At>
    </Stage>
  )
}
