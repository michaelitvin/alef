# Voice: delivery and emotion

- Record all voice lines before release. Do not use device text-to-speech.
  Reason: the parent approves each file. All assets are on the device, so no fallback is necessary.
- Give each voice one role.
  Example (tower): the wizard speaks the instructions, the feedback and the clues.
- Before you change the settings of a voice model, read the documentation for that model version.
  Example (tower): the emotion tags did not work until the documentation showed that they need low stability.
- Set the stability for the type of line (ElevenLabs v3/v4):
  - Excited or dramatic line: stability 0 ("Creative"), with a tag such as [excited], [amazed], [booming] or [powerful].
  - Instruction or other content line: stability 0.5 ("Natural") or lower, with one tag for each sentence, for example [playful] → [warmly].
  - Single vowel or other short sound: stability 1.0 ("Robust").
- Make every line sound alive and playful, also short content lines. A flat, neutral reading is not acceptable.
  Make dramatic moments sound exciting: new monster, boss, boss win, special power, streak, record. Keep instructions
  warm. Do not overdo it on learning content: say it warmly and clearly, with less play than a narrator line.
  Example (clock): the time phrases and the narrator lines sounded dull, and the parent asked to make all of them again;
  then playful time phrases ("three o'clock") were "too playful".
  Example (tower): the parent rejected flat takes three times ("more excitement please").
- Use tags to get emotion, not "!": it makes the voice shout (see [pronunciation.md](pronunciation.md), Punctuation).
- Put a pause of 0.7–0.9 s between two sentences in one line, and 0.8 s after an announcement.
  Reason: a 0.5 s pause sounds rushed and robotic. You can make the pause longer in an approved take with an audio edit.
- Speak a sound one time, short and clear. Do not make it long, and do not add decoration to the learning sound: no
  growl tags, no character voice, no pitch shift.
  Example (tower): the approved vowels are 1 voiced burst of approximately 0.2 s. Takes of approximately 0.4 s sounded
  like a moan. Use the text "אַ." at stability 1.0. The monster voice and the pitch-shifted monster variants moaned and
  hid the vowel; they were removed.
- Remove a voice or sound that is awkward. No sound is better than an awkward sound.
- Play speech a little faster, with the pitch kept. Cut the silence at the start and the end of each file, but keep the
  natural end of the word (approximately 120 ms of decay) and cut a breath before it.
  Example (tower): speech plays at 1.15×. Reason: slow speech made all of the game feel slow.
  Example (English): "he" and "bath" were "abrupt"; "I" and "have" started with a breath.
- To remove a part of an approved take, cut the audio. Do not record it again, unless the parent asks.
- Make all takes of one set sound like one speaker in one session: the same pitch, the same calm tone, the same length
  for the same kind of item. Measure the pitch and the length against the approved takes and reject outliers before review.
  Example (English): two word takes sounded female, "we" was "much more jolly than others", and the r, v and ng sounds
  were "longer than others".
- Make the last consonant of a word audible. Check for a burst or hiss in the end of each take.
  Example (English): "at", "it", "dot" and "tif" were rejected with a silent last consonant, "cup" with a weak p.
- Keep the voice directions out of the spoken text. Reject a take that says a word that is not in the text.
  Example (English): retakes said "clearly hop" and "clearly, log".
