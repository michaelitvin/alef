// The English voice lines: what an adult says to a child in natural American English at each moment (asset plan 3.5).
// One for one with Spell Quest's lines where the run shares the line: same id, same number of variations, so the policies and
// the controller name them as before. No "!" (it makes the voice shout); a line that a sound follows ends with ":" (no
// "…": the voice moaned). No girl forms: a girl is a "wizard" too. Every line is voiced by Puck except the merchant's.
// Loaded by plain Node too: erasable TS only.

export type LineKind = 'I' | 'D' | 'M'

export interface EnLine {
  id: string
  /** where it plays (shown on the review page) */
  where: string
  /** one text per variation; files `<id>-<n>` with n from 1 */
  en: string[]
  variations: number
  /** I = instruction or content, D = dramatic, M = the merchant */
  kind: LineKind
  /** the bracket at the start of the TTS request; it is not read aloud */
  direction: string
  voice?: 'merchant'
}

const KID = ', to a 7-year-old]'
const WARM = '[warmly' + KID
const PLAY = '[playfully' + KID
const EXCITED = '[excited' + KID
const AMAZED = '[amazed' + KID
const ENCOURAGE = '[encouragingly' + KID
const TRADER = '[playful, a friendly market trader]'

const line = (id: string, where: string, kind: LineKind, direction: string, en: string[]): EnLine => ({
  id, where, en, variations: en.length, kind, direction, ...(kind === 'M' ? { voice: 'merchant' as const } : {}),
})
const m = (id: string, where: string, en: string[]) => line(id, where, 'M', TRADER, en)

