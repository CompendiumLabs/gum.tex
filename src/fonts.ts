// gum's SVG output references fonts by family name (KaTeX_Math, IBM Plex Sans,
// ...). gum itself only needs the font *metrics* (via opentype.js) to lay out;
// for the browser to actually draw the glyphs we also need @font-face rules.
// FONT_PATHS already holds the vite-resolved asset URLs, so build them from it
// (only for the math faces — that's all this app loads).
import { FONT_PATHS, MATH_FONTS } from 'gum-jsx/fonts/fonts.ts'

const WEIGHTS: Record<string, number> = { light: 300, regular: 400, bold: 700 }

function fontFaceCss(): string {
  const rules: string[] = []
  for (const family of MATH_FONTS) {
    const path = FONT_PATHS[family]
    if (typeof path === 'string') {
      rules.push(`@font-face { font-family: "${family}"; src: url("${path}"); }`)
    } else {
      for (const [weight, url] of Object.entries(path)) {
        rules.push(`@font-face { font-family: "${family}"; font-weight: ${WEIGHTS[weight]}; src: url("${url}"); }`)
      }
    }
  }
  return rules.join('\n')
}

let installed = false
export function installFontFaces(): void {
  if (installed) return
  installed = true
  const style = document.createElement('style')
  style.textContent = fontFaceCss()
  document.head.appendChild(style)
}
