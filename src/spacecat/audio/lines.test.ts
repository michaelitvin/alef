import { describe, expect, it } from 'vitest'
import spec from '../../../docs/superpowers/specs/2026-11-12-space-cat-design.md?raw'
import ladderSpec from '../../../docs/superpowers/specs/2026-11-20-space-cat-ladder-design.md?raw'
import { VOICE_URLS } from '../assets/audioFiles'
import { LINES, VOICE, lineAudioId } from './lines'

const texts = LINES.flatMap((l) => l.he)
/** the Hebrew lines of the spec's Voice table */
function specLines(): string[] {
  const sec = spec.split('## Voice')[1].split('\n## ')[0]
  return sec.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| When') && !l.startsWith('| ---'))
    .flatMap((l) => l.split('|')[2].split(' / ').map((t) => t.trim().normalize('NFC')))
}
/** the Hebrew lines of the ladder design's Voice table (rows start with the line id in backticks) */
function ladderLines(): string[] {
  const sec = ladderSpec.split('## Voice')[1].split('\n## ')[0]
  return sec.split('\n').filter((l) => l.startsWith('| `')).map((l) => l.split('|')[3].trim().normalize('NFC'))
}

describe('the voice table', () => {
  it('no line holds "!" or a digit', () => {
    for (const t of texts) expect(t).not.toMatch(/[!0-9]/)
  })
  it('no line holds עוֹד', () => {
    for (const t of texts) expect(t.includes('עוֹד'.normalize('NFC'))).toBe(false)
  })
  it('every text is NFC', () => {
    for (const t of texts) expect(t).toBe(t.normalize('NFC'))
  })
  it('the voice table matches the spec\'s ids and texts', () => {
    expect(LINES.map((l) => l.id)).toEqual(['demo', 'zoom-tip', 'missing', 'level-done', 'new-ship', 'out', 'info-hearts', 'info-points',
      'info-best', 'info-ship-locked', 'compare', 'jumps', 'times', 'divide', 'new-best'])
    expect([...texts].sort()).toEqual([...specLines(), ...ladderLines()].sort())
    expect(LINES.find((l) => l.id === 'level-done')!.he).toHaveLength(2)
    expect(new Set(LINES.map((l) => l.id)).size).toBe(LINES.length)
  })
  it('lines with a tag that needs drama are creative; instructions are natural', () => {
    for (const l of LINES) expect(l.tag === 'excited' ? l.stability === 0 : l.stability === 0.5).toBe(true)
  })
  it('new-best reuses Book 2\'s take', () => {
    const nb = LINES.find((l) => l.id === 'new-best')!
    expect(nb.reuse).toBe('duel2/new-best-1')
    expect(VOICE_URLS[lineAudioId('new-best', 1)]).toMatch(/new-best-1\.mp3/)
  })
  it('the four intro lines: one sentence-pair each, natural stability, the design\'s tags', () => {
    const tags = { compare: 'warmly', jumps: 'playful', times: 'warmly', divide: 'warmly' }
    for (const [id, tag] of Object.entries(tags)) {
      const l = LINES.find((x) => x.id === id)!
      expect(l.stability).toBe(0.5)
      expect(l.tag).toBe(tag)
      expect(l.he).toHaveLength(1)
    }
  })
  it('the narrator is Book 2\'s', () => {
    expect(VOICE.id).toBe('bIHbv24MWmeRgasZH58o')
  })
})
