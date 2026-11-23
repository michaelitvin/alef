import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { useProgressStore } from './stores/progressStore'
import { rehydrateOnRestore } from './shared/rehydrateOnRestore'

// Book 2's page also writes the progress save (its tower): coming back with the back button reads it again
rehydrateOnRestore(useProgressStore)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
