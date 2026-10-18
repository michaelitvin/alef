// Everything the cuckoo narrator and the customers say, except the time phrases (src/clock/logic/phrases.ts).
// {cue} before a word fires an animation as that word is spoken (rule: things glow when the voice names them).
// Spelling: check every Hebrew word's nikkud in a dictionary before generating (rule). Loaded by plain Node.
import type { Lang } from '../logic/phrases.ts'
import type { Exercise } from '../logic/types.ts'

export type Cue =
  | 'short' | 'long' | 'seconds' | 'half' | 'quarterRight' | 'quarterLeft' | 'ring' | 'fives' | 'quarters'
  | 'digital' | 'finger' | 'creep' | 'past' | 'to' | 'check'

export interface LineDef {
  id: string
  /** where it plays in the game (shown on the review page) */
  where: string
  he: string
  en: string
  /** ElevenLabs v4 audio tag, e.g. "excited" (needs stability 0) */
  tag?: string
  /** 0 Creative (dramatic), 0.5 Natural (calm), 1 Robust (short) */
  stability: number
  /** the clock the explanation shows, as a time id */
  example?: string
}

export const LINES: LineDef[] = [
  // "סדנה" kept the wrong stress in every spelling, so the line avoids the word (rule: change the wording)
  { id: 'welcome', where: 'First launch, on the workshop door', stability: 0.5, tag: 'warmly',
    he: 'בָּרוּךְ הַבָּא לַחֲנוּת הַשְּׁעוֹנִים. אַתָּה הַשָּׁעָן.', en: 'Welcome to the clock shop. You are the clockmaker.' },
  { id: 'exp-hands', where: 'Explanation: the first round ever', stability: 0.5, example: '3-00',
    he: 'לַשָּׁעוֹן יֵשׁ שְׁנֵי מְחוֹגִים. הַמָּחוֹג {short}הַקָּצָר מַרְאֶה אֶת הַשָּׁעָה. הַמָּחוֹג {long}הָאָרוֹךְ מַרְאֶה אֶת הַדַּקּוֹת.',
    en: 'The clock has two hands. The {short}short hand shows the hour. The {long}long hand shows the minutes.' },
  { id: 'exp-level-2', where: 'Explanation: first half past (level 2)', stability: 0.5, example: '3-30',
    he: 'שָׁלוֹשׁ וָחֵצִי: הַמָּחוֹג הָאָרוֹךְ עָשָׂה {half}חֲצִי סִיבוּב.', en: 'Half past three: the long hand has gone {half}half way round.' },
  { id: 'exp-level-3', where: 'Explanation: first quarter past (level 3)', stability: 0.5, example: '3-15',
    he: 'שָׁלוֹשׁ וָרֶבַע: הַמָּחוֹג הָאָרוֹךְ עָשָׂה {quarterRight}רֶבַע סִיבוּב.', en: 'Quarter past three: the long hand has gone a {quarterRight}quarter of the way round.' },
  { id: 'exp-level-4', where: 'Explanation: first quarter to (level 4)', stability: 0.5, example: '3-45',
    he: 'רֶבַע לְאַרְבַּע: עוֹד {quarterLeft}רֶבַע סִיבוּב, וְיִהְיֶה אַרְבַּע.', en: 'Quarter to four: one more {quarterLeft}quarter of the way round, and it will be four o\'clock.' },
  { id: 'exp-level-5', where: 'Explanation: first five-minute step, past side (level 5)', stability: 0.5, example: '3-20',
    he: 'כָּל מִסְפָּר עַל הַשָּׁעוֹן הוּא {ring}חָמֵשׁ דַּקּוֹת. {fives}חָמֵשׁ, עֶשֶׂר, חֲמֵשׁ־עֶשְׂרֵה, עֶשְׂרִים.',
    en: 'Each number on the clock is {ring}five minutes. {fives}Five, ten, fifteen, twenty.' },
  { id: 'exp-level-6', where: 'Explanation: first five-minute step, to side (level 6)', stability: 0.5, example: '3-50',
    he: 'בַּצַּד {to}הַשֵּׁנִי סוֹפְרִים כַּמָּה דַּקּוֹת חֲסֵרוֹת לַשָּׁעָה הַבָּאָה. עֲשָׂרָה לְאַרְבַּע.',
    en: 'On the {to}other side, we count the minutes left to the next hour. Ten to four.' },
  { id: 'exp-nonumbers', where: 'Explanation: first clock with no numbers (level 6–7)', stability: 0.5, example: '3-00',
    he: 'גַּם בְּלִי מִסְפָּרִים: {quarters}לְמַעְלָה שְׁתֵּים־עֶשְׂרֵה, בַּצַּד שָׁלוֹשׁ, לְמַטָּה שֵׁשׁ, וּבַצַּד הַשֵּׁנִי תֵּשַׁע.',
    en: 'Even with no numbers: {quarters}twelve is at the top, three on the side, six at the bottom, and nine on the other side.' },
  { id: 'exp-ex-find', where: 'Explanation: first Find the clock round', stability: 0.5,
    he: 'תַּקְשִׁיב לַשָּׁעָה, וְתִבְחַר אֶת הַשָּׁעוֹן הַנָּכוֹן.', en: 'Listen to the time, and pick the right clock.' },
  { id: 'exp-ex-what', where: 'Explanation: first What time is it round', stability: 0.5,
    he: 'מָה הַשָּׁעָה? תַּקְשִׁיב לַתְּשׁוּבוֹת, וְתִבְחַר אֶת הַנְּכוֹנָה.', en: 'What time is it? Listen to the answers, and pick the right one.' },
  { id: 'exp-ex-set', where: 'Explanation: first Set the clock round (animated finger)', stability: 0.5,
    he: 'תָּזִיז אֶת הַמָּחוֹג {finger}עִם הָאֶצְבַּע, וְאַחַר כָּךְ תִּלְחַץ {check}עַל הַוִּי.',
    en: 'Move the hand {finger}with your finger. Then tap the {check}check mark.' },
  // no example time: it shows the round's own time (QA 2026-10-15: 3:45 showed on level 2, before quarter to is learned)
  { id: 'exp-ex-digital', where: 'Explanation: first digital clock card', stability: 0.5,
    he: 'זֶה שָׁעוֹן {digital}דִּיגִיטָלִי. הוּא מַרְאֶה אֶת אוֹתָהּ שָׁעָה בְּמִסְפָּרִים.', en: 'This is a {digital}digital clock. It shows the same time in numbers.' },
  { id: 'exp-seconds', where: 'Explanation: first seconds hand, and after mistakes with it', stability: 0.5, example: '3-00',
    he: 'הַמָּחוֹג {seconds}הַדַּק וְהַמָּהִיר סוֹפֵר שְׁנִיּוֹת. כְּדֵי לָדַעַת מָה הַשָּׁעָה, תִּסְתַּכֵּל עַל {short}שְׁנֵי {long}הָאֲחֵרִים.',
    en: 'The {seconds}thin, fast hand counts seconds. To tell the time, look at the {short}other {long}two.' },
  { id: 'exp-fix-swap', where: 'After repeated mistakes: swapped hands', stability: 0.5, example: '3-00',
    he: 'הַמָּחוֹג {short}הַקָּצָר הוּא הַשָּׁעָה. {long}הָאָרוֹךְ הוּא הַדַּקּוֹת.', en: 'The {short}short hand is the hour. The {long}long one is the minutes.' },
  { id: 'exp-fix-notAdvanced', where: 'After repeated mistakes: short hand not moved on', stability: 0.5, example: '3-45',
    he: 'הַמָּחוֹג הַקָּצָר {creep}זָז לְאַט לְאַט לַמִּסְפָּר הַבָּא. כְּשֶׁהוּא בֵּין שָׁלוֹשׁ לְאַרְבַּע, הַשָּׁעָה הִיא שָׁלוֹשׁ, לֹא אַרְבַּע.',
    en: 'The short hand {creep}moves slowly towards the next number. When it is between three and four, it is still three.' },
  { id: 'exp-fix-mirror', where: 'After repeated mistakes: past and to swapped', stability: 0.5, example: '3-15',
    he: 'אַחֲרֵי הַשָּׁעָה, הַמָּחוֹג {past}בַּצַּד הַזֶּה: שָׁלוֹשׁ וָרֶבַע. לִפְנֵי הַשָּׁעָה הַבָּאָה, הוּא {to}בַּצַּד הַזֶּה: רֶבַע לְאַרְבַּע.',
    en: 'Past the hour, the long hand is {past}on this side: quarter past three. Before the next hour, it is {to}on this side: quarter to four.' },
  { id: 'exp-fix-numberAsMin', where: 'After repeated mistakes: the number read as minutes', stability: 0.5, example: '3-20',
    he: 'כְּשֶׁהַמָּחוֹג הָאָרוֹךְ עַל אַרְבַּע, סוֹפְרִים בְּחָמֵשׁ: {fives}חָמֵשׁ, עֶשֶׂר, חֲמֵשׁ־עֶשְׂרֵה, עֶשְׂרִים.',
    en: 'When the long hand is on the four, count by fives: {fives}five, ten, fifteen, twenty.' },
  { id: 'exp-fix-hour1', where: 'After repeated mistakes: the hour off by one', stability: 0.5,
    he: 'תִּסְתַּכֵּל טוֹב עַל הַמָּחוֹג {short}הַקָּצָר.', en: 'Look closely at the {short}short hand.' },
  { id: 'exp-fix-five', where: 'After repeated mistakes: five minutes off', stability: 0.5, example: '3-20',
    he: 'תִּסְפֹּר בְּחָמֵשׁ: {fives}חָמֵשׁ, עֶשֶׂר, חֲמֵשׁ־עֶשְׂרֵה, עֶשְׂרִים.', en: 'Count by fives: {fives}five, ten, fifteen, twenty.' },
  { id: 'fb-almost', where: 'Set the clock: five minutes off, first time (he tries again)', stability: 0.5, tag: 'encouraging',
    he: 'כִּמְעַט.', en: 'Almost.' },
  { id: 'fb-cheer-1', where: 'Correct answer (rotates)', stability: 0, tag: 'happy', he: 'יֹפִי.', en: 'Great.' },
  { id: 'fb-cheer-2', where: 'Correct answer (rotates)', stability: 0, tag: 'happy', he: 'מְעֻלֶּה.', en: 'Well done.' },
  { id: 'fb-cheer-3', where: 'Correct answer (rotates)', stability: 0, tag: 'happy', he: 'בְּדִיּוּק.', en: 'Exactly right.' },
  { id: 'fb-streak', where: 'Ten correct in a row (all wall clocks chime)', stability: 0, tag: 'excited',
    he: 'וָאוּ, עֶשֶׂר בְּרֶצֶף.', en: 'Wow, ten in a row.' },
  { id: 'fb-levelup', where: 'Level passed: a cheer, with a burst and a fanfare', stability: 0, tag: 'excited',
    he: 'כָּל הַכָּבוֹד, לָמַדְתָּ מַשֶּׁהוּ חָדָשׁ.', en: 'Well done, you learned something new.' },
  { id: 'fb-master', where: 'Level 7 reached, the last level: after the new clock', stability: 0, tag: 'excited',
    he: 'וָאוּ, עַכְשָׁיו אַתָּה שָׁעָן אֲמִיתִּי.', en: 'Wow, now you are a real clockmaker.' },
  { id: 'bonus-intro', where: 'Bonus game, first time only', stability: 0.5, tag: 'playfully',
    he: 'תַּעֲצֹר אֶת הַמָּחוֹג עַל הַשְּׁתֵּים־עֶשְׂרֵה.', en: 'Stop the hand on the twelve.' },
  { id: 'day-end', where: 'End of the workday, on the summary', stability: 0, tag: 'happy',
    he: 'כָּל הַכָּבוֹד, סִיַּמְתָּ יוֹם עֲבוֹדָה.', en: 'What a great day at work.' },
  // the question of each round (the playtest: "my clock is broken", then a list of times, made no sense). It comes
  // before the phrase or the answers; not after the exercise's own first-time explanation, which asks it already
  { id: 'ask-find', where: 'Find the clock: before the time is read, every round', stability: 0.5,
    he: 'אֵיזֶה שָׁעוֹן מַרְאֶה...', en: 'Which clock shows...' },
  { id: 'ask-what', where: 'What time is it: before the answers are read, every round', stability: 0.5,
    he: 'מָה הַשָּׁעָה בַּשָּׁעוֹן?', en: 'What time does the clock show?' },
  { id: 'ask-set', where: 'Set the clock: before the time is read, every round', stability: 0.5,
    he: 'תְּסַדֵּר אֶת הַשָּׁעוֹן שֶׁיַּרְאֶה...', en: 'Set the clock to...' },
  { id: 'ask-digitalPick', where: 'Clock to digital: the question, every round', stability: 0.5,
    he: 'אֵיזֶה שָׁעוֹן דִּיגִיטָלִי מַרְאֶה אֶת אוֹתָהּ שָׁעָה?', en: 'Which digital clock shows the same time?' },
  { id: 'ask-digitalSet', where: 'Digital to clock: the question, every round', stability: 0.5,
    he: 'תְּסַדֵּר אֶת הַשָּׁעוֹן שֶׁיַּרְאֶה אֶת אוֹתָהּ שָׁעָה.', en: 'Set the clock to the same time.' },
  { id: 'ask-now', where: 'First customer of the day: the real time on the clock', stability: 0.5, tag: 'curious',
    he: 'מָה הַשָּׁעָה עַכְשָׁיו?', en: 'What time is it now?' },
]

