import { describe, expect, it } from 'vitest'
import { FEMININE_IDS, LINES } from './lines'

// spec 2026-11-07 girls: every line that speaks to the child has a feminine take
const MASCULINE = /(^|\s)(אַתָּה|שֶׁלְּךָ|לְךָ|בּוֹא|תִּתְפֹּס|תִּגְרֹר|תִּזְרֹק|תִּמְצָא|תִּקְרָא|תָּבִיא|תִּסְתַּכֵּל|תִּכְתֹּב|תְּקַבֵּל|תִּגַּע)(?=[\s.,:?]|$)|תָּ(?=[\s.,:]|$)|הַקּוֹסֵם/u
describe('Book 2 feminine lines', () => {
  it('give one entry per variation, a real change, and no "!" or "…" ending', () => {
    for (const l of LINES) {
      if (!l.fe) continue
      expect(l.fe.length, l.id).toBe(l.variations)
      l.fe.forEach((t, i) => {
        if (t === null) return
        expect(t, l.id).not.toBe(l.he[i])
        expect(t, l.id).not.toMatch(/!|…|\.\.\.$/)
      })
    }
  })
  it('leave no masculine address in a line without a feminine take', () => {
    for (const l of LINES)
      l.he.forEach((t, i) => {
        if (!l.fe?.[i]) expect(t.normalize('NFC'), `${l.id}-${i + 1}`).not.toMatch(new RegExp(MASCULINE.source.normalize('NFC'), 'u'))
      })
  })
  it('the feminine texts themselves are not masculine', () => {
    for (const l of LINES) for (const t of l.fe ?? []) if (t) expect(t, l.id).not.toMatch(new RegExp(MASCULINE.source.normalize('NFC'), 'u'))
  })
  it('lists the voice ids that have a feminine take', () => {
    expect(FEMININE_IDS.has('q-door-1')).toBe(true)
    expect(FEMININE_IDS.has('q-door-3')).toBe(false)
    expect(FEMININE_IDS.has('run-end-1')).toBe(false)
  })
})
describe('the masculine-address check itself', () => {
  it('finds the masculine words it looks for', () => {
    const re = new RegExp(MASCULINE.source.normalize('NFC'), 'u')
    for (const s of ['תִּתְפֹּס אֶת', 'אַתָּה תּוֹתָח.', 'הִגַּעְתָּ עַד לְמַעְלָה.', 'הַשִּׂיא שֶׁלְּךָ.', 'וְהַקּוֹסֵם יְטַפֵּס'])
      expect(s.normalize('NFC')).toMatch(re)
  })
})
