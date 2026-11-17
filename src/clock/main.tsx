import '../shared/stagingStorage' // first: staging saves are kept apart before any store loads
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ClockApp from './ClockApp'
import '../styles/fonts.css'
import './clock.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClockApp />
  </StrictMode>,
)
