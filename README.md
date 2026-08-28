# gum.tex

**LaTeX → SVG in the browser, without MathJax.**

gum.tex is a small live-preview app for the math renderer in
[`gum.jsx`](https://github.com/CompendiumLabs/gum-jsx). Type LaTeX, get back a standalone
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

`@gum-jsx/math` sits in between: it uses KaTeX's parser to understand the TeX, then lays
out the glyphs itself using metrics read from the KaTeX fonts, and emits plain SVG. The
whole pipeline is **~555 kB of JS (~167 kB gzipped) plus ~190 kB of fonts** for ordinary
math (~480 kB if a formula uses `\mathbf`, `\mathcal`, … ) — see the
[size breakdown](#bundle-size-breakdown) below.

## Running it

Vite + React + TypeScript, run with [bun](https://bun.sh).

```sh
bun install
bun run dev        # http://localhost:5173
bun run build      # also prints a per-package size report
```

> gum is split into packages: `@gum-jsx/core` (elements, layout, fonts), `@gum-jsx/math`
> (the LaTeX pipeline and the KaTeX faces) and `@gum-jsx/web` (the browser runtime: installing
> the fetched faces through the `FontFace` API, downloads). `package.json` pulls them in as
> deps (`web` as a `link:` to the local checkout until it is published). Vite consumes their TypeScript source directly, so no build step is needed on
> the gum side; `tsconfig.json` includes their `src/types` folders for the ambient
> `opentype.js`/`linebreak`/`katex` declarations.

The app is a textarea, an inline/display toggle, a font-size slider, the rendered SVG,
copy / download buttons for it, and a collapsible view of the SVG source.

Pushes to `master` are built and deployed to GitHub Pages by `.github/workflows/pages.yml`;
`vite.config.ts` sets `base: '/gum.tex/'` to match the Pages URL prefix.

## Using `mathToSvg` yourself

The app is deliberately thin so the interesting part is easy to lift out:

```ts
import { mathToSvgAsync } from '@gum-jsx/math'

// fetches the KaTeX TTFs it needs (for glyph metrics) on first use
const svg = await mathToSvgAsync(String.raw`\frac{a}{b}`, { inline: false, font_size: 48 })
container.innerHTML = svg
```

Two things to know:

- **Layout needs font metrics.** gum uses [opentype.js](https://opentype.js.org) to read
  advances and bounding boxes from the KaTeX fonts, so they must be fetched before layout.
  `mathToSvgAsync` loads the 7 base faces (~190 kB) and, if the math sets a face that isn't
  loaded yet (`\mathbf`, `\mathcal`, `\mathfrak`, …), fetches the other 11 (~290 kB) in one
  go and lays out again. The sync `mathToSvg` is for after an explicit `await loadMathFonts()`
  (all 18). Only the math faces are ever touched; gum's text fonts (registered by
  `@gum-jsx/core`, ~1 MB) are left alone — don't call the no-argument `loadFonts()`, which
  loads everything registered.
- **Drawing needs the faces too.** The SVG names fonts the way CSS does: a family plus
  weight/style (`KaTeX_Main`, `KaTeX_Main` + `font-weight="700"` for `\mathbf`,
  `KaTeX_Caligraphic`, …; the mapping is `fontFace()` in `@gum-jsx/core/fonts`). The
  browser won't know those faces unless you tell it. `src/fonts.ts` registers them with the
  `FontFace` API straight from the bytes gum already fetched for metrics (`FONT_DATA`), so
  drawing costs no second request per font; it runs after every render and registers
  whatever faces are new. Without this step you get system-serif fallback glyphs (and
  faux-bold for `\mathbf`).

## How the app is wired

- `src/App.tsx` — textarea → `mathToSvgAsync(tex, { inline, font_size })` → `installFontFaces()`
  → `dangerouslySetInnerHTML`, in an effect (stale results from superseded input are dropped).
- `src/fonts.ts` — registers newly fetched math faces with the browser as described above.
- `vite.config.ts` — `manualChunks` splits the bundle by origin (react / gum / katex /
  opentype / vendor) so the build output doubles as a size breakdown.

## Bundle size breakdown

Numbers from `bun run build` (Vite 7, minified). React is listed for completeness but
excluded from the totals — the question is what the LaTeX→SVG pipeline itself costs.

### JavaScript

| chunk        | min         | gzip        | what                                                        |
|--------------|------------:|------------:|-------------------------------------------------------------|
| gum          |   98 kB     |   33 kB     | `@gum-jsx/core` + `@gum-jsx/math` source reachable from `mathToSvg` (tree-shaken) |
| katex        |  258 kB     |   76 kB     | whole katex bundle — gum only uses the parser, but katex isn't tree-shakable |
| opentype     |  172 kB     |   50 kB     | opentype.js 1.3.4, used for glyph metrics                   |
| vendor       |   28 kB     |   10 kB     | linebreak, emojibase-regex                                  |
| **pipeline** | **~555 kB** | **~167 kB** | gum + katex + opentype + vendor                             |
| react        |  192 kB     |   60 kB     | react + react-dom (app only, not part of the pipeline)      |

### Fonts (fetched at runtime)

gum loads fonts per family (`loadFonts(names)`, `loadMathFonts()`, `loadTextFonts()`);
math layout only touches the KaTeX faces, so `loadMathFonts()` is all this app needs.

| fonts                                                              | size        | fetched?                                |
|--------------------------------------------------------------------|------------:|-----------------------------------------|
| KaTeX Math, Main, AMS, Size1–4 (7 TTFs, `MATH_BASE_FONTS`)         |   ~190 kB   | yes — on first render                   |
| KaTeX Main Bold/Italic/BoldItalic, Math BoldItalic, Caligraphic, Fraktur, Script, SansSerif ×3, Typewriter (11 TTFs, `MATH_EXTRA_FONTS`) | ~290 kB | only if a formula uses a font command |
| IBM Plex Sans/Mono × 3 weights (6 TTFs)                            |   ~1.06 MB  | no                                      |

Each math TTF is fetched exactly once: gum reads it for metrics and `src/fonts.ts` hands
the same bytes to the browser for drawing. The IBM Plex files still appear in `docs/assets`
because `@gum-jsx/core` imports their URLs at module level (that's what makes them available
to `loadFonts()` on demand), but nothing requests them. (gum no longer bundles an emoji font
at all: emoji are measured with a fixed advance and drawn by the system's emoji face.)

### Total and comparison

**~555 kB JS (~167 kB gzip) + ~190 kB fonts** (~480 kB with the extra faces) for a browser
LaTeX→SVG pipeline.

- **vs. KaTeX:** KaTeX's own browser bundle is ~270 kB min / ~75 kB gzip of JS plus ~70 kB
  of woff2 fonts for a typical page. gum is roughly 2–2.5× on JS and ~2.5× on fonts (TTF
  rather than woff2) — the price of getting SVG rather than HTML/CSS.
- **vs. MathJax:** MathJax 3.2.2's `tex-svg.js` is **2,108 kB min / 678 kB gzip**
  (`tex-svg-full.js`: 2,275 kB / 716 kB). That bundle embeds the glyph outlines, so
  there are no separate font files — but it's still ~4× gum's JS and ~2× its JS+fonts
  total, gzipped. (MathJax's CHTML output is smaller, 1,160 kB / 262 kB plus ~390 kB of
  woff2, but then you're back to HTML/CSS rather than SVG.)

### Where the bytes are, and what could still move

- **gum itself is small** — 33 kB gzip, ~20% of the pipeline JS. Tree-shaking through
  `@gum-jsx/math` works well; the rest of gum (plots, layout, eval) is not pulled in.
- **katex (75 kB gz)** is the largest chunk and gum uses only its parser. KaTeX ships a
  single side-effectful bundle, so this won't shrink without either importing from
  `katex/src/Parser` (fragile internal path) or vendoring the parser + symbol table.
- **opentype.js (68 kB gz)** exists only to measure glyphs. Precomputed per-font metric
  tables (advance, ink bounds, italic correction per glyph) would remove it entirely and
  also remove the need to fetch the TTFs for layout at all — leaving fonts purely a display
  concern (`@font-face`, where woff2 would cut ~190 kB to ~70 kB).
- **fonts (~190 kB base)** are already loaded on demand: the 11 extra faces (~290 kB) cost
  nothing until a formula uses a font command, and then one extra round trip. Subsetting
  the base faces to the glyphs the symbol table references would help too, but the
  metrics-table route above is the bigger win.
