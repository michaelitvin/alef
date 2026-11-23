import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SpellQuestApp from './SpellQuestApp'
import '../styles/fonts.css'
import './spellquest.css'
import { TEST_HOOKS } from './testHooks'
import { useProgressStore } from '../stores/progressStore'
import { rehydrateOnRestore } from '../shared/rehydrateOnRestore'

// the alef app's page also writes the progress save (the older levels): coming back with the back button reads it again
rehydrateOnRestore(useProgressStore)
if (TEST_HOOKS) (window as unknown as { __d2audio?: string[] }).__d2audio = []
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpellQuestApp />
  </StrictMode>,
)
