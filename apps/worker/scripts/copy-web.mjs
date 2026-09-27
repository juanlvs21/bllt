// Copies the PWA build (apps/web/dist) into this Worker's static assets folder.
import { cpSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const from = join(here, '../../web/dist')
const to = join(here, '../public')
rmSync(to, { recursive: true, force: true })
cpSync(from, to, { recursive: true })
console.log(`PWA copiada a ${to}`)
