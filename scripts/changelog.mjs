// Builds the changelog from git tags (v*) and the commits between them.
//
//   node scripts/changelog.mjs                 → CHANGELOG.md + apps/site/src/lib/changelog.json
//   node scripts/changelog.mjs --notes v1.2.0 release-notes.md
//                                              → also writes that version's notes for the release
//
// Every commit links to GitHub. Changelog commits made by the release workflow are skipped.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = `https://github.com/${process.env.GITHUB_REPOSITORY ?? 'juanlvs21/bllt'}`
const CHANGELOG_COMMIT = /^Changelog de v/

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const lines = (text) => text.split('\n').filter(Boolean)

const tags = lines(git('tag', '--list', 'v*', '--sort=v:refname'))

const versions = tags
  .map((tag, i) => {
    const prev = tags[i - 1]
    const range = prev ? `${prev}..${tag}` : tag
    const commits = lines(git('log', '--no-merges', '--format=%H%x1f%s', range))
      .map((line) => {
        const [sha, subject] = line.split('\x1f')
        return { sha, short: sha.slice(0, 7), subject, url: `${REPO}/commit/${sha}` }
      })
      .filter((c) => !CHANGELOG_COMMIT.test(c.subject))
    return {
      version: tag.slice(1),
      tag,
      date: git('log', '-1', '--format=%cs', tag),
      url: `${REPO}/releases/tag/${tag}`,
      compareUrl: prev ? `${REPO}/compare/${prev}...${tag}` : `${REPO}/commits/${tag}`,
      commits
    }
  })
  .reverse()

/** Markdown would turn `*`, `_`, `<`… in a commit subject into formatting. */
const escape = (text) => text.replace(/([\\`*_[\]<>#|])/g, '\\$1')

const commitList = (v) =>
  v.commits.map((c) => `- ${escape(c.subject)} ([${c.short}](${c.url}))`).join('\n')

const section = (v) =>
  `## [${v.version}](${v.url}) · ${v.date}\n\n${commitList(v)}\n\n[Ver todos los cambios](${v.compareUrl})\n`

const markdown = [
  '# Changelog\n',
  'Cambios de cada versión de Bllt. Este archivo se genera solo al publicar una versión; no lo edites a mano.\n',
  ...(versions.length ? versions.map(section) : ['Aún no hay versiones publicadas.\n'])
].join('\n')

writeFileSync(join(root, 'CHANGELOG.md'), markdown)
writeFileSync(
  join(root, 'apps/site/src/lib/changelog.json'),
  JSON.stringify({ repo: REPO, versions }, null, 2) + '\n'
)

const notesIndex = process.argv.indexOf('--notes')
if (notesIndex !== -1) {
  const [tag, file] = process.argv.slice(notesIndex + 1, notesIndex + 3)
  const v = versions.find((x) => x.tag === tag)
  if (!v || !file) throw new Error(`Uso: --notes <tag> <archivo>; no hay versión ${tag}`)
  writeFileSync(file, `${commitList(v)}\n\n[Ver todos los cambios](${v.compareUrl})\n`)
}

console.log(`Changelog: ${versions.length} versiones`)