const BY_ID = new Map(LINES.map((l) => [l.id, l]))
export const lineById = (id: string) => BY_ID.get(id)

/** Splits a line into caption words and cues; `spoken` is the text without cue marks. */
export function parseLine(text: string): { words: string[]; cues: { word: number; cue: Cue }[]; spoken: string } {
  const words: string[] = []
  const cues: { word: number; cue: Cue }[] = []
  for (const tok of text.split(/\s+/).filter(Boolean)) {
    const m = /^\{(\w+)\}(.*)$/.exec(tok)
    if (m) {
      cues.push({ word: words.length, cue: m[1] as Cue })
      words.push(m[2])
    } else words.push(tok)
  }
  return { words, cues, spoken: words.join(' ') }
}

export const lineAudioId = (id: string, lang: Lang) => `${id}-${lang}`

/**
 * What a customer asks for as he comes in: it matches the round's task, so the story leads into the question (the parent
 * 2026-10-16: "my clock is broken" followed by "which clock shows three?" had no connection). 'now' = the real-time
 * question of the day.
 */
export type Request = 'set' | 'what' | 'find' | 'digitalPick' | 'digitalSet' | 'now'
export const requestFor = (exercise: Exercise, real: boolean): Request =>
  real ? 'now' : exercise === 'setShort' || exercise === 'setLong' || exercise === 'setBoth' ? 'set' : exercise
