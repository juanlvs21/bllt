// macOS takes the menu-bar name from the running bundle, so in development it
// says "Electron". Rename the local Electron.app so dev matches the packaged app.
// The Dock and Finder use the folder name ("Electron.app") unless the bundle ships
// a localized display name, which macOS only honors while the plist's
// CFBundleDisplayName still matches that folder name.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const NAME = 'Bllt'

if (process.platform === 'darwin') {
  const executable = createRequire(import.meta.url)('electron')
  const contents = resolve(executable, '../..')
  const plist = resolve(contents, 'Info.plist')
  if (existsSync(plist)) {
    execFileSync('plutil', ['-replace', 'CFBundleName', '-string', NAME, plist])
    execFileSync('plutil', ['-replace', 'CFBundleDisplayName', '-string', 'Electron', plist])
    execFileSync('plutil', ['-replace', 'LSHasLocalizedDisplayName', '-bool', 'true', plist])

    const resources = resolve(contents, 'Resources')
    const strings = `CFBundleName = "${NAME}";\nCFBundleDisplayName = "${NAME}";\n`
    for (const dir of readdirSync(resources).filter((d) => d.endsWith('.lproj'))) {
      writeFileSync(resolve(resources, dir, 'InfoPlist.strings'), strings)
    }

    // LaunchServices caches bundle names; make it read the new ones.
    const lsregister =
      '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'
    if (existsSync(lsregister)) execFileSync(lsregister, ['-f', resolve(contents, '..')])
  }
}
