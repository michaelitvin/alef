import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Duel2App from './Duel2App'
import '../styles/fonts.css'
import './duel2.css'
import { TEST_HOOKS } from './testHooks'
import { useProgressStore } from '../stores/progressStore'
import { rehydrateOnRestore } from '../shared/rehydrateOnRestore'

// the alef app's page also writes the progress save (the older levels): coming back with the back button reads it again
rehydrateOnRestore(useProgressStore)
if (TEST_HOOKS) (window as unknown as { __d2audio?: string[] }).__d2audio = []
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Duel2App />
  </StrictMode>,
)
