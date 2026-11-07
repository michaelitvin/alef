// Clockmaker's Workshop: a separate app in the alef repo (spec: docs/superpowers/specs/2026-10-15-clock-workshop-design.md).
import { useEffect, useRef, useState } from 'react'
import { Cover } from './screens/Cover'
import { Workshop } from './screens/Workshop'
import { Parent } from './screens/Parent'
import { useClockStore } from './store'
import { configureClockAudio, playVoice, setClockHidden, startMusic, stopMusic, unlockClockAudio } from './audio/clockAudio'
import { lineAudioId } from './data/lines'
import { preloadClockAssets } from './assets/preload'
import { GenderQuestion } from '../shared/GenderQuestion'
import { getGender, setGender } from '../shared/player'
import { VOICE_RATE } from '../shared/audioCore'
import { clockTelemetry } from './telemetry'
import { VOICE_WORDS } from './assets/audioFiles'
// the clock has no player character: the question shows the wizards the child knows from the other games
import boyWizard from '../duel2/assets/img/s-wizard-idle.webp'
import girlWizard from '../duel2/assets/img/s-wizard-idle-girl.webp'

/** when the question take says בֵּן / boy and בַּת / girl (real time), from its word timings */
function askCues(id: string) {
  const w = VOICE_WORDS[id]
  const at = (re: RegExp, dflt: number) => { const i = w ? w.w.findIndex((x) => re.test(x)) : -1; return (i >= 0 ? w!.t[i] : dflt) / VOICE_RATE }
  return { boy: at(/^(בן|boy)/i, 1.2), girl: at(/^(בת|girl)/i, 1.7) }
}

export default function ClockApp() {
  const [screen, setScreen] = useState<'cover' | 'ask' | 'work' | 'parent'>('cover')
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
    // boy or girl is not set yet: ask the child before the welcome (spec 2026-11-07 girls)
    if (!getGender()) { stopMusic(); setScreen('ask'); return }
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
  if (screen === 'ask') {
    const lang = useClockStore.getState().settings.langs[0]
    return (
      <GenderQuestion boySrc={boyWizard} girlSrc={girlWizard} line={lineAudioId('ask-gender', lang)} play={(id) => playVoice(id)}
        cues={askCues(lineAudioId('ask-gender', lang))}
        onChoose={(g) => {
          setGender(g, 'child')
          clockTelemetry.track('player', { gender: g, by: 'child' })
          setScreen('cover')
          play()
        }} />
    )
  }
  if (screen === 'work') return <Workshop onExit={() => setScreen('cover')} />
  if (screen === 'parent') return <Parent onClose={() => setScreen('cover')} />
  return <Cover onPlay={play} onParent={() => setScreen('parent')} loading={loading} />
}
