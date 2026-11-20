# Communication on the screen

- Speak all instructions, feedback and labels. Do not use written text on child screens.
  Reason: the child cannot read.
  Exception: you can show text while the voice speaks it, if each word is highlighted when it is spoken.
  The text must not be the only source of the information, and it must be smaller and fainter than the learning content.
  Reason: the child is learning to read. This rule will become less strict as he reads better.
  Example (clock): the spoken answers show a caption, and each word glows when the voice says it.
- Show letters and nikkud only as the learning content. Do not use them as labels.
- Do not use Latin letters for Hebrew sounds. Use picture words.
  Reason: English phonics conflict with Hebrew vowels. Example (duel): the child heard "U" as "uh" (= kamatz).
- On the English path, Latin letters are the learning content, so they may appear as letters, sound units and words.
  No Hebrew letter and no nikkud appears on the English path, not even as a label.
  Reason: a Hebrew mark next to a Latin letter would give the letter a second sound to learn.
  Example (English path): the orbs, the runes, the boxes and the plates carry Latin text. The no-text scan
  (`src/english/noText.test.tsx`) allows Latin letters only as such content.
- Do not say what the screen already shows.
  Example (duel): do not say "לחץ על הברק". Make the lightning appear with an animation that attracts attention.
  Example (book 2): a heart that comes back at the end of a pass has no line (not "לֵב אֶחָד חוֹזֵר אֵלֶיךָ"). The heart
  flies to the top bar at once and the hearts there flash; the game does not stop for it.
- When the voice names an object, make the object appear at that moment, with an animation. If it is already on the
  screen, make it glow.
  Example (duel): in "הגן על ה**מגדל**", the tower rises on "מגדל". The clue bubble appears and bounces on "בתמונה". The marks
  appear on "הניקוד".
- In an explanation that compares two things, show both from the start. Make the one that the voice names glow at that moment.
  Example (clock): "this is a digital clock" showed only the clock face, and the digital clock appeared on its word.
- Make the thing that the child must act on pulse or glow itself. Do not add a separate button or indicator for it
  when there is no choice to make.
  Example (clock): a pulsing hand button under the clock was redundant when only one hand could move. Now the hand pulses.
- Remove icons and cues that the child does not need.
  Example (duel): the look/listen cue icons were removed.

## The question of a round

- Make each round say what to do: a short question right before the answers (for example "What time does the clock
  show?"). Do not start with the content alone. If an explanation comes between a character's question and the
  answers, ask the question again after the explanation.
  Reason: content with no question makes no sense to the child, and he forgets a question that came before an explanation.
  Example (clock): a customer said "my clock is broken", and then a list of times followed. Another customer asked "which digital clock shows the same as my
  clock?", then two explanations played, then the answers appeared; the parent: "I don't remember the question anymore".
- Do not show a question and then hide it for another screen. Play the welcome and the explanations first, then show
  the question. When something replaces the question at the end of a round (a reward, an explanation), do not bring
  the old question back.
  Example (clock): the first question appeared, then the welcome hid it. After a level up, the old clocks came back for
  a moment and then went away.
