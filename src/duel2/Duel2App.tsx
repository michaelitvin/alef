// Book 2: letters and syllables, a separate app in the alef repo (spec: docs/superpowers/specs/2026-10-19-duel-book-2-design.md).
import { useEffect, useRef, useState } from 'react'
import { GlyphSheet } from './screens/GlyphSheet'
import { TowerGlyphSheet } from './screens/TowerGlyphSheet'
import { TEST_HOOKS } from './testHooks'
import { Cover } from './screens/Cover'
import { Play } from './screens/Play'
import { Summary } from './screens/Summary'
import { Parent } from './screens/Parent'
import { Gallery, type GalleryEntry } from './screens/Gallery'
import { Strokes } from './screens/Strokes'
import { DrawTest } from './screens/DrawTest'
import { preloadDuel2Assets } from './assets/preload'
import { holdAudio, say, stopMusic, stopVoice } from './audio/duel2Audio'
import { useGameShell } from '../shared/shell/GameShell'
import { IMAGES } from './assets/images'
import { VOICE_RATE } from '../shared/gameAudio/kit'
import { unlockAudioOutput } from '../shared/gameAudio/output'
import { duel2Telemetry } from './telemetry'
import { useDuel2Store } from './store'
import { useProgressStore } from '../stores/progressStore'
import type { View } from './controller'
import { StationCover } from './screens/StationCover'
import { openScreens, stationFromUrl } from './station'

type Screen = 'cover' | 'station' | 'play' | 'summary' | 'parent' | 'gallery' | 'gallery-play' | 'strokes' | 'drawtest' | 'leaving'

/** back to the alef home screen (a session from the path ends there by itself) */
function defaultGoHome() { location.assign(import.meta.env.BASE_URL) }

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

const ASK_LINE = 'ask-gender-1'
/** when the take says בֵּן and בַּת (s into the trimmed file, at the speech rate) */
const ASK_CUES = { boy: 1.17 / VOICE_RATE, girl: 1.73 / VOICE_RATE }

export default function Duel2App({ goHome = defaultGoHome }: { goHome?: () => void } = {}) {
  // a station link from the home screen's path (?station=<screen>): one session of that minigame, if it is open for him
  const [station] = useState(() => (typeof location === 'undefined' ? null
    : stationFromUrl(location.search, openScreens(useDuel2Store.getState(), useProgressStore.getState().duel?.recent ?? {}))))
  // the stroke review's own address (#/strokes) opens it directly only in test builds; for the child it is reached
  // through the parent area (behind its hold), never past it
  const [screen, setScreen] = useState<Screen>(() => (TEST_HOOKS && typeof location !== 'undefined' && location.hash === '#/strokes' ? 'strokes' : station ? 'station' : 'cover'))
  const [over, setOver] = useState<NonNullable<View['over']> | null>(null)
  const [runNo, setRunNo] = useState(0)
  const [entry, setEntry] = useState<GalleryEntry | null>(null)
  const screenRef = useRef(screen)
  screenRef.current = screen
  const startRun = () => { setRunNo((n) => n + 1); setScreen('play') }
  // the shell (src/shared/shell/GameShell.tsx): the preload, the device's sound, the mute while hidden, the play gate.
  // Switching apps silences everything; the play screen also pauses (useRun) and its cover holds the sound (rule).
  const shell = useGameShell({
    preload: preloadDuel2Assets,
    askGender: {
      boySrc: IMAGES['s-wizard-idle'], girlSrc: IMAGES['s-wizard-idle-girl'] ?? IMAGES['s-wizard-idle'], line: ASK_LINE, cues: ASK_CUES,
      play: (id) => say([id]), stop: stopVoice, className: 'd2-root',
      onChosen: (g) => duel2Telemetry.track('player', { gender: g, by: 'child' }),
    },
    canStart: () => screenRef.current === 'cover' || screenRef.current === 'station',
    onPlay: startRun,
    onHide: () => { if (screenRef.current === 'play') holdAudio(true) },
  })
  const loading = shell.loading
  // the first duel's progress moves over once (its own save is only read; the flag makes a reload safe)
  useEffect(() => { useDuel2Store.getState().importFirstDuel(useProgressStore.getState().duel) }, [])
  if (TEST_HOOKS && location.hash === '#/glyphs') return <div className="d2-root"><GlyphSheet /></div>
  if (TEST_HOOKS && location.hash === '#/tower-glyphs') return <TowerGlyphSheet />
  // the end screens as they look after a full run (crystals, a trophy, the next boss, the play button) and after a
  // session from the path, for layout checks at every screen size
  if (TEST_HOOKS && location.hash === '#/summary') return <Summary over={{ score: 37, crystals: 3, best: true, bosses: ['mimic'] }} onAgain={() => {}} />
  if (TEST_HOOKS && location.hash === '#/summary-session') return <Summary over={{ score: 12, crystals: 0, best: false, session: true }} onAgain={() => {}} onHome={() => {}} />

  const play = shell.play
  // the held home button (a full run and its summary): the run has stopped (Play: RunController.exit), the game leaves
  // to the alef home screen (the parent area's way home goes there too); nothing of the game stays mounted meanwhile
  const leave = () => {
    stopVoice()
    stopMusic()
    duel2Telemetry.flush()
    setScreen('leaving')
    goHome()
  }
  const view = (() => {
  if (screen === 'leaving') return <div className="d2-root" data-screen="leaving" />
  if (shell.asking) return shell.question
  if (screen === 'play') return <Play key={runNo} opts={station ? { session: { screen: station } } : {}} onOver={(o) => { setOver(o); setScreen('summary') }} onExit={station ? undefined : leave} />
  if (screen === 'summary' && over) {
    return <Summary over={over} onAgain={() => { stopVoice(); startRun() }} onHome={goHome}
      onExit={over.session ? undefined : () => { duel2Telemetry.track('run-exit', { screen: 'summary', score: over.score }); leave() }} />
  }
  if (screen === 'station' && station) return <StationCover station={station} onPlay={play} loading={loading} />
  if (screen === 'parent') return <Parent onClose={() => setScreen('cover')} onGallery={() => setScreen('gallery')} onStrokes={() => setScreen('strokes')} onDrawTest={() => setScreen('drawtest')} />
  if (screen === 'strokes') return <Strokes onBack={() => { if (location.hash === '#/strokes') history.replaceState(null, '', location.pathname + location.search); setScreen('parent') }} />
  if (screen === 'drawtest') return <DrawTest onBack={() => setScreen('parent')} />
  if (screen === 'gallery') return <Gallery onBack={() => setScreen('parent')} onStart={(e) => { unlockAudioOutput(); setEntry(e); setRunNo((n) => n + 1); setScreen('gallery-play') }} />
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
  return <>{view}{screen !== 'parent' && screen !== 'gallery' && screen !== 'strokes' && <RotateHint />}</>
}
