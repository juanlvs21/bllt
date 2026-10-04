/**
 * Data layer checks: migrating an installation from before the sync between PCs, and applying
 * changes that come from another PC. Run with `pnpm --filter @bllt/desktop test:data`.
 *
 * The code is bundled with Vite and run under Electron-as-Node, because better-sqlite3 is built
 * for Electron's ABI.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import electron from 'electron'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'out', 'test')

await build({
  root,
  logLevel: 'warn',
  configFile: false,
  resolve: { alias: { electron: resolve(root, 'e2e/data/electron-stub.ts') } },
  ssr: { noExternal: ['@bllt/shared', 'zod', 'drizzle-orm'] },
  build: {
    ssr: resolve(root, 'e2e/data/harness.ts'),
    outDir: out,
    emptyOutDir: true,
    target: 'node22',
    rollupOptions: { output: { format: 'cjs', entryFileNames: 'harness.cjs' } }
  }
})

const run = spawnSync(electron, [join(out, 'harness.cjs')], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
})
process.exit(run.status ?? 1)
