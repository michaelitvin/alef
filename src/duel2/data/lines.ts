// Everything the wizard voice says except the learning sounds (syllables, letter names, words: separate files, never in a
// carrier phrase — rule). Lines that repeat have 3 variations (rule); no "!" (it makes the voice shout); check every word's
// nikkud in a dictionary before generating (rule). Loaded by plain Node: erasable TS only.

export interface LineDef {
  id: string
  /** where it plays (shown on the review page) */
  where: string
  /** one text per variation; files `<id>-<n>` with n from 1 */
  he: string[]
  variations: number
  /** ElevenLabs v4 tag, e.g. "excited" (needs stability 0) */
  tag?: string
  /** 0 Creative (dramatic), 0.5 Natural (instructions), 1 Robust (short sounds) */
  stability: number
  /** the feminine text of each variation (files `<id>-<n>-f`); null = the variation does not address the child (one take
   * for both). Spec 2026-11-07 girls. */
  fe?: (string | null)[]
  /** who says it: the merchant has his own voice (spec: one duel, Part 2); unset = the wizard narrator */
  voice?: 'merchant'
}

const line = (id: string, where: string, he: string[], stability = 0.5, tag?: string): LineDef => ({
  id, where, he: he.map((t) => t.normalize('NFC')), variations: he.length, stability, ...(tag ? { tag } : {}),
})

export const VOICE = { id: 'bIHbv24MWmeRgasZH58o', model: 'eleven_v4', lang: 'he' } as const
/** a merchant's line: his own voice (chosen in the host pipeline: warm, playful, unlike the narrator) */
const mline = (id: string, where: string, he: string[], stability = 0.5, tag = 'playful'): LineDef => ({ ...line(id, where, he, stability, tag), voice: 'merchant' })

