// macOS takes the menu-bar name from the running bundle, so in development it
// says "Electron". Rename the local Electron.app so dev matches the packaged app.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

if (process.platform === 'darwin') {
  const executable = createRequire(import.meta.url)('electron')
  const plist = resolve(executable, '../../Info.plist')
  if (existsSync(plist)) {
    for (const key of ['CFBundleName', 'CFBundleDisplayName']) {
      execFileSync('plutil', ['-replace', key, '-string', 'Bllt', plist])
    }
  }
}
