// Writes the clock game's audio catalogue (every voice line with its text, voice and where it plays) as JSON for
// the host-local generation pipeline. Run: node scripts/clock/export-audio-catalog.ts > catalog.json
import { HOURS, LEVEL_MINUTES, MINUTES, timeId } from '../../src/clock/logic/time.ts'
import { LANGS, phrase, stripNikkud } from '../../src/clock/logic/phrases.ts'
import { CUSTOMERS, NARRATOR_VOICE } from '../../src/clock/logic/workday.ts'
import { CUSTOMER_LINES, LINES, customerAudioId, lineAudioId, parseLine, type Request } from '../../src/clock/data/lines.ts'

const levelOf = (m: number) => Number(Object.keys(LEVEL_MINUTES).find((l) => LEVEL_MINUTES[Number(l)].includes(m)))
const items: unknown[] = []

// Spoken text is the caption without nikkud (full nikkud makes the voice say silent shvas), playful delivery (style test 2026-10-15).
// Rule "natural spoken form": "to 2/8/12" is said "le-", not "li-". Only the segol is written, which makes Charlotte say it
// (tested by transcription: לֶשתיים -> leshtayim, לֶשמוֹנֶה -> leshmone, לֶשתים עשרה -> leshtem esre; plain לשתיים gave lishtayim).
const SPOKEN_OVERRIDES: [string, string][] = [
  ['לשתים', 'לֶשתיים'],
  ['לשמונה', 'לֶשמוֹנֶה'],
  ['לשתים־עשרה', 'לֶשתים עשרה'],
]
// Word-level pronunciation fixes (parent review 2026-10-15). The captions are in haser spelling, so without nikkud the voice
// guesses wrong. Each word gets just enough nikkud, a meteg (stress mark) or a respelling to give the right reading
// (tested with Charlotte + Gemini transliteration). Key = stripped word; `prefix` also matches ב/ל/ה/כ/מ/ו/ש in front.
// Tested: הָאָרֹךְ -> haaROCH; הַשָּׁעָן -> hashaAN; סוֹפֵר -> soFER; סוֹפְרִים -> sofRIM; מִסְפָּר -> misPAR; מִסְפָּרִים -> mispaRIM;
// תִּסְפֹּר -> tisPOR; מְעוּלֶּה -> me'uLE; אֲמִיתִּי -> amiTI; תַּעֲצֹר -> ta'aTSOR; יֽוֹפִי -> YOfi; וואו -> WOW;
// בָּנִיתָ -> baNIta; סִיַּמְתָּ -> siYAMta (masculine).
// חֲמִשָּׁה -> chamisha in 4 of 4 probes (also after ו); the bare חמשה gave "chamesh" / "chamshe" in the :05 and :55 phrases
// (playtest 2026-10-15: the caption said חֲמִשָּׁה, the voice said חָמֵשׁ).
// סַד נה (patah on the dalet, a space before the nun) -> SADna in 4 of 4 probes. Every one-word spelling (qamats, meteg, dagesh,
// patah without qamats, maqaf) gave sadNA in most probes.
const HE_SPOKEN_WORDS: Record<string, { to: string; prefix?: boolean }> = {
  הארך: { to: 'הָאָרֹךְ' },
  הארוך: { to: 'הָאָרֹךְ' },
  השען: { to: 'הַשָּׁעָן' },
  שען: { to: 'שָׁעָן' },
  סופר: { to: 'סוֹפֵר' },
  סופרים: { to: 'סוֹפְרִים' },
  מספר: { to: 'מִסְפָּר', prefix: true },
  מספרים: { to: 'מִסְפָּרִים', prefix: true },
  תספר: { to: 'תִּסְפֹּר' },
  תספור: { to: 'תִּסְפֹּר' },
  מעלה: { to: 'מְעוּלֶּה' },
  מעולה: { to: 'מְעוּלֶּה' },
  אמתי: { to: 'אֲמִיתִּי' },
  אמיתי: { to: 'אֲמִיתִּי' },
  תעצר: { to: 'תַּעֲצֹר' },
  תעצור: { to: 'תַּעֲצֹר' },
  יפי: { to: 'יֽוֹפִי' },
  יופי: { to: 'יֽוֹפִי' },
  חמשה: { to: 'חֲמִשָּׁה', prefix: true },
  ואו: { to: 'וואו' },
  // "will show", not "will see" (the round questions, 2026-10-15)
  שיראה: { to: 'שֶׁיַּרְאֶה' },
  // masculine past 2nd person (the child is a boy; a female voice reads the bare spelling as feminine: banit / siyamt)
  בנית: { to: 'בָּנִיתָ' },
  סימת: { to: 'סִיַּמְתָּ' },
  למדת: { to: 'לָמַדְתָּ' },
  // ארבע stays as written: one take had a guttural, Arabic-sounding ayin (the parent 2026-10-17), but the other plain takes
  // were fine, so that take was withdrawn; a test with "ארבא" was reverted.
  // masculine "you will find" (timtza), not timtzi (a customer request, 2026-10-16)
  תמצא: { to: 'תִּמְצָא' },
  סיימת: { to: 'סִיַּמְתָּ' },
}
const HE_LETTER = '\\u05d0-\\u05ea'
const applyWordMap = (text: string) =>
  text.replace(new RegExp(`(?<![${HE_LETTER}])([בלהכמוש]{0,2})([${HE_LETTER}]+)(?![${HE_LETTER}])`, 'g'), (all, pre: string, stem: string) => {
    const whole = HE_SPOKEN_WORDS[pre + stem]
    if (whole) return whole.to
    const e = HE_SPOKEN_WORDS[stem]
    return pre && e?.prefix ? pre + e.to : all
  })
