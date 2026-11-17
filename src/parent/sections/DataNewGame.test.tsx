// A new game joins the Data section by declaring its log in its GameParent: it lists, exports and clears with no change
// in src/shared or in the section.
import { fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameParent } from '../types'

const SPACECAT_LOG = { key: 'alef-spacecat-telemetry', label: 'Space Cat', game: 'spacecat', about: { game: 'Space Cat', docs: ['docs/spacecat.md'] } }
vi.mock('../registry', () => ({
  GAMES: [{ id: 'book2', title: 'Space Cat', saveKey: 'alef-spacecat', logs: [SPACECAT_LOG], summary: () => null, mixups: () => [], reset: async () => {} } as unknown as GameParent],
}))

afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

describe('a new game\'s log in the Data section', () => {
  it('lists, exports and clears with no core change', async () => {
    const { DataSection } = await import('./Data')
    const { createTelemetry } = await import('../../shared/telemetry')
    const t = createTelemetry(SPACECAT_LOG.key, { game: 'spacecat', about: SPACECAT_LOG.about })
    t.track('answer', { ok: true })
    t.flush()
    let blob: Blob | null = null
    Object.assign(URL, { createObjectURL: (b: Blob) => { blob = b; return 'blob:x' }, revokeObjectURL: () => {} })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { container } = render(<DataSection game="book2" />)
    expect(container.querySelector('[data-log="alef-spacecat-telemetry"] [data-log-count]')!.textContent).toBe('1 events')
    fireEvent.click(container.querySelector('[data-telemetry-download]')!)
    const doc = JSON.parse(await blob!.text())
    expect(doc.games[0]).toMatchObject({ key: 'alef-spacecat-telemetry', events: [expect.objectContaining({ g: 'spacecat', e: 'answer' })] })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(container.querySelector('[data-log="alef-spacecat-telemetry"] [data-log-clear]')!)
    expect(localStorage.getItem('alef-spacecat-telemetry')).toBeNull()
  })
})
