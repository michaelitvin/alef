import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SpaceCatApp from './SpaceCatApp'
import '../styles/fonts.css'
import './spacecat.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpaceCatApp />
  </StrictMode>,
)
