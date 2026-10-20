# Minigame design rules

Use these rules when you design, build or review a child-facing minigame in alef.
They come from the parent's steering on all minigames. The player is a boy of approximately 7 years. He cannot read yet.

Give each rule a reason or an example. Write the game's name before each example, for example "Example (duel):".
Put a new rule in the section that agrees with its subject. Keep the rules general, so that they apply to other games.

## Communication on the screen

- Speak all instructions, feedback and labels. Do not use written text on child screens.
  Reason: the child cannot read.
  Exception: you can show text while the voice speaks it, if each word is highlighted when it is spoken.
  The text must not be the only source of the information, and it must be smaller and fainter than the learning content.
  Reason: the child is learning to read. This rule will become less strict as he reads better.
  Example (clock): the spoken answers show a caption, and each word glows when the voice says it.
- Show letters and nikkud only as the learning content. Do not use them as labels.
- Do not use Latin letters for Hebrew sounds. Use picture words.
  Reason: English phonics conflict with Hebrew vowels. Example (duel): the child heard "U" as "uh" (= kamatz).
- Do not say what the screen already shows.
  Example (duel): do not say "לחץ על הברק". Make the lightning appear with an animation that attracts attention.
- When the voice names an object, make the object appear at that moment. If it is already on the screen, make it glow.
  Example (duel): in "הגן על ה**מגדל**", the tower rises on "מגדל". The clue bubble appears on "בתמונה". The marks appear on "הניקוד".
- Make each round say what to do: a short question before the content (for example "What time does the clock show?"
  before the answers). Do not start with the content alone.
  Reason: content with no question makes no sense to the child.
  Example (clock): a customer said "my clock is broken", and then a list of times followed. A digital-clock round had no voice at all.
- In an explanation that compares two things, show both from the start. Make the one that the voice names glow at that moment.
  Example (clock): "this is a digital clock" showed only the clock face, and the digital clock appeared on its word.
- Make the thing that the child must act on pulse or glow itself. Do not add a separate button or indicator for it
  when there is no choice to make.
  Example (clock): a pulsing hand button under the clock was redundant when only one hand could move. Now the hand pulses.
- Remove icons and cues that the child does not need.
  Example (duel): the look/listen cue icons were removed.

## Voice lines: wording

- Use the phrase that people really say, even when it breaks a pattern. Where two phrases are common, use both.
  Example (clock): nobody says "עֶשְׂרִים וְחָמֵשׁ לְשֶׁבַע" or "twenty-five to eight"; people say "שֵׁשׁ שְׁלוֹשִׁים וְחָמֵשׁ" and
  "seven thirty-five". For :40, both "twenty to two" and "one forty" are common, so the game uses both.
- Give a line that plays again and again several variations, and do not play the same variation twice in a row.
  Example (clock): every customer said "הַשָּׁעוֹן שֶׁלִּי הִתְקַלְקֵל"; now each has five hellos.
- A line must not point at a thing that is not on the screen ("this", "here", "that one"). If the thing is not shown
  yet, name it. Example (clock): a customer said "אַתָּה יוֹדֵעַ אֵיךְ מְכַוְּנִים אֶת זֶה?" before its clock was on the bench;
  now it says "הַשָּׁעוֹן שֶׁלִּי מַרְאֶה שָׁעָה לֹא נְכוֹנָה".
- In a bilingual game, keep the child in one language for a block of questions (the non-English language first), then
  change. Do not switch the language at every question. Example (clock): a workday is 4 Hebrew customers, then 4 English.
- In captions, use the spelling that the child sees in books (full spelling, with vav where the reading has it).
  Example (clock): "הַמָּחוֹג הָאָרוֹךְ", not "הָאָרֹךְ".
- Make sure each line is correct in its context, and that its feeling agrees with the moment.
  Example (duel): "המגדל נפל. כל הכבוד" praised the child for a loss. The first "כִּמְעַט" sounded disappointed; it must encourage.
- Do not use game or technical words. Say what happens.
  Example (duel): "wave" and "combo" were removed. "עוד מפלצות בדרך" replaced the wave line.
