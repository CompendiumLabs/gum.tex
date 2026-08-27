// gum's SVG output names fonts by css face (family + weight/style, see fontFace
// in @gum-jsx/core). gum itself only needs the font *metrics* (via opentype.js)
// to lay out; for the browser to draw the glyphs it must know the faces too.
// loadMathFonts() has already fetched the bytes for metrics, so hand those same
// bytes to the browser via the FontFace API rather than writing @font-face
// rules with urls — no second request per font.
import { FONT_DATA, fontFace } from '@gum-jsx/core/fonts'
import { MATH_FONTS } from '@gum-jsx/math'

// call after loadMathFonts() has resolved
export function installFontFaces(): void {
  for (const name of MATH_FONTS) {
    const data = FONT_DATA[name]
    if (!(data instanceof ArrayBuffer)) throw new Error(`math font not loaded: ${name}`)
    const { family, weight = 400, style = 'normal' } = fontFace(name)
    document.fonts.add(new FontFace(family, data, { weight: String(weight), style }))
  }
}