export const EN_LINES: EnLine[] = [
  // ---- from Spell Quest's lines (74 texts)
  line('q-cauldron', 'Cauldron, when he waits; then the word', 'I', WARM, ['Which sound is missing from:', 'Put the missing sound in the pot to make:', "What's missing to make:"]),
  line('q-ladder', 'Ladder, when he waits; then the word', 'I', WARM, ['Find the letter that makes:', 'Drag the letter up the ladder to make:', 'Which letter makes:']),
  line('q-ghosts', 'Ghosts (words), when he waits; then the word', 'I', PLAY, ['Where is:', 'Which ghost has:', 'Find:']),
  line('q-ghosts-sound', 'Ghosts (letters, by sound), when he waits; then the sound', 'I', PLAY, ['Which ghost has the sound:', 'Find the sound:', "Where's the letter that says:"]),
  line('q-door', 'Door, when he waits; never says the word', 'I', WARM, ['What does the door say? Bring the right key.', 'Read the word, and pick a key.', 'Which key opens the door?']),
  line('target-new', 'Broom: a new target; the ladder: before each new word after the first rung; then it', 'I', PLAY, ['And now:', 'Now catch:', 'Now something new:']),
  line('almost', 'A near miss, forgiven (encouraging)', 'I', ENCOURAGE, ['Almost.', 'So close. Look again.', 'Really close.']),
  line('streak', 'A streak', 'D', EXCITED, ["Wow, you're on fire.", "You're unstoppable.", "You're really flying through these."]),
  line('ladder-top', 'The ladder is built to the top', 'D', EXCITED, ['You made it to the top.', 'You built the whole ladder.', 'Wow, all the way to the sky.']),
  line('crystal', 'The crystal behind the last door', 'D', AMAZED, ['Wow, a magic crystal.', 'You found a magic crystal.', 'What a sparkly crystal.']),
  line('run-end', 'Out of hearts (no praise, not sad)', 'I', WARM, ['Out of hearts. Play again?', "That's it for this time. Want to play again?", 'The round is over. One more?']),
  line('defeat', 'The dizzy wizard falls', 'I', PLAY, ['Oops, they won this time.', 'Oh no, the magic ran out this time.']),
  line('new-best', 'Summary: a new best', 'D', EXCITED, ['A new record.', 'You beat your record.']),
  line('explain-lead', 'After a mistake, before the slow word', 'I', WARM, ["Let's read it slowly."]),
  line('boss-arrive', 'A flight boss; then the first target', 'D', EXCITED, ["Here comes a monster. To beat it, catch what I say:", "A monster in the sky. Let's beat it. Catch:", "Oh, a monster's here. Catch what I say:"]),
  line('boss-win', 'The boss is beaten', 'D', EXCITED, ['You beat the monster.', 'Wow, you scared the monster away.', 'What a spell. You beat it.']),
  line('boss-new', 'First win against a kind of boss', 'D', AMAZED, ["You beat a new monster. Now it's on your shelf."]),
  line('mult-up', 'The multiplier rises (take 1 x2, take 2 x3)', 'D', EXCITED, ['Now every right answer gives you twice as many coins.', 'Now every right answer gives you three times as many coins.']),
  line('info-hearts', 'A tap on the hearts', 'I', WARM, ['These are your hearts. Each mistake takes one away, and you get one back at the end of each round.']),
  line('info-stars', 'A tap on the stars', 'I', WARM, ['These are the stars from this game. Every right answer gives you a star.']),
  line('info-coins', 'A tap on the coins', 'I', WARM, ['These are your coins. You get them for right answers, and you can buy potions with them.']),
  line('info-crystals', 'A tap on the crystals', 'I', WARM, ['These are your magic crystals. You find them behind the last door.']),
  line('info-best', 'A tap on the best', 'I', WARM, ['This is your record: the most stars you got in one game.']),
  line('info-bosses', 'A tap on the boss trophies', 'I', WARM, ['These are the monsters you beat. The dark ones are waiting for you in the sky.']),
  line('info-mult', 'A tap on the multiplier beside the coins', 'I', WARM, ['Right answers in a row give more coins. When you lose a heart, the streak ends.']),
  line('demo-broom', 'First broom with words', 'I', WARM, ['Move the wizard up and down, and catch the word I say.']),
  line('demo-broom-sound', 'First broom with sounds', 'I', WARM, ['Move the wizard up and down, and catch the sound I say.']),
  line('demo-cauldron', 'First cauldron', 'I', WARM, ['Drag the missing letter into the pot, to make the word I say.']),
  line('demo-ladder', 'First ladder (Hebrew course only: the English ladder uses demo-ladder-look and q-ladder)', 'I', WARM, ['Drag up the letter that makes the word I say, and the wizard climbs.']),
  line('demo-ladder-look', 'First ladder, beat 1: the foot rung glows; then the foot word', 'I', WARM, ['This word is:']),
  line('demo-ghosts-sound', 'First letter ghosts', 'I', WARM, ['Touch the ghost that has the sound I say.']),
  line('demo-ghosts-word', 'First word ghosts', 'I', WARM, ['Touch the ghost that has the word I say.']),
  line('demo-doors', 'First door', 'I', WARM, ['Read what the door says, and drag the key with the right picture to it.']),
  line('demo-draw', 'Drawing, first visit, while the hand writes', 'I', WARM, ['Watch how to write the first sound. Then you write it.']),
  line('q-draw', 'Drawing, when he waits; then the word', 'I', WARM, ['Write the first sound of:', 'How does it start? Write the first letter of:', "Let's write the start of:"]),
  line('draw-again', 'A wrong stroke; the hand shows it again', 'I', ENCOURAGE, ["Let's write that line again.", "Let's try that line one more time.", 'Watch the hand, and write the line again.']),
  line('draw-dot', 'The letter is done; now its dot (i, j)', 'I', WARM, ['Now the dot.']),
  line('draw-cross', 'Now its cross line (t, f)', 'I', WARM, ['Now the line across.']),
  line('line-tall', 'Above the top line (it still counts)', 'I', WARM, ['That letter went a little too high.']),
  line('line-low', 'Below the base line', 'I', WARM, ['A little low.']),
  line('line-small', 'Much too small', 'I', WARM, ['Next time, write it bigger.']),
  line('ask-gender', 'Only if English Spell Quest can be the first thing a child plays', 'I', WARM, ["Who's playing? A boy or a girl?"]),

  // ---- the merchant (27 texts, his voice)
  m('m-hello', 'Merchant: he walks in at a checkpoint', [
    'Hello, wizard. I have a potion that gives you a heart back. Do you want one?',
    "Hi there, wizard. I brought a potion that gives you a heart. Want one?",
    "Hey, wizard. I've got a potion that brings a heart back. Want to buy it?",
  ]),
  m('m-offer', 'Merchant: his opening when the child knows him', ['Want a heart potion?']),
  m('m-again', 'Merchant: nothing tapped for a while', ['So, do you want one?', 'Well? How about a potion?']),
  m('m-bye', 'Merchant: the child says no thanks', ['All right. Goodbye, wizard.', 'No problem. See you next time.']),
  m('m-price', 'Merchant, first visit demo D1: the price tag glows', ['This is the price.']),
  m('m-give', 'Merchant, first visit demo D2: a coin is dragged to him', ['Give me coins to match the price.']),
  m('m-tap', 'Merchant, first visit demo D3: the hand taps the potion', ['Then touch the potion.']),
  m('m-decline', 'Merchant, first visit demo D4: the no card glows', ["Don't need it? Touch here."]),
  m('m-exact', 'Merchant: the exact price; the potion flies to the wizard', ["Exactly right. Here's your potion.", 'Just the right amount. Here you go.', "Perfect, that's exactly the price."]),
  m('m-heart', 'Merchant: after a purchase, the heart flew to the top bar', ['Now you have a heart back.', 'You got a heart back.', 'Your heart is back.']),
  m('m-short', 'Merchant: less than the price', ["That's not enough.", "That's less than the price.", 'I need more coins.']),
  m('m-over', 'Merchant: more than the price', ["That's too much.", "That's more than the price.", 'There are too many coins here.']),
  m('m-undo', 'Merchant: too much, the first time only; a coin flies back', ['Take a coin back.']),
  m('m-empty', 'Merchant: the potion tapped with nothing in his hand', ['Coins first.', 'First, give me some coins.']),

  // ---- the tower (13 texts)
  line('line-intro', 'The tower rises', 'I', '[mysterious] then [determined]', ['The monsters are coming. Protect the tower.']),
  line('line-how-A', 'Tower picture round, first sound', 'I', '[curious] then ' + WARM, ["What's the first sound in the picture? Pick its letter."]),
  line('line-how-B', 'Tower sound round', 'I', WARM, ['Listen to the sound, and pick its letter.']),
  line('line-how-C', 'Tower name round (nonsense words)', 'I', WARM, ["Listen to the monster's name, and find it."]),
  line('line-new-monster', 'A new monster', 'D', '[amazed] then [excited]', ['Look, a new monster. Here it comes.']),
  line('line-combo', 'A streak in the tower', 'D', EXCITED, ["Wow, you're on fire."]),
  line('line-mega', 'The mega spell is ready', 'D', EXCITED, ['Mega spell ready.']),
  line('line-boss', 'A tower boss', 'D', '[booming] then [excited]', ['Watch out, a giant monster. It takes lots of spells to beat it.']),
  line('line-boss-win', 'The tower boss is beaten', 'D', EXCITED, ['Great job. You beat the giant monster.']),
  line('line-over', 'The tower ends', 'I', WARM, ['You fought like a real wizard. Play again?']),
  line('line-record', 'A new record in the tower', 'D', EXCITED, ['New record.']),
  line('line-almost', 'Tower near miss', 'I', ENCOURAGE, ['Almost.']),
  line('line-wave', 'More monsters', 'I', PLAY, ['More monsters are on the way.']),

  // ---- new lines for English Spell Quest (25 texts)
  line('line-how-last', 'Picture round, last sound (x ck ff ll ss zz ng nk)', 'I', WARM, ["What's the last sound in the picture? Pick its letter."]),
  line('line-how-word', 'Picture round with word runes (stages 6 to 9)', 'I', WARM, ['Which word goes with the picture?']),
  line('q-door-words', 'Phrase door, when he waits', 'I', WARM, ['What do the words say? Bring the right key.', 'Read the words, and pick a key.', 'Which key goes with the words?']),
  line('q-draw-word', 'Drawing a whole word (from stage 2), when he waits; then the word', 'I', WARM, ['Write the word:', 'Can you write:', 'Now write the whole word:']),
  line('q-draw-big', 'Capitals (after stage 3): at the start of a capital round (after the word) and when he waits; then the sound', 'I', WARM, ['Now write the big letter for:']),
  line('intro-sound', "A new unit's introduction; then its sound and a picture word", 'I', PLAY, ["Here's a new sound:", 'Listen to this new sound:', 'A new sound:']),
  line('intro-team', 'The first two-letter unit (stage 4); then the unit', 'I', WARM, ['These two letters make one sound together:']),
  line('intro-blend', 'Stage 5; then a blend', 'I', WARM, ['Say each sound, then push them together:']),
  line('intro-magic-e', 'Stage 6, the first silent e', 'I', PLAY, ["This is a magic e. It doesn't make a sound, but it makes the other vowel say its name."]),
  line('intro-ending', 'Stage 7; then a word with its ending', 'I', WARM, ['An ending changes the word:']),
  line('intro-second', 'A second reading of a unit; then the unit\'s new sound', 'I', WARM, ['These letters can make another sound too:']),
  line('intro-heart', 'A new heart word; then the word', 'I', WARM, ['This is a heart word. We learn it by heart:']),
  line('explain-letter', 'Look-alike explanation; then a letter name and its sound', 'I', WARM, ['This is the letter:']),
  line('demo-spell', 'First spell book', 'I', WARM, ['Listen to the word, and put a sound in each box.']),
  line('demo-spell-write', 'The first written word (stage 4 on)', 'I', WARM, ['Now write the word yourself, one letter in each box.']),
  line('q-spell', 'Spell book, when he waits; then the word', 'I', WARM, ['Spell the word:', "Let's spell:", 'Make the word:']),
  line('spell-near', 'Stage 9 near miss (ee/ea), forgiven once', 'I', ENCOURAGE, ['That sounds right, but this word uses the other one.']),
]

/** the tower lines the English tower and the placement tower play through the tower's audio adapter (13) */
export const EN_TOWER_LINE_IDS: readonly string[] = [
  'line-intro', 'line-how-A', 'line-how-B', 'line-how-C', 'line-new-monster', 'line-combo', 'line-mega', 'line-boss',
  'line-boss-win', 'line-over', 'line-record', 'line-almost', 'line-wave',
]

export const enLine = (id: string): EnLine | undefined => EN_LINES.find((l) => l.id === id)
export const enLineAudioId = (id: string, n: number): string => `${id}-${n}`
/** English marks no gender here: no girl forms (Spell Quest's takes `<id>-<n>-f` have no English counterpart) */
export const FEMININE_IDS: ReadonlySet<string> = new Set()
