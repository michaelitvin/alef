# Minigame design rules

Use these rules when you design, build or review a child-facing minigame in alef.
They come from the parent's steering on all minigames. The player is a boy of approximately 7 years. He cannot read yet.

Give each rule a reason or an example. Write the game's name before each example, for example "Example (duel):".
Put a new rule in the section that agrees with its subject. Keep the rules general, so that they apply to other games.

## Communication on the screen

- Speak all instructions, feedback and labels. Do not use written text on child screens.
  Reason: the child cannot read.
- Show letters and nikkud only as the learning content. Do not use them as labels.
- Do not use Latin letters for Hebrew sounds. Use picture words.
  Reason: English phonics conflict with Hebrew vowels. Example (duel): the child heard "U" as "uh" (= kamatz).
- Do not say what the screen already shows.
  Example (duel): do not say "לחץ על הברק". Make the lightning appear with an animation that attracts attention.
- When the voice names an object, make the object appear at that moment. If it is already on the screen, make it glow.
  Example (duel): in "הגן על ה**מגדל**", the tower rises on "מגדל". The clue bubble appears on "בתמונה". The marks appear on "הניקוד".
- Remove icons and cues that the child does not need.
  Example (duel): the look/listen cue icons were removed.

## Voice lines: wording

- Make sure each line is correct in its context, and that its feeling agrees with the moment.
  Example (duel): "המגדל נפל. כל הכבוד" praised the child for a loss. The first "כִּמְעַט" sounded disappointed; it must encourage.
- Do not use game or technical words. Say what happens.
  Example (duel): "wave" and "combo" were removed. "עוד מפלצות בדרך" replaced the wave line.
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
  - Calm instruction: stability 0.5 ("Natural"), with one tag for each sentence, for example [curious] → [warmly].
  - Single vowel or other short sound: stability 1.0 ("Robust").
- Make dramatic moments sound exciting: new monster, boss, boss win, special power, streak, record. Keep instructions calm and warm.
  Example (duel): the parent rejected flat takes three times ("more excitement please").
- Do not put "!" in the text. It makes the voice shout. Use tags to get emotion.
- Put a pause of 0.7–0.9 s between two sentences in one line, and 0.8 s after an announcement.
  Reason: a 0.5 s pause sounds rushed and robotic. You can make the pause longer in an approved take with an audio edit.
- Speak a sound one time, short and clear. Do not make it long.
  Example (duel): the approved vowels are 1 voiced burst of approximately 0.2 s. Takes of approximately 0.4 s sounded like a moan. Use the text "אַ." at stability 1.0.
- Do not add decoration to the learning sound: no growl tags, no character voice, no pitch shift.
  Example (duel): the monster voice and the pitch-shifted monster variants moaned and hid the vowel. They were removed.
- Remove a voice or sound that is awkward. No sound is better than an awkward sound.
- Play speech a little faster, with the pitch kept. Cut the silence at the start and the end of each file.
  Example (duel): speech plays at 1.15×. Reason: slow speech made all of the game feel slow.
- To remove a part of an approved take, cut the audio. Do not record it again, unless the parent asks.

## Pronunciation

- Use the newest model that speaks Hebrew well, with the language code "he".
  Example (duel): eleven_v4 with language_code "he". The parent: "v4 generally sounds better than v3".
- Check the nikkud of each word in a dictionary before you make audio.
  Example (duel): אַבַּטִּיחַ (wrong dagesh) gave "abatiach". The correct spelling is אֲבַטִּיחַ.
- Expect hard words. Give them more takes and more spellings in each round. Put all rounds in review.
  Example (duel): צֵירֶה needed 5 rounds and more than 25 takes.
- You can change the spoken text to get the correct sound. Do not change the text on the screen.
  Examples (duel): צֵירֶה is spoken from "צְרֶה." (else it sounded "tseire"). פַּתָּח is spoken from "פַּתָּךְ." (the final ח was too guttural). שִׂיא is spoken from "שִׂי" (else it sounded "sia").
- To move the stress in a Hebrew word, try a meteg first. Example (duel): "אֽוֹטוֹבּוּס".
- To move the stress in a loanword or a slang word, write IPA in slashes inside the Hebrew text.
  Examples (duel): "/ˈmeɡa/ כִּשּׁוּף", "/anaˈnas/", "/baˈʃvunɡ/".
  Caution: IPA can give an English accent. Example (duel): the bus in IPA sounded English.
