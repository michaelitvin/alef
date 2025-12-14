import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/Home/HomePage'
import LettersPage from './pages/Letters/LettersPage'
import LetterNodeView from './pages/Letters/LetterNodeView'
import NikkudPage from './pages/Nikkud/NikkudPage'
import NikkudNodeView from './pages/Nikkud/NikkudNodeView'
import WordsPage from './pages/Words/WordsPage'
import WordGroupView from './pages/Words/WordGroupView'
import SentencesPage from './pages/Sentences/SentencesPage'
import SentenceGroupView from './pages/Sentences/SentenceGroupView'
import ProgressPage from './pages/Progress/ProgressPage'
import SettingsPage from './pages/Settings/SettingsPage'
import { useProgressStore } from './stores/progressStore'

function App() {
  const { settings, setDevMode } = useProgressStore()

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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/letters" element={<LettersPage />} />
        <Route path="/letters/:letterId" element={<LetterNodeView />} />
        <Route path="/nikkud" element={<NikkudPage />} />
        <Route path="/nikkud/:nikkudId" element={<NikkudNodeView />} />
        <Route path="/words" element={<WordsPage />} />
        <Route path="/words/:groupId" element={<WordGroupView />} />
        <Route path="/sentences" element={<SentencesPage />} />
        <Route path="/sentences/:groupId" element={<SentenceGroupView />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
