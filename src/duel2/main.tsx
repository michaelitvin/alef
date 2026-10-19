import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Duel2App from './Duel2App'
import '../styles/fonts.css'
import './duel2.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Duel2App />
  </StrictMode>,
)
