# Interaction: taps, drags, demos and layout

## Taps and choices

- Let the child tap each clue to hear it again. Respond on finger-down, with a large tap area and a bounce.
  Reason: a moving target is hard to tap on a real tablet.
- Do not accept answer taps while an instruction plays. Keep a power-button tap that comes between rounds, and use it in
  the next round. Accept answer taps while the answers themselves are read aloud: a tap stops the reading. A hint or an
  explanation is not an instruction (see the skip rule in [game-play-learning.md](game-play-learning.md)).
  Example (clock): the child had to wait until all three answers were read before he could choose.
  Exception (Space Cat, the parent, 2026-11-20): the child can start to play while the demo or the missing-number line is
  spoken. Do not cut the line. A line that would start during it waits behind it in the voice queue; sound effects can
  overlap it. Reason: "the kid should be able to start playing while instructions are audioed".
- Give the child few, large, clear choices. Make each choice large enough for a finger on a phone on its side: at least
  about 56 CSS px, with space between choices so that a finger does not hit the next one.
  Example (tower): a choice from 6 pictures was too hard, even for an adult. That screen was removed.
  Example (merchant): the coins were about 21 px on the parent's phone, and he could not pick the correct one.
- Make the choices that the child can pick glow softly while he can pick them. Do not let them glow while he cannot pick
  them (an instruction, a demo, feedback). Make this glow gentler than a hint's glow, so that he can see the difference.

## Drag and drop

- When the screen shows a place where a choice goes (a pot, a ladder rung, a door), let the child drag the choice there.
  Accept a tap too. Make the drop zone large, and let a choice that is dropped elsewhere fly back. When the screen also
  shows the gap that the answer fills, accept a drop on the gap as well as on the main target, and make the gap's drop
  area larger than the box.
  Reason: the child sees the gap as the place the answer goes.
  Example (Hebrew Spell Quest): the cauldron said "throw" and the ladder showed an empty rung, but neither could be dragged.
  Example (English ladder): on an unmarked rung the child must find the place. A tap on a letter lifts it and makes the
  boxes glow; a second tap on a box places it there. A tap on a letter alone is not an answer, because a tap names no
  place and the skill of this stage is to find the place. A tap on a marked rung (the gold box shows the place)
  answers at once.
  Example (English): the cauldron accepts a letter dropped on the empty box of `c_t` or on the pot.
- While the child drags a choice, make its drop place glow. Make it glow more when the choice is over it.
  Reason: the child does not always know where to drop the choice.
  Example (merchant): the merchant's open hand glows while a coin is dragged.

## Drawing

- In a drawing task, accept the dots and marks in any order, also across neighbouring letters. Match each drawn mark to
  the nearest mark that is still missing, and judge its place against the child's own letter. Accept a mark that he
  draws immediately after the letter, also while the voice asks for the marks: he continues his writing, he does not
  answer a new question.
  Example (Hebrew Spell Quest): in שׁוּעָל the ש dot drawn first was lost, so the marks seemed to need an order.
- Accept each stroke order and stroke count that the parent approves for a letter, in addition to the order that the
  hand teaches. The hand continues to show the taught order.
  Example (Hebrew Spell Quest): the parent writes פ in one stroke, from the centre and around.

## Demos and openings

- Show a gesture with a demo that does the gesture: a hand that the child recognizes as a hand, and the object moves with it.
  Example (clock): the demo finger was a blob that moved in an arc beside the clock. Now a pointing hand pulls the long
  hand round, and the short hand moves with it.
- Let the round that a demo shows be the first round he plays (the same letter, the same choices).
  Example (Hebrew Spell Quest): the cauldron demo showed one letter; after the instruction the round changed to another letter.
- Let a demo flow into play: when its words end, the round starts. Do not stop a demo on a next button.
  Example (Hebrew Spell Quest): the broom demo ended on a still screen with an arrow; the parent found it "unnatural".
- Explain a move at the moment that the child first needs it, not in the opening demo. When the child knows a screen,
  make its opening short: remove the long greeting and the demo, and keep the explanations that come when a move is
  first needed.
  Reason: a long opening that he already knows makes him wait.
  Example (merchant): how to take a coin back is shown the first time that he gives too much. After his first purchase
  the merchant says only "רוֹצֶה שִׁקּוּי לֵב?".
- Do not count for the child what the task asks him to count. Count only after he decides, as feedback.
  Example (merchant): a running total on the plate did his adding for him; now the merchant counts after he taps the potion.

## Screen shape

- Target device: an older Android tablet in landscape. Choose the layout by the screen's current shape: a phone on its
  side gets the landscape layout, as the tablet does; a phone held upright gets the portrait layout. When the screen
  turns, change the layout and keep the round.
  Reason: the portrait layout shrunk into a phone on its side made the planets too small to tap.
- Make the background fill the whole screen on any shape of screen. Keep the game area fixed and extend the background
  around it. Example (Hebrew Spell Quest): wide phones showed black bars on both sides.
