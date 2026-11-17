import '../shared/stagingStorage' // first: staging saves are kept apart before any store loads
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ClockApp from './ClockApp'
import '../styles/fonts.css'
import './clock.css'
import { requestPersistentStorage } from '../shared/saveStorage'
import { clockTelemetry } from './telemetry'

// ask the browser to keep the saves under storage pressure (best-effort), and note its answer once
void requestPersistentStorage((persisted) => clockTelemetry.track('storage-persist', { persisted }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClockApp />
  </StrictMode>,
)