/** These requests are the question itself, so the narrator does not ask it again. */
export const REQUEST_ASKS: Request[] = ['what', 'digitalPick', 'now']

/**
 * What each customer says (in its own voice; no caption). Several variations of each request (the parent 2026-10-16:
 * one hello was too repetitive). Each names the clock: the customer's clock is not on the bench yet, so "this" points at
 * nothing. No first-person verb that shows gender (the customers are boys and girls): "בָּאתִי", not "אֲנִי רוֹצֶה".
 */
export const CUSTOMER_LINES: Record<Lang, { ask: Record<Request, string[]>; thanks: string }> = {
  he: {
    ask: {
      set: [
        'שָׁלוֹם, הַשָּׁעוֹן שֶׁלִּי הִתְקַלְקֵל.',
        'תּוּכַל לְסַדֵּר לִי אֶת הַשָּׁעוֹן?',
        'שָׁלוֹם! הַשָּׁעוֹן שֶׁלִּי מַרְאֶה שָׁעָה לֹא נְכוֹנָה.',
        'אוֹי, הַשָּׁעוֹן שֶׁלִּי מְבוּלְבָּל לְגַמְרֵי.',
        'תַּעֲזוֹר לִי עִם הַשָּׁעוֹן?',
      ],
      what: [
        'מָה הַשָּׁעָה בַּשָּׁעוֹן שֶׁלִּי?',
        'שָׁכַחְתִּי אֶת הַמִּשְׁקָפַיִים. מָה הַשָּׁעָה בַּשָּׁעוֹן שֶׁלִּי?',
        'תַּגִּיד לִי, מָה הַשָּׁעָה בַּשָּׁעוֹן שֶׁלִּי?',
      ],
      find: [
        'שָׁלוֹם! בָּאתִי לָקַחַת אֶת הַשָּׁעוֹן שֶׁלִּי.',
        'שָׁלוֹם! אֵיפֹה הַשָּׁעוֹן שֶׁלִּי?',
      ],
      digitalPick: [
        'אֵיזֶה שָׁעוֹן דִּיגִיטָלִי מַרְאֶה כְּמוֹ הַשָּׁעוֹן שֶׁלִּי?',
        'תִּמְצָא לִי שָׁעוֹן דִּיגִיטָלִי שֶׁמַּרְאֶה כְּמוֹ הַשָּׁעוֹן שֶׁלִּי?',
      ],
      digitalSet: [
        'תְּסַדֵּר לִי אֶת הַשָּׁעוֹן כְּמוֹ הַשָּׁעוֹן הַדִּיגִיטָלִי?',
        'הַשָּׁעוֹן הַדִּיגִיטָלִי שֶׁלִּי צוֹדֵק, וְהַשָּׁעוֹן הַשֵּׁנִי טוֹעֶה.',
      ],
      now: ['סְלִיחָה, מָה הַשָּׁעָה עַכְשָׁיו?'],
    },
    thanks: 'תּוֹדָה רַבָּה.',
  },
  en: {
    ask: {
      set: [
        'Hello. My clock is broken.',
        'Can you fix my clock, please?',
        'Hello! My clock shows the wrong time.',
        'Hi, clockmaker! My clock is all mixed up.',
        'Could you help me with my clock?',
      ],
      what: [
        'What time does my clock show?',
        'I forgot my glasses. What time does my clock show?',
        'Can you tell me what time my clock shows?',
      ],
      find: [
        'Hello! I came to pick up my clock.',
        'Hello! Where is my clock?',
      ],
      digitalPick: [
        'Which digital clock matches my clock?',
        'Can you find me a digital clock that shows the same as mine?',
      ],
      digitalSet: [
        'Can you set my clock like my digital clock?',
        'My digital clock is right, but my other clock is wrong.',
      ],
      now: ['Excuse me, what time is it now?'],
    },
    thanks: 'Thank you so much.',
  },
}
/** The voice file of a customer line. The set requests keep the ids they had as hellos (cust-bear-hello, -hello-2, ...). */
export const customerAudioId = (customer: string, what: Request | 'thanks', variant = 0) =>
  what === 'thanks' ? `cust-${customer}-thanks`
    : what === 'set' ? `cust-${customer}-hello${variant > 0 ? `-${variant + 1}` : ''}`
      : `cust-${customer}-${what}-${variant + 1}`
