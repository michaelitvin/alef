import { useEffect, useRef } from 'react'
import { HashRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { useSoundEffects } from './hooks/useAudio'
import { HomePage } from './pages/Home/HomePage'
import { LettersPage } from './pages/Letters/LettersPage'
import { LetterNodeView } from './pages/Letters/LetterNodeView'
import { NikkudPage } from './pages/Nikkud/NikkudPage'
import { NikkudNodeView } from './pages/Nikkud/NikkudNodeView'
import { SyllablesPage } from './pages/Syllables/SyllablesPage'
import { SyllableNodeView } from './pages/Syllables/SyllableNodeView'
import { WordsPage } from './pages/Words/WordsPage'
import { WordGroupView } from './pages/Words/WordGroupView'
import { SentencesPage } from './pages/Sentences/SentencesPage'
import { SentenceGroupView } from './pages/Sentences/SentenceGroupView'
import { StoriesPage } from './pages/Stories/StoriesPage'
import { StoryView } from './pages/Stories/StoryView'
import { ProgressPage } from './pages/Progress/ProgressPage'
import { ParentPage } from './pages/Parent/ParentPage'
import { RoutesPage } from './pages/Debug/RoutesPage'
import { useProgressStore } from './stores/progressStore'
import { useFontEffect } from './hooks/useFont'

/**
 * Plays page turn sound on route changes
 */
function NavigationSoundEffect() {
  const location = useLocation()
  const { playPageTurn } = useSoundEffects()
  const isFirstRender = useRef(true)
  const prevLocation = useRef(location.pathname + location.search)

  useEffect(() => {
    const currentLocation = location.pathname + location.search

    // Skip first render (initial page load)
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevLocation.current = currentLocation
      return
    }

    // Only play if location actually changed
    if (prevLocation.current !== currentLocation) {
      prevLocation.current = currentLocation
      playPageTurn().catch(console.error)
    }
  }, [location.pathname, location.search, playPageTurn])

  return null
}

/**
 * The devMode URL param and Ctrl+Shift+D switch dev mode on with no parent gate, so they work only outside
 * production (dev, test and verify builds). On production, dev mode is switched in the parent's settings.
 */
const DEV_SHORTCUTS = import.meta.env.MODE !== 'production'

function App() {
  const { settings, setDevMode } = useProgressStore()

  // Apply font setting to document root
  useFontEffect()

  // Check URL param for dev mode on mount
  // With HashRouter, params can be in hash (e.g., /#/?devMode=true) or before hash (?devMode=true#/)
  useEffect(() => {
    if (!DEV_SHORTCUTS) return
    // Check regular search params first
    let params = new URLSearchParams(window.location.search)
    if (params.get('devMode') === 'true') {
      setDevMode(true)
      return
    }
    // Check hash params (for HashRouter: /#/?devMode=true)
    const hashParts = window.location.hash.split('?')
    if (hashParts.length > 1) {
      params = new URLSearchParams(hashParts[1])
      if (params.get('devMode') === 'true') {
        setDevMode(true)
      }
    }
  }, [setDevMode])

  // Keyboard shortcut: Ctrl+Shift+D to toggle dev mode
  useEffect(() => {
    if (!DEV_SHORTCUTS) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setDevMode(!settings.devMode)
        console.log(`Dev mode: ${!settings.devMode ? 'ON' : 'OFF'}`)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [settings.devMode, setDevMode])

  return (
    <HashRouter>
      <NavigationSoundEffect />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/letters" element={<LettersPage />} />
        <Route path="/letters/:letterId" element={<LetterNodeView />} />
        <Route path="/nikkud" element={<NikkudPage />} />
        <Route path="/nikkud/:nikkudId" element={<NikkudNodeView />} />
        <Route path="/syllables" element={<SyllablesPage />} />
        <Route path="/syllables/:drillId" element={<SyllableNodeView />} />
        <Route path="/words" element={<WordsPage />} />
        <Route path="/words/:groupId" element={<WordGroupView />} />
        <Route path="/sentences" element={<SentencesPage />} />
        <Route path="/sentences/:groupId" element={<SentenceGroupView />} />
        <Route path="/stories" element={<StoriesPage />} />
        <Route path="/stories/:storyId" element={<StoryView />} />
        <Route path="/progress" element={<ProgressPage />} />
        {/* the shared parent area, behind the gate on every visit */}
        <Route path="/settings" element={<ParentPage />} />
        <Route path="/debug/routes" element={<RoutesPage />} />
        {/* the first duel's own page is gone (it is Book 2's tower now): an old link or bookmark goes home, not to a blank page */}
        <Route path="/duel/*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
