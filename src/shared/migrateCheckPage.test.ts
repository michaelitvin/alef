// The end page of `?migrate-check`: plain DOM, the rows, the two downloads in the `?export-prod` format, Continue.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { showCheckEnd, snapshotName } from './migrateCheckPage'
import type { CheckResult } from './migrateCheck'

const RESULT: CheckResult = { v: 2, step: 'spellquest-two-names', at: 1, verdict: 'fail', rows: [
  { key: 'alef-spellquest-he', moved: true, content: true, counts: null },
  { key: 'alef-spellquest-en', moved: false, content: false, counts: null, detail: 'the new key is missing' },
] }
const at = new Date('2026-11-23T10:00:00Z')

describe('the end page of the migration check', () => {
  beforeEach(() => document.body.replaceChildren())

  it('shows the verdict and one row per key; the buttons download the snapshots and continue', () => {
    const files: [string, string][] = []
    const go = vi.fn()
    showCheckEnd(window, RESULT, { before: { 'alef-duel2': 'raw "old"' }, after: { 'alef-spellquest-he': 'raw new' } }, go, (j, n) => files.push([n, j]), () => at)
    expect(document.querySelector('[data-migrate-check-verdict]')!.textContent).toBe('Migration check: FAIL')
    const rows = [...document.querySelectorAll('[data-migrate-check-row]')]
    expect(rows.map((r) => [r.getAttribute('data-migrate-check-row'), r.getAttribute('data-ok')])).toEqual([['alef-spellquest-he', 'true'], ['alef-spellquest-en', 'false']])
    expect(rows[1]!.textContent).toContain('FAIL the new key is missing')
    const press = (id: string) => (document.querySelector(`[data-migrate-check-button="${id}"]`) as HTMLButtonElement).click()
    press('before'); press('after')
    expect(files.map(([n]) => n)).toEqual(['alef-migrate-check-before-2026-11-23.json', 'alef-migrate-check-after-2026-11-23.json'])
    expect(JSON.parse(files[0]![1])).toEqual({ v: 1, kind: 'alef-prod-storage', exportedAt: at.toISOString(), userAgent: navigator.userAgent, label: 'before', keys: { 'alef-duel2': 'raw "old"' } })
    expect(JSON.parse(files[1]![1]).keys).toEqual({ 'alef-spellquest-he': 'raw new' })
    expect(go).not.toHaveBeenCalled()
    press('continue')
    expect(go).toHaveBeenCalledTimes(1)
    expect(snapshotName('after', at)).toBe('alef-migrate-check-after-2026-11-23.json')
  })
})