- Do not use IPA alone for a single vowel. Example (duel): "/a/." gave 5–6 bursts of extra speech.
- Use the same correct spelling everywhere in the app. Example (duel): צֵירֶה, פַּתָּח.

## Music and sound effects

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
- Make each moving sprite face the direction it moves. Judge by motion cues (tail, stride), not only the face.
- Show each character only one time on a screen. Use opaque covers for start and pause screens.
  Example (duel): the wizard showed two times, on the tower and in the middle.
- Animate a new element when it appears. Example (duel): the clue bubble bounces.
- Change effects and animations from round to round. Give special characters (bosses) their own look and moves.
- Give the child few, large, clear choices.
  Example (duel): a choice from 6 pictures was too hard, even for an adult. That screen was removed.
- Do not use emoji. Draw all icons as SVG.
  Reason: the old Android tablet and the headless browser show missing emoji as squares.

## Art generation

- Start with 3–4 different style concepts. Let the parent select one.
- Make a style sheet from the selected concept. Use it as the reference image for every sprite, so that the style stays the same.
- Ask for one subject on a flat magenta background, with no text. Then remove the background, the specks and the colored halos.
- Make mocks in Hebrew, right to left. Put mocks where the parent can comment on them.
- Agree on a spending limit before you use a paid API. Record the spend.

## Interaction

- Let the child tap each clue to hear it again. Respond on finger-down, with a large tap area and a bounce.
  Reason: a moving target is hard to tap on a real tablet.
- Do not accept answer taps while an instruction plays. Keep a power-button tap that comes between rounds, and use it in the next round.
- Do not use a clock for slow tasks, such as drawing.
- Target device: an older Android tablet in landscape. A phone on its side keeps the portrait layout.

## Game play and learning

- Select questions to get a predicted mistake rate of 1 in 5.
  If no question reaches this rate, use the most difficult question available.
- Give recent answers more weight than old answers. Keep the history.
- Record confusions by direction (the item asked, the item tapped). Put the confused item on the board when its pair is asked.
- Adapt the speed, but do not let the child see the change.
- Forgive a near miss one time.
  Example (duel): a tap on the twin mark (kamatz for patach) costs no heart. The wizard says "כִּמְעַט" and the twin's name.
- Keep the flow. Do not repeat the same feedback many times in one encounter.
  Example (duel): boss hits before the last one get only a sound.
- Make a boss harder than the stage that it ends. Example (duel): a 3-hit boss after 5-kill waves was an anticlimax.
- Celebrate big wins and streaks with voice and a visual effect. Give each reward its own moment.
- Put a new mechanic where every child gets to it regularly, not in a rare event.
  Example (duel): a drawing task in the special power can be missed. In a boss fight it is too rare.
- Do not let progress go backwards. Keep the progress that the child can see.
- Give the child a story, things to look forward to, and achievements that he can say.
- Pause the game when the tablet locks. Cover the game while it is paused.
- Make a new minigame available from the start. Do not lock it behind levels.
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
- Show open items clearly. Keep decided items visible, but make them look different. Let the parent change or reset a decision.
- Make the play and approve buttons clear.
- Show the model and settings in each take's label. Example (duel): "Will · v4 · take 1".
- When you make new takes, keep the current pick as the first option. Write why you made new takes.
- Do not write the word under a picture in review.
  Reason: a caption tells the reviewer the name. The child does not get this help.
- Put items that can be ambiguous in the review.
  Examples (duel): picture names, look-alike symbols, pronunciation, the direction a sprite faces (show it walking).
- Put new candidate items in review first. Add them to the game only after the parent keeps them.
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
- Do not list an item again after the parent declines it.
- Merge and push only when the parent asks. Run the tests and the build on the merged result before you push.
- The repository is public. Do not put host addresses, routes or passwords in committed files.

## Verification

- Look at your screenshots before you show them.
  Look for missing-font squares, characters shown two times, and sprites that move backwards.
- Run an automated scan that finds Latin or Hebrew text on child screens.
- Look at a sheet of all glyphs and one walking frame of each sprite.
- Before you give a build to the parent, play it to the end and listen to all of the audio. Compare it with the last prototype that the parent tested.
  Example (duel): the first full build was worse than the prototype (moans, backwards sprites, wrong words, a doubled wizard).
