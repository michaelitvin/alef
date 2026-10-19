import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Duel2App from './Duel2App'
import '../styles/fonts.css'
import './duel2.css'
import { TEST_HOOKS } from './testHooks'

if (TEST_HOOKS) (window as unknown as { __d2audio?: string[] }).__d2audio = []
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Duel2App />
  </StrictMode>,
)
