import '@fontsource/grenze-gotisch/600.css'
import '@fontsource/grenze-gotisch/700.css'
import '@fontsource/archivo/500.css'
import '@fontsource/archivo/600.css'
import '@fontsource/archivo/700.css'
import './styles/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

const root = document.getElementById('root')
if (!root) throw new Error('#root ausente')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
