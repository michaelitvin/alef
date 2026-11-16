// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'

// Staging keeps its saves apart by prefixing every localStorage key. That works only if the prefix is installed before
// any store loads, so every entry point must import it first.
const entries = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((f) => /(^|[\\/])main\.tsx$/.test(f))
  .map((f) => `src/${f}`)

describe('entry points', () => {
  it('finds the entry points', () => expect(entries.length).toBeGreaterThanOrEqual(3))
  it.each(entries)('%s imports shared/stagingStorage first', (file) => {
    const first = readFileSync(file, 'utf8').split('\n').find((l) => /^\s*import\b/.test(l)) ?? ''
    expect(first).toMatch(/^import ['"](\.\.?\/)+(\.\.\/)*shared\/stagingStorage['"]/)
  })
})
