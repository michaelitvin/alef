import { describe, expect, it } from 'vitest'
import { LINES, parseLine } from './lines'

describe('lines', () => {
  it('parses cues onto the following word', () => {
    expect(parseLine('The {short}short hand.')).toEqual({ words: ['The', 'short', 'hand.'], cues: [{ word: 1, cue: 'short' }], spoken: 'The short hand.' })
  })
  it('ids are unique and every line has both languages without "!"', () => {
    expect(new Set(LINES.map((l) => l.id)).size).toBe(LINES.length)
    for (const l of LINES) {
      expect(l.he.length).toBeGreaterThan(0)
      expect(l.en.length).toBeGreaterThan(0)
      expect(l.he + l.en).not.toContain('!')
    }
  })
  it('every explanation id from levels.ts has a line', async () => {
    const ids = ['hands', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6', 'nonumbers', 'ex-find', 'ex-what', 'ex-set', 'ex-digital', 'seconds', 'fix-swap', 'fix-notAdvanced', 'fix-mirror', 'fix-numberAsMin', 'fix-hour1', 'fix-five']
    for (const id of ids) expect(LINES.some((l) => l.id === `exp-${id}`)).toBe(true)
  })
  it('{fives} sits on the first counted number, so the long hand steps on five, ten, fifteen, twenty', () => {
    const counted = { en: ['five', 'ten', 'fifteen', 'twenty'], he: ['חָמֵשׁ', 'עֶשֶׂר', 'חֲמֵשׁ־עֶשְׂרֵה', 'עֶשְׂרִים'] }
    for (const l of LINES)
      for (const lang of ['en', 'he'] as const) {
        const { words, cues } = parseLine(l[lang])
        const at = cues.find((c) => c.cue === 'fives')?.word
        if (at === undefined) continue
        expect(words.slice(at, at + 4).map((w) => w.replace(/[.,:]/g, '').toLowerCase()), `${l.id} ${lang}`).toEqual(counted[lang])
      }
  })
})

// spec 2026-11-07 girls
import { CUSTOMER_ASK_HE_F, CUSTOMER_LINES, hasFeminine, lineById, lineText } from './lines'
const MASC = /(^|[\s}])(אַתָּה|בָּרוּךְ|תַּקְשִׁיב|וְתִבְחַר|תָּזִיז|תִּלְחַץ|תִּסְתַּכֵּל|תִּסְפֹּר|לָמַדְתָּ|סִיַּמְתָּ|תַּעֲצֹר|תְּסַדֵּר|תּוּכַל|תַּעֲזוֹר|תַּגִּיד|תִּמְצָא|הַשָּׁעָן|שָׁעָן)(?=[\s.,:?]|$)/u
const re = new RegExp(MASC.source.normalize('NFC'), 'u')
describe('feminine lines (clock)', () => {
  it('every Hebrew line that speaks to the child in the masculine has a feminine version with the same cues', () => {
    for (const l of LINES) {
      if (re.test(l.he.normalize('NFC'))) expect(l.heF, l.id).toBeTruthy()
      if (!l.heF) continue
      expect(l.heF.normalize('NFC')).not.toMatch(re)
      expect(l.heF).not.toMatch(/!|…|\.\.\.$/)
      expect(parseLine(l.heF).cues.map((c) => c.cue)).toEqual(parseLine(l.he).cues.map((c) => c.cue))
    }
  })
  it('lineText gives the feminine Hebrew only to a girl, and English to both', () => {
    const l = lineById('welcome')!
    expect(lineText(l, 'he', 'girl')).toBe(l.heF)
    expect(lineText(l, 'he', 'boy')).toBe(l.he)
    expect(lineText(l, 'he', null)).toBe(l.he)
    expect(lineText(l, 'en', 'girl')).toBe(l.en)
  })
  it('the customer requests that address the child have a feminine version', () => {
    const ask = CUSTOMER_LINES.he.ask
    for (const [what, list] of Object.entries(ask)) {
      list.forEach((t, v) => {
        const f = CUSTOMER_ASK_HE_F[what as keyof typeof ask]?.[v]
        if (re.test(t.normalize('NFC'))) expect(f, `${what} ${v}`).toBeTruthy()
        if (f) expect(f.normalize('NFC')).not.toMatch(re)
      })
    }
  })
  it('hasFeminine knows which voice ids have a -f take', () => {
    expect(hasFeminine('welcome-he')).toBe(true)
    expect(hasFeminine('welcome-en')).toBe(false)
    expect(hasFeminine('fb-streak-he')).toBe(false)
    expect(hasFeminine('cust-bear-hello-2')).toBe(true)
    expect(hasFeminine('cust-bear-hello')).toBe(false)
    expect(hasFeminine('cust-cat-digitalSet-1')).toBe(true)
    expect(hasFeminine('cust-cat-thanks')).toBe(false)
  })
})
