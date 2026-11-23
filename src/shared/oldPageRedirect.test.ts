// The old addresses of Spell Quest (`duel2/`, `spellquest/`) stay as tiny pages that redirect, query and hash kept:
// to `../spellquest-he/`, or with `course=en` to `../spellquest-en/` with `course` dropped (spec 2026-11-22-spell-quest-rename-design.md,
// addendum 2026-11-23). They must import nothing from the app and be build inputs.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** runs the page's script with this address; returns where it goes */
function target(page: string, search: string, hash = ''): string {
  const html = readFileSync(`${page}/index.html`, 'utf8')
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)![1]
  let to = ''
  new Function('location', script)({ search, hash, replace: (u: string) => { to = u } })
  return to
}

describe.each(['duel2', 'spellquest'])('%s/ redirect page', (page) => {
  const html = readFileSync(`${page}/index.html`, 'utf8')
  it.each([
    ['', '', '../spellquest-he/'],
    ['?station=broom', '', '../spellquest-he/?station=broom'],
    ['?station=broom&x=1', '#/gallery/a', '../spellquest-he/?station=broom&x=1#/gallery/a'],
    ['?migrate-check', '', '../spellquest-he/?migrate-check'],
    ['?course=en', '', '../spellquest-en/'],
    ['?course=en&station=doors', '#/gallery/spell-long', '../spellquest-en/?station=doors#/gallery/spell-long'],
    ['?station=ghosts&course=en&a=b', '', '../spellquest-en/?station=ghosts&a=b'],
    ['?course=he&station=tower', '', '../spellquest-he/?station=tower'],
  ])('%s %s goes to %s', (search, hash, to) => {
    expect(target(page, search, hash)).toBe(to)
  })
  it('has a meta refresh fallback to the Hebrew page', () => {
    expect(html).toMatch(/<meta http-equiv="refresh" content="0; url=\.\.\/spellquest-he\/"/)
  })
  it('imports nothing from the app', () => {
    expect(html).not.toMatch(/<script[^>]*\bsrc=/)
    expect(html).not.toMatch(/\bimport\b/)
  })
})

describe('the four pages', () => {
  it('are build inputs, and the two games have their own entries', () => {
    const config = readFileSync('vite.config.ts', 'utf8')
    for (const [key, dir] of [['spellquestHe', 'spellquest-he'], ['spellquestEn', 'spellquest-en'], ['spellquest', 'spellquest'], ['duel2', 'duel2']]) {
      expect(config).toContain(`${key}: fileURLToPath(new URL('./${dir}/index.html'`)
      expect(existsSync(`${dir}/index.html`)).toBe(true)
    }
    expect(readFileSync('spellquest-he/index.html', 'utf8')).toContain('<title>Hebrew Spell Quest</title>')
    expect(readFileSync('spellquest-en/index.html', 'utf8')).toContain('<title>English Spell Quest</title>')
  })
  it('each entry gives its page the course, behind the staging gate', () => {
    for (const [c, f] of [['he', 'main.he.tsx'], ['en', 'main.en.tsx']]) {
      expect(readFileSync(`spellquest-${c}/index.html`, 'utf8')).toContain(`/src/spellquest/${f}`)
      const main = readFileSync(`src/spellquest/${f}`, 'utf8')
      expect(main).toContain('migrateCheckGate()')
      expect(main).toContain(`m.boot('${c}')`)
    }
  })
})
