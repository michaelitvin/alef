# Asset review kit

Shared review for generated sounds and pictures: one item at a time, the parent listens or looks, accepts or rejects
with a note, and the next open item plays. Nothing plays a row of items by itself; "Later" goes on without a decision. The Play button turns into Pause while a sound plays (Pause keeps the position, Play resumes, Replay starts again; Space toggles, R replays). Decisions: [ADR 0006](../../docs/adr/0006-review-decisions-are-an-event-log.md). The parent's rules for
review: [docs/minigame-rules/asset-review.md](../../docs/minigame-rules/asset-review.md).

| File | What it holds |
| --- | --- |
| `model.ts` | Items, takes, events, the game adapter interface |
| `rules.ts` | The take to ship, item state, notes and their states, views, the retake work list (pure) |
| `log.ts` | The append-only decision log (JSON lines, one per game), and who may write which event |
| `legacy.ts` | Import from the old `choices.json`, `retake-queue.json` and the first duel's versioned picks; export back |
| `legacyFiles.ts` | Writes the old files again from the log after each decision, for tools that still read them |
| `pageData.ts` | The derived state the page gets |
| `server.ts` | One server for every game: page, `api/state`, `api/event` (parent events only), media |
| `cli.ts` | The agent CLI (agent events only); usage at the head of the file |
| `page/` | The page shell (`main.ts`), renderers (`render.ts`: audio take, picture with takes, hidden word shown on a tap, notes per take and per item), sequencing (`flow.ts`: the next open item after a decision or Later, the done state), playback (`player.ts`: one item, a failed load leaves a retry) and saving a decision (`save.ts`: tries again after a blip, ignores a double tap) |

Node runs the TypeScript files directly (type stripping); the server strips the page's types when it serves them. The page's
files stay erasable TypeScript only (no parameter properties, enums or namespaces). Text goes out gzipped with an ETag and
media with an ETag, so an unchanged state, page file or take costs a 304, not a new download.

## A game adapter (host-local, never committed)

A `.mjs` file that exports a `GameAdapter` (see `model.ts`): `id`, `title`, `log` (path of the game's log), `media`
(URL prefix to folder), `loadItems()` and optional `sections`. Optional `legacy` names the game's old files (choices, retake queue, and where
to keep the pre-switch copies): the server writes them again after each of the parent's decisions, atomically, and only
while each file still holds what the log exported before the decision; `cli.ts <adapter> legacy-check` compares them. Each item gives its takes in order, oldest first. Mark
`hidden: true` for a picture whose word the game does not show, and `nameCheck: true` to offer a name objection.

```
node tools/review/server.ts <config.mjs>        # config: { host, port, games: [adapter, ...] }
node tools/review/cli.ts <adapter.mjs> retakes  # open notes per item, with the current take
node tools/review/cli.ts <adapter.mjs> ship     # item -> take to ship (sync and provenance read this)
node tools/review/cli.ts <adapter.mjs> answer <item> <note-seq|all> "what I did" [--take <new take>]
```

## For agents

- Ask the CLI for work (`retakes`, `notes`, `open focus`); do not parse the log or the old files.
- After a retake, answer the note it answers. To take a take back, `withdraw` it with the reason. When the parent
  approves in a message, record it with `accept` and his words; never write a parent event for him.
- Automated checks run against a copy of the log, never the live one.

## Card rules

- A picture with several takes is decided by "Pick this one": it OKs that take only, the card shows it at once, and the page moves on. Such an item has no plain OK.
- Every view except "All" shows only items that still need a decision (open, or with an open ask) when the page loads. Items decided during the visit stay until the next load, so they can be changed.
- A sound card leads with `say` (the item's optional picture of the sound: `text`, `mark` ranges shown in red, `kind`, `sub`, `speaker`), or the caption when an adapter gives no `say`. The take label and the automatic check are folded into Details.
