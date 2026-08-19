# gum-katex

Minimal LaTeX → SVG preview app built on [`gum-jsx`](https://github.com/CompendiumLabs/gum.jsx)'s
`mathToSvg` (the `gum-jsx/math` entry). Vite + React + TypeScript, run with bun.

Its purpose is to measure what a browser LaTeX→SVG pipeline on gum actually costs.

```sh
bun install        # gum-jsx is a `bun link` to ../gum.jsx (run `bun link` there first)
bun run dev        # http://localhost:5173
bun run build      # also prints the per-package size report
```

## How it's wired

- `src/App.tsx` — textarea → `mathToSvg(tex, { inline, font_size })` → `dangerouslySetInnerHTML`.
  Waits on `loadFonts()` (from `gum-jsx/fonts/fonts.ts`) first, since gum needs opentype
  metrics to lay out.
- `src/fonts.ts` — gum's SVG references fonts by family name (`KaTeX_Math`, `IBM Plex Sans`, …).
  The browser needs `@font-face` rules to draw them, so we generate those from gum's `FONT_PATHS`
  (which already hold the Vite-resolved asset URLs). Without this you get system-serif fallback glyphs.
- `vite.config.ts` — `manualChunks` splits the bundle by origin (react / gum / katex / opentype / vendor)
  so the build output doubles as a size breakdown.

## Bundle size assessment (vite 7, minified)

Numbers from `bun run build`. The interesting question is the cost of the LaTeX→SVG pipeline
alone, so React is listed but excluded from the totals.

### JavaScript

| chunk        | min         | gzip        | what                                                        |
|--------------|------------:|------------:|-------------------------------------------------------------|
| gum          |   66 kB     |   22 kB     | gum-jsx source reachable from `gum-jsx/math` (tree-shaken)  |
| katex        |  256 kB     |   75 kB     | whole katex bundle — gum only uses `__parse`, but katex isn't tree-shakable |
| opentype     |  172 kB     |   50 kB     | opentype.js, used for glyph metrics                         |
| vendor       |   28 kB     |   10 kB     | linebreak, emojibase-regex                                  |
| **pipeline** | **~520 kB** | **~157 kB** | gum + katex + opentype + vendor                             |
| react        |  192 kB     |   60 kB     | react + react-dom (app only, not part of the pipeline)      |

### Fonts (fetched at runtime)

gum.jsx loads fonts per family (`loadFonts(names)`, `loadMathFonts()`, `loadTextFonts()`);
math layout only touches the KaTeX faces, so `loadMathFonts()` is all this app needs.

| fonts                                   | size        | fetched?                                   |
|-----------------------------------------|------------:|--------------------------------------------|
| KaTeX Math, Main, AMS, Size1–4 (7 TTFs) | **~190 kB** | yes — `loadMathFonts()` + `@font-face`     |
| IBM Plex Sans/Mono × 3 weights (6 TTFs) |   ~1.06 MB  | no                                         |
| Noto Emoji Variable                     |   ~1.99 MB  | no                                         |

The IBM Plex / Noto files still appear in `dist/assets` because gum's `FONT_PATHS` imports their
URLs (that's what makes them available to `loadFonts()` on demand), but nothing requests them.
Before gum.jsx got per-family loading, `loadFonts()` fetched all ~3.2 MB eagerly on import.

### Total

**~520 kB JS (~157 kB gzip) + ~190 kB fonts** for a browser LaTeX→SVG pipeline.

For comparison, KaTeX's own browser bundle is ~270 kB min / ~75 kB gzip of JS plus ~70 kB of woff2
fonts (for a typical page). So gum is roughly 2× KaTeX on JS and ~2.5× on fonts, while giving you
an SVG (not HTML/CSS) that can be composed with the rest of gum.

### Where the bytes are, and what could still move

- **gum itself is small** — 22 kB gzip, ~14% of the pipeline JS. Tree-shaking through `gum-jsx/math`
  works well; the rest of gum (plots, layout, eval) is not pulled in.
- **katex (75 kB gz)** is the largest chunk and gum uses only its parser. KaTeX ships a single
  side-effectful bundle, so this won't shrink without either importing from `katex/src/Parser` (fragile
  internal path) or vendoring the parser + symbol table.
- **opentype.js (50 kB gz)** exists only to measure glyphs. Precomputed per-font metric tables
  (advance, ink bounds, italic correction per glyph) would remove it entirely and also remove the
  need to fetch the TTFs for layout at all — leaving fonts purely a display concern (`@font-face`,
  where woff2 would cut ~190 kB to ~70 kB).
- **fonts (~190 kB)** could also be subset to the glyphs the symbol table references, but the metrics
  table route above is the bigger win.
