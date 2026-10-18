import { describe, expect, it } from 'vitest'
import { HOURS, MINUTES } from '../logic/time'
import { LANGS, phrase } from '../logic/phrases'
import { CUSTOMER_LINES, LINES, lineAudioId, customerAudioId, parseLine, type Request } from '../data/lines'
import { captionTimes } from '../audio/wordTiming'
import { CUSTOMERS } from '../logic/workday'
import { VOICE_URLS, VOICE_WORDS } from './audioFiles'

/** every voice id the game can play, with the caption words the UI shows for it */
const captions = new Map<string, string[]>([
  ...HOURS.flatMap((h) => MINUTES.flatMap((m) => LANGS.flatMap((l) => (m === 40 ? [false, true] : [false]).map((d) => [phrase({ h, m }, l, d).audioId, phrase({ h, m }, l, d).words] as [string, string[]])))),
  ...LINES.flatMap((l) => LANGS.map((lang) => [lineAudioId(l.id, lang), parseLine(l[lang]).words] as [string, string[]])),
  ...CUSTOMERS.flatMap((c) => (Object.entries(CUSTOMER_LINES[c.lang].ask) as [Request, string[]][]).flatMap(([what, texts]) =>
    texts.map((t, v) => [customerAudioId(c.id, what, v), t.split(' ')] as [string, string[]]))),
  ...CUSTOMERS.map((c) => [customerAudioId(c.id, 'thanks'), CUSTOMER_LINES[c.lang].thanks.split(' ')] as [string, string[]]),
])
const known = new Set(captions.keys())

describe('clock assets', () => {
  it('every voice file belongs to a known line (files arrive progressively, so none may be missing yet)', () => {
    for (const id of Object.keys(VOICE_URLS)) expect(known.has(id), id).toBe(true)
  })
  it('word timings exist only for files, one per spoken word, and are ascending', () => {
    for (const [id, { w, t }] of Object.entries(VOICE_WORDS)) {
      expect(VOICE_URLS[id], id).toBeTruthy()
      expect(t.length, id).toBe(w.length)
      for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThanOrEqual(t[i - 1])
    }
  })
  // Playtest 2026-10-15: a partial sync left all but two files without timings, so the highlight ran on an estimate.
  it('every voice file has timings, and they map onto its caption words (the voice says the caption)', () => {
    for (const id of Object.keys(VOICE_URLS)) {
      expect(VOICE_WORDS[id], `${id}: no timings`).toBeTruthy()
      const times = captionTimes(captions.get(id)!, VOICE_WORDS[id])
      expect(times, `${id}: spoken ${VOICE_WORDS[id].w.join(' ')} / caption ${captions.get(id)!.join(' ')}`).not.toBeNull()
      expect(times!.length).toBe(captions.get(id)!.length)
    }
  })
})