- Use the full name of a thing when its short name has another meaning. Example (book 2): רוּחַ alone is "wind"; the
  ghosts are רוּחוֹת רְפָאִים.
- Use natural, spoken Hebrew. When the parent gives a wording, use it.
  Examples (duel): "מגה כישוף" (not "כישוף מגה"), "נשחק שוב?", "וואו, אתה בשוונג".
- Make an announcement say something specific. Make the next round show it.
  Example (duel): "תראה, מפלצת חדשה" came before a monster that he saw before. "מעכשיו צריך גם להקשיב" was not clear, and the next round was a picture round.
- Do not put a number in a line if the game logic can change that number.
  Example (duel): the boss line said "3 spells". Then the boss got 8 hit points.
- Record a word alone. Do not put it in a carrier phrase.
  Example (duel): "כְּמוֹ אַרְיֵה" was rejected. "אַרְיֵה." was kept.

## Voice: delivery and emotion

- Record all voice lines before release. Do not use device text-to-speech.
  Reason: the parent approves each file. All assets are on the device, so no fallback is necessary.
- Give each voice one role.
  Example (duel): the wizard speaks the instructions, the feedback and the clues.
- Before you change the settings of a voice model, read the documentation for that model version.
  Example (duel): the emotion tags did not work until the documentation showed that they need low stability.
- Set the stability for the type of line (ElevenLabs v3/v4):
  - Excited or dramatic line: stability 0 ("Creative"), with a tag such as [excited], [amazed], [booming] or [powerful].
  - Instruction or other content line: stability 0.5 ("Natural") or lower, with one tag for each sentence, for example [playful] → [warmly].
  - Single vowel or other short sound: stability 1.0 ("Robust").
- Make dramatic moments sound exciting: new monster, boss, boss win, special power, streak, record. Keep instructions warm.
- Make every line sound alive and playful, also short content lines. A flat, neutral reading is not acceptable.
  Example (clock): the time phrases and the narrator lines sounded dull. The parent asked to make all of them again.
- Do not overdo it on learning content. Say it warmly and clearly, with less play than a narrator line.
  Example (clock): playful time phrases ("three o'clock") were "too playful".
  Example (duel): the parent rejected flat takes three times ("more excitement please").
- Do not put "!" in the text. It makes the voice shout. Use tags to get emotion.
- Put a pause of 0.7–0.9 s between two sentences in one line, and 0.8 s after an announcement.
  Reason: a 0.5 s pause sounds rushed and robotic. You can make the pause longer in an approved take with an audio edit.
- Speak a sound one time, short and clear. Do not make it long.
  Example (duel): the approved vowels are 1 voiced burst of approximately 0.2 s. Takes of approximately 0.4 s sounded like a moan. Use the text "אַ." at stability 1.0.
- Do not add decoration to the learning sound: no growl tags, no character voice, no pitch shift.
  Example (duel): the monster voice and the pitch-shifted monster variants moaned and hid the vowel. They were removed.
- Remove a voice or sound that is awkward. No sound is better than an awkward sound.
- If a word does not sound right after several spellings, change the wording of the line.
  Example (clock): "סדנה" kept the wrong stress, so the welcome line now says "חֲנוּת הַשְּׁעוֹנִים".
- Play speech a little faster, with the pitch kept. Cut the silence at the start and the end of each file.
  Example (duel): speech plays at 1.15×. Reason: slow speech made all of the game feel slow.
- To remove a part of an approved take, cut the audio. Do not record it again, unless the parent asks.

## Pronunciation

- Use the newest model that speaks Hebrew well, with the language code "he".
  Example (duel): eleven_v4 with language_code "he". The parent: "v4 generally sounds better than v3".
- Check the nikkud of each word in a dictionary before you make audio.
- Full nikkud in the spoken text can make the voice say a silent shva. Test the spoken text with and without nikkud, and keep the version that sounds correct.
  Example (clock): "שְׁתַּיִם" was spoken "shetaim" instead of "shtaim".
