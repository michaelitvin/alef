// Spell Quest: letters and syllables, a separate app in the alef repo (spec: docs/superpowers/specs/2026-10-19-duel-book-2-design.md).
import { useEffect, useRef, useState } from 'react'
import { GlyphSheet } from './screens/GlyphSheet'
import { TowerGlyphSheet } from './screens/TowerGlyphSheet'
import { TEST_HOOKS } from './testHooks'
import { Cover } from './screens/Cover'
import { Play } from './screens/Play'
import { Summary } from './screens/Summary'
import { ParentArea } from '../parent/ParentArea'
import type { SectionId } from '../parent/types'
import { Gallery, galleryFor, type GalleryEntry } from './screens/Gallery'
import { Strokes } from './screens/Strokes'
import { DrawTest } from './screens/DrawTest'
import { useGameShell } from '../shared/shell/GameShell'
import { VOICE_RATE } from '../shared/gameAudio/kit'
import { holdAudio, unlockAudioOutput } from '../shared/gameAudio/output'
import { useSpellQuestStore } from './store'
import { useProgressStore } from '../stores/progressStore'
import type { View } from './controller'
import { StationCover } from './screens/StationCover'
import { openScreens, stationFromUrl } from './station'
import { courseIdFor, loadCourse } from './course'
import { HEBREW } from './course/hebrew'
import { CourseProvider } from './course/CourseContext'
import type { Course, CourseId } from './course/types'
import { ENGLISH_AVAILABLE } from './english/available'

type Screen = 'cover' | 'station' | 'play' | 'summary' | 'parent' | 'gallery' | 'gallery-play' | 'strokes' | 'drawtest' | 'leaving'

/** back to the alef home screen (a session from the path ends there by itself) */
function defaultGoHome() { location.assign(import.meta.env.BASE_URL) }

/** Spell Quest is a landscape game; a portrait phone shows a drawn "turn the phone" picture over everything (no text: rule). */
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

/** when the take says בֵּן and בַּת (s into the trimmed file, at the speech rate) */
const ASK_CUES = { boy: 1.17 / VOICE_RATE, girl: 1.73 / VOICE_RATE }

/**
 * The page plays one course, the one its entry page gives (`spellquest-he/`: Hebrew; `spellquest-en/`: English, where English is available). The Hebrew course is here
 * at once (the page renders as before); the English one loads first (by dynamic import, so the Hebrew page never loads
 * it), then the shell starts with it.
 */
