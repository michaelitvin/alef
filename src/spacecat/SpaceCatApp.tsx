// Space Cat: a flying sums game, a separate app in the alef repo (spec: docs/superpowers/specs/2026-11-12-space-cat-design.md).
import { useEffect, useRef, useState } from 'react'
import { unlockAudioOutput } from '../shared/gameAudio/output'
import { useGameShell } from '../shared/shell/GameShell'
import { preloadSpaceCat } from './assets/preload'
import { stopAll } from './audio/spaceCatAudio'
import type { EndInfo } from './controller'
import { ParentArea } from '../parent/ParentArea'
import { Cover } from './screens/Cover'
import { End } from './screens/End'
import { Play } from './screens/Play'
import { rehydrateSpaceCat } from './store'
import { spaceCatTelemetry } from './telemetry'

type Screen = 'cover' | 'play' | 'end' | 'parent'

/** back to alef's home screen, the hub of all the games (never the game's cover) */
function defaultGoHome() { location.assign(import.meta.env.BASE_URL) }

export default function SpaceCatApp({ goHome = defaultGoHome }: { goHome?: () => void } = {}) {
  const [screen, setScreen] = useState<Screen>('cover')
  const screenRef = useRef(screen)
  screenRef.current = screen
  /** a new run mounts a new play screen */
  const [runKey, setRunKey] = useState(0)
  const [end, setEnd] = useState<EndInfo | null>(null)
  useEffect(() => rehydrateSpaceCat(), [])
  const newRun = () => { setRunKey((k) => k + 1); setScreen('play') }
  // no askGender: no line of this game has a boy or girl form, so play never asks (spec *Voice*; the parent)
  const shell = useGameShell({ preload: preloadSpaceCat, canStart: () => screenRef.current === 'cover', onPlay: newRun })
  // the held house (the cover, the end screen; the play screen has the pause button, whose cover has the house): alef's home screen
  const leave = () => {
    stopAll()
    spaceCatTelemetry.flush()
    goHome()
  }
  const inRun = screen === 'play' || screen === 'end'
  return (
    <div className="sc-root" data-screen={screen} data-loading={shell.loading || undefined}>
      {inRun && (
        // the play screen stays mounted under the end screen
        <Play key={runKey} goHome={goHome} onEnd={(i) => { setEnd(i); setScreen('end') }} />
      )}
      {screen === 'end' && end && <End info={end} onAgain={() => { unlockAudioOutput(); newRun() }} onHome={leave} />}
      {screen === 'cover' && <Cover onPlay={shell.play} loading={shell.loading} onParent={() => setScreen('parent')} onHome={leave} />}
      {/* the shared parent area at Space Cat's section, with the live log (the Data section exports and clears it) */}
      {screen === 'parent' && (
        <ParentArea game="spacecat" onClose={() => setScreen('cover')} track={spaceCatTelemetry.track} telemetry={spaceCatTelemetry}
          homeHref={import.meta.env.BASE_URL} />
      )}
    </div>
  )
}
