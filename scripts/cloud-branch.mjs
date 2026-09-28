// Builds the contents of the `cloud` branch: the tree behind the Deploy to Cloudflare button.
// The button copies a single directory into the user's new repo, so apps/worker alone is not
// enough (it needs @bllt/shared, and its build compiles apps/web with @bllt/ui). This writes a
// trimmed pnpm workspace with only those four packages and wrangler.jsonc at its root.
//
//   node scripts/cloud-branch.mjs <out-dir>
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2]
if (!out) throw new Error('Uso: node scripts/cloud-branch.mjs <carpeta-destino>')

const packages = ['apps/worker', 'apps/web', 'packages/shared', 'packages/ui']
const extra = ['tsconfig.base.json', 'LICENSE', 'NOTICE', 'TRADEMARKS.md']
// Moved to the root (the button reads both from there), so not copied in place.
const moved = ['apps/worker/wrangler.jsonc', 'apps/worker/.dev.vars.example']

const tracked = execFileSync('git', ['ls-files', ...packages, ...extra], { cwd: root })
  .toString()
  .split('\n')
  .filter((f) => f && !moved.includes(f))
for (const file of tracked) {
  mkdirSync(dirname(join(out, file)), { recursive: true })
  copyFileSync(join(root, file), join(out, file))
}

const read = (f) => readFileSync(join(root, f), 'utf8')
const worker = JSON.parse(read('apps/worker/package.json'))
const rootPkg = JSON.parse(read('package.json'))

// Paths in the Worker's config are relative to apps/worker; at the root they gain that prefix.
const wrangler = read('apps/worker/wrangler.jsonc')
  .replace('"main": "src/index.ts"', '"main": "apps/worker/src/index.ts"')
  .replace('"directory": "./public"', '"directory": "./apps/worker/public"')
  .replace('"migrations_dir": "migrations"', '"migrations_dir": "apps/worker/migrations"')
for (const path of ['apps/worker/src', 'apps/worker/public', 'apps/worker/migrations']) {
  if (!wrangler.includes(path)) throw new Error(`wrangler.jsonc cambió: falta ${path}`)
}
writeFileSync(join(out, 'wrangler.jsonc'), wrangler)
copyFileSync(join(root, 'apps/worker/.dev.vars.example'), join(out, '.dev.vars.example'))

// Self-update: the business's repo runs this workflow, which runs update.mjs from upstream.
mkdirSync(join(out, 'scripts'), { recursive: true })
copyFileSync(join(root, 'scripts/cloud/update.mjs'), join(out, 'scripts/update.mjs'))
mkdirSync(join(out, '.github/workflows'), { recursive: true })
copyFileSync(
  join(root, 'scripts/cloud/update-cloud.yml'),
  join(out, '.github/workflows/update-cloud.yml')
)
const version = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString()
writeFileSync(join(out, '.bllt-version'), version)

writeFileSync(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: 'bllt-cloud',
      private: true,
      license: rootPkg.license,
      packageManager: rootPkg.packageManager,
      engines: rootPkg.engines,
      scripts: {
        build: 'pnpm --filter @bllt/web build && node apps/worker/scripts/copy-web.mjs',
        deploy: 'wrangler d1 migrations apply DB --remote && wrangler deploy',
        dev: 'pnpm build && wrangler d1 migrations apply DB --local && wrangler dev'
      },
      devDependencies: { wrangler: worker.devDependencies.wrangler },
      cloudflare: {
        bindings: {
          SYNC_TOKEN: {
            description:
              'Token que usa la app de escritorio para sincronizar. Pon un valor largo y aleatorio.'
          },
          JWT_SECRET: {
            description:
              'Firma las sesiones del teléfono. Otro valor largo y aleatorio; cámbialo para cerrar todas las sesiones.'
          }
        }
      }
    },
    null,
    2
  ) + '\n'
)

writeFileSync(
  join(out, 'pnpm-workspace.yaml'),
  `packages:\n${packages.map((p) => `  - ${p}`).join('\n')}\n\n` +
    'allowBuilds:\n  better-sqlite3: false\n  esbuild: true\n  sharp: true\n  workerd: true\n\nsaveExact: true\n'
)

writeFileSync(
  join(out, '.gitignore'),
  'node_modules\ndist\n.wrangler\n.dev.vars\napps/worker/public\n.env.local\n'
)

writeFileSync(
  join(out, 'README.md'),
  `# Bllt en la nube

Este repositorio es la parte en la nube de [Bllt](https://github.com/juanlvs21/bllt): la API
(Hono + D1), el cron de la tasa y la PWA del teléfono, en un solo Cloudflare Worker.

Se generó con el botón *Deploy to Cloudflare*. Guía: [bllt.juanl.dev/docs/nube](https://bllt.juanl.dev/docs/nube).

El nombre del negocio en la PWA es el de la app de escritorio: se sincroniza con el resto de
los datos.

## Actualizar

*Actions → Update cloud → Run workflow* trae la última versión y Cloudflare la despliega
(también corre sola cada lunes). Conserva tu \`wrangler.jsonc\` (nombre del Worker e id de la
base D1); el resto de los archivos se reemplaza. Guía:
[bllt.juanl.dev/docs/guias/actualizar-nube](https://bllt.juanl.dev/docs/guias/actualizar-nube).
`
)

// Lockfile for the trimmed workspace, pinned to the same versions as the monorepo's.
copyFileSync(join(root, 'pnpm-lock.yaml'), join(out, 'pnpm-lock.yaml'))
execFileSync('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], {
  cwd: out,
  stdio: 'inherit'
})
console.log(`Rama cloud generada en ${out}`)