export default function SpellQuestApp({ courseId = 'he', ...props }: { courseId?: CourseId; goHome?: () => void } = {}) {
  const [id] = useState(() => courseIdFor(courseId, ENGLISH_AVAILABLE))
  const [course, setCourse] = useState<Course | null>(() => (id === 'he' ? HEBREW : null))
  useEffect(() => {
    let alive = true
    if (!course) void loadCourse(id).then((c) => { if (alive) setCourse(c) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!course) return <div className="d2-root" data-screen="loading" />
  return <CourseProvider value={course}><CoursePage course={course} {...props} /></CourseProvider>
}

function CoursePage({ course, goHome = defaultGoHome }: { course: Course; goHome?: () => void }) {
  const { audio, telemetry } = course
  // a station link from the home screen's path (?station=<screen>, the same on the English page): one session
  // of that minigame, if it is open for him in the open course's save and stages
  const [station] = useState(() => {
    if (typeof location === 'undefined' || !new URLSearchParams(location.search).has('station')) return null
    const save = course.save()
    return stationFromUrl(location.search, openScreens(save.read(), save.towerRecent(), course.stages))
  })
  // the stroke review's own address (#/strokes) opens it directly only in test builds; for the child it is reached
  // through the parent area (behind its hold), never past it
  // test builds: #/gallery/<entry> starts that gallery screen at once (the /verify driver's fit check opens screens so)
  const [linked] = useState(() => (TEST_HOOKS && typeof location !== 'undefined' ? galleryFor(course.id).find((e) => location.hash === `#/gallery/${e.id}`) ?? null : null))
  const [screen, setScreen] = useState<Screen>(() => (TEST_HOOKS && typeof location !== 'undefined' && location.hash === '#/strokes' ? 'strokes' : linked ? 'gallery-play' : station ? 'station' : 'cover'))
  const [over, setOver] = useState<NonNullable<View['over']> | null>(null)
  const [runNo, setRunNo] = useState(0)
  const [entry, setEntry] = useState<GalleryEntry | null>(linked)
  // where the parent area opens: Spell Quest's section from the cover, the developer tools when a developer screen goes back
  const [areaAt, setAreaAt] = useState<SectionId>('game')
  const backToArea = () => { setAreaAt('developer'); setScreen('parent') }
  const screenRef = useRef(screen)
  screenRef.current = screen
  const startRun = () => { setRunNo((n) => n + 1); setScreen('play') }
  // the shell (src/shared/shell/GameShell.tsx): the preload, the device's sound, the mute while hidden, the play gate.
  // Switching apps silences everything; the play screen also pauses (useRun) and its cover holds the sound (rule).
  const shell = useGameShell({
    preload: course.preload,
    askGender: {
      boySrc: course.genderPictures.boy, girlSrc: course.genderPictures.girl, line: course.genderPictures.askLine, cues: ASK_CUES,
      play: (id) => audio.say([id]), stop: audio.stopVoice, className: 'd2-root',
      onChosen: (g) => telemetry.track('player', { gender: g, by: 'child' }),
    },
    canStart: () => screenRef.current === 'cover' || screenRef.current === 'station',
    onPlay: startRun,
    onHide: () => { if (screenRef.current === 'play') holdAudio(true) },
  })
  const loading = shell.loading
  // the tower's progress moves over once (its own save is only read; the flag makes a reload safe): into Spell Quest's
  // save, so on the Hebrew page only (the English page never writes Spell Quest's save)
  useEffect(() => { if (course.id === 'he') useSpellQuestStore.getState().importTower(useProgressStore.getState().tower) }, [course])
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
    audio.stopVoice()
    audio.stopMusic()
    telemetry.flush()
    setScreen('leaving')
    goHome()
  }
  const view = (() => {
  if (screen === 'leaving') return <div className="d2-root" data-screen="leaving" />
  if (shell.asking) return shell.question
  if (screen === 'play') return <Play key={runNo} opts={station ? { session: { screen: station } } : {}} onOver={(o) => { setOver(o); setScreen('summary') }} onExit={station ? undefined : leave} />
  if (screen === 'summary' && over) {
    return <Summary over={over} onAgain={() => { audio.stopVoice(); startRun() }} onHome={goHome}
      onExit={over.session ? undefined : () => { telemetry.track('run-exit', { screen: 'summary', score: over.score }); leave() }} />
  }
  if (screen === 'station' && station) return <StationCover station={station} onPlay={play} loading={loading} />
  if (screen === 'parent') {
    return <ParentArea game={course.game} section={areaAt} onClose={() => setScreen('cover')} track={(e, f) => telemetry.track(e, f)} telemetry={telemetry} homeHref={import.meta.env.BASE_URL}
      openDev={(id) => { if (id === 'gallery' || id === 'strokes' || id === 'drawtest') setScreen(id) }} />
  }
  if (screen === 'strokes') return <Strokes onBack={() => { if (location.hash === '#/strokes') history.replaceState(null, '', location.pathname + location.search); backToArea() }} />
  if (screen === 'drawtest') return <DrawTest onBack={backToArea} />
  if (screen === 'gallery') return <Gallery onBack={backToArea} onStart={(e) => { unlockAudioOutput(); setEntry(e); setRunNo((n) => n + 1); setScreen('gallery-play') }} />
  if (screen === 'gallery-play' && entry) {
    return (
      <>
        <Play key={runNo} opts={{ sandbox: true, force: entry.force }} onOver={() => setScreen('gallery')} />
        <button type="button" aria-label="back" className="d2-gallery-back" onClick={() => { audio.stopVoice(); setScreen('gallery') }}>Back</button>
      </>
    )
  }
  return <Cover onPlay={play} onParent={() => { setAreaAt('game'); setScreen('parent') }} onHome={leave} loading={loading} />
  })()
  return <>{view}{screen !== 'parent' && screen !== 'gallery' && screen !== 'strokes' && <RotateHint />}</>
}
