// @vitest-environment jsdom

// The tower's frozen history log reads its old key while its move waits for space, so the export still has it.
import { afterEach, describe, expect, it } from 'vitest'
import { readLog } from '../../../shared/telemetry'
import { TOWER_HISTORY_LOG } from './telemetryHistory'

const LOG = JSON.stringify({ v: 1, events: [{ t: 500, s: 'x', run: 1, e: 'choice' }] })

describe('TOWER_HISTORY_LOG', () => {
  afterEach(() => localStorage.clear())

  it('is the new key, and the old key while only the old one is there (as stored: no alias)', () => {
    expect(TOWER_HISTORY_LOG.key).toBe('alef-tower-history-telemetry')
    localStorage.setItem('alef-duel-telemetry', LOG)
    expect(TOWER_HISTORY_LOG.key).toBe('alef-duel-telemetry')
    expect(readLog(TOWER_HISTORY_LOG.key)).toEqual([{ t: 500, s: 'x', run: 1, e: 'choice' }])
    localStorage.setItem('alef-tower-history-telemetry', LOG)
    expect(TOWER_HISTORY_LOG.key).toBe('alef-tower-history-telemetry')
  })
})
