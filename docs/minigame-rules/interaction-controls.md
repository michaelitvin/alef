# Interaction: buttons and the top bar

## Where buttons go

- Put floating buttons in the top bar, not over the content area. Before you add a button, check at phone size that it
  covers nothing. Keep the content area below the top bar: start the game area under the bar, and do not let content
  go up into it.
  Example (clock): the hint button under the gear counter covered the question; now it is in the top bar beside the gears.
  Example (book 2): on a phone on its side the ladder's top plates went under the coins and the stars; now the stage
  starts below the bar on every screen.
- Make the go-on button of an explanation large and glowing, and put it where the explanation leaves room (book 2: at the
  bottom). Check at phone size that it covers nothing he must see.

## The way home and the parent gate

- Every game has one way home, and it goes to alef's home screen, not to the game's own cover. Use the shared house
  (`src/shared/HomeButton.tsx`): the same look, the same hold, the same corner, on the cover, each play screen, the pause
  cover and the end screen (a session from the home screen's path has none: it goes home by itself).
  - It needs a 2 s hold, with a ring that fills. A tap must never leave: a tap or a short press only shows how far the
    ring got. It is the same held button as the parent button.
  - Put it in the left corner of the top bar, as the first item (where a back button usually is), and on the end
    screen in the same corner. The hold keeps it safe next to the speaker.
  Reason: a plain home button takes the child out by mistake, and with no way out at all the parent cannot leave a run.
  Alef's home screen is the hub of all the games, and one way home is one thing to learn.
  Example (book 2): a home button next to "play again" took the child to the old duel twice; he did not know what he
  pressed. The parent asked for the house on the left, not in the right corner after the counts.
  Example (clock): a plain-tap home button went back to the clock's own door; the parent: "make consistent between games".
- Every way into a parent screen (settings, progress, export, developer tools) must need a 2 s hold and then the
  parent's year of birth on a number pad. Accept any adult year and do not store it. A wrong year goes back to where the
  child was, with no message.
  Reason: the parent screens hold reset and the developer tools (also on production), which must stay out of the
  child's reach, and the child cannot read the question or type a year.
  Example (all games): the settings gear on the home screen opened settings, dev mode and reset with one tap.

## What a button looks like and means

- Show a speaker icon on everything that plays a sound when the child taps it, next to the text it says again. A tap on
  the text alone is not enough: the child does not know that the text can speak.
  Example (clock): Set the clock had no way to hear the time again, and the time caption in Find the clock played on a tap
  with no speaker; now each has a speaker, and so has each explanation.
- Make the hint button a question mark. Do not use a symbol that the child must learn first, such as a wand.
  Reason: a child knows the question mark as "help"; he did not know what the wand did (book 2).
- On a screen that a walkthrough teaches, give one help button (the question mark) that plays the walkthrough again.
  Do not add a second help button or a speaker for the last line there. Let the replay keep the state of the task, and let
  a touch on an answer end it.
  Reason: two buttons with no clear meaning confuse the child. The walkthrough is the help that he needs there.
  Example (merchant): the parent did not know what the hint wand and the sound button did.
- Use the play triangle for every go-on and next button. Point it in the direction of the motion that the child sees.
  A path that goes right to left takes a triangle that points left; a scene where the wizard flies to the right takes a
  triangle that points right. With no motion, follow the reading direction (right to left).
  Example: the home screen's path runs right to left, so its play buttons point left; inside Book 2 the wizard flies to
  the right, so its play and next buttons point right.
- Do not reuse a button for a new meaning. Example (merchant): the play triangle as "no thanks" looked like "start the deal".
- Let the action itself be the answer. Do not add a button to confirm or to say yes.
  Example (merchant): a handshake "deal" button and a yes card were removed; giving coins is the yes, a tap on the potion
  buys it, and one ✗ card is the only "no".
- Build a new screen from the game's own parts: its top bar, buttons, choice cards, coin, demo hand and colours. Do not
  draw a new version of a part that the game already has.
  Example (merchant): new coins, yes/no buttons and a new pointing hand each looked foreign, and the parent rejected each.
- Let a tap on each thing the child collects or keeps (hearts, points, coins, crystals, his best) say briefly what it is
  and how he gets more. Say it once for a burst of taps. Reason: he cannot read a label.
- Ask before you remove a control the child uses. A control that looks redundant to an adult can be one the child likes.
  Example (clock): the short-hand and long-hand buttons were removed for a "nearest hand moves" rule; the child wanted
  the buttons back, and they returned.
