import { describe, expect, it } from 'vitest'
import { createTelemetry } from './telemetry'

describe('telemetry export', () => {
  it('carries a note on where the code and the docs are, so an analysis tool can find them', () => {
    const t = createTelemetry('t-about', 100_000, { game: 'Test game', docs: ['docs/x.md'] })
    t.track('run-start')
    const doc = JSON.parse(t.exportJson())
    expect(doc.about.repo).toBe('https://github.com/michaelitvin/alef')
    expect(doc.about.game).toBe('Test game')
    expect(doc.about.docs).toContain('docs/x.md')
    expect(doc.about.docs).toContain('docs/minigame-rules.md')
    expect(doc.about.howToAnalyse).toMatch(/Claude Code/)
    expect(doc.events).toHaveLength(1)
  })
})
