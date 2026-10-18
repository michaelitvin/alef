import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Caption, displayWord, scriptFor } from './Caption'

const settings = { heCursiveMix: true, enCapsMix: true }

describe('Caption', () => {
  it('scripts alternate per language round', () => {
    expect([0, 1, 2, 3].map((r) => scriptFor('he', r, settings))).toEqual(['print', 'cursive', 'print', 'cursive'])
    expect([4, 5, 6].map((r) => scriptFor('en', r, settings))).toEqual(['small', 'caps', 'small'])
    expect(scriptFor('en', 5, { heCursiveMix: true, enCapsMix: false })).toBe('small')
  })
  it('English small has no capital at all; caps are all capitals', () => {
    expect(displayWord('Hello.', 'small')).toBe('hello.')
    expect(displayWord("o'clock", 'caps')).toBe("O'CLOCK")
  })
  it('cursive drops the nikkud (keeps the maqaf); print keeps it', () => {
    expect(displayWord('אַחַת־עֶשְׂרֵה', 'cursive')).toBe('אחת־עשרה')
    expect(displayWord('שְׁתַּיִם', 'print')).toBe('שְׁתַּיִם')
    const { container } = render(<Caption words={['שְׁתַּיִם']} lang="he" script="cursive" active={-1} />)
    expect(container.querySelector('[data-caption]')!.textContent).toBe('שתים')
  })
  it('marks spoken words and the active word, with the language direction', () => {
    const { container } = render(<Caption words={['רֶבַע', 'לְאַרְבַּע']} lang="he" script="print" active={1} />)
    const root = container.querySelector('[data-caption]')!
    expect(root.getAttribute('dir')).toBe('rtl')
    const spans = root.querySelectorAll('span')
    expect(spans[0].className).toContain('said')
    expect(spans[1].className).toContain('now')
  })
})
