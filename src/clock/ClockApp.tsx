// Clockmaker's Workshop: a separate app in the alef repo (spec: docs/superpowers/specs/2026-10-15-clock-workshop-design.md).
import { useEffect, useRef, useState } from 'react'
import { Cover } from './screens/Cover'
import { Workshop } from './screens/Workshop'
import { Parent } from './screens/Parent'
import { useClockStore } from './store'
import { configureClockAudio, playVoice, setClockHidden, startMusic, stopMusic, unlockClockAudio } from './audio/clockAudio'
import { lineAudioId } from './data/lines'
import { preloadClockAssets } from './assets/preload'

export default function ClockApp() {
  const [screen, setScreen] = useState<'cover' | 'work' | 'parent'>('cover')
  const starting = useRef(false)
  const screenRef = useRef(screen)
  screenRef.current = screen
  // fonts, images, effects and lines load while the door shows; play waits for the fonts and images (at most 4 s)
  useEffect(() => { void preloadClockAssets() }, [])
  const settings = useClockStore((s) => s.settings)
  useEffect(() => configureClockAudio(settings), [settings])
  // switching apps silences all the clock audio, on every screen (rule)
  useEffect(() => {
    const vis = () => setClockHidden(document.visibilityState === 'hidden')
    const hide = () => setClockHidden(true)
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', hide)
    window.addEventListener('pageshow', vis)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', hide)
      window.removeEventListener('pageshow', vis)
    }
  }, [])
  // the door plays the calm music (the workshop turns it off while customers come); browsers allow sound only after
  // the first tap
  const tapped = useRef(false)
  useEffect(() => {
    if (screen !== 'cover') {
      if (screen === 'parent') stopMusic()
      return
    }
    const start = (e?: PointerEvent) => {
      // the parent-settings button leads away from the door: its press starts no music
      if (e?.target instanceof Element && e.target.closest('.ck-parent-btn')) return
      window.removeEventListener('pointerdown', start)
      tapped.current = true
      unlockClockAudio()
      // the music file waits for the fonts and images, so it does not slow them down
      void preloadClockAssets().then(() => { if (screenRef.current === 'cover') startMusic(useClockStore.getState().workdays) })
    }
    if (tapped.current) { start(); return }
    window.addEventListener('pointerdown', start)
    return () => window.removeEventListener('pointerdown', start)
  }, [screen])
  const [loading, setLoading] = useState(false)
  const play = () => {
    if (starting.current) return
    unlockClockAudio()
    starting.current = true
    setLoading(true)
    const st = useClockStore.getState()
    const welcome = st.welcomed ? Promise.resolve() : playVoice(lineAudioId('welcome', st.settings.langs[0])).catch(() => {})
    if (!st.welcomed) st.setWelcomed()
    // the welcome plays while the rest loads; the workshop opens when both are done
    void Promise.all([welcome, preloadClockAssets()]).finally(() => {
      starting.current = false
      setLoading(false)
      if (screenRef.current === 'cover') setScreen('work')
    })
  }
  if (screen === 'work') return <Workshop onExit={() => setScreen('cover')} />
  if (screen === 'parent') return <Parent onClose={() => setScreen('cover')} />
  return <Cover onPlay={play} onParent={() => setScreen('parent')} loading={loading} />
}
