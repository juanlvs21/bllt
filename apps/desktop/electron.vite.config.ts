import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

// Workspace packages ship TypeScript source, so they are bundled instead of externalized.
const bundled = ['@bllt/shared', 'zod', 'drizzle-orm']

export default defineConfig({
  main: {
    build: {
      externalizeDeps: { exclude: bundled },
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'export-worker': resolve(__dirname, 'src/main/modules/exports/export.worker.ts')
        }
      }
    }
  },
  preload: {
    build: { externalizeDeps: { exclude: bundled } }
  },
  renderer: {
    resolve: {
      alias: { '@renderer': resolve(__dirname, 'src/renderer/src') }
    },
    plugins: [tailwindcss(), svelte()]
  }
})
