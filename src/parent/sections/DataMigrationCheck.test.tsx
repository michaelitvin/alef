// The Data section's migration check: PASS or FAIL, one row per key, the date. The parent area is behind the gate:
// nothing of it shows before the right year.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { MigrationCheck } from './DataMigrationCheck'
import { ParentPage } from '../../pages/Parent/ParentPage'
import { HOLD_MS } from '../../shared/HoldButton'
import { enterYear } from '../../shared/parentGate/testing'
import { takeGatePass } from '../gateToken'
import { MIGRATION_CHECK_KEY, type CheckResult } from '../../shared/migrateCheck'

const AT = Date.UTC(2026, 10, 23, 9, 30)
const result = (over: Partial<CheckResult>): CheckResult => ({
  v: 2, step: 'spellquest-two-names', at: AT, verdict: 'pass', rows: [
    { key: 'alef-spellquest-he', moved: true, content: true, counts: null },
    { key: 'alef-spellquest-he-telemetry: whole log, 7 events', moved: null, content: true, counts: true },
  ], ...over,
})
const store = (r: CheckResult) => localStorage.setItem(MIGRATION_CHECK_KEY, JSON.stringify(r))

describe('the migration check in the Data section', () => {
  beforeEach(() => localStorage.clear())

  it('shows nothing without a result (production)', () => {
    expect(render(<MigrationCheck />).container.innerHTML).toBe('')
  })

  it('an older check result (v1, the first rename) is never shown as PASS; it says that no check ran for this version', () => {
    localStorage.setItem(MIGRATION_CHECK_KEY, JSON.stringify({ v: 1, at: AT, verdict: 'pass', rows: [{ key: 'alef-spellquest', moved: true, content: true, counts: null }] }))
    const { container } = render(<MigrationCheck />)
    expect(container.querySelector('[data-migration-verdict]')).toBeNull()
    expect(container.textContent).toContain('No migration check yet for this version')
    expect(container.textContent).toContain('?migrate-check')
  })

  it('a v2 result of another step is not shown either', () => {
    store({ ...result({}), step: 'spellquest-rename' })
    const { container } = render(<MigrationCheck />)
    expect(container.querySelector('[data-migration-verdict]')).toBeNull()
    expect(container.textContent).toContain('No migration check yet')
  })

  it('PASS: the verdict, one row per key, the date', () => {
    store(result({}))
    const { container } = render(<MigrationCheck />)
    expect(container.querySelector('[data-migration-verdict]')!.textContent).toBe('Migration check: PASS')
    expect(container.querySelectorAll('[data-migration-row]')).toHaveLength(2)
    expect(container.querySelector('[data-migration-date]')!.textContent).toBe('2026-11-23 09:30 UTC')
    expect(container.querySelector('[data-migration-row="alef-spellquest-he"]')!.textContent).toContain('yes')
  })

  it('FAIL: the verdict and the failing row say so', () => {
    store(result({ verdict: 'fail', rows: [{ key: 'alef-progress', moved: true, content: false, counts: null, detail: 'the saved value differs from the expected one' }] }))
    const { container } = render(<MigrationCheck />)
    expect(container.querySelector('[data-migration-verdict]')!.textContent).toBe('Migration check: FAIL')
    const row = container.querySelector('[data-migration-row="alef-progress"]')!
    expect(row.getAttribute('data-ok')).toBe('false')
    expect(row.textContent).toContain('NO')
    expect(row.textContent).toContain('FAIL the saved value differs')
  })

  it('already migrated reads plainly', () => {
    store(result({ verdict: 'already', rows: [], message: 'production is already migrated: nothing to check' }))
    expect(render(<MigrationCheck />).container.textContent).toContain('production is already migrated: nothing to check')
  })

  describe('behind the gate', () => {
    beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); takeGatePass() })
    afterEach(() => vi.useRealTimers())
    it('the result shows in the area only after the right year', () => {
      store(result({}))
      const { container } = render(<MemoryRouter><ParentPage /></MemoryRouter>)
      expect(document.querySelector('[data-migration-check]')).toBeNull()
      fireEvent.pointerDown(container.querySelector('[aria-label="settings (hold)"]')!)
      act(() => { vi.advanceTimersByTime(HOLD_MS) })
      enterYear(new Date().getFullYear() - 40)
      expect(document.querySelector('[data-migration-verdict]')!.textContent).toBe('Migration check: PASS')
    })
  })
})

describe('MigrationCheck: a conflict of the key migration', () => {
  afterEach(() => localStorage.clear())
  it('names the old and the new key that both stay', async () => {
    const { runKeyMigration } = await import('../../shared/stagingStorage')
    localStorage.setItem('alef-duel2', '{"state":{"coins":1},"version":7}')
    localStorage.setItem('alef-spellquest-he', '{"state":{"coins":2},"version":7}')
    runKeyMigration(localStorage)
    const { container } = render(<MigrationCheck />)
    const note = container.querySelector('[data-migration-waiting]')!.textContent!
    expect(note).toContain('alef-duel2')
    expect(note).toContain('alef-spellquest-he')
    localStorage.clear()
    runKeyMigration(localStorage) // a clean report for the next test
  })
})
