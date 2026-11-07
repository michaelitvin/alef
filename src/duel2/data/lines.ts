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
}

const line = (id: string, where: string, he: string[], stability = 0.5, tag?: string): LineDef => ({
  id, where, he: he.map((t) => t.normalize('NFC')), variations: he.length, stability, ...(tag ? { tag } : {}),
})

export const VOICE = { id: 'bIHbv24MWmeRgasZH58o', model: 'eleven_v4', lang: 'he' } as const

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
  line('potion-intro', 'The rescue potion, the first time it floats by (the flight goes on)', ['שִׁקּוּי קֶסֶם. אִם תִּתְפֹּס אוֹתוֹ, תְּקַבֵּל לֵב.'], 0.5, 'warmly'),
  // a tap on what he collects says what it is (the parent); one take each: it answers his own tap
  line('info-hearts', 'A tap on the hearts', ['אֵלֶּה הַלְּבָבוֹת שֶׁלְּךָ. עַל כָּל טָעוּת הוֹלֵךְ לֵב אֶחָד, וּבְכָל מָסָךְ חָדָשׁ הֵם חוֹזְרִים.']),
  line('info-stars', 'A tap on the stars of this run', ['אֵלֶּה הַכּוֹכָבִים שֶׁאָסַפְתָּ בַּמִּשְׂחָק הַזֶּה. כָּל תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת כּוֹכָב.']),
  line('info-coins', 'A tap on his coins', ['אֵלֶּה הַמַּטְבְּעוֹת שֶׁלְּךָ. עַל כָּל עֲשָׂרָה כּוֹכָבִים אַתָּה מְקַבֵּל מַטְבֵּעַ.']),
  line('info-crystals', 'A tap on his crystals', ['אֵלֶּה אַבְנֵי הַקְּסָמִים שֶׁלְּךָ. אַתָּה מוֹצֵא אוֹתָן מֵאֲחוֹרֵי הַדֶּלֶת הָאַחֲרוֹנָה.']),
  line('info-best', 'A tap on his best run', ['זֶה הַשִּׂיא שֶׁלְּךָ: הֲכִי הַרְבֵּה כּוֹכָבִים שֶׁאָסַפְתָּ בְּמִשְׂחָק אֶחָד.']),
  line('info-bosses', 'A tap on the boss trophies (cover, end screen)', ['אֵלֶּה הַמִּפְלָצוֹת שֶׁנִּצַּחְתָּ. הַמִּפְלָצוֹת הַחֲשׁוּכוֹת מְחַכּוֹת לְךָ בַּשָּׁמַיִם.']),
  line('info-coin-ring', 'A tap on the ring around the coin (end screen)', ['כְּשֶׁהָעִגּוּל מִתְמַלֵּא, אַתָּה מְקַבֵּל מַטְבֵּעַ חָדָשׁ.']),
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
  line('line-small', 'Drawing: the letter is much too small (it still counts)', ['הָאוֹת יָצְאָה קְטַנָּה מִדַּי.'], 0.5, 'warmly'),
]

export const lineAudioId = (id: string, n: number) => `${id}-${n}`
export const lineById = (id: string) => LINES.find((l) => l.id === id)
