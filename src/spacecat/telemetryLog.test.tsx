// Space Cat's log: its events, what an evicted chunk keeps, and its place in the registry and the Data section.
import { fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION, registeredLogs, type TelemetryEvent } from '../shared/telemetry'
import { SPACECAT_LOG, spaceCatFacts } from './telemetryLog'

afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

const ev = (e: string, f: Record<string, unknown>, t = 1000): TelemetryEvent => ({ t, s: 'x', run: 1, e, g: 'spacecat', ...f })

describe('Space Cat\'s telemetry log', () => {
  it('a Space Cat event carries g and the page\'s session', async () => {
    const { spaceCatTelemetry } = await import('./telemetry')
    spaceCatTelemetry.setRun(3)
    spaceCatTelemetry.track('run-start', { ship: 1, rung: 1 })
    const evs = spaceCatTelemetry.events()
    const last = evs[evs.length - 1]!
    expect(last).toMatchObject({ e: 'run-start', g: 'spacecat', s: SESSION, run: 3, ship: 1, rung: 1 })
    spaceCatTelemetry.clear()
  })

  it('the facts of a chunk: right, wrong, time-out, and the demo and the cut round apart', () => {
    const facts = spaceCatFacts([
      ev('run-start', { ship: 1, rung: 1 }),
      ev('round', { item: '1+1=2/c', result: 'right', number: 2, endMs: 2000, demo: true }, 1),
      ev('round', { item: '3+4=7/c', result: 'right', number: 7, endMs: 1500 }, 2),
      ev('round', { item: '3+4=7/c', result: 'wrong', number: 8, endMs: 2500 }, 3),
      ev('round', { item: '5-2=3/a', result: 'timeout', number: 4, endMs: 5000 }, 4),
      ev('round', { item: '5-2=3/a', cut: true }, 5),
      ev('level-done', { level: 1, points: 7 }),
    ])
    expect(facts).toEqual([
      { item: '1+1=2/c', special: true, t: 1 },
      { item: '3+4=7/c', ok: true, ms: 1500, t: 2 },
      { item: '3+4=7/c', ok: false, ms: 2500, chosen: '8', t: 3 },
      { item: '5-2=3/a', ok: false, ms: 5000, chosen: 'timeout', t: 4 },
      { item: '5-2=3/a', special: true, t: 5 },
    ])
  })

  it('the log is registered', async () => {
    await import('../parent/registry')
    expect(registeredLogs().map((l) => l.key)).toContain(SPACECAT_LOG.key)
    expect(registeredLogs().find((l) => l.key === SPACECAT_LOG.key)!.rollup).toBe(spaceCatFacts)
  })

  it('the Data section lists, exports and clears Space Cat\'s log', async () => {
    const { DataSection } = await import('../parent/sections/Data')
    const { spaceCatTelemetry } = await import('./telemetry')
    spaceCatTelemetry.track('round', { item: '3+4=7/c', result: 'right' })
    let blob: Blob | null = null
    Object.assign(URL, { createObjectURL: (b: Blob) => { blob = b; return 'blob:x' }, revokeObjectURL: () => {} })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { container } = render(<DataSection game="spacecat" live={spaceCatTelemetry} />)
    expect(container.querySelector(`[data-log="${SPACECAT_LOG.key}"] [data-log-count]`)!.textContent).toBe('1 events')
    fireEvent.click(container.querySelector('[data-telemetry-download]')!)
    const doc = JSON.parse(await blob!.text()) as { games: { key: string; events: TelemetryEvent[] }[] }
    expect(doc.games.find((g) => g.key === SPACECAT_LOG.key)).toMatchObject({ events: [expect.objectContaining({ g: 'spacecat', e: 'round' })] })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(container.querySelector(`[data-log="${SPACECAT_LOG.key}"] [data-log-clear]`)!)
    expect(spaceCatTelemetry.events()).toEqual([])
  })
})
