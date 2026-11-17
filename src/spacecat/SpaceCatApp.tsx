// Space Cat: a flying sums game, a separate app in the alef repo (spec: docs/superpowers/specs/2026-11-12-space-cat-design.md).
import { useEffect, useRef, useState } from 'react'
import { useGameShell } from '../shared/shell/GameShell'
import { preloadSpaceCat } from './assets/preload'
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
  const play = useRef<PlayApi | null>(null)
  useEffect(() => rehydrateSpaceCat(), [])
  // no askGender: no line of this game has a boy or girl form, so play never asks (spec *Voice*; the parent)
  const shell = useGameShell({
    preload: preloadSpaceCat,
    canStart: () => screenRef.current === 'cover',
    onPlay: () => { setRunKey((k) => k + 1); setScreen('play') },
  })
  const inRun = screen === 'play' || screen === 'level' || screen === 'end'
  return (
    <div className="sc-root" data-screen={screen} data-loading={shell.loading || undefined}>
      {inRun && (
        // the play screen stays mounted under level done and the end screen (Task 16), so the run goes on from there
        <Play key={runKey} apiRef={play} goHome={goHome} onLevelDone={() => setScreen('level')} onEnd={() => setScreen('end')} />
      )}
      {screen === 'cover' && <button type="button" className="sc-play" aria-label="play" onClick={shell.play} />}
    </div>
  )
}
