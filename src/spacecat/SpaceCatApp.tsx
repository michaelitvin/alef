// Space Cat: a flying sums game, a separate app in the alef repo (spec: docs/superpowers/specs/2026-11-12-space-cat-design.md).
import { useEffect, useRef, useState } from 'react'
import { unlockAudioOutput } from '../shared/gameAudio/output'
import { useGameShell } from '../shared/shell/GameShell'
import { preloadSpaceCat } from './assets/preload'
import { stopAll } from './audio/spaceCatAudio'
import type { EndInfo, LevelDoneInfo } from './controller'
import { flushLog } from './logSeam'
import { Cover } from './screens/Cover'
import { End } from './screens/End'
import { LevelDone } from './screens/LevelDone'
import { Play } from './screens/Play'
import { rehydrateSpaceCat } from './store'
import type { PlayApi } from './usePlay'

type Screen = 'cover' | 'play' | 'level' | 'end' | 'parent'

/** back to alef's home screen, the hub of all the games (never the game's cover) */
function defaultGoHome() { location.assign(import.meta.env.BASE_URL) }

export default function SpaceCatApp({ goHome = defaultGoHome }: { goHome?: () => void } = {}) {
  const [screen, setScreen] = useState<Screen>('cover')
  const screenRef = useRef(screen)
  screenRef.current = screen
  /** a new run mounts a new play screen */
  const [runKey, setRunKey] = useState(0)
  const [level, setLevel] = useState<LevelDoneInfo | null>(null)
  const [end, setEnd] = useState<EndInfo | null>(null)
  const play = useRef<PlayApi | null>(null)
  useEffect(() => rehydrateSpaceCat(), [])
  const newRun = () => { setRunKey((k) => k + 1); setScreen('play') }
  // no askGender: no line of this game has a boy or girl form, so play never asks (spec *Voice*; the parent)
  const shell = useGameShell({ preload: preloadSpaceCat, canStart: () => screenRef.current === 'cover', onPlay: newRun })
  // the held house (the cover, the end screen; the play screen has its own, which also ends the run): alef's home screen
  const leave = () => {
    stopAll()
    flushLog()
    goHome()
  }
  const inRun = screen === 'play' || screen === 'level' || screen === 'end'
  return (
    <div className="sc-root" data-screen={screen} data-loading={shell.loading || undefined}>
      {inRun && (
        // the play screen stays mounted under level done and the end screen, so the run goes on from level done
        <Play key={runKey} apiRef={play} goHome={goHome}
          onLevelDone={(i) => { setLevel(i); setScreen('level') }} onEnd={(i) => { setEnd(i); setScreen('end') }} />
      )}
      {screen === 'level' && level && <LevelDone info={level} onNext={() => { setScreen('play'); play.current?.nextLevel() }} />}
      {screen === 'end' && end && <End info={end} onAgain={() => { unlockAudioOutput(); newRun() }} onHome={leave} />}
      {screen === 'cover' && <Cover onPlay={shell.play} loading={shell.loading} onParent={() => setScreen('parent')} onHome={leave} />}
      {/* the shared parent area comes with Space Cat's part in it */}
      {screen === 'parent' && <div data-screen-part="parent" />}
    </div>
  )
}
