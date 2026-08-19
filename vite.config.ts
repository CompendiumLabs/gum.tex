import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// split the bundle by origin so `bun run build` doubles as a size report:
// react / gum-jsx / katex / opentype.js / everything else
function chunkFor(id: string): string | undefined {
  if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
  if (/\/katex\//.test(id)) return 'katex'
  if (/\/opentype\.js\//.test(id)) return 'opentype'
  if (/\/gum\.jsx\/src\//.test(id) || /\/gum-jsx\/src\//.test(id)) return 'gum'
  if (/node_modules/.test(id)) return 'vendor'
}

export default defineConfig({
  // served from https://compendiumlabs.github.io/gum.tex/ via GitHub Pages
  base: '/gum.tex/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: { output: { manualChunks: chunkFor } },
  },
})
