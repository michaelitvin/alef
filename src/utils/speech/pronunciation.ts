/**
 * TTS engines read kamatz katan as a regular kamatz ("a" instead of "o"),
 * e.g. כָּל comes out as "kal" instead of "kol". Respell such words with an
 * unambiguous holam male for speech only; displayed text is unaffected.
 */
/**
 * HEBREW ACCENT OLE — marks the stressed syllable for TTS engines that
 * default to final stress (e.g. the name מוֹתֶק is mil'el: "MO-tek").
 * Engines that don't understand it ignore it.
 */
const OLE = '֫'

const PRONUNCIATION_FIXES = new Map(
  (
    [
      ['מוֹתֶק', `מ${OLE}וֹתֶק`],
      ['לְמוֹתֶק', `לְמ${OLE}וֹתֶק`],
      ['כָּל', 'כּוֹל'],
      ['וְכָל', 'וְכוֹל'],
      ['בְּכָל', 'בְּכוֹל'],
      ['לְכָל', 'לְכוֹל'],
      ['מִכָּל', 'מִכּוֹל'],
      ['שֶׁכָּל', 'שֶׁכּוֹל'],
    ] as const
  ).map(([written, spoken]) => [written.normalize('NFC'), spoken.normalize('NFC')])
)

// Letters (U+05D0-05EA) + pointing marks, matching decodeWord's HEBREW_MARK.
// Excludes maqaf (U+05BE), rafe, paseq so they act as word boundaries.
const HEBREW_WORD = /[ְ-ׇֽׁׂא-ת]+/g

/** Replace whole words that TTS mispronounces with a phonetic respelling */
export function fixPronunciation(text: string): string {
  return text
    .normalize('NFC')
    .replace(HEBREW_WORD, (word) => PRONUNCIATION_FIXES.get(word) ?? word)
}
