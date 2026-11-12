import { describe, expect, it } from 'vitest'
import { syllable } from '../logic/content.ts'
import { WORDS, wordLinkFor } from './words.ts'
import { LINES, lineAudioId, lineById } from './lines.ts'

const PER_ROUND = ['q-cauldron', 'q-ladder', 'q-ghosts', 'q-ghosts-letter', 'q-door', 'target-new', 'almost', 'streak', 'ladder-top', 'crystal', 'run-end', 'boss-arrive', 'boss-win']

describe('words', () => {
  const doors = WORDS.filter((w) => w.door)
  it('door words are built from their syllables', () => {
    for (const w of doors) expect(w.syllables!.map((s) => syllable(s.item, s.mark).text + (s.tail ?? '')).join('').normalize('NFC')).toBe(w.text)
  })
  it('door words use no final letters and no door', () => {
    for (const w of doors) expect(/[ךםןףץ]/.test(w.text), w.id).toBe(false)
    expect(doors.some((w) => w.id === 'door' || w.picture.endsWith('door'))).toBe(false)
  })
  it('at least 10 door words with unique pictures', () => {
    expect(doors.length).toBeGreaterThanOrEqual(10)
    expect(new Set(doors.map((w) => w.picture)).size).toBe(doors.length)
  })
  it('every word starts with its first syllable', () => {
    for (const w of WORDS) {
      const s = syllable(w.first.item, w.first.mark).text
      expect(w.text.startsWith(s) || w.text.normalize('NFD').replace(/ּ/g, '').startsWith(s.normalize('NFD').replace(/ּ/g, '')), w.id).toBe(true)
    }
  })
  it('word link finds a word for בָּ', () => {
    expect(wordLinkFor('bet', 'kamatz', () => 0)?.id).toMatch(/house|banana/)
  })
  it('word link never shows a word that starts with another letter of the same sound (כָ is not חָתוּל)', () => {
    expect(wordLinkFor('het', 'kamatz', () => 0)?.id).toBe('cat')
    expect(wordLinkFor('khaf', 'kamatz')).toBeUndefined()
    for (const it of ['alef', 'bet', 'vet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'het', 'tet', 'yod', 'kaf', 'khaf', 'lamed', 'mem', 'nun', 'samech', 'ayin', 'pe', 'fe', 'tsadi', 'qof', 'resh', 'shin', 'sin', 'tav'])
      for (const m of ['kamatz', 'patach', 'tsere', 'segol', 'chirik', 'cholam', 'cholam-male', 'kubutz', 'shuruk'] as const)
        for (let r = 0; r < 1; r += 0.1) {
          const w = wordLinkFor(it, m, () => r)
          if (w) expect(w.first.item, `${it}-${m} -> ${w.id}`).toBe(it)
        }
  })
})

describe('lines', () => {
  it('repeated lines have variations', () => {
    for (const id of PER_ROUND) expect(LINES.find((l) => l.id === id)?.variations, id).toBeGreaterThanOrEqual(3)
    expect(LINES.find((l) => l.id === 'new-best')?.variations).toBe(2)
  })
  it('every variation has its text', () => {
    for (const l of LINES) expect(l.he.length, l.id).toBe(l.variations)
  })
  it('no exclamation marks in spoken text', () => {
    expect(LINES.some((l) => l.he.some((t) => t.includes('!')))).toBe(false)
  })
  it('question lines carry no learning word', () => {
    const words = WORDS.map((w) => w.text)
    for (const l of LINES.filter((x) => x.id.startsWith('q-')))
      for (const t of l.he) {
        const tokens = t.split(/[\s,.?]+/)
        for (const w of words) expect(tokens.includes(w), `${l.id}: ${w}`).toBe(false)
      }
  })
  it('the boss lines exist (text only: the parent pipeline records them), none ends with "…"', () => {
    for (const id of ['boss-arrive', 'boss-win', 'boss-new', 'info-bosses', 'defeat']) {
      const l = lineById(id)!
      expect(l, id).toBeDefined()
      for (const t of l.he) expect(/(\.\.\.|…)$/.test(t), `${id}: ${t}`).toBe(false)
    }
    expect(lineById('boss-arrive')!.variations).toBe(3)
    expect(lineById('boss-win')!.variations).toBe(3)
    // no flying potion any more (spec: one duel)
    expect(lineById('potion-intro')).toBeUndefined()
    // the end screen has no coin ring any more
    expect(lineById('info-coin-ring')).toBeUndefined()
    expect(lineById('defeat')!.variations).toBe(2)
    // the info lines say the new rules: hearts come back at the end of a pass, coins come from right answers
    // spelled as it is said ("sivuv", the parent); the pause cannot fall inside "וּבְסוֹף כָּל"
    for (const t of [lineById('info-hearts')!.he[0], lineById('info-hearts')!.fe![0]!]) {
      expect(t).toMatch(/וְלֵב חוֹזֵר בְּסוֹף כָּל סִיבוּב/.source.normalize('NFC'))
      expect(t).not.toMatch(/סִבּוּב/.source.normalize('NFC'))
    }
    expect(lineById('info-hearts')!.he[0]).not.toMatch(/מָסָךְ/.source.normalize('NFC'))
    expect(lineById('info-coins')!.he[0]).not.toMatch(/כּוֹכָבִים/.source.normalize('NFC'))
    // no number that the game logic can change (rule): a right answer pays more with a streak
    expect(lineById('info-coins')!.he[0]).toBe('אֵלֶּה הַמַּטְבְּעוֹת שֶׁלְּךָ. אַתָּה מַרְוִיחַ אוֹתָם בִּתְשׁוּבוֹת נְכוֹנוֹת, וְקוֹנֶה בָּהֶם שִׁקּוּי.'.normalize('NFC'))
    expect(lineById('info-coins')!.fe![0]).toBe('אֵלֶּה הַמַּטְבְּעוֹת שֶׁלָּךְ. אַתְּ מַרְוִיחָה אוֹתָם בִּתְשׁוּבוֹת נְכוֹנוֹת, וְקוֹנָה בָּהֶם שִׁקּוּי.'.normalize('NFC'))
    // the parent's wording: he chased the monster away
    expect(lineById('boss-win')!.he[1]).toBe('וָואוּ, הִבְרַחְתָּ אֶת הַמִּפְלֶצֶת.'.normalize('NFC'))
  })
  it('audio ids', () => {
    expect(lineAudioId('almost', 2)).toBe('almost-2')
  })
describe('drawing lines (spec: drawing)', () => {
  it('has the new lines with their variations', () => {
    const want: Record<string, number> = { 'demo-draw': 1, 'q-draw': 3, 'draw-again': 3, 'draw-mark': 1, 'line-tall': 1, 'line-low': 1, 'line-small': 1 }
    for (const [id, n] of Object.entries(want)) expect(lineById(id)?.variations, id).toBe(n)
  })
  it('short, with nikkud, never ending in "…" (the voice moaned) and no "!"', () => {
    for (const id of ['demo-draw', 'q-draw', 'draw-again', 'draw-mark', 'line-tall', 'line-low', 'line-small'])
      for (const t of lineById(id)!.he) {
        expect(/(\.\.\.|…)$/.test(t), `${id}: ${t}`).toBe(false)
        expect(t.includes('!')).toBe(false)
        expect(/[\u05B0-\u05BC]/.test(t), `${id} has nikkud`).toBe(true)
        expect(t.split(/\s+/).length, `${id}: short`).toBeLessThanOrEqual(12)
      }
  })
  it('the instruction leads into the word that follows it', () => {
    for (const t of lineById('q-draw')!.he) expect(t.endsWith(':'), t).toBe(true)
  })
})

describe('lines lead into the sound', () => {
  it('a line that a sound follows ends open (…), so the voice does not close the sentence first', () => {
    for (const id of ['q-cauldron', 'q-ladder', 'q-ghosts', 'q-ghosts-letter', 'target-new', 'dot-without', 'dot-with', 'dot-right', 'dot-left', 'boss-arrive'])
      for (const t of lineById(id)!.he) expect(/(\.\.\.|…|:)$/.test(t), `${id}: ${t}`).toBe(true)
  })
  it('the dotted-letter introduction names each form before its sound', () => {
    expect(lineById('dot-without')!.he[0]).toMatch(/בְּלִי נְקֻדָּה/)
    expect(lineById('dot-with')!.he[0]).toMatch(/עִם נְקֻדָּה/)
    expect(lineById('dot-intro')).toBeUndefined()
  })
  it('no line is left that nothing plays (the broom asks nothing: its demo teaches it)', () => {
    expect(lineById('q-broom')).toBeUndefined()
    expect(lineById('q-broom-letter')).toBeUndefined()
  })
})

})

describe('one duel lines: the parent’s review 2026-11-12', () => {
  it('no pass-heart line: the heart comes back with no words', () => {
    expect(lineById('pass-heart')).toBeUndefined()
  })
  it('the multiplier says he gets more coins (the coins are not worth more), in words that suit a boy and a girl', () => {
    const n = (t: string) => t.normalize('NFC')
    expect(lineById('mult-up')!.he).toEqual([n('עַכְשָׁו כָּל תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת פִּי שְׁנַיִם מַטְבְּעוֹת.'), n('עַכְשָׁו כָּל תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת פִּי שְׁלוֹשָׁה מַטְבְּעוֹת.')])
    expect(lineById('mult-up')!.fe).toBeUndefined()
    expect(lineById('info-mult')!.he[0]).toBe(n('תְּשׁוּבוֹת נְכוֹנוֹת בְּרֶצֶף נוֹתְנוֹת יוֹתֵר מַטְבְּעוֹת. כְּשֶׁהוֹלֵךְ לֵב, הָרֶצֶף נִגְמָר.'))
    expect(lineById('info-mult')!.fe).toBeUndefined()
  })
})

describe('merchant lines (spec: one duel, Part 2)', () => {
  const want: Record<string, number> = {
    'm-hello': 3, 'm-again': 2, 'm-bye': 2, 'm-price': 1, 'm-give': 1, 'm-tap': 1, 'm-decline': 1, 'm-exact': 3, 'm-short': 3,
    'm-over': 3, 'm-undo': 1, 'm-empty': 2, 'm-hint': 2,
  }
  it('every line exists with its variations; the merchant speaks in his own voice, the hint is the narrator', () => {
    for (const [id, n] of Object.entries(want)) {
      expect(lineById(id)?.variations, id).toBe(n)
      expect(lineById(id)!.voice, id).toBe(id === 'm-hint' ? undefined : 'merchant')
    }
  })
  it('the spec’s texts: the parent’s opening line and the table’s lines', () => {
    const he = (id: string, k = 0) => lineById(id)!.he[k]
    const n = (t: string) => t.normalize('NFC')
    expect(he('m-hello')).toBe(n('שָׁלוֹם קוֹסֵם. יֵשׁ לִי שִׁקּוּי שֶׁנּוֹתֵן לֵב בַּחֲזָרָה. תִּרְצֶה לִקְנוֹת אֶחָד?'))
    expect(lineById('m-hello')!.fe![0]).toBe(n('שָׁלוֹם קוֹסֶמֶת. יֵשׁ לִי שִׁקּוּי שֶׁנּוֹתֵן לֵב בַּחֲזָרָה. תִּרְצִי לִקְנוֹת אֶחָד?'))
    expect(he('m-again')).toBe(n('נוּ, תִּרְצֶה לִקְנוֹת אֶחָד?'))
    expect(he('m-bye')).toBe(n('בְּסֵדֶר. לְהִתְרָאוֹת קוֹסֵם.'))
    expect(lineById('m-bye')!.fe![0]).toBe(n('בְּסֵדֶר. לְהִתְרָאוֹת קוֹסֶמֶת.'))
    expect(he('m-price')).toBe(n('זֶה הַמְּחִיר.'))
    expect(he('m-give')).toBe(n('תֵּן לִי מַטְבְּעוֹת, לְפִי הַמְּחִיר.'))
    expect(he('m-tap')).toBe(n('וְאָז גַּע בַּשִּׁקּוּי.'))
    expect(he('m-decline')).toBe(n('לֹא צָרִיךְ? גַּע כָּאן.'))
    expect(he('m-exact')).toBe(n('בְּדִיּוּק. הִנֵּה הַשִּׁקּוּי.'))
    expect(he('m-short')).toBe(n('זֶה לֹא מַסְפִּיק.'))
    expect(he('m-over')).toBe(n('זֶה יוֹתֵר מִדַּי.'))
    expect(he('m-undo')).toBe(n('קַח מַטְבֵּעַ בַּחֲזָרָה.'))
    expect(he('m-hint')).toBe(n('אוּלַי אֵלֶּה?'))
    expect(he('m-empty')).toBe(n('קֹדֶם מַטְבְּעוֹת.'))
  })
  it('a girl form for every line that addresses the child; no "!", no digits (no numbers are spoken)', () => {
    // masculine words that address the child: the verbs, "you", the wizard
    const addresses = /(קוֹסֵם|תִּרְצֶה|תֵּן|גַּע|קַח|שֶׁלְּךָ|רוֹצֶה)/
    for (const id of Object.keys(want)) {
      const l = lineById(id)!
      l.he.forEach((t, i) => {
        expect(t.includes('!'), `${id}: ${t}`).toBe(false)
        expect(/[0-9]/.test(t), `${id}: ${t}`).toBe(false)
        if (addresses.test(t.normalize('NFC'))) expect(l.fe?.[i], `${id} ${i + 1} needs a girl form`).toBeTruthy()
        if (l.fe?.[i]) expect(l.fe[i]!.includes('!')).toBe(false)
      })
    }
  })
  it('"not enough" avoids עוֹד and קְצָת (this voice says them wrongly)', () => {
    for (const t of lineById('m-short')!.he) expect(/עוֹד|קְצָת/.test(t), t).toBe(false)
  })
  it('the parent’s review 2026-11-12: no wow; a neutral undo for a girl; take 3 of exact does not need שֶׁלְּךָ', () => {
    for (const t of lineById('m-over')!.he) expect(/וָואוּ/.test(t), t).toBe(false)
    expect(lineById('m-undo')!.fe![0]).toBe('אֶפְשָׁר לָקַחַת מַטְבֵּעַ בַּחֲזָרָה.'.normalize('NFC'))
    expect(lineById('m-exact')!.fe).toBeUndefined()
  })
})