- Without nikkud, a word that has more than one reading is often read wrong. Add nikkud (or a stress mark) to those words only.
  Examples (clock): "הארוך" was said "haarach", "סופר" "sopar", "מעולה" "ma'ala", "השען" "hash'en".
  Example (duel): אַבַּטִּיחַ (wrong dagesh) gave "abatiach". The correct spelling is אֲבַטִּיחַ.
- Expect hard words. Give them more takes and more spellings in each round. Put all rounds in review.
  Example (duel): צֵירֶה needed 5 rounds and more than 25 takes.
- You can change the spoken text to get the correct sound. Do not change the text on the screen.
- If only one take says a word wrong, make a new take. Do not respell the word for all takes before the parent hears the
  respelled takes.
  Example (clock): one ארבע take had an Arabic-sounding guttural ayin. A respelling "ארבא" was made for all takes; the parent
  approved the old plain takes, and the respelling was reverted.
- If the voice stresses the wrong word again after a retake, change the words, not the takes.
  Example (clock): "הַשָּׁעָה עוֹד שָׁלוֹשׁ" stressed עוד in every take, also with a contrast added; without עוד the stress
  falls on שלוש.
- A comma or "!" makes the voice stop. Do not put one inside words that are said in one breath. If a word is read wrong
  without the stop, change the words: do not use the stop to fix the reading.
  Example (clock): "שָׁלוֹם, שָׁעָן!" was said "shalom. sha'an."; without the comma, "שען" was read "sha'on" (clock). The line is
  now "אוֹי, הַשָּׁעוֹן שֶׁלִּי מְבוּלְבָּל לְגַמְרֵי".
- Make the voice say the natural spoken form, even when the formal form is different.
  Example (clock): "לשתיים" is said "leshtaim", not "lishtaim".
  Examples (duel): צֵירֶה is spoken from "צְרֶה." (else it sounded "tseire"). פַּתָּח is spoken from "פַּתָּךְ." (the final ח was too guttural). שִׂיא is spoken from "שִׂי" (else it sounded "sia").
- To move the stress in a Hebrew word, try a meteg first. Example (duel): "אֽוֹטוֹבּוּס".
- To move the stress in a loanword or a slang word, write IPA in slashes inside the Hebrew text.
  Examples (duel): "/ˈmeɡa/ כִּשּׁוּף", "/anaˈnas/", "/baˈʃvunɡ/".
  Caution: IPA can give an English accent. Example (duel): the bus in IPA sounded English.
- Do not use IPA alone for a single vowel. Example (duel): "/a/." gave 5–6 bursts of extra speech.
- Use the same correct spelling everywhere in the app. Example (duel): צֵירֶה, פַּתָּח.
- Before you generate a word, look for an approved recording of it in the other games, and use that file. Also use their
  pronunciation fixes.
  Example (book 2): אוֹטוֹבּוּס and אַנָּנָס had the wrong stress again; the duel had fixed both. Book 2 now plays the duel's files.
- The voice does not see a missing dagesh: it reads ב as "b" and פ as "p". Spell a "v" sound with ו (וָה), and test each
  "f" spelling by transcription.
  Example (book 2): בָ, the "va" syllable, was spoken "ba".
- A lone letter with a vowel can be read as the letter's name. Add the vowel letter (גִּי, not גִ).
  Example (book 2): גִ was spoken "gimel".
- Say letter names in the modern spoken form: פֵּי, פֵי, טֶת, חֶת, וֶט, חַף; spell them so that the voice says that form.
  Example (book 2): the parent rejected "teit", "veit", "pe", "kaf" (for chaf), and צָדִי with the stress on the last syllable.
- Do not put an accent tag on a single syllable. Example (book 2): "[Israeli accent] רָ" was spoken two times.

## Music and sound effects

- In a calm game, do not play music while the child answers questions. Play music only on menus, rewards and bonus screens.
  Example (clock): background music during the rounds drove the parent crazy.
- Make several music tracks. Use them for different game states (for example, game speed), and rotate them.
  Reason: one repeated track becomes annoying. Longer tracks (approximately 75 s) also help.
- Keep one original track as the signature of a special event. Do not add variations of it.
  Example (duel): the boss keeps its one original track.