const spokenHe = (caption: string) => {
  // the caption's haser spelling שתים is written with the yod here, as in the style test
  let t = applyWordMap(stripNikkud(caption).replace(/(^| )שתים(?= |$)/g, '$1שתיים'))
  for (const [from, to] of SPOKEN_OVERRIDES) if (t.endsWith(from)) t = t.slice(0, -from.length) + to
  return t
}
const PLAYFUL = 'playful'
// Bare time phrases are lighter than the lines (parent: "too playful" on ph-en-3-00 / ph-en-9-00): warm, clear, not exaggerated.
const PHRASE_TAG = 'warmly'
const PHRASE_STABILITY = 0.4
const EMOTION_TAGS = new Set(['excited', 'amazed', 'happy'])

for (const lang of LANGS)
  for (const m of MINUTES)
    for (const h of HOURS)
      // :40 has a second, digital-style form ("one forty"); a round uses one of the two (parent review 2026-10-16)
      for (const digital40 of m === 40 ? [false, true] : [false]) {
        const p = phrase({ h, m }, lang, digital40)
        items.push({
          id: p.audioId, group: 'phrase', lang, text: p.text, spoken: lang === 'he' ? spokenHe(p.text) : p.text, voice: NARRATOR_VOICE, model: 'eleven_v4', stability: PHRASE_STABILITY, tag: PHRASE_TAG,
          where: digital40
            ? 'Time phrase, :40 read as on a digital clock (rounds alternate it with "twenty to"): Find / Set the clock, answer cards, feedback'
            : `Time phrase: spoken in Find the clock / Set the clock, read on answer cards, and repeated in feedback`,
          context: { type: 'clock', time: timeId({ h, m }) }, level: levelOf(m),
        })
      }

for (const l of LINES)
  for (const lang of LANGS) {
    const { spoken } = parseLine(l[lang])
    items.push({
      id: lineAudioId(l.id, lang), group: 'line', lang, text: spoken, spoken: lang === 'he' ? spokenHe(spoken) : spoken, voice: NARRATOR_VOICE, model: 'eleven_v4',
      stability: 0, tag: l.tag && EMOTION_TAGS.has(l.tag) ? l.tag : PLAYFUL, where: l.where,
      context: l.id.startsWith('exp-') ? { type: 'explain', line: l.id, example: l.example } : { type: 'line' },
    })
  }

const REQUEST_WHERE: Record<Request, string> = {
  set: 'a Set the clock round (his clock is wrong)',
  what: 'a What time is it round (he asks the time on his clock)',
  find: 'a Find the clock round (he comes to pick up his clock)',
  digitalPick: 'a Clock to digital round (he wants a digital clock that matches)',
  digitalSet: 'a Digital to clock round (his digital clock is right, the other is wrong)',
  now: 'the first round of the day (he asks the real time now)',
}
for (const c of CUSTOMERS) {
  const asks = CUSTOMER_LINES[c.lang].ask
  const lines = [
    ...(Object.keys(asks) as Request[]).flatMap((what) => asks[what].map((text, v) => ({ what, v, text }))),
    { what: 'thanks' as const, v: 0, text: CUSTOMER_LINES[c.lang].thanks },
  ]
  for (const { what, v, text } of lines)
    items.push({
      id: customerAudioId(c.id, what, v), group: 'customer', lang: c.lang, text, spoken: c.lang === 'he' ? spokenHe(text) : text, voice: c.voice, model: 'eleven_v4',
      stability: 0, tag: what === 'thanks' ? 'happy' : PLAYFUL,
      where: what === 'thanks' ? `Customer (${c.id}) thanks him after a right answer, sometimes`
        : `Customer (${c.id}) comes in: ${REQUEST_WHERE[what]} (one of ${asks[what].length})`,
      context: { type: 'customer', customer: c.id },
    })
}

process.stdout.write(JSON.stringify({ items }, null, 1))
