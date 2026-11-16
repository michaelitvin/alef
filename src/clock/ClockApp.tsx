// Clockmaker's Workshop: a separate app in the alef repo (spec: docs/superpowers/specs/2026-10-15-clock-workshop-design.md).
import { useEffect, useRef, useState } from 'react'
import { Cover } from './screens/Cover'
import { Workshop } from './screens/Workshop'
import { ParentArea } from '../parent/ParentArea'
import { useClockStore } from './store'
import { playVoice, stopVoices, startMusic, stopMusic } from './audio/clockAudio'
import { lineAudioId } from './data/lines'
import { preloadClockAssets } from './assets/preload'
import { VOICE_RATE } from '../shared/gameAudio/howlerPlayer'
import { unlockAudioOutput } from '../shared/gameAudio/output'
import { useGameShell } from '../shared/shell/GameShell'
import { clockTelemetry } from './telemetry'
import { VOICE_WORDS } from './assets/audioFiles'
// the clock has no player character: the question shows the wizards the child knows from the other games
import { IMAGES } from './assets/images'

/** when the question take says בֵּן / boy and בַּת / girl (real time), from its word timings */
function askCues(id: string) {
  const w = VOICE_WORDS[id]
  const at = (re: RegExp, dflt: number) => { const i = w ? w.w.findIndex((x) => re.test(x)) : -1; return (i >= 0 ? w!.t[i] : dflt) / VOICE_RATE }
  return { boy: at(/^(בן|boy)/i, 1.2), girl: at(/^(בת|girl)/i, 1.7) }
}

export default function ClockApp() {
  const [screen, setScreen] = useState<'cover' | 'work' | 'parent'>('cover')
  /** the door shows (not the boy/girl question over it) */
  const onDoor = useRef(true)
  const lang = useClockStore((s) => s.settings.langs[0])
  // the shell (src/shared/shell/GameShell.tsx): fonts, images, effects and lines load while the door shows (play waits
  // for the fonts and images, at most READY_MS); the device's one sound setting; switching apps silences all the clock
  // audio, on every screen (rule; the workshop also pauses, and its cover holds the sound: useWorkday)
  const shell = useGameShell({
    preload: preloadClockAssets,
    // the clock has no player character: the question shows the wizards the child knows from the other games
    // (its pictures load first, with the rest of the workshop: a picture must not appear after the screen)
    askGender: {
      boySrc: IMAGES['wizard-boy'], girlSrc: IMAGES['wizard-girl'], line: lineAudioId('ask-gender', lang), cues: askCues(lineAudioId('ask-gender', lang)),
      play: (id) => playVoice(id), stop: stopVoices,
      onChosen: (g) => clockTelemetry.track('player', { gender: g, by: 'child' }),
    },
    canStart: () => onDoor.current,
    onPlay: () => setScreen('work'),
    // boy or girl is set: the welcome plays while the rest loads; the workshop opens when both are done
    welcome: () => {
      const st = useClockStore.getState()
      if (st.welcomed) return Promise.resolve()
      const line = playVoice(lineAudioId('welcome', st.settings.langs[0])).then(() => {}, () => {})
      st.setWelcomed()
      return line
    },
    // boy or girl is not set yet: ask the child before the welcome (spec 2026-11-07 girls)
    onAsk: stopMusic,
  })
  const door = screen === 'cover' && !shell.asking
  onDoor.current = door
  // the door plays the calm music (the workshop turns it off while customers come); browsers allow sound only after
  // the first tap
  const tapped = useRef(false)
  useEffect(() => {
    if (!door) {
      if (screen === 'parent') stopMusic()
      return
    }
    const start = (e?: PointerEvent) => {
      // the parent-settings button and its number pad lead away from the door: their presses start no music
      if (e?.target instanceof Element && e.target.closest('.ck-parent-btn, [data-parent-gate]')) return
      window.removeEventListener('pointerdown', start)
      tapped.current = true
      unlockAudioOutput()
      // the music file waits for the fonts and images, so it does not slow them down
      void preloadClockAssets().then(() => { if (onDoor.current) startMusic(useClockStore.getState().workdays) })
    }
    if (tapped.current) { start(); return }
    window.addEventListener('pointerdown', start)
    return () => window.removeEventListener('pointerdown', start)
  }, [door, screen])
  if (shell.asking) return shell.question
  if (screen === 'work') return <Workshop onExit={() => setScreen('cover')} />
  if (screen === 'parent') return <ParentArea game="clock" onClose={() => setScreen('cover')} track={(e, f) => clockTelemetry.track(e, f)} telemetry={clockTelemetry} homeHref={import.meta.env.BASE_URL} />
  return <Cover onPlay={shell.play} onParent={() => setScreen('parent')} loading={shell.loading} />
}