- Make the music quieter under all speech. Stop it for dramatic lines.
- When the parent approves more than one take of a sound effect, rotate them.
- Give each repeated event its own sound. Example (duel): the arrival sound means "new question".
- Make each sound effect sound like the thing that it shows.
  Example (duel): the first spell sound did not sound like a fireball.
- Do not let two audio events overlap or touch. Start the next question only after the feedback ends and a pause.
- Give feedback in this order: sound → mark name → picture word. Animate each part when the voice says it.
- Make feedback shorter after a confident correct answer.
  Reason (duel): feedback used approximately 60% of play time.

## Visuals

- Do not show a shape that looks like a nikkud mark. This includes effect particles.
  Examples (duel): lowercase "i" (looks like cholam), small round dot clusters (blueberries), a bar with a dot (looks like a vav with a mark), crumbs and specks near a picture.
- Do not remove learning content (a letter, a syllable, a word) because it looks like something else. Show it, and ask
  the parent.
  Example (book 2): יִ was left out because it looks like "¡"; the parent: "not cool". It is a common syllable.
- When you remove a look-alike, make sure that the object stays recognizable.
  Example (duel): a cookie without chips did not look like a cookie. Big, irregular chocolate chunks are correct.
- Give each symbol only one meaning. A picture word must not look like a UI icon. A particle must not look like a heart (life) or a placeholder.
  Example (duel): the ear meant "listen" and also suggested "mute" (shva). It was removed.
- Give each picture word one obvious name. Ask: "What will the child call this?"
  Examples removed (duel): goat (he said "sheep"), car (מכונית), ship (סירה), mom (he said "woman"), hamster (he said "mouse"), a star-shaped cookie (כוכב).
- Use only words whose first vowel sounds as written.
  Example (duel): תמנון has shva, but people say "ta". Do not use it.
- Give each sound several picture words. Take them from things that the child knows.
  Reason: the child must learn the sound, not one picture. Example (duel): words from the Alef-Bet song.
- Show a learning mark on a neutral placeholder (circle or box), not on a carrier letter.
- Make the learning content the strongest element on the screen. Make helper shapes faint. Make sure a highlight does not hide the mark.
  Example (book 2): the cholam dot fell on the bubble's shine and vanished; glyphs now have a dark outline and a dark disc behind them.
- Show the true cause of a mistake. Example (book 2): when the right letter flew past him, the wizard spun as if hit; now a miss
  is a whoosh and a glow where the letter passed, and only a real hit makes him dizzy.
- Make each moving sprite face the direction it moves. Judge by motion cues (tail, stride), not only the face.
- Do not show a question and then hide it for another screen. Play the welcome and the explanations first, then show the question.
  Example (clock): the first question appeared, then the welcome hid it.
- Ask the question right before the answers. If an explanation comes between a character's question and the answers,
  ask the question again after the explanation.
  Example (clock): the customer asked "which digital clock shows the same as my clock?", then two explanations played,
  then the answers appeared. The parent: "I don't remember the question anymore".
  The same at the end of a round: when something replaces the question (a reward, an explanation), do not bring the old
  question back. Example (clock): after a level up, the old clocks came back for a moment and then went away.
- Show each character only one time on a screen. Use opaque covers for start and pause screens.
  Example (duel): the wizard showed two times, on the tower and in the middle.
- Animate a new element when it appears. Example (duel): the clue bubble bounces.
- Do not move a group of targets as one straight column or row. Give each its own timing and a small offset.
  Example (book 2): the parent: "3's of flying letters don't need to be so aligned, disperse them. Popcorn style."
- Make a wrong answer a dramatic moment: shake the screen, flash, burst the wrong choice, show the player hit.
  Example (book 2): the parent: "When wrong, something more dramatic needs to happen."
- Change effects and animations from round to round. Give special characters (bosses) their own look and moves.
- Give the child few, large, clear choices.
  Example (duel): a choice from 6 pictures was too hard, even for an adult. That screen was removed.
- Load the fonts and the pictures before the first game screen. Do not let text change its font, or a picture appear
  after the rest, while the child looks.
  Example (clock): the first cursive caption showed in a print font and then changed; clock cases appeared after the clock.
