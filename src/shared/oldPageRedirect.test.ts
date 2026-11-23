// The old address of Spell Quest (`duel2/`) stays as a tiny page that redirects to `../spellquest/`, query and hash kept
// (spec 2026-11-22-spell-quest-rename-design.md, "Old URL"). It must import nothing from the app and be a build input.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync('duel2/index.html', 'utf8')

describe('duel2/ redirect page', () => {
  it('sends the visitor to ../spellquest/ with the same query and hash, with a meta refresh fallback', () => {
    expect(html).toContain("location.replace('../spellquest/' + location.search + location.hash)")
    expect(html).toMatch(/<meta http-equiv="refresh" content="0; url=\.\.\/spellquest\/"/)
  })
  it('imports nothing from the app', () => {
    expect(html).not.toMatch(/<script[^>]*\bsrc=/)
    expect(html).not.toMatch(/\bimport\b/)
  })
  it('both pages are build inputs', () => {
    const config = readFileSync('vite.config.ts', 'utf8')
    expect(config).toContain("spellquest: fileURLToPath(new URL('./spellquest/index.html'")
    expect(config).toContain("duel2: fileURLToPath(new URL('./duel2/index.html'")
    expect(existsSync('spellquest/index.html')).toBe(true)
  })
})
