import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './css/cm-path.css'
import './css/cm-display.css'
import './css/cm-controls.css'
import './css/cm-motivation.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
