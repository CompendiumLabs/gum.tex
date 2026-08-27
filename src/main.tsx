import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadFonts } from '@gum-jsx/core'
import { loadMathFonts } from '@gum-jsx/math/fonts'
import App from './App'
import './style.css'

await Promise.all([ loadFonts(), loadMathFonts() ]).then(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
