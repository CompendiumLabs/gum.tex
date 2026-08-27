import { useEffect, useState } from 'react'
import { mathToSvgAsync } from '@gum-jsx/math'
import { installFontFaces } from './fonts'

const DEFAULT_TEX = String.raw`\int_0^\infty e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}`

type Result = { svg: string } | { error: string }

// mathToSvgAsync fetches the base KaTeX faces on first use and the extra ones
// (\mathbf, \mathcal, ...) only when the math asks for them; after each render
// hand any newly fetched faces to the browser so the glyphs draw
async function render(tex: string, inline: boolean, fontSize: number): Promise<Result> {
  try {
    const svg = await mathToSvgAsync(tex, { inline, font_size: fontSize })
    installFontFaces()
    return { svg }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

function downloadSvg(svg: string): void {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'math.svg'
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [tex, setTex] = useState(DEFAULT_TEX)
  const [inline, setInline] = useState(false)
  const [fontSize, setFontSize] = useState(48)
  const [result, setResult] = useState<Result | null>(null)
  const [copied, setCopied] = useState(false)

  const svg = result != null && 'svg' in result ? result.svg : null

  // the buttons live inside the <summary>; don't let their clicks toggle it
  async function copySvg(e: React.MouseEvent) {
    e.preventDefault()
    if (svg == null) return
    await navigator.clipboard.writeText(svg)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function download(e: React.MouseEvent) {
    e.preventDefault()
    if (svg != null) downloadSvg(svg)
  }

  useEffect(() => {
    let stale = false
    render(tex, inline, fontSize).then(r => { if (!stale) setResult(r) })
    return () => { stale = true }
  }, [tex, inline, fontSize])

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
        {result == null && <span className="muted">loading fonts…</span>}
        {result != null && 'error' in result && <pre className="error">{result.error}</pre>}
        {result != null && 'svg' in result && (
          <div dangerouslySetInnerHTML={{ __html: result.svg }} />
        )}
      </section>

      {svg != null && (
        <details>
          <summary>
            SVG source ({svg.length.toLocaleString()} chars)
            <span className="actions">
              <button onClick={copySvg}>{copied ? 'copied!' : 'copy'}</button>
              <button onClick={download}>download</button>
            </span>
          </summary>
          <pre className="source">{svg}</pre>
        </details>
      )}
    </main>
  )
}
