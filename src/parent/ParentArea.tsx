// The shared parent area (rule: Interaction; a parent screen, so text and English are allowed). Every entry page mounts it
// behind the parent gate and opens it at a section, by default the open game's own:
//
//   <ParentArea game="spellquest-he" onClose={toCover} track={spellQuestTelemetry.track} telemetry={spellQuestTelemetry} openDev={setScreen} homeHref={BASE_URL} />
//
// Sections, top to bottom: Child, Sound, Progress, the open game's settings and reset, Data, Developer. Every game's lines
// come from the registry (registry.ts); only the open game's settings, reset and developer tools show.
import { Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { gameParent } from './registry'
import type { GameId, LiveLog, SectionId, Track } from './types'
import { ChildSection } from './sections/Child'
import { SoundSection } from './sections/Sound'
import { ProgressSection } from './sections/Progress'
import { DataSection } from './sections/Data'
import { DeveloperSection } from './sections/Developer'
import { requestPersistentStorage } from '../shared/saveStorage'
import './parentArea.css'

export interface ParentAreaProps {
  /** the game whose page is open */
  game: GameId
  onClose: () => void
  /** the section to open at (the open game's by default) */
  section?: SectionId
  /** the open game's telemetry: the area's changes are logged as the old parent screens logged them */
  track?: Track
  /** the open game's log instance: the Data section reads and clears the open game's log through it */
  telemetry?: LiveLog
  /** open one of the page's developer screens (Spell Quest: gallery, strokes, drawtest) */
  openDev?: (id: string) => void
  /** the way to the alef home screen, from a game's own page */
  homeHref?: string
}

const NAV: { id: SectionId; label: string }[] = [
  { id: 'child', label: 'Child' }, { id: 'sound', label: 'Sound' }, { id: 'progress', label: 'Progress' },
  { id: 'game', label: 'This game' }, { id: 'data', label: 'Data' }, { id: 'developer', label: 'Developer' },
]

function scrollTo(root: HTMLElement | null, id: SectionId) {
  root?.querySelector(`[data-section="${id}"]`)?.scrollIntoView?.({ block: 'start' })
}

export function ParentArea({ game, onClose, section = 'game', track, telemetry, openDev, homeHref }: ParentAreaProps) {
  const g = gameParent(game)
  const root = useRef<HTMLDivElement>(null)
  const goTo = (id: SectionId) => scrollTo(root.current, id)
  // the nav wraps to two rows on a narrow phone: keep its measured height in --pa-nav-h, so a section lands below it
  useLayoutEffect(() => {
    const area = root.current
    const nav = area?.querySelector('.pa-nav')
    if (!area || !nav) return
    const measure = () => area.style.setProperty('--pa-nav-h', `${(nav as HTMLElement).offsetHeight}px`)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(nav)
    return () => ro.disconnect()
  }, [])
  // open at the section asked for, once (the top is the Child section)
  const first = useRef(section)
  useEffect(() => { if (first.current !== 'child') scrollTo(root.current, first.current) }, [])
  // ask the browser to keep the saves under storage pressure: here, behind the gate, because a browser may show a
  // prompt for it (never on a child screen). Once per page; the open game's log notes the answer.
  const trackRef = useRef(track)
  useEffect(() => { void requestPersistentStorage((persisted) => trackRef.current?.('storage-persist', { persisted })) }, [])
  const Settings = g.Settings
  const reset = () => { if (window.confirm(`Reset all ${g.title} progress?`)) void g.reset() }
  const part = (id: SectionId, title: string, body: ReactNode) => (
    <section data-section={id} className="pa-section"><h2>{title}</h2>{body}</section>
  )
  return (
    <div ref={root} className="parent-area" data-parent-area={game} data-parent-text dir="ltr">
      <header className="pa-head">
        <h1>Parent area</h1>
        <div className="pa-actions">
          {homeHref && <a data-alef-menu href={homeHref}>Alef menu</a>}
          <button type="button" data-parent-close onClick={onClose}>Close</button>
        </div>
      </header>
      <nav className="pa-nav">
        {NAV.map((n) => <button key={n.id} type="button" data-goto={n.id} onClick={() => goTo(n.id)}>{n.id === 'game' ? g.title : n.label}</button>)}
      </nav>
      {part('child', 'Boy or girl', <ChildSection track={track} />)}
      {part('sound', 'Sound (this device, every game)', <SoundSection track={track} />)}
      {part('progress', 'Progress', <ProgressSection />)}
      {part('game', g.title, <>
        {Settings && <Suspense fallback={<p>Loading…</p>}><Settings goTo={goTo} track={track} /></Suspense>}
        <p><button type="button" data-parent-reset className="pa-danger" onClick={reset}>Reset {g.title} progress</button></p>
      </>)}
      {part('data', 'Data (telemetry export)', <DataSection game={game} live={telemetry} />)}
      {part('developer', 'Developer', <DeveloperSection game={g} goTo={goTo} track={track} openDev={openDev} />)}
    </div>
  )
}
