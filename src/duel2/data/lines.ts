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

export const LINES: LineDef[] = [
  line('q-broom', 'Broom flight (syllables): the question before the target sound', [
    'תִּתְפֹּס אֶת מָה שֶׁתִּשְׁמַע.', 'תָּעוּף אֶל מָה שֶׁתִּשְׁמַע.', 'תַּקְשִׁיב טוֹב, וְתִתְפֹּס אֶת מָה שֶׁתִּשְׁמַע.',
  ], 0.5, 'playful'),
  line('q-broom-letter', 'Broom flight (letters): the question before the letter name', [
    'תִּתְפֹּס אֶת הָאוֹת שֶׁתִּשְׁמַע.', 'תָּעוּף אֶל הָאוֹת שֶׁתִּשְׁמַע.', 'אֵיזוֹ אוֹת? תַּקְשִׁיב, וְתִתְפֹּס אוֹתָהּ.',
  ], 0.5, 'playful'),
  line('q-cauldron', 'Cauldron: the question before the syllable', [
    'תַּקְשִׁיב, וְתִזְרֹק לַסִּיר אֶת הַנִּקּוּד הַנָּכוֹן.', 'אֵיזֶה נִקּוּד חָסֵר? תִּזְרֹק אוֹתוֹ לַסִּיר.', 'מָה צָרִיךְ לְהוֹסִיף לָאוֹת? תַּקְשִׁיב.',
  ], 0.5, 'warmly'),
  line('q-ladder', 'Ladder: the question before the syllable of the next rung', [
    'תִּבְחַר אֶת מָה שֶׁתִּשְׁמַע, וְתַעֲלֶה שָׁלָב.', 'עוֹד שָׁלָב בַּסֻּלָּם. מָה שׁוֹמְעִים?', 'תַּקְשִׁיב, וְתִבְנֶה עוֹד שָׁלָב.',
  ], 0.5, 'warmly'),
  line('q-ghosts', 'Ghosts: the question before the letter name or syllable', [
    'אֵיזוֹ רוּחַ מַחֲזִיקָה אֶת מָה שֶׁתִּשְׁמַע?', 'אֵיזוֹ רוּחַ? תַּקְשִׁיב טוֹב.', 'מִי מֵהָרוּחוֹת מַחֲזִיקָה אֶת מָה שֶׁתִּשְׁמַע?',
  ], 0.5, 'playful'),
  line('q-door', 'Door: the question; it never says the word (he reads it)', [
    'אֵיזוֹ תְּמוּנָה הִיא הַמִּלָּה שֶׁעַל הַשַּׁעַר?', 'תִּקְרָא אֶת הַמִּלָּה, וְתִבְחַר אֶת הַמַּפְתֵּחַ.', 'מָה כָּתוּב עַל הַשַּׁעַר? תִּבְחַר מַפְתֵּחַ.',
  ], 0.5, 'warmly'),
  line('target-new', 'Broom flight: a new target (then the new sound)', [
    'עַכְשָׁו תִּתְפֹּס מַשֶּׁהוּ חָדָשׁ.', 'מְחַפְּשִׂים מַשֶּׁהוּ חָדָשׁ.', 'שִׁנּוּי, תַּקְשִׁיב לַחָדָשׁ.',
  ], 0.5, 'playful'),
  line('almost', 'Near miss: the other form of a dotted letter (encouraging)', [
    'כִּמְעַט.', 'כִּמְעַט, תִּסְתַּכֵּל עַל הַנְּקֻדָּה.', 'קָרוֹב מְאוֹד.',
  ], 0.5, 'encouraging'),
  line('streak', 'A streak of right answers', ['וָואוּ, אַתָּה /baˈʃvunɡ/.', 'אֵיזֶה רֶצֶף.', 'אַתָּה פָּשׁוּט עָף.'], 0, 'excited'),
  line('ladder-top', 'The ladder is built to the top', ['הִגַּעְתָּ עַד לְמַעְלָה.', 'כָּל הַסֻּלָּם, כָּל הַכָּבוֹד.', 'וָואוּ, עַד הַשָּׁמַיִם.'], 0, 'excited'),
  line('crystal', 'The crystal behind the last door', ['וָואוּ, גָּבִישׁ קָסוּם.', 'מָצָאתָ גָּבִישׁ.', 'אֵיזֶה גָּבִישׁ נוֹצֵץ.'], 0, 'amazed'),
  line('run-end', 'The run ends (no hearts left): neither praise for a loss nor disappointed', [
    'נִגְמְרוּ הַלְּבָבוֹת. נְשַׂחֵק שׁוּב?', 'זֶהוּ לְהַפַּעַם. עוֹד סִבּוּב?', 'הַקְּסָמִים נָחִים. נְנַסֶּה שׁוּב?',
  ], 0.5, 'warmly'),
  line('new-best', 'Summary: a new best run', ['שִׂיא חָדָשׁ.', 'זֶה הַשִּׂיא שֶׁלְּךָ.'], 0, 'excited'),
  line('dot-intro', 'First time a dotted pair comes up: before the two sounds', ['נְקֻדָּה אַחַת מְשַׁנָּה אֶת הַצְּלִיל.'], 0.5, 'warmly'),
  line('explain-lead', 'Explanation after a mistake: before letter name, vowel name, syllable', ['בּוֹא נִקְרָא לְאַט.'], 0.5, 'warmly'),
  line('demo-broom', 'Demo: first broom flight with syllables', ['הַקּוֹסֵם עָף. תִּגְרֹר אוֹתוֹ לְמַעְלָה וּלְמַטָּה, וְתִתְפֹּס אֶת מָה שֶׁתִּשְׁמַע.']),
  line('demo-broom-letter', 'Demo: first broom flight with letters', ['הַקּוֹסֵם עָף. תִּגְרֹר אוֹתוֹ לְמַעְלָה וּלְמַטָּה, וְתִתְפֹּס אֶת הָאוֹת שֶׁתִּשְׁמַע.']),
  line('demo-cauldron', 'Demo: first cauldron', ['תִּגְרֹר אֶת הַנִּקּוּד הַנָּכוֹן לַסִּיר, וְהוּא יִתְחַבֵּר לָאוֹת.']),
  line('demo-ladder', 'Demo: first ladder', ['כָּל תְּשׁוּבָה נְכוֹנָה בּוֹנָה שָׁלָב, וְהַקּוֹסֵם עוֹלֶה.']),
  line('demo-ghosts-letter', 'Demo: first letter ghosts', ['כָּל רוּחַ מַחֲזִיקָה אוֹת. תִּבְחַר אֶת הָאוֹת שֶׁתִּשְׁמַע.']),
  line('demo-ghosts-syllable', 'Demo: first syllable ghosts', ['כָּל רוּחַ מַחֲזִיקָה שֶׁלֶט. תִּבְחַר אֶת מָה שֶׁתִּשְׁמַע.']),
  line('demo-doors', 'Demo: first door', ['תִּקְרָא אֶת הַמִּלָּה שֶׁעַל הַשַּׁעַר, וְתִבְחַר אֶת הַמַּפְתֵּחַ עִם הַתְּמוּנָה שֶׁלָּהּ.']),
]

export const lineAudioId = (id: string, n: number) => `${id}-${n}`
export const lineById = (id: string) => LINES.find((l) => l.id === id)
