import { useMemo, useState } from 'react'
import { mathToSvg } from '@gum-jsx/math'

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
  const [tex, setTex] = useState(DEFAULT_TEX)
  const [inline, setInline] = useState(false)
  const [fontSize, setFontSize] = useState(48)

  const result = useMemo(
    () => render(tex, inline, fontSize),
    [tex, inline, fontSize]
  )

  return (
    <main>
      <header>
        <h1>gum.tex</h1>
        <span className="sub">LaTeX → SVG via <code>@gum-jsx/math</code></span>
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
        {'error' in result && <pre className="error">{result.error}</pre>}
        {'svg' in result && (
          <div dangerouslySetInnerHTML={{ __html: result.svg }} />
        )}
      </section>

      {'svg' in result && (
        <details>
          <summary>SVG source ({result.svg.length.toLocaleString()} chars)</summary>
          <pre className="source">{result.svg}</pre>
        </details>
      )}
    </main>
  )
}
