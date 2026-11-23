# Visuals

## Look-alikes and symbols

- Do not show a shape that looks like a nikkud mark. This includes effect particles.
  Examples (tower): lowercase "i" (looks like cholam), small round dot clusters (blueberries), a bar with a dot (looks
  like a vav with a mark), crumbs and specks near a picture.
- Do not remove learning content (a letter, a syllable, a word) because it looks like something else. Show it, and ask
  the parent.
  Example (Hebrew Spell Quest): יִ was left out because it looks like "¡". It is a common syllable.
- When you remove a look-alike from a picture, make sure that the object stays recognizable.
  Example (tower): a cookie without chips did not look like a cookie. Big, irregular chocolate chunks are correct.
- Give each symbol only one meaning. A picture word must not look like a UI icon. A particle must not look like a heart
  (life) or a placeholder.
  Example (tower): the ear meant "listen" and also suggested "mute" (shva). It was removed.
- Show letters with nikkud in the app's nikkud font (Sigalit). Make a sheet of all letter and mark combinations at game
  size, and look for shapes that look like a Latin letter, a digit or punctuation. Check how the font draws each dotted
  letter.
  Example (Hebrew Spell Quest): in Hillel CLM, יִ looked like "!". Sigalit fuses the shin dot into ש's right arm (שׁ looked like ن);
  the game draws its own dot above the arm.

## Picture words

- Give each picture word one obvious name. Ask: "What will the child call this?"
  Examples removed (tower): goat (he said "sheep"), car (מכונית), ship (סירה), mom (he said "woman"), hamster (he said
  "mouse"), a star-shaped cookie (כוכב).
- Use words for things that the child sees where he lives (Israel), also on the English course. Do not use words for
  snow, winter or a foreign country's everyday things.
  Example (English Spell Quest): sled was removed.
- Use only words whose first vowel sounds as written.
  Example (tower): תמנון has shva, but people say "ta". Do not use it.
- Give each sound several picture words. Take them from things that the child knows.
  Reason: the child must learn the sound, not one picture. Example (tower): words from the Alef-Bet song.
- Link a letter or syllable only to a picture word that starts with that same letter, not only the same sound.
  Reason: the child must not learn the wrong spelling. Example (Hebrew Spell Quest): כָ showed חָתוּל (the same sound, another letter).

## Glyphs and words

- Show a learning mark on a neutral placeholder (circle or box), not on a carrier letter.
- Make the learning content the strongest element on the screen. Make helper shapes faint. Make sure a highlight does
  not hide the mark.
  Example (Hebrew Spell Quest): the cholam dot fell on the bubble's shine and vanished; glyphs now have a dark outline and a dark
  disc behind them.
- Center a glyph by its ink (the letter and its marks), not by its line box. Measure it after the font loads. Put the
  syllables of one word on one baseline: center a syllable alone by its ink, but a syllable in a word by the ink of the
  whole word.
  Example (Hebrew Spell Quest): syllables with a mark below sat too high on their orbs; on the door, "עָ" (a mark below) sat higher
  than "שׁוּ".
- Place the parts of a word by their measured widths, not at fixed places, and make the letters smaller when the word does
  not fit its frame. Check the longest word. Example (Hebrew Spell Quest): "דּוּר" of כַּדּוּר ran off the door plate.

## Scenes, characters and motion

- Make a scene change look clean at every frame. Do not stretch a small picture to full size. Hide the change in a
  natural effect (light, a fade) instead. Show a passage (a door, a portal) from the inside: the next room through the
  opening, and a camera that flies through it into that room, so that the next round starts where the flight ends.
  Animate it frame by frame, and avoid SVG masks in the animation (they repaint slowly).
  Example (Hebrew Spell Quest): a fly-through-the-door zoom was "extremely ugly"; the camera now moves into the doorway's light, and
  the next door comes out of that light.
- Make each moving sprite face the direction it moves. Judge by motion cues (tail, stride), not only the face.
- Show each character only one time on a screen. Use opaque covers for start and pause screens.
  Example (tower): the wizard showed two times, on the tower and in the middle.
- Make the player sprite small enough for the action.
  Example (Hebrew Spell Quest): the wizard on the broom filled most of his lane, so he could not dodge.
- Do not move a group of targets as one straight column or row. Give each its own timing and a small offset.
  Example (Hebrew Spell Quest): flying letters in threes, "popcorn style".
- Do not let two moving answers overlap. Keep neighbouring lanes at least one answer apart, with their random offsets.
  Keep two answers in one lane at least one answer apart at the fastest speed. Start each answer outside the screen,
  so that it flies in. Check this with a geometry test at each screen size, also when you make the answers bigger.
  Example (Hebrew Spell Quest): the parent made the broom's orbs 1.3 times bigger. Orbs in neighbouring lanes already overlapped a
  little on a phone.
- Change effects and animations from round to round. Give special characters (bosses) their own look and moves.
- Do not let the scene show the answer.
  Example (Hebrew Spell Quest): the word "דֶּלֶת" was on a door, and a door was one of the pictures to choose from.
- Make a wrong answer a dramatic moment: shake the screen, flash, burst the wrong choice, show the player hit. Show the
  true cause of the mistake.
  Example (Hebrew Spell Quest): when the right letter flew past him, the wizard spun as if hit; now a miss is a whoosh and a glow where the letter passed, and only a real hit makes
  him dizzy.

## The screen as a whole

- Load the fonts and the pictures before the first game screen. Do not let text change its font, or a picture appear
  after the rest, while the child looks.
  Example (clock): the first cursive caption showed in a print font and then changed; clock cases appeared after the clock.
- Do not cut a picture with a hard edge. Show it whole when it fits. If you must cut it to keep the learning content big,
  fade the cut edge.
  Example (clock): on a phone, the clock cases were cut at the top and bottom (the cuckoo roof, the grandfather clock body).
- Make the start screen show the game's world and its learning content. Do not use a cropped background with a button on it.
  Example (clock): the start screen is a big cuckoo clock with the real time, and its cuckoo comes out to say hello.
- Do not use emoji. Draw all icons as SVG.
  Reason: the old Android tablet and the headless browser show missing emoji as squares.
- A second path gets its look from one colour transformation of the first path's assets. Do not draw a second set.
  Transform the player's character fully: use a mapping that leaves no half-changed patches.
  Reason: one set of art keeps the two paths one game, and a half-changed character looks like a mistake.
  Example (English Spell Quest): the purple wizard, tower and cards are recoloured green by one mapping (the recoloured files in
  `src/spellquest/english/assets/img/`). Purple that is drawn in code (orb trails, silhouettes) takes the course's colour too.
