import './shared/stagingStorage' // first: staging saves are kept apart before any store loads
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { useProgressStore } from './stores/progressStore'
import { rehydrateOnRestore } from './shared/rehydrateOnRestore'
import { requestPersistentStorage } from './shared/saveStorage'

// Book 2's page also writes the progress save (its tower): coming back with the back button reads it again
rehydrateOnRestore(useProgressStore)
// ask the browser to keep the saves under storage pressure (best-effort; the lessons have no log to record it in)
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
