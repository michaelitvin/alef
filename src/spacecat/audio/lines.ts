// Space Cat's voice lines: the texts of the spec's *Voice* table (drafts for the parent's review). No line says a number
// or addresses the child (one take for boys and girls); no "!" (it makes the voice shout): excitement comes from the tag.
// Loaded by plain Node (the catalogue script): erasable TypeScript only.

export interface LineDef {
  id: string
  /** where it plays (shown on the review page) */
  where: string
  /** one text per variation; files `<id>-<n>` with n from 1 */
  he: string[]
  /** 0 Creative (dramatic), 0.5 Natural (instructions), 1 Robust */
  stability: number
  /** ElevenLabs v4 tag, e.g. "excited" */
  tag?: string
  /** an approved take of another game that this line plays instead (`<game>/<file id>`): no new take */
  reuse?: string
}

/** Book 2's narrator (the game's narrator; Space Cat has no speaking character) */
export const VOICE = { id: 'bIHbv24MWmeRgasZH58o', model: 'eleven_v4', lang: 'he' } as const

const line = (id: string, where: string, he: string[], stability: number, tag?: string, reuse?: string): LineDef => ({
  id, where, he: he.map((t) => t.normalize('NFC')), stability, ...(tag ? { tag } : {}), ...(reuse ? { reuse } : {}),
})

export const LINES: LineDef[] = [
  line('demo', 'The demo round (first run, first round), while the hand shows the way', ['צָרִיךְ לָטוּס אֶל כּוֹכַב הַלֶּכֶת עִם הַתְּשׁוּבָה הַנְּכוֹנָה.'], 0.5, 'warmly'),
  line('zoom-tip', 'The zoom tip: he rests under the right planet (at most two times)', ['אֶפְשָׁר לְזַנֵּק לְמַעְלָה וּלְהַגִּיעַ מַהֵר.'], 0.5, 'playful'),
  line('missing', 'The first two rounds with the ring not at the end, before the planets move', ['אֵיזֶה מִסְפָּר חָסֵר?'], 0.5, 'warmly'),
  line('level-done', 'Level done (the first two times), after the fanfare', ['כָּל הַכָּבוֹד. הַלְּבָבוֹת מְלֵאִים שׁוּב.', 'יֹפִי שֶׁל טִיסָה. הַלְּבָבוֹת מְלֵאִים שׁוּב.'], 0, 'excited'),
  line('new-ship', 'Level done: a new ship (each of the two ships)', ['חֲלָלִית חֲדָשָׁה.'], 0, 'excited'),
  line('out', 'End of the run (the first two times)', ['נִגְמְרוּ הַלְּבָבוֹת. אֶפְשָׁר לָטוּס שׁוּב.'], 0.5, 'warmly'),
  line('info-hearts', 'A tap on the hearts (once for a burst of taps)', ['אֵלֶּה הַלְּבָבוֹת. טָעוּת לוֹקַחַת לֵב, וּבְסוֹף כָּל שָׁלָב הֵם מִתְמַלְּאִים.'], 0.5, 'playful'),
  line('info-points', 'A tap on the points (once for a burst of taps)', ['אֵלֶּה הַנְּקֻדּוֹת. תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת נְקֻדָּה, וְזִנּוּק מַהִיר נוֹתֵן יוֹתֵר.'], 0.5, 'playful'),
  line('info-best', 'A tap on his best (once for a burst of taps)', ['זֶה הַשִּׂיא: הֲכִי הַרְבֵּה נְקֻדּוֹת בְּטִיסָה אַחַת.'], 0.5, 'playful'),
  line('info-ship-locked', 'A tap on a locked ship on the cover (once for a burst of taps)', ['אֶת הַחֲלָלִית הַזֹּאת מְקַבְּלִים בְּטִיסָה אֲרֻכָּה.'], 0.5, 'playful'),
  line('new-best', 'The end screen: a new best (each time; it is rare)', ['שִׂיא חָדָשׁ.'], 0.5, undefined, 'duel2/new-best-1'),
]

/** the file id of a line's variation n (from 1) */
export const lineAudioId = (id: string, n: number): string => `${id}-${n}`
