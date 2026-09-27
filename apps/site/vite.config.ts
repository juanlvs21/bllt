import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // @bllt/shared ships raw TS with extensionless imports; Node can't load it
  // as an external during SSR/prerender, so Vite must bundle it.
  ssr: { noExternal: ['@bllt/shared'] }
})
