import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './v2/tokens.css'
import './v2/base.css'
import './v2/shell/shell.css'
import './v2/ui/kit.css'
import './v2/lesson/lesson.css'
import './v2/age.css'
import './v2/board.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
