// Updates a business's repo (the one the Deploy to Cloudflare button created) to the latest
// `cloud` branch. Run by .github/workflows/update-cloud.yml in that repo, always from the freshly
// cloned upstream, so fixes here reach every repo without touching its workflow file.
//
//   node update.mjs <upstream-dir> <repo-dir>
//
// Every file becomes the upstream one except:
// - .git and .github: GITHUB_TOKEN can't push workflow changes, and the repo owns its history.
// - wrangler.jsonc: the upstream one, keeping what belongs to this deployment (the Worker's
//   name, the D1 id the button provisioned, custom routes). Overwriting those would point the
//   Worker at a new, empty database.
//
// Needs jsonc-parser (edits JSONC keeping comments); the workflow installs it in $BLLT_TOOLS.
import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const [upstream, repo] = process.argv.slice(2)
if (!upstream || !repo) throw new Error('Uso: node update.mjs <upstream> <repo>')
const { applyEdits, modify, parse } = createRequire(join(process.env.BLLT_TOOLS ?? '.', '/'))(
  'jsonc-parser'
)

const KEEP = new Set(['.git', '.github', 'wrangler.jsonc'])
/** Top-level keys that describe this deployment, not the app. */
const DEPLOYMENT_KEYS = ['name', 'account_id', 'routes', 'route']
/** Per-binding fields the button fills in when it provisions a resource. */
const RESOURCE_LISTS = {
  d1_databases: ['database_name', 'database_id'],
  kv_namespaces: ['id'],
  r2_buckets: ['bucket_name']
}

const localText = readFileSync(join(repo, 'wrangler.jsonc'), 'utf8')
const local = parse(localText)
let text = readFileSync(join(upstream, 'wrangler.jsonc'), 'utf8')
const format = { formattingOptions: { insertSpaces: true, tabSize: 2 } }
const set = (path, value) => (text = applyEdits(text, modify(text, path, value, format)))

for (const key of DEPLOYMENT_KEYS) if (key in local) set([key], local[key])
const next = parse(text)
for (const [list, fields] of Object.entries(RESOURCE_LISTS)) {
  ;(next[list] ?? []).forEach((entry, i) => {
    const mine = (local[list] ?? []).find((l) => l.binding === entry.binding)
    if (!mine) return
    for (const field of fields) if (field in mine) set([list, i, field], mine[field])
  })
}

for (const entry of readdirSync(repo)) {
  if (!KEEP.has(entry)) rmSync(join(repo, entry), { recursive: true, force: true })
}
for (const entry of readdirSync(upstream)) {
  if (!KEEP.has(entry)) cpSync(join(upstream, entry), join(repo, entry), { recursive: true })
}
writeFileSync(join(repo, 'wrangler.jsonc'), text)

const version = readFileSync(join(upstream, '.bllt-version'), 'utf8').trim()
console.log(`Repositorio actualizado a Bllt ${version}`)