- Do not cut a picture with a hard edge. Show it whole when it fits. If you must cut it to keep the learning content big,
  fade the cut edge.
  Example (clock): on a phone, the clock cases were cut at the top and bottom (the cuckoo roof, the grandfather clock body).
- Make the start screen show the game's world and its learning content. Do not use a cropped background with a button on it.
  Example (clock): the start screen is now a big cuckoo clock with the real time, and its cuckoo comes out to say hello.
- Do not use emoji. Draw all icons as SVG.
  Reason: the old Android tablet and the headless browser show missing emoji as squares.
- Show letters with nikkud in the app's nikkud font (Sigalit). Make a sheet of all letter and mark combinations at game
  size, and look for shapes that look like a Latin letter, a digit or punctuation.
  Example (book 2): in Hillel CLM, יִ looked like "!".
- Center a glyph by its ink (the letter and its marks), not by its line box. Measure it after the font loads.
  Example (book 2): syllables with a mark below sat too high on their orbs.
- Do not let the scene show the answer.
  Example (book 2): the word "דֶּלֶת" was on a door, and a door was one of the pictures to choose from.
- Make the player sprite small enough for the action.
  Example (book 2): the wizard on the broom filled most of his lane, so he could not dodge.

## Art generation

- Start with 3–4 different style concepts. Let the parent select one.
- Make a style sheet from the selected concept. Use it as the reference image for every sprite, so that the style stays the same.
- Ask for one subject on a flat magenta background, with no text. Then remove the background, the specks and the colored halos.
- Make mocks in Hebrew, right to left. Put mocks where the parent can comment on them.
- Make mocks from parts, as the game will be built: a background, sprites cut out from a flat color, and glyphs that
  the code places. Do not make one generated picture of the whole screen.
  Example (book 2): the parent called the first mock "ugly"; the generated scenes put the empty orbs in the wrong places,
  and the wizard was too big to change.
- Make the parent's mocks a page that opens on a phone. Write the voice lines on the mock only as a note for the parent,
  and say that the game does not show them.
- Cut out a sprite from a color that is far from its own colors.
  Example (book 2): purple orbs lost their edges on magenta; green worked.
- Agree on a spending limit before you use a paid API. Record the spend.

## Interaction

- Let the child tap each clue to hear it again. Respond on finger-down, with a large tap area and a bounce.
  Reason: a moving target is hard to tap on a real tablet.
- Do not accept answer taps while an instruction plays. Keep a power-button tap that comes between rounds, and use it in the next round.
  Accept answer taps while the answers themselves are read aloud. A tap stops the reading.
  Example (clock): the child had to wait until all three answers were read before he could choose.
- Show a speaker icon on everything that plays a sound when the child taps it, next to the text it says again. A tap on
  the text alone is not enough: the child does not know that the text can speak.
  Example (clock): Set the clock had no way to hear the time again, and the time caption in Find the clock played on a tap
  with no speaker; now each has a speaker, and so has each explanation.
- Put floating buttons in the top bar, not over the content area. Before you add a button, check at phone size that it
  covers nothing.
  Example (clock): the hint button under the gear counter covered the question; now it is in the top bar beside the gears.
- Ask before you remove a control the child uses. A control that looks redundant to an adult can be one the child likes.
  Example (clock): the short-hand and long-hand buttons were removed for a "nearest hand moves" rule; the child wanted
  the buttons back, and they returned.
- Do not use a clock for slow tasks, such as drawing.
- Show a gesture with a demo that does the gesture: a hand that the child recognizes as a hand, and the object moves with it.
  Example (clock): the demo finger was a blob that moved in an arc beside the clock. Now a pointing hand pulls the long
  hand round, and the short hand moves with it.
- Let a demo flow into play: when its words end, the round starts. Do not stop a demo on a next button.
  Example (book 2): the broom demo ended on a still screen with an arrow; the parent: "unnatural ... not intuitive that you
  need to press the left arrow". Use the play triangle for every next button (the clock game does).
