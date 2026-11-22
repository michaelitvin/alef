# Review of generated assets

## The review page

- Make an interactive review page for all generated sounds and pictures.
  Give 2 or more takes for each item. Save the parent's picks to a file that the build reads.
  Exception: for real words and phrases in a large set, give 1 take. Make more takes only for an item that the parent rejects.
  Example (clock): 144 time phrases for each language.
- Give every review page the controls to decide each item: OK, reject with a typed reason, a note, and a way to change
  or reset a decision, saved on the server. A static page that only shows the items is not a review page. Give every
  section of a page the same controls and layout: when you add a new kind of section, reuse the existing item layout
  and buttons. Make it obvious which item the controls act on: highlight that item, show its name next to the
  controls, and let the parent jump to it.
  Example (English course): a static page had no way to write rejects and notes or to approve.
  Example (clock): the style-test section used a different layout from the rest of the page. The first review page had
  shared controls with no highlight and no way to find the item they acted on.
- Make review fast: show one item at a time, and let the parent's decision set the pace. After OK, or after Reject
  and its reason, save in the background and play the next open item at once. Do not play items in a row by
  themselves ("play all"), and do not move on by a timer.
  Open the page on the first open item. Give large OK and Reject buttons, Replay, and a "Later" button that goes on
  without a decision. A tap on an item makes it the current item and plays it. When no open item is left, say so, with
  the counts. Show the progress of the current visit: items decided out of items that were open when the page loaded.
  Example (English course): the parent left a note on the sled and went on without OK or Reject.
- By default, show only the items that need the parent: open and flagged items. Hide decided, superseded and finished
  items behind a "show all" switch, but keep the items that he decides during a visit visible until he leaves the
  page, so that he can change them. Hide items that left the game (retired).
  Example (clock): the parent asked to hide what needs no more attention from him. He reviewed "the tower is finished"
  after the tower was gone: "is there still a tower?".
- Give the parent a short "needs you" list: only what you need him to check now, each with one line on what to check
  and why. Keep sample and full review as other views.
- In review, show a visual of the game context next to each sound, and write where the sound is used in the game.
  Example (clock): the clock face that shows the time next to its phrase.
- In review, hide the word of a picture by default. Show it only when the parent hovers over the picture or taps it.
  Reason: the parent first looks at the picture as the child does, with no name given. Then he checks the word.
  Example (English course): "could be a skillet", "could be a chick".
- Show the model and settings in each take's label. Example (tower): "Will · v4 · take 1".

## Takes and the game

- Check takes before you show them to the parent. Measure each audio take (length, voiced bursts). For a large set,
  check each take automatically (speech-to-text against the text, length, rhythm), and let the parent review a sample
  of each pattern and all flagged takes. Offer a full review as an option.
- Generate large sets progressively, in the order that the game needs them. Keep to the cost and rate limits, and run
  requests in parallel within those limits.
- Put items that can be ambiguous in the review.
  Examples (tower): picture names, look-alike symbols, pronunciation, the direction a sprite faces (show it walking).
- When you make new takes, keep the current pick as the first option. Write why you made new takes.
- Use the parent's notes on reviewed items for similar items that are not reviewed yet.
- Put new candidate items in review first. Add them to the game only after the parent keeps them.
  Exception: when the parent says not to wait for review, build the game with the generated takes and replace the takes
  that the parent rejects later.
  Example (clock): the parent asked to build everything and fix rejects later.
- Ship the take that the parent approved. Do not let a newer take that he has not reviewed replace an approved take.
  When you take back a take (a failed test, a reverted spelling), mark it as withdrawn in the pipeline, so that the game
  and the review page skip it. Do not write to the parent's review file for him.
  Example (clock): the parent approved ארבע takes 1 and 2, but the game played the newest take, which he had not heard.
- Do not let automated checks write to live review data.
- Do not stop work while a review is open. Continue, and apply the picks later.
- Record the request of each chosen take in `asset-sources/<game>/`.
  Reason: then you can make a similar take again.
- On a sound card, lead with what the parent must hear: the target as a picture (the word with the sound's letters in red, the letter, the line), a big play button, then the check question. Put model, voice and automatic checks in a folded "Details". Reason: the parent decides in seconds; technical labels hide the important line.
- When an item has several candidate takes, "Pick this one" is the decision. Do not add a second OK that acts on another take.

