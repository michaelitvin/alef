# Book 2's run: pure policies, and the controller as their interpreter

Renamed 2026-11-22: Book 2 is Spell Quest, the first duel is its tower, the English path is its English course; old paths and keys below are history (see ADR 0009).

`RunController` held every rule of the run in async methods that awaited timers, read the store and played audio. Its
rules could be tested only end to end, on fake timers, through the real store. Now the parts with their own rules (the
merchant's visit, a drawing round, the flight boss, the pass and its hearts) are pure policies in `src/duel2/policies/`.
Each has a `<visit>(ctx)` that makes its state and a `step(state, event)` that returns the next state and what the run
must do: show, say, play, save, track, and what to wait for. Events carry `at`, the run's clock. The controller does each
step's effects through its seams (the kit for the voice, `Sleeper` for the time, `SavePort` for the saves) and sends
back the end of each wait.

## Why not a state machine library

The flows are short and linear, with a few branches; a pause must keep a visit where it was. A plain state with a
`flow` tag and a switch says that in a few lines, is easy to freeze in a test, and adds no dependency or new notation
for the next reader. A library would add a runtime and a second way to describe what a `switch` already does.

## Consequences

- A policy imports only `logic/` and other policies (the depcruise rule `run-policies-are-pure`); its test has no fake
  timers and no store.
- The controller stays the one place with time: the loop, the broom's tick, the waits. A wait that a pause must not cut
  (the run's end) is an unguarded wait in the controller, not a flag in the policy.
- A policy's step returns effects as data, so their order inside one step is the controller's: a step's sounds, saves
  and telemetry happen together, at once.
- `useRun.test.tsx` keeps only what needs the whole run (voice order, timing, pauses, the gallery); a rule goes to the
  policy's test.
