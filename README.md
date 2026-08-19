# gum.tex

**LaTeX → SVG in the browser, without MathJax.**

gum.tex is a small live-preview app for the math renderer in
[`gum.jsx`](https://github.com/CompendiumLabs/gum.jsx). Type LaTeX, get back a standalone
`<svg>` — real vector paths positioned by real font metrics — using only the
[KaTeX](https://katex.org) parser and gum's own layout engine. No MathJax, no
HTML/CSS soup, no multi-megabyte bundle.

```
\int_0^\infty e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}
```

→ an SVG you can drop into a page, a chart, a slide, or any other gum figure.

## Why

If you want *SVG* math in the browser today, the usual answer is MathJax's SVG output,
which means shipping a ~2 MB bundle (~680 kB gzipped). KaTeX is much lighter but emits
HTML + CSS, which is great for web pages and awkward for everything else (embedding in
SVG graphics, exporting to images, composing with other vector content).

`gum-jsx/math` sits in between: it uses KaTeX's parser to understand the TeX, then lays
out the glyphs itself using metrics read from the KaTeX fonts, and emits plain SVG. The
whole pipeline is **~590 kB of JS (~175 kB gzipped) plus ~190 kB of fonts** — see the
[size breakdown](#bundle-size-breakdown) below.

## Running it

Vite + React + TypeScript, run with [bun](https://bun.sh).

```sh
bun install
bun run dev        # http://localhost:5173
bun run build      # also prints a per-package size report
```

> `gum-jsx` is installed straight from GitHub (`github:CompendiumLabs/gum.jsx#<commit>`
> in `package.json`), pinned to a known-good commit. Vite consumes its TypeScript source
> directly, so no build step is needed on the gum.jsx side. If you're hacking on gum.jsx
> alongside this app, swap it for `"link:gum-jsx"` after running `bun link` in your
> gum.jsx checkout.

The app is a textarea, an inline/display toggle, a font-size slider, the rendered SVG, and
a collapsible view of the SVG source.

## Using `mathToSvg` yourself

The app is deliberately thin so the interesting part is easy to lift out:

```ts
import { mathToSvg, loadMathFonts } from 'gum-jsx/math'

await loadMathFonts()                 // fetch the KaTeX TTFs (needed for glyph metrics)
const svg = mathToSvg(String.raw`\frac{a}{b}`, { inline: false, font_size: 48 })
container.innerHTML = svg
```

Two things to know:

- **Layout needs font metrics.** gum uses [opentype.js](https://opentype.js.org) to read
  advances and bounding boxes from the KaTeX fonts, so `loadMathFonts()` must resolve
  before the first `mathToSvg` call. Only the math faces are fetched; gum's text and emoji
  fonts are left alone.
- **Drawing needs `@font-face`.** The SVG references fonts by family name
  (`KaTeX_Math`, `KaTeX_Main`, …). The browser won't know where those live unless you tell
  it, so `src/fonts.ts` generates `@font-face` rules from gum's `FONT_PATHS` (which already
  hold the Vite-resolved asset URLs) and injects them once. Without this step you get
  system-serif fallback glyphs.

## How the app is wired

- `src/App.tsx` — textarea → `mathToSvg(tex, { inline, font_size })` → `dangerouslySetInnerHTML`,
  gated on `loadMathFonts()`.
- `src/fonts.ts` — builds and installs the `@font-face` rules described above.
- `vite.config.ts` — `manualChunks` splits the bundle by origin (react / gum / katex /
  opentype / vendor) so the build output doubles as a size breakdown.

## Bundle size breakdown

Numbers from `bun run build` (Vite 7, minified). React is listed for completeness but
excluded from the totals — the question is what the LaTeX→SVG pipeline itself costs.

### JavaScript

| chunk        | min         | gzip        | what                                                        |
|--------------|------------:|------------:|-------------------------------------------------------------|
| gum          |   66 kB     |   22 kB     | gum-jsx source reachable from `gum-jsx/math` (tree-shaken)  |
| katex        |  256 kB     |   75 kB     | whole katex bundle — gum only uses the parser, but katex isn't tree-shakable |
| opentype     |  243 kB     |   68 kB     | opentype.js 1.3.5, used for glyph metrics                   |
| vendor       |   28 kB     |   10 kB     | linebreak, emojibase-regex                                  |
| **pipeline** | **~590 kB** | **~175 kB** | gum + katex + opentype + vendor                             |
| react        |  192 kB     |   60 kB     | react + react-dom (app only, not part of the pipeline)      |

### Fonts (fetched at runtime)

gum.jsx loads fonts per family (`loadFonts(names)`, `loadMathFonts()`, `loadTextFonts()`);
math layout only touches the KaTeX faces, so `loadMathFonts()` is all this app needs.

| fonts                                   | size        | fetched?                                   |
|-----------------------------------------|------------:|--------------------------------------------|
| KaTeX Math, Main, AMS, Size1–4 (7 TTFs) | **~190 kB** | yes — `loadMathFonts()` + `@font-face`     |
| IBM Plex Sans/Mono × 3 weights (6 TTFs) |   ~1.06 MB  | no                                         |
| Noto Emoji Variable                     |   ~1.99 MB  | no                                         |

The IBM Plex / Noto files still appear in `dist/assets` because gum's `FONT_PATHS` imports
their URLs (that's what makes them available to `loadFonts()` on demand), but nothing
requests them.

### Total and comparison

**~590 kB JS (~175 kB gzip) + ~190 kB fonts** for a browser LaTeX→SVG pipeline.

- **vs. KaTeX:** KaTeX's own browser bundle is ~270 kB min / ~75 kB gzip of JS plus ~70 kB
  of woff2 fonts for a typical page. gum is roughly 2–2.5× on JS and ~2.5× on fonts — the
  price of getting SVG rather than HTML/CSS.
- **vs. MathJax:** MathJax 3.2.2's `tex-svg.js` is **2,108 kB min / 678 kB gzip**
  (`tex-svg-full.js`: 2,275 kB / 716 kB). That bundle embeds the glyph outlines, so
  there are no separate font files — but it's still ~4× gum's JS and ~2× its JS+fonts
  total, gzipped. (MathJax's CHTML output is smaller, 1,160 kB / 262 kB plus ~390 kB of
  woff2, but then you're back to HTML/CSS rather than SVG.)

### Where the bytes are, and what could still move

- **gum itself is small** — 22 kB gzip, ~13% of the pipeline JS. Tree-shaking through
  `gum-jsx/math` works well; the rest of gum (plots, layout, eval) is not pulled in.
- **katex (75 kB gz)** is the largest chunk and gum uses only its parser. KaTeX ships a
  single side-effectful bundle, so this won't shrink without either importing from
  `katex/src/Parser` (fragile internal path) or vendoring the parser + symbol table.
- **opentype.js (68 kB gz)** exists only to measure glyphs. Precomputed per-font metric
  tables (advance, ink bounds, italic correction per glyph) would remove it entirely and
  also remove the need to fetch the TTFs for layout at all — leaving fonts purely a display
  concern (`@font-face`, where woff2 would cut ~190 kB to ~70 kB).
- **fonts (~190 kB)** could also be subset to the glyphs the symbol table references, but
  the metrics-table route above is the bigger win.
