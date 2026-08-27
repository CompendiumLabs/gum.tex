import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadMathFonts } from '@gum-jsx/math'
import { installFontFaces } from './fonts'
import App from './App'
import './style.css'

// layout needs the KaTeX metrics before the first mathToSvg call; only the
// math faces are fetched, not gum's text/emoji fonts
await loadMathFonts()
installFontFaces()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