- Make the background fill the whole screen on any shape of screen. Keep the game area fixed and extend the background
  around it. Example (book 2): wide phones showed black bars on both sides.
- Target device: an older Android tablet in landscape. A phone on its side keeps the portrait layout.

## Game play and learning

- Select questions to get a predicted mistake rate of 1 in 5.
  If no question reaches this rate, use the most difficult question available.
- Give recent answers more weight than old answers. Keep the history.
- Make wrong answers only from content that the child learned. A trick must test the current skill, not show an unknown word.
  Example (clock): on level 1 (o'clock only), the answers included "ten to eleven".
- Record confusions by direction (the item asked, the item tapped). Put the confused item on the board when its pair is asked.
- Adapt the speed, but do not let the child see the change.
- Explain each new element when it first appears: say what it is and show it with an animation.
  Explain again after the child makes the same mistake several times. Then go back to short feedback.
  Reason: feedback alone does not teach a new idea, and the same mistake again and again shows that he does not understand it.
  Example (clock): at the first quarter past, the minute hand moves a quarter of the circle and the slice fills.
- Do not let the child make a state that cannot exist. Make the controls move only between valid states. Do not show
  one either, also in decorations, demos and bonus games.
  Example (clock): the short hand moved freely while the long hand stayed, which made impossible times. Now the short hand
  steps an hour at a time, to the place that belongs with the long hand. In the bonus, the long and short hands stood
  still while the seconds hand swept round; now they turn with it.
- Make wrong answers clearly different from the right one. Do not offer two answers that differ only in a small detail.
  Example (clock): two 9:30 clocks, one with the short hand on the 9 (an impossible clock) and one half way to the 10.
  The parent: "too confusing, don't do this".
- Forgive a near miss one time.
- After a mistake or an explanation, do not go on by yourself. The child needs as much time as he wants to think.
  Keep the right answer on the screen (with the wrong one marked) until the child taps a next button. Keep an explanation
  on the screen when it ends, with a speaker that plays it again, until he taps next. Give the explanation of a mistake
  from time to time (not every time), after he has looked at the right answer.
  Example (clock): after a mistake the next customer came at once, and an explanation went on to the question at once.
- Give hints that fit the question. Show a hint by itself in the first rounds, then put it behind a hint button. Show it
  again on the right answer after a mistake.
  Example (clock): the quarters (the face cut in four, 00/15/30/45) for :15/:30/:45, and the minutes at each number for
  the other five-minute times; none on the hour.
  Example (duel): a tap on the twin mark (kamatz for patach) costs no heart. The wizard says "כִּמְעַט" and the twin's name.
- Keep the pace brisk. Between the answer and the next question, do not add fixed pauses longer than about 350 ms.
  Play sounds that belong together at the same time, and let a door bell ring while the round continues.
  Example (clock): a round had about 5 s of waiting after the answer, and the game felt slow.
- Keep the flow. Do not repeat the same feedback many times in one encounter.
  Example (duel): boss hits before the last one get only a sound.
- Make a boss harder than the stage that it ends. Example (duel): a 3-hit boss after 5-kill waves was an anticlimax.
- Celebrate big wins and streaks with voice and a visual effect. Give each reward its own moment.
- Put a new mechanic where every child gets to it regularly, not in a rare event.
  Example (duel): a drawing task in the special power can be missed. In a boss fight it is too rare.
- Do not let progress go backwards. Keep the progress that the child can see.
- Give the child a story, things to look forward to, and achievements that he can say.
- Make each thing on a screen part of the story there, or remove it from that screen. Show a progress reward in its own
  moment (when it grows, at the end of a session, on the start screen), with a voice line, not as a silent decoration.
  Example (clock): a tower next to the customers looked like animals staring at a tower; a row of clocks with bare numbers
  meant nothing to the parent or the child. "You built a new floor on the tower" was weird, because nothing said why the
  tower was there; the tower was removed.
- Do not announce a thing as special unless something special happens with it. A collection must matter: if its items
  are not memorable, drop the collection.
  Example (clock): "look, a new kind of clock" played, and then nothing special happened; the clock kinds were only case
  pictures, so the collection was dropped.
- Do not draw a reward like a control. Keep controls and decorations away from the screen corners.
  Example (clock): a single gear at the top right looked like a settings button; now it is a heap of gold gears in a tray.
  On a tablet, the home button 10px from the edge looked cut by the rounded screen corner.
- Make the story lead into each task. What a character says must give the reason for the question that follows.
  Example (clock): "my clock is broken" followed by "which clock shows three?" had no connection. Now each customer asks
  for the round's task: "I came to pick up my clock" before Find the clock, "what time does my clock show?" before What
  time is it.
- Pause the game when the tablet locks or the child switches to another app. Stop all sound, music too, and cover the game while it is paused.
  After the pause, continue with the same question.
- Make a new minigame available from the start. Do not lock it behind levels.
- Calculate how many answers a usual run has before the hearts run out (at 1 mistake in 5). Make sure that every screen
  comes up in a usual run.
  Example (book 2): 3 hearts gave approximately 15 answers, and one cycle of the screens had approximately 25. Now the
  hearts fill again on each new screen, and the next run starts at the next screen.
- Keep the story small until the parent asks for more. The challenge keeps the child playing. Put on a screen only
  the things that the child acts on.
  Example (book 2): the parent: "Don't add elements to the game that are not directly related to something that he
  needs to do."
- Use a timer only where speed is the game. Example (book 2): only the broom flight has a time limit.
- Start with a simple version. Add a mechanic only when the data shows a need.
  Example (duel): a simple random repeat of mistakes was sufficient for v1.
- A simple, repetitive drill is acceptable if it teaches the target skill and the child likes it.
  Example (duel): the child loved the duel. Monotony is the main open problem.

## Parent tracking

- Record correct answers, mistakes, time-outs and usage for each item and each screen type.
- Record what was shown at which position, the time to answer, the clock time and the assets used.
- Record when the child stops or leaves (abandon). Keep the log in localStorage, with a size limit.
- Count special results separately. Do not count them as correct.
  Examples (duel): special-power kills, forgiven twin taps.
- Let the parent export the telemetry. Analyze it with a script that you can use again.
- Remove retired items from the parent's stats.

## Review of generated assets

- Make an interactive review page for all generated sounds and pictures.
  Give 2 or more takes for each item. Save the parent's picks to a file that the build reads.
  Exception: for real words and phrases in a large set, give 1 take. Make more takes only for an item that the parent rejects.
  Example (clock): 144 time phrases for each language.
- For a large set, check each take automatically (speech-to-text against the text, length, rhythm).
  Let the parent review a sample of each pattern and all flagged takes. Offer a full review as an option.
- Make audio review fast: large buttons, and a "play all" mode that plays the items in a row with no click.
  The parent clicks only to stop, replay or reject.
  Reject stops the playback while the parent types the reason. After OK or a submitted reason, play the next open item. Let the parent continue "play all" from any item.
  Show the progress of the current visit: items decided out of items that were open when the page loaded.
- In review, show a visual of the game context next to each sound, and write where the sound is used in the game.
  Example (clock): the clock face that shows the time next to its phrase.
- Generate large sets progressively, in the order that the game needs them. Keep to the cost and rate limits, and run requests in parallel within those limits.
- By default, show only the items that need the parent: open and flagged items. Hide decided, superseded and finished items behind a "show all" switch. Let the parent change or reset a decision.
  Example (clock): the parent asked to hide what needs no more attention from him.
- Keep the items that the parent decides during a visit visible until he leaves the page, so that he can change them.
- Give every section of a review page the same controls and layout. When you add a new kind of section, reuse the existing item layout and buttons.
  Example (clock): the style-test section used a different layout from the rest of the page.
- Make the play and approve buttons clear. Make it obvious which item the controls act on: highlight that item, show its name next to the controls, and let the parent jump to it.
  Example (clock): the first review page had shared controls with no highlight and no way to find the item they acted on.
- Show the model and settings in each take's label. Example (duel): "Will · v4 · take 1".
- When you make new takes, keep the current pick as the first option. Write why you made new takes.
- Do not write the word under a picture in review.
  Reason: a caption tells the reviewer the name. The child does not get this help.
- Put items that can be ambiguous in the review.
  Examples (duel): picture names, look-alike symbols, pronunciation, the direction a sprite faces (show it walking).
- Ship the take that the parent approved. Do not let a newer take that he has not reviewed replace an approved take.
  When you take back a take (a failed test, a reverted spelling), mark it as withdrawn in the pipeline, so that the game
  and the review page skip it. Do not write to the parent's review file for him.
  Example (clock): the parent approved ארבע takes 1 and 2, but the game played the newest take, which he had not heard.
- Hide items that left the game (retired) from the review page.
  Example (clock): the parent reviewed "the tower is finished" after the tower was gone: "is there still a tower?".
- Give the parent a short "needs you" list: only what you need him to check now, each with one line on what to check
  and why. Keep sample and full review as other views.
- Put new candidate items in review first. Add them to the game only after the parent keeps them.
  Exception: when the parent says not to wait for review, build the game with the generated takes and replace the takes that the parent rejects later.
  Example (clock): the parent asked to build everything and fix rejects later.
- Use the parent's notes on reviewed items for similar items that are not reviewed yet.
- Measure audio takes (length, voiced bursts) before you show them to the parent.
- Do not let automated checks write to live review data.
- Do not stop work while a review is open. Continue, and apply the picks later.
- Record the request of each chosen take in `asset-sources/<game>/`.
  Reason: then you can make a similar take again.

## Working with the parent

- Fix obvious problems yourself. Ask only questions that need the parent. Record your own judgement calls in the spec.
- After a set of notes, list all open items from the parent's messages. Also list the important decisions that you made without the parent.
- The parent sends many short notes while you work. Make each note a checklist item, and confirm each one.
- Give choices as numbered or lettered options, with a recommendation.
- Before you give a design to the parent, check it against each rule in this file, one by one. Also give it to a
  reviewer who plans the build, and read the playtest fixes of the last games (their commit messages).
  Example (book 2): the first draft had explanations that went on by themselves, no hints, one take for each syllable,
  and runs too short to reach half of the screens.
- When another session works in the same repository, work in a separate git worktree on your own branch.
- Do not list an item again after the parent declines it.
- Merge and push only when the parent asks. Run the tests and the build on the merged result before you push.
- The repository is public. Do not put host addresses, routes or passwords in committed files.

## Verification

- Look at your screenshots before you show them.
  Look for missing-font squares, characters shown two times, and sprites that move backwards.
- Run an automated scan that finds Latin or Hebrew text on child screens.
- Run an automated audit that compares each caption with the audio that plays with it (the spoken text and a transcript). They must say the same words.
  Example (clock): some captions showed text that the voice did not say.
- Highlight caption words from the audio's real playback time, not from a timer that starts when you call play.
  Example (clock): the highlights ran out of sync with the voice.
- Look at every screen at phone sizes too. The learning content must stay the largest element.
  Example (clock): on a phone, the clock was smaller than the answer cards.
- Look at a sheet of all glyphs and one walking frame of each sprite.
- Before you give a build to the parent, do a full QA pass yourself: play each level from a fresh start, at phone and
  tablet sizes, with wrong answers too. Log the order of all audio, and look at a screenshot of each step.
  For each step, ask: does it make sense to a child who hears it for the first time? Does every element fit on the screen?
- Draw everything inside its drawing area, or let the area overflow. Look at the screenshot edges for cut shapes.
  Example (clock): the hint badges on the clock rim were cut at the edge of the clock drawing.
- When a playtest note names one case, look for the same problem in all similar places.
  Example (clock): after "the short hand moves alone" was fixed, the bonus clock and the summary clocks still showed
  impossible times.
  Reason: the parent found flow and layout problems that a QA pass shows (clock: a round with no question, a list of times
  after "my clock is broken", an explanation clock at the screen edge).
- Before you give a build to the parent, play it to the end and listen to all of the audio. Compare it with the last prototype that the parent tested.
  Example (duel): the first full build was worse than the prototype (moans, backwards sprites, wrong words, a doubled wizard).
