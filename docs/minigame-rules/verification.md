# Verification

## Automated checks

- Run an automated scan that finds Latin or Hebrew text on child screens (except the learning content and marked digits:
  see [communication.md](communication.md)).
- Run an automated audit that compares each caption with the audio that plays with it (the spoken text and a
  transcript). They must say the same words.
  Example (clock): some captions showed text that the voice did not say.
- Highlight caption words from the audio's real playback time, not from a timer that starts when you call play.
  Example (clock): the highlights ran out of sync with the voice.
- Test every drag with real touch events in a headless browser with touch on (CDP `Input.dispatchTouchEvent`), not with
  mouse or synthetic pointer events. Make the stage itself `touch-action: none`: the browser ignores it on inner SVG parts,
  takes the finger as a page pan and cancels the drag.
  Example (book 2): the cauldron said "throw the vowel in", but on the tablet the orb did not move. The unit tests passed
  with synthetic events.

## Screenshots

- Look at your screenshots before you show them. Look for missing-font squares, characters shown two times, sprites
  that move backwards, and cut shapes at the edges. Also look at a sheet of all glyphs and one walking frame of each sprite.
- Look at every screen at phone sizes too. The learning content must stay the largest element.
  Example (clock): on a phone, the clock was smaller than the answer cards.
- Draw everything inside its drawing area, or let the area overflow.
  Example (clock): the hint badges on the clock rim were cut at the edge of the clock drawing.

## Before a build goes to the parent

- Do a full QA pass yourself: play each level from a fresh start, at phone and tablet sizes, with wrong answers too, and
  play it to the end. Log the order of all audio, listen to all of it, and look at a screenshot of each step.
  For each step, ask: does it make sense to a child who hears it for the first time? Does every element fit on the
  screen? Compare the build with the last prototype that the parent tested.
  Reason: the parent found flow and layout problems that a QA pass shows (clock: a round with no question, an
  explanation clock at the screen edge).
  Example (duel): the first full build was worse than the prototype (moans, backwards sprites, wrong words, a doubled wizard).
- When a playtest note names one case, look for the same problem in all similar places.
  Example (clock): after "the short hand moves alone" was fixed, the bonus clock and the summary clocks still showed
  impossible times.
