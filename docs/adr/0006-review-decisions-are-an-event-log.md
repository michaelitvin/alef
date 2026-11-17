# Asset review decisions are an event log; one rule picks the take to ship

Each game had its own review page and server, copied from the last one, and a `choices.json` that the server edited in
place. The rule that picks the take to ship was copied into four pages and three sync scripts, and the copies drifted:
the clock shipped an unreviewed newer take over a take the parent had approved. An OK or a reset deleted the note of a
rejected take, and the retake queue was never pruned, so an agent could not trust it as a work list.

Now the review kit (`tools/review/`) keeps every decision as an event in an append-only log, one log per game. The
take to ship, each item's state, the open notes and the retake work list are derived from the log and the game's items,
in one module (`rules.ts`). The page, the sync and the agent CLI all ask that module.

- **The take to ship**: the newest take the parent approved (his OK, or his approval in a message, relayed by an agent
  as an `accept` event with his words). A newer take he has not heard never replaces it. Without an approval: the
  newest take that is newer than the newest rejected take (the game uses unreviewed takes while the review is open).
  To replace an approved take, an agent withdraws it, with the reason.
- **Notes are work.** A Reject note, a free note on an item and a name objection are open until an agent answers them
  (a new take, a dropped item, a reply). A note on a take that has a newer take counts as answered by that take. His
  next decision closes an answered note. Item notes keep the take that was on screen.
- **Who writes what.** The page writes only the parent's events (`ok`, `reject`, `reset`, `note`, `name`). The CLI
  writes only agent events (`accept`, `answer`, `ask`, `withdraw`, `retire`, `prefer`, ...). Nothing edits or deletes
  a line.
- **Host facts stay out of the repository.** The kit knows no game and no host: a host-local adapter per game gives
  the items, the media folders and the log path. The kit never imports `src/` (a dependency-cruiser rule).

## Consequences

- Until the sync and provenance tools read the CLI, the server writes the old files again from the log after each of
  the parent's decisions (atomically, and only while a file still holds the log's previous export, so a hand edit is
  never overwritten). The old pages added an item to the retake queue with every new Reject; the old queue file keeps
  doing so.
- The old stores import without loss: the importers replay the backups in time order, so notes that the live file lost
  come back as history, and the exporters write the live files back unchanged (a round-trip test, which runs on copies
  of the real files when `REVIEW_LEGACY_DIR` is set).
- The clock's 8 clips with an OK'd older take ship that take under this rule, until the parent re-reviews the newer
  takes or an agent withdraws the old ones on his word.
- Strokes and screens stay in the parent area for now. The kit can add them as more media kinds later.
