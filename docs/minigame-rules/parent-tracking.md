# Parent tracking

- Record correct answers, mistakes, time-outs and usage for each item and each screen type.
- Record what was shown at which position, the time to answer, the clock time and the assets used.
- Record when the child stops or leaves (abandon). Keep the log in localStorage, with a size limit.
- Count special results separately. Do not count them as correct.
  Examples (tower): special-power kills, forgiven twin taps.
- Let the parent export the telemetry. Analyze it with a script that you can use again.
- Remove retired items from the parent's stats.

## Parent settings

- Give every parent setting a label and a one- or two-line explanation that a parent understands without the design.
  Say what the child sees (an example round, such as "7 ◯ 5") and what changes when the setting is on or off. Do not use
  internal words or numbers (rung numbers, step ids, "galaxy").
  Reason: the parent must know what a switch does before he changes it, and other parents use the parent area too.
  Example (Space Cat, the parent, 2026-11-20): "a parent must understand from its label and description what it refers
  to". "Times (rungs 7 and 8)" became "Times (×): from 3 + 3 + 3 to the tables up to 10 × 10".
- In a right-to-left paragraph, put a math example in a left-to-right span. Reason: the browser mirrors `<` and `>` in
  right-to-left text, which changes their meaning.
