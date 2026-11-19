# English path asset sources

This folder records how each asset that is only for the English path was made. It follows the format of
[../duel2/README.md](../duel2/README.md). The tools and the working files are kept outside this repository, under
`<scratch>`.

## `images.json`

One entry for each green picture in `src/english/assets/img/`: `{name, source, method, script, review}`.

- `name` is the key of the Book 2 picture it replaces (`src/duel2/assets/img/<name>.webp`).
- The green look turns only the purple of that picture green. The wizard, the crystals, the props and the backgrounds
  are green. The monsters, bosses, merchant, potion, coins, hearts, stars and picture words are not changed.
- A picture with no file in `img/` keeps Book 2's file (`greenImages` in `src/english/assets/images.ts`).
- Ship only a recolour that the parent approved on the asset review. Ask the review kit (`node tools/review/cli.ts english ship`).

The recolours of the home card and of the first duel's own sprites (`card*`, `duel-*`) are approved too, but they are
not Book 2 pictures, so no file of this folder uses them yet.

## `audio.json`

The ElevenLabs requests of the English voices and sounds, one entry for each file in `src/english/assets/audio/`, in the
format of `../duel2/audio.json`. It is written when the voice clips are shipped (the voice tasks), not by this task.