// Rewritten 2026-10-20 (Michael: "much of the instructions sound unnatural and out of place"): each line is what an adult
// says to the child at that moment, checked in its sequence and by a native reviewer. A line that a sound follows ends
// open ("…") and leads into it. The instructions (q-*) play only when he has not picked for a while; the broom has none
// (its demo teaches it). The speaker is the wizard: "what I say", not "what you will hear".
export const LINES: LineDef[] = [
  line('q-cauldron', 'Cauldron, when he waits: then the syllable', [
    'אֵיזֶה נִקּוּד צָרִיךְ לִזְרֹק לַסִּיר, כְּדֵי שֶׁיִּהְיֶה...', 'תִּזְרֹק לַסִּיר אֶת הַנִּקּוּד שֶׁל...', 'מָה חָסֵר לָאוֹת, כְּדֵי שֶׁיִּהְיֶה...',
  ], 0.5, 'warmly'),
  line('q-ladder', 'Ladder, when he waits: then the syllable', ['אֵיפֹה כָּתוּב...', 'תִּגְרֹר לַסֻּלָּם אֶת הַשָּׁלָב...', 'תִּמְצָא אֶת...'], 0.5, 'warmly'),
  line('q-ghosts', 'Ghosts (syllables), when he waits: then the syllable', [
    'אֵיפֹה כָּתוּב...', 'אֵיזוֹ רוּחַ רְפָאִים מַחֲזִיקָה אֶת...', 'תִּמְצָא אֶת...',
  ], 0.5, 'playful'),
  line('q-ghosts-letter', 'Ghosts (letters), when he waits: then the letter name', [
    'אֵיפֹה הָאוֹת...', 'אֵיזוֹ רוּחַ רְפָאִים מַחֲזִיקָה אֶת הָאוֹת...', 'תִּמְצָא אֶת הָאוֹת...',
  ], 0.5, 'playful'),
  line('q-door', 'Door, when he waits; it never says the word (he reads it)', [
    'מָה כָּתוּב עַל הַדֶּלֶת? תָּבִיא אֶת הַמַּפְתֵּחַ הַנָּכוֹן.', 'תִּקְרָא אֶת הַמִּלָּה, וְתִבְחַר מַפְתֵּחַ.', 'אֵיזֶה מַפְתֵּחַ פּוֹתֵחַ אֶת הַדֶּלֶת?',
  ], 0.5, 'warmly'),
  line('target-new', 'Broom flight: a new sound to catch (then the new sound)', [
    'וְעַכְשָׁו...', 'עַכְשָׁו תִּתְפֹּס אֶת...', 'וְעַכְשָׁו מַשֶּׁהוּ אַחֵר:',
  ], 0.5, 'playful'),
  line('almost', 'Near miss: the other form of a dotted letter (encouraging; he tries again)', [
    'כִּמְעַט.', 'כִּמְעַט. תִּסְתַּכֵּל עַל הַנְּקֻדָּה.', 'מַמָּשׁ קָרוֹב.',
  ], 0.5, 'encouraging'),
  line('streak', 'A streak of right answers', ['וָואוּ, אַתָּה /baˈʃvunɡ/.', 'אַתָּה תּוֹתָח.', 'אַתָּה עָף עַל זֶה.'], 0, 'excited'),
  line('ladder-top', 'The ladder is built to the top', ['הִגַּעְתָּ עַד לְמַעְלָה.', 'בָּנִיתָ אֶת כָּל הַסֻּלָּם.', 'וָואוּ, עַד הַשָּׁמַיִם.'], 0, 'excited'),
  line('crystal', 'The crystal behind the last door', ['וָואוּ, אֶבֶן קְסָמִים.', 'מָצָאתָ אֶבֶן קְסָמִים.', 'אֵיזוֹ אֶבֶן נוֹצֶצֶת.'], 0, 'amazed'),
  line('run-end', 'The run ends (no hearts left): neither praise for a loss nor disappointed', [
    'נִגְמְרוּ הַלְּבָבוֹת. עוֹד פַּעַם?', 'זֶהוּ לְהַפַּעַם. נְשַׂחֵק שׁוּב?', 'נִגְמַר הַסִּבּוּב. עוֹד סִבּוּב?',
  ], 0.5, 'warmly'),
  line('defeat', 'The hearts ran out: the dizzy wizard spins and falls (playful; never praise for a loss), then the summary', [
    'אוּפְּס, הַפַּעַם הֵן נִצְּחוּ.', 'אוֹי, הַקְּסָמִים נִגְמְרוּ לְהַפַּעַם.',
  ], 0.5, 'playful'),
  line('new-best', 'Summary: a new best run', ['שִׂיא חָדָשׁ.', 'שָׁבַרְתָּ אֶת הַשִּׂיא שֶׁלְּךָ.'], 0, 'excited'),
  line('dot-without', 'Dotted-letter introduction: before the sound of the form without the dot', ['בְּלִי נְקֻדָּה...'], 0.5, 'warmly'),
  line('dot-with', 'Dotted-letter introduction: before the sound of the form with the dot', ['וְעִם נְקֻדָּה...'], 0.5, 'warmly'),
  line('dot-right', 'ש introduction: before the sound of שׁ (both forms have a dot; it differs by its side)', ['נְקֻדָּה מִיָּמִין...'], 0.5, 'warmly'),
  line('dot-left', 'ש introduction: before the sound of שׂ', ['וּנְקֻדָּה מִשְּׂמֹאל...'], 0.5, 'warmly'),
  line('explain-lead', 'Explanation after a mistake: before letter name, vowel name, syllable', ['בּוֹא נִקְרָא לְאַט.'], 0.5, 'warmly'),
  // the flight boss (spec 2026-11-07): it is on the screen when its line plays; the arrival line leads into the first sound
  line('boss-arrive', 'Broom flight: a boss swoops in (then the first sound to catch)', [
    'הִנֵּה מִפְלֶצֶת. כְּדֵי לְנַצֵּחַ אוֹתָהּ, תִּתְפֹּס אֶת מָה שֶׁאֲנִי אוֹמֵר:', 'מִפְלֶצֶת בַּשָּׁמַיִם. בּוֹא נְנַצֵּחַ אוֹתָהּ. תִּתְפֹּס אֶת:',
    'אוֹי, הִגִּיעָה מִפְלֶצֶת. תִּתְפֹּס אֶת מָה שֶׁאֲנִי אוֹמֵר:',
  ], 0, 'excited'),
  line('boss-win', 'The boss is beaten (praise: spoken the first two times only)', [
    'נִצַּחְתָּ אֶת הַמִּפְלֶצֶת.', 'וָואוּ, הִבְרַחְתָּ אֶת הַמִּפְלֶצֶת.', 'אֵיזֶה כִּשּׁוּף. נִצַּחְתָּ אוֹתָהּ.',
  ], 0, 'excited'),
  line('boss-new', 'His first win against a kind of boss: it falls into a golden frame for the shelf', ['נִצַּחְתָּ מִפְלֶצֶת חֲדָשָׁה. עַכְשָׁו הִיא עַל הַמַּדָּף שֶׁלְּךָ.'], 0, 'amazed'),
  // one duel (spec 2026-11-11): the hearts last the run; at the end of each pass one comes back with no line (it flies to
  // the top bar and the hearts flash; the parent 2026-11-12: "no need to say it at all")
  // the streak multiplier rises (its own moment, always spoken): take 1 at x2 (streak 5), take 2 at x3 (streak 10). He gets
  // more coins for each right answer; the coins are not worth more (the parent 2026-11-12). It does not address the child.
  line('mult-up', 'The streak multiplier rises: take 1 for x2, take 2 for x3 (said over the flight on the broom)', [
    'עַכְשָׁו כָּל תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת פִּי שְׁנַיִם מַטְבְּעוֹת.', 'עַכְשָׁו כָּל תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת פִּי שְׁלוֹשָׁה מַטְבְּעוֹת.',
  ], 0, 'excited'),
  // a tap on what he collects says what it is (the parent); one take each: it answers his own tap. info-hearts: the pause
  // fell inside "וּבְסוֹף כָּל" and סִבּוּב was said "sibuv" (the parent 2026-11-12): reordered, spelled as said ("sivuv")
  line('info-hearts', 'A tap on the hearts', ['אֵלֶּה הַלְּבָבוֹת שֶׁלְּךָ. עַל כָּל טָעוּת הוֹלֵךְ לֵב אֶחָד, וְלֵב חוֹזֵר בְּסוֹף כָּל סִיבוּב.']),
  line('info-stars', 'A tap on the stars of this run', ['אֵלֶּה הַכּוֹכָבִים שֶׁאָסַפְתָּ בַּמִּשְׂחָק הַזֶּה. כָּל תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת כּוֹכָב.']),
  line('info-coins', 'A tap on his coins', ['אֵלֶּה הַמַּטְבְּעוֹת שֶׁלְּךָ. אַתָּה מַרְוִיחַ אוֹתָם בִּתְשׁוּבוֹת נְכוֹנוֹת, וְקוֹנֶה בָּהֶם שִׁקּוּי.']),
  line('info-crystals', 'A tap on his crystals', ['אֵלֶּה אַבְנֵי הַקְּסָמִים שֶׁלְּךָ. אַתָּה מוֹצֵא אוֹתָן מֵאֲחוֹרֵי הַדֶּלֶת הָאַחֲרוֹנָה.']),
  line('info-best', 'A tap on his best run', ['זֶה הַשִּׂיא שֶׁלְּךָ: הֲכִי הַרְבֵּה כּוֹכָבִים שֶׁאָסַפְתָּ בְּמִשְׂחָק אֶחָד.']),
  line('info-bosses', 'A tap on the boss trophies (cover, end screen)', ['אֵלֶּה הַמִּפְלָצוֹת שֶׁנִּצַּחְתָּ. הַמִּפְלָצוֹת הַחֲשׁוּכוֹת מְחַכּוֹת לְךָ בַּשָּׁמַיִם.']),
  // two short sentences that do not address the child (the parent 2026-11-12: the long one broke in the wrong places)
  line('info-mult', 'A tap on the ×2 or ×3 beside the coins (the streak multiplier)', ['תְּשׁוּבוֹת נְכוֹנוֹת בְּרֶצֶף נוֹתְנוֹת יוֹתֵר מַטְבְּעוֹת. כְּשֶׁהוֹלֵךְ לֵב, הָרֶצֶף נִגְמָר.']),
  line('demo-broom', 'Demo: first broom flight with syllables (then the sound)', ['תִּגְרֹר אֶת הַקּוֹסֵם לְמַעְלָה וּלְמַטָּה, וְתִתְפֹּס אֶת מָה שֶׁאֲנִי אוֹמֵר.']),
  line('demo-broom-letter', 'Demo: first broom flight with letters (then the letter name)', ['תִּגְרֹר אֶת הַקּוֹסֵם לְמַעְלָה וּלְמַטָּה, וְתִתְפֹּס אֶת הָאוֹת שֶׁאֲנִי אוֹמֵר.']),
  line('demo-cauldron', 'Demo: first cauldron (then the sound)', ['תִּגְרֹר לַסִּיר אֶת הַנִּקּוּד שֶׁחָסֵר לָאוֹת, לְפִי מָה שֶׁאֲנִי אוֹמֵר.']),
  line('demo-ladder', 'Demo: first ladder (then the sound)', ['תִּגְרֹר לַסֻּלָּם אֶת מָה שֶׁאֲנִי אוֹמֵר, וְהַקּוֹסֵם יְטַפֵּס.']),
  line('demo-ghosts-letter', 'Demo: first letter ghosts (then the letter name)', ['תִּגַּע בְּרוּחַ הָרְפָאִים שֶׁמַּחֲזִיקָה אֶת הָאוֹת שֶׁאֲנִי אוֹמֵר.']),
  line('demo-ghosts-syllable', 'Demo: first syllable ghosts (then the sound)', ['תִּגַּע בְּרוּחַ הָרְפָאִים שֶׁמַּחֲזִיקָה אֶת מָה שֶׁאֲנִי אוֹמֵר.']),
  line('demo-doors', 'Demo: first door', ['תִּקְרָא מָה כָּתוּב עַל הַדֶּלֶת, וְתִגְרֹר אֵלֶיהָ אֶת הַמַּפְתֵּחַ עִם הַתְּמוּנָה הַנְּכוֹנָה.']),
  // the drawing screen (spec: 2026-11-07 drawing). No "…" endings (the voice moaned): a line that the word follows ends with ":".
  line('demo-draw', 'Drawing, first visit: after the word, while the hand writes its first letter', [
    'תִּסְתַּכֵּל אֵיךְ כּוֹתְבִים אֶת הָאוֹת הָרִאשׁוֹנָה, וְאַחַר כָּךְ תִּכְתֹּב אוֹתָהּ בְּעַצְמְךָ.',
  ], 0.5, 'warmly'),
  line('q-draw', 'Drawing, when he waits: then the word', [
    'תִּכְתֹּב אֶת הָאוֹת הָרִאשׁוֹנָה שֶׁל הַמִּלָּה:', 'בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה:', 'אֵיךְ כּוֹתְבִים אֶת הָאוֹת הָרִאשׁוֹנָה שֶׁל:',
  ], 0.5, 'warmly'),
  line('draw-again', 'Drawing: a stroke was wrong; the hand shows that one line again (first wrong stroke of a word only)', [
    'בּוֹא נִכְתֹּב אֶת הַקַּו הַזֶּה שׁוּב.', 'נְנַסֶּה אֶת הַקַּו הַזֶּה עוֹד פַּעַם.', 'תִּסְתַּכֵּל עַל הַיָּד, וְתִכְתֹּב אֶת הַקַּו שׁוּב.',
  ], 0.5, 'encouraging'),
  line('draw-mark', 'Drawing: the letter is done; now its marks (the place glows)', ['וְעַכְשָׁו הַנִּקּוּד.'], 0.5, 'warmly'),
  line('line-tall', 'Drawing: the letter pokes above the top line (it still counts)', ['הָאוֹת יָצְאָה גְּבוֹהָה מִדַּי.'], 0.5, 'warmly'),
  line('line-low', 'Drawing: the letter sinks below the baseline (it still counts)', ['קְצָת נָמוּךְ.'], 0.5, 'warmly'),
  line('line-small', 'Drawing: the letter is much too small (it still counts)', ['בַּפַּעַם הַבָּאָה, תִּכְתֹּב אוֹתָהּ גְּדוֹלָה יוֹתֵר.'], 0.5, 'warmly'),
  // the merchant (spec: one duel, Part 2). His own voice; no numbers spoken (every count is shown); no "!"; the parent
  // wrote the opening line and the D2 line. Variations beyond the spec's table are mine, to be checked by the parent.
  mline('m-hello', 'Merchant: he walks in at a checkpoint (the opening; the first take is the parent\'s line)', [
    'שָׁלוֹם קוֹסֵם. יֵשׁ לִי שִׁקּוּי שֶׁנּוֹתֵן לֵב בַּחֲזָרָה. תִּרְצֶה לִקְנוֹת אֶחָד?',
    'מָה נִשְׁמָע קוֹסֵם? הֵבֵאתִי שִׁקּוּי שֶׁנּוֹתֵן לֵב. תִּרְצֶה אֶחָד?',
    'הַי קוֹסֵם. יֵשׁ לִי שִׁקּוּי שֶׁמַּחֲזִיר לֵב. רוֹצֶה לִקְנוֹת?',
  ]),
  // the parent: a child who knows the merchant (he bought a potion from him before) hears only this short offer
  mline('m-offer', 'Merchant: his opening when the child knows him (a potion bought before); no demo then', ['רוֹצֶה שִׁקּוּי לֵב?']),
  mline('m-again', 'Merchant: nothing tapped for 20 s after he came (once per visit)', ['נוּ, תִּרְצֶה לִקְנוֹת אֶחָד?', 'אָז מָה? קוֹנִים שִׁקּוּי?']),
  // no comma before קוֹסֵם: no pause there (the parent 2026-11-12)
  mline('m-bye', 'Merchant: the ✗ (no thanks); his coins go back and he walks away', ['בְּסֵדֶר. לְהִתְרָאוֹת קוֹסֵם.', 'אֵין בְּעָיָה. נִתְרָאֶה בַּפַּעַם הַבָּאָה.']),
  mline('m-price', 'Merchant, first visit demo D1: the price tag glows', ['זֶה הַמְּחִיר.']),
  mline('m-give', 'Merchant, first visit demo D2 (the parent\'s wording): the hand drags a coin into his hand', ['תֵּן לִי מַטְבְּעוֹת, לְפִי הַמְּחִיר.']),
  mline('m-tap', 'Merchant, first visit demo D3: the hand taps the potion', ['וְאָז גַּע בַּשִּׁקּוּי.']),
  mline('m-decline', 'Merchant, first visit demo D4: the ✗ card glows', ['לֹא צָרִיךְ? גַּע כָּאן.']),
  // take 3 does not address the child: the parent wanted the accent on שֶׁלְּךָ / שֶׁלָּךְ (2026-11-12) and two retakes did not
  // put it there
  mline('m-exact', 'Merchant: he counted the exact price; the potion flies to the wizard', [
    'בְּדִיּוּק. הִנֵּה הַשִּׁקּוּי.', 'בְּדִיּוּק כַּמָּה שֶׁצָּרִיךְ. בְּבַקָּשָׁה.', 'מְצֻיָּן, זֶה בְּדִיּוּק הַמְּחִיר.',
  ]),
  // the parent: after a purchase he says that the child has a heart back (after m-exact, while the hearts flash). The
  // parent's draft had עוֹד (said wrongly by the voices: rule) and "!" (it shouts): לֵב בַּחֲזָרָה instead; no הִנֵּה (m-exact
  // take 1 says it just before)
  mline('m-heart', 'Merchant: after a purchase, right after m-exact: the heart flew to the top bar', [
    'עַכְשָׁו יֵשׁ לְךָ לֵב בַּחֲזָרָה.', 'קִבַּלְתָּ לֵב בַּחֲזָרָה.', 'הַלֵּב שֶׁלְּךָ חָזַר.',
  ]),
  // "not enough" avoids עוֹד and קְצָת (this voice says them wrongly: rule). Plain words, no "wow" (the parent 2026-11-12:
  // "חָסֵר לִי כֶּסֶף" was weird wording; "why wow?")
  mline('m-short', 'Merchant: he counted less than the price (the tag flashes; the coins stay)', ['זֶה לֹא מַסְפִּיק.', 'זֶה פָּחוֹת מֵהַמְּחִיר.', 'צָרִיךְ יוֹתֵר מַטְבְּעוֹת.']),
  mline('m-over', 'Merchant: he counted more than the price (the tag flashes; the coins stay)', ['זֶה יוֹתֵר מִדַּי.', 'זֶה יוֹתֵר מֵהַמְּחִיר.', 'יֵשׁ פֹּה יוֹתֵר מִדַּי מַטְבְּעוֹת.']),
  mline('m-undo', 'Merchant: too much, the first time only: the hand taps his hand and the last coin flies back', ['קַח מַטְבֵּעַ בַּחֲזָרָה.']),
  mline('m-empty', 'Merchant: the potion tapped with nothing in his hand (his hand glows)', ['קֹדֶם מַטְבְּעוֹת.', 'קֹדֶם תֵּן לִי מַטְבְּעוֹת.']),
  // the boy/girl question (spec 2026-11-07 girls): one take for both, before the first run while the setting is unset
  line('ask-gender', 'Before the first run, while boy/girl is not set: the two wizards glow on בֵּן and בַּת', ['מִי מְשַׂחֵק? בֵּן אוֹ בַּת?'], 0.5, 'warmly'),
]

