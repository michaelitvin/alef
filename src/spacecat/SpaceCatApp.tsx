// Space Cat: a flying sums game, a separate app in the alef repo (spec: docs/superpowers/specs/2026-11-12-space-cat-design.md).
import { useEffect, useRef, useState } from 'react'
import { useGameShell } from '../shared/shell/GameShell'
import { preloadSpaceCat } from './assets/preload'
import { rehydrateSpaceCat } from './store'

type Screen = 'cover' | 'play' | 'level' | 'end' | 'parent'

export default function SpaceCatApp() {
  const [screen, setScreen] = useState<Screen>('cover')
  const screenRef = useRef(screen)
  screenRef.current = screen
  useEffect(() => rehydrateSpaceCat(), [])
  // no askGender: no line of this game has a boy or girl form, so play never asks (spec *Voice*; the parent)
  const shell = useGameShell({
    preload: preloadSpaceCat,
    canStart: () => screenRef.current === 'cover',
    onPlay: () => setScreen('play'),
  })
  return (
    <div className="sc-root" data-screen={screen} data-loading={shell.loading || undefined}>
      {screen === 'cover' && <button type="button" className="sc-play" aria-label="play" onClick={shell.play} />}
    </div>
  )
}
