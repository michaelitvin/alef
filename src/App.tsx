import { useEffect, useRef } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useSoundEffects } from './hooks/useAudio'
import HomePage from './pages/Home/HomePage'
import LettersPage from './pages/Letters/LettersPage'
import LetterNodeView from './pages/Letters/LetterNodeView'
import NikkudPage from './pages/Nikkud/NikkudPage'
import NikkudNodeView from './pages/Nikkud/NikkudNodeView'
import SyllablesPage from './pages/Syllables/SyllablesPage'
import SyllableNodeView from './pages/Syllables/SyllableNodeView'
import WordsPage from './pages/Words/WordsPage'
import WordGroupView from './pages/Words/WordGroupView'
import SentencesPage from './pages/Sentences/SentencesPage'
import SentenceGroupView from './pages/Sentences/SentenceGroupView'
import ProgressPage from './pages/Progress/ProgressPage'
import SettingsPage from './pages/Settings/SettingsPage'
import RoutesPage from './pages/Debug/RoutesPage'
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

function App() {
  const { settings, setDevMode } = useProgressStore()

  // Apply font setting to document root
  useFontEffect()

  // Check URL param for dev mode on mount
  // With HashRouter, params can be in hash (e.g., /#/?devMode=true) or before hash (?devMode=true#/)
  useEffect(() => {
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
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/debug/routes" element={<RoutesPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