// The feminine version of each line that speaks to the child (spec 2026-11-07 girls): verbs, pronouns and adjectives in
// the feminine, the rest the same. Lines that do not address the child (the sound, the narrator about itself: "מָה שֶׁאֲנִי
// אוֹמֵר") stay single (null). The player's wizard is a girl too: הַקּוֹסֶמֶת. New takes end with ":" or "." (no "…": the
// voice moaned).
const FE: Record<string, (string | null)[]> = {
  'q-cauldron': [null, 'תִּזְרְקִי לַסִּיר אֶת הַנִּקּוּד שֶׁל:', null],
  'q-ladder': [null, 'תִּגְרְרִי לַסֻּלָּם אֶת הַשָּׁלָב:', 'תִּמְצְאִי אֶת:'],
  'q-ghosts': [null, null, 'תִּמְצְאִי אֶת:'],
  'q-ghosts-letter': [null, null, 'תִּמְצְאִי אֶת הָאוֹת:'],
  'q-door': ['מָה כָּתוּב עַל הַדֶּלֶת? תָּבִיאִי אֶת הַמַּפְתֵּחַ הַנָּכוֹן.', 'תִּקְרְאִי אֶת הַמִּלָּה, וְתִבְחֲרִי מַפְתֵּחַ.', null],
  'target-new': [null, 'עַכְשָׁו תִּתְפְּסִי אֶת:', null],
  'almost': [null, 'כִּמְעַט. תִּסְתַּכְּלִי עַל הַנְּקֻדָּה.', null],
  // the parent: תּוֹתָחִית and עָפָה had a wrong accent; reworded (2026-11-07)
  'streak': ['וָואוּ, אַתְּ /baˈʃvunɡ/.', 'אַתְּ אַלּוּפָה.', 'אֵין עָלַיִךְ.'],
  'ladder-top': ['הִגַּעְתְּ עַד לְמַעְלָה.', 'בָּנִית אֶת כָּל הַסֻּלָּם.', null],
  'crystal': [null, 'מָצָאת אֶבֶן קְסָמִים.', null],
  'new-best': [null, 'שָׁבַרְתְּ אֶת הַשִּׂיא שֶׁלָּךְ.'],
  'explain-lead': ['בּוֹאִי נִקְרָא לְאַט.'],
  'boss-arrive': [
    'הִנֵּה מִפְלֶצֶת. כְּדֵי לְנַצֵּחַ אוֹתָהּ, תִּתְפְּסִי אֶת מָה שֶׁאֲנִי אוֹמֵר:', 'מִפְלֶצֶת בַּשָּׁמַיִם. בּוֹאִי נְנַצֵּחַ אוֹתָהּ. תִּתְפְּסִי אֶת:',
    'אוֹי, הִגִּיעָה מִפְלֶצֶת. תִּתְפְּסִי אֶת מָה שֶׁאֲנִי אוֹמֵר:',
  ],
  // the voice says ־ְתְּ as the masculine, and the parent rejected the ט respelling ("Nitshat"): first person plural
  'boss-win': ['נִצַּחְנוּ אֶת הַמִּפְלֶצֶת.', 'וָואוּ, הַמִּפְלֶצֶת בָּרְחָה מִמֵּךְ.', 'אֵיזֶה כִּשּׁוּף. נִצַּחְנוּ אוֹתָהּ.'],
  'boss-new': ['נִצַּחְנוּ מִפְלֶצֶת חֲדָשָׁה. עַכְשָׁו הִיא עַל הַמַּדָּף שֶׁלָּךְ.'],
  // one duel: the hearts last the run and one comes back at the end of each pass (re-record both takes)
  'info-hearts': ['אֵלֶּה הַלְּבָבוֹת שֶׁלָּךְ. עַל כָּל טָעוּת הוֹלֵךְ לֵב אֶחָד, וְלֵב חוֹזֵר בְּסוֹף כָּל סִיבוּב.'],
  'info-stars': ['אֵלֶּה הַכּוֹכָבִים שֶׁאָסַפְתְּ בַּמִּשְׂחָק הַזֶּה. כָּל תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת כּוֹכָב.'],
  'info-coins': ['אֵלֶּה הַמַּטְבְּעוֹת שֶׁלָּךְ. אַתְּ מַרְוִיחָה אוֹתָם בִּתְשׁוּבוֹת נְכוֹנוֹת, וְקוֹנָה בָּהֶם שִׁקּוּי.'],
  'info-crystals': ['אֵלֶּה אַבְנֵי הַקְּסָמִים שֶׁלָּךְ. אַתְּ מוֹצֵאת אוֹתָן מֵאֲחוֹרֵי הַדֶּלֶת הָאַחֲרוֹנָה.'],
  'info-best': ['זֶה הַשִּׂיא שֶׁלָּךְ: הֲכִי הַרְבֵּה כּוֹכָבִים שֶׁאָסַפְתְּ בְּמִשְׂחָק אֶחָד.'],
  'info-bosses': ['אֵלֶּה הַמִּפְלָצוֹת שֶׁנִּצַּחְתְּ. הַמִּפְלָצוֹת הַחֲשׁוּכוֹת מְחַכּוֹת לָךְ בַּשָּׁמַיִם.'],
  'demo-broom': ['תִּגְרְרִי אֶת הַקּוֹסֶמֶת לְמַעְלָה וּלְמַטָּה, וְתִתְפְּסִי אֶת מָה שֶׁאֲנִי אוֹמֵר.'],
  'demo-broom-letter': ['תִּגְרְרִי אֶת הַקּוֹסֶמֶת לְמַעְלָה וּלְמַטָּה, וְתִתְפְּסִי אֶת הָאוֹת שֶׁאֲנִי אוֹמֵר.'],
  'demo-cauldron': ['תִּגְרְרִי לַסִּיר אֶת הַנִּקּוּד שֶׁחָסֵר לָאוֹת, לְפִי מָה שֶׁאֲנִי אוֹמֵר.'],
  'demo-ladder': ['תִּגְרְרִי לַסֻּלָּם אֶת מָה שֶׁאֲנִי אוֹמֵר, וְהַקּוֹסֶמֶת תְּטַפֵּס.'],
  'demo-ghosts-letter': ['תִּגְּעִי בְּרוּחַ הָרְפָאִים שֶׁמַּחֲזִיקָה אֶת הָאוֹת שֶׁאֲנִי אוֹמֵר.'],
  'demo-ghosts-syllable': ['תִּגְּעִי בְּרוּחַ הָרְפָאִים שֶׁמַּחֲזִיקָה אֶת מָה שֶׁאֲנִי אוֹמֵר.'],
  'demo-doors': ['תִּקְרְאִי מָה כָּתוּב עַל הַדֶּלֶת, וְתִגְרְרִי אֵלֶיהָ אֶת הַמַּפְתֵּחַ עִם הַתְּמוּנָה הַנְּכוֹנָה.'],
  'demo-draw': ['תִּסְתַּכְּלִי אֵיךְ כּוֹתְבִים אֶת הָאוֹת הָרִאשׁוֹנָה, וְאַחַר כָּךְ תִּכְתְּבִי אוֹתָהּ בְּעַצְמֵךְ.'],
  'q-draw': ['תִּכְתְּבִי אֶת הָאוֹת הָרִאשׁוֹנָה שֶׁל הַמִּלָּה:', null, null],
  'draw-again': ['בּוֹאִי נִכְתֹּב אֶת הַקַּו הַזֶּה שׁוּב.', null, 'תִּסְתַּכְּלִי עַל הַיָּד, וְתִכְתְּבִי אֶת הַקַּו שׁוּב.'],
  'line-small': ['בַּפַּעַם הַבָּאָה, תִּכְתְּבִי אוֹתָהּ גְּדוֹלָה יוֹתֵר.'],
  // the merchant: check the feminine forms by ear on his voice before mass recording (spec), reword where they fail
  'm-hello': [
    'שָׁלוֹם קוֹסֶמֶת. יֵשׁ לִי שִׁקּוּי שֶׁנּוֹתֵן לֵב בַּחֲזָרָה. תִּרְצִי לִקְנוֹת אֶחָד?',
    'מָה נִשְׁמָע קוֹסֶמֶת? הֵבֵאתִי שִׁקּוּי שֶׁנּוֹתֵן לֵב. תִּרְצִי אֶחָד?',
    'הַי קוֹסֶמֶת. יֵשׁ לִי שִׁקּוּי שֶׁמַּחֲזִיר לֵב. רוֹצָה לִקְנוֹת?',
  ],
  'm-offer': ['רוֹצָה שִׁקּוּי לֵב?'],
  // ־ְתְּ past forms are said as the masculine (rule): the girl's take 2 has a neutral wording
  'm-heart': ['עַכְשָׁו יֵשׁ לָךְ לֵב בַּחֲזָרָה.', 'הַלֵּב חָזַר אֵלַיִךְ.', 'הַלֵּב שֶׁלָּךְ חָזַר.'],
  'm-again': ['נוּ, תִּרְצִי לִקְנוֹת אֶחָד?', null],
  'm-bye': ['בְּסֵדֶר. לְהִתְרָאוֹת קוֹסֶמֶת.', null],
  'm-give': ['תְּנִי לִי מַטְבְּעוֹת, לְפִי הַמְּחִיר.'],
  'm-tap': ['וְאָז גְּעִי בַּשִּׁקּוּי.'],
  'm-decline': ['לֹא צָרִיךְ? גְּעִי כָּאן.'],
  // the voice said קְחִי "kechi" (the parent 2026-11-12): a neutral wording for a girl
  'm-undo': ['אֶפְשָׁר לָקַחַת מַטְבֵּעַ בַּחֲזָרָה.'],
  'm-empty': [null, 'קֹדֶם תְּנִי לִי מַטְבְּעוֹת.'],
}
for (const l of LINES) if (FE[l.id]) l.fe = FE[l.id].map((t) => (t === null ? null : t.normalize('NFC')))

export const lineAudioId = (id: string, n: number) => `${id}-${n}`
/** voice ids (`<id>-<n>`) that have a feminine take `<id>-<n>-f` */
export const FEMININE_IDS: ReadonlySet<string> = new Set(LINES.flatMap((l) => (l.fe ?? []).flatMap((t, i) => (t ? [lineAudioId(l.id, i + 1)] : []))))
export const lineById = (id: string) => LINES.find((l) => l.id === id)
