import { useEffect, useMemo, useState } from 'react'
import { mathToSvg, loadMathFonts } from 'gum-jsx/math'
import { installFontFaces } from './fonts'

const DEFAULT_TEX = String.raw`\int_0^\infty e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}`

type Result = { svg: string } | { error: string }

function render(tex: string, inline: boolean, fontSize: number): Result {
  try {
    return { svg: mathToSvg(tex, { inline, font_size: fontSize }) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [tex, setTex] = useState(DEFAULT_TEX)
  const [inline, setInline] = useState(false)
  const [fontSize, setFontSize] = useState(48)

  // gum needs the KaTeX font metrics (via opentype) before it can lay out math,
  // and the browser needs @font-face rules to draw the glyphs the SVG names
  useEffect(() => {
    installFontFaces()
    loadMathFonts().then(() => setReady(true))
  }, [])

  const result = useMemo(
    () => (ready ? render(tex, inline, fontSize) : null),
    [ready, tex, inline, fontSize]
  )

  return (
    <main>
      <header>
        <h1>gum-katex</h1>
        <span className="sub">LaTeX → SVG via <code>gum-jsx/math</code></span>
      </header>

      <textarea
        value={tex}
        onChange={e => setTex(e.target.value)}
        spellCheck={false}
        rows={4}
      />

      <div className="controls">
        <label>
          <input type="checkbox" checked={inline} onChange={e => setInline(e.target.checked)} />
          inline (text style)
        </label>
        <label>
          font size
          <input
            type="range" min={12} max={120} value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
          />
          {fontSize}px
        </label>
      </div>

      <section className="preview">
        {result == null && <span className="muted">loading fonts…</span>}
        {result != null && 'error' in result && <pre className="error">{result.error}</pre>}
        {result != null && 'svg' in result && (
          <div dangerouslySetInnerHTML={{ __html: result.svg }} />
        )}
      </section>

      {result != null && 'svg' in result && (
        <details>
          <summary>SVG source ({result.svg.length.toLocaleString()} chars)</summary>
          <pre className="source">{result.svg}</pre>
        </details>
      )}
    </main>
  )
}
