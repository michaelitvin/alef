// Book 2: letters and syllables, a separate app in the alef repo (spec: docs/superpowers/specs/2026-10-19-duel-book-2-design.md).
import { useEffect, useRef, useState } from 'react'
import { GlyphSheet } from './screens/GlyphSheet'
import { TEST_HOOKS } from './testHooks'
import { Cover } from './screens/Cover'
import { Play } from './screens/Play'
import { Summary } from './screens/Summary'
import { Parent } from './screens/Parent'
import { Gallery, type GalleryEntry } from './screens/Gallery'
import { preloadDuel2Assets } from './assets/preload'
import { configureAudio, holdAudio, setHidden, stopVoice, unlockDuel2Audio } from './audio/duel2Audio'
import { useDuel2Store } from './store'
import type { View } from './controller'

type Screen = 'cover' | 'play' | 'summary' | 'parent' | 'gallery' | 'gallery-play'

/** Book 2 is a landscape game; a portrait phone shows a drawn "turn the phone" picture over everything (no text: rule). */
function RotateHint() {
  return (
    <div className="d2-rotate" aria-hidden>
      <svg viewBox="0 0 120 120" width="160" height="160">
        <rect x="38" y="18" width="44" height="78" rx="8" fill="none" stroke="#fff6d8" strokeWidth="5" className="d2-rotate-phone" />
        <path d="M24 70 a40 40 0 0 1 22 -46" fill="none" stroke="#ffd34d" strokeWidth="5" strokeLinecap="round" />
        <path d="M40 18 l7 6 -9 4" fill="none" stroke="#ffd34d" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function Duel2App() {
  const [screen, setScreen] = useState<Screen>('cover')
  const [over, setOver] = useState<NonNullable<View['over']> | null>(null)
  const [runNo, setRunNo] = useState(0)
  const [entry, setEntry] = useState<GalleryEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const screenRef = useRef(screen)
  screenRef.current = screen
  useEffect(() => { void preloadDuel2Assets() }, [])
  const settings = useDuel2Store((s) => s.settings)
  useEffect(() => configureAudio(settings), [settings])
  // switching apps silences everything; the play screen also pauses (useRun) and its cover holds the sound (rule)
  useEffect(() => {
    const vis = () => {
      const hidden = document.visibilityState === 'hidden'
      setHidden(hidden)
      if (hidden && screenRef.current === 'play') holdAudio(true)
    }
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', vis)
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', vis) }
  }, [])
  if (TEST_HOOKS && location.hash === '#/glyphs') return <div className="d2-root"><GlyphSheet /></div>

  const play = () => {
    if (loading) return
    unlockDuel2Audio()
    setLoading(true)
    void preloadDuel2Assets().then(() => {
      setLoading(false)
      if (screenRef.current !== 'cover') return
      setRunNo((n) => n + 1)
      setScreen('play')
    })
  }
  const view = (() => {
  if (screen === 'play') return <Play key={runNo} opts={{}} onOver={(o) => { setOver(o); setScreen('summary') }} />
  if (screen === 'summary' && over) return <Summary over={over} onAgain={() => { stopVoice(); setRunNo((n) => n + 1); setScreen('play') }} />
  if (screen === 'parent') return <Parent onClose={() => setScreen('cover')} onGallery={() => setScreen('gallery')} />
  if (screen === 'gallery') return <Gallery onBack={() => setScreen('parent')} onStart={(e) => { unlockDuel2Audio(); setEntry(e); setRunNo((n) => n + 1); setScreen('gallery-play') }} />
  if (screen === 'gallery-play' && entry) {
    return (
      <>
        <Play key={runNo} opts={{ sandbox: true, force: entry.force }} onOver={() => setScreen('gallery')} />
        <button type="button" aria-label="back" className="d2-gallery-back" onClick={() => { stopVoice(); setScreen('gallery') }}>Back</button>
      </>
    )
  }
  return <Cover onPlay={play} onParent={() => setScreen('parent')} loading={loading} />
  })()
  return <>{view}{screen !== 'parent' && screen !== 'gallery' && <RotateHint />}</>
}
