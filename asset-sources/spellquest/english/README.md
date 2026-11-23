# English course asset sources

This folder records how each asset that is only for the English course was made. It follows the format of
[../spellquest/README.md](../README.md). The tools and the working files are kept outside this repository, under
`<scratch>`.

## `images.json`

One entry for each green picture in `src/spellquest/english/assets/img/`: `{name, source, method, script, review}`.

- `name` is the key of the Spell Quest picture it replaces (`src/spellquest/assets/img/<name>.webp`).
- The green look turns only the purple of that picture green. The wizard, the crystals, the props and the backgrounds
  are green. The monsters, bosses, merchant, potion, coins, hearts, stars and picture words are not changed.
- A picture with no file in `img/` keeps the Spell Quest file (`greenImages` in `src/spellquest/english/assets/images.ts`).
- Ship only a recolour that the parent approved on the asset review. Ask the review kit (`node tools/review/cli.ts english ship`).

`tower-*` are the tower's and the wizard's poses; the English tower board draws them (`towerArt.ts`). The home
card's recolours (`card*`) are approved too and belong to the home card task.

## `audio.json`

One entry for each file in `src/spellquest/english/assets/audio/voice/`: `{id, file, take, source_sha256, where, caption, request,
processing, earlier_takes}`. `request` is the Gemini text-to-speech request of the chosen take (model, voice, and the
`prompt`: the direction in brackets followed by the spoken text). `earlier_takes` lists the other takes of the item with
the parent's verdict and note. Text-to-speech output changes from run to run: keep the MP3; the request only gets a
similar take. `gain_db` is the level match: the export measures the active RMS of the source WAV (20 ms frames above -45 dBFS) and applies a gain (-6 to +20 dB, peak kept at or below -1 dBFS) that brings the clip to the median of the word clips, so quiet sounds such as `snd-th` and `snd-ch` play as loud as the words. Written by `node scripts/english/export-assets.ts` (see below), never by hand.

## `pictures.json`

One entry for each word picture `src/spellquest/english/assets/img/pw-<key>.webp`: `{key, file, take, source_sha256, caption, model,
reference, aspect, prompt, processing}`. The prompt is the Gemini image request of the chosen take.

## Shipping the approved assets

`node scripts/english/export-assets.ts --adapter <english adapter of the review kit>` ships every item whose review
status is ok (voice to MP3, mono, 96 kbit/s, with the approved trim and speed; pictures as approved; recolours only where
a file already exists). It encodes again only a file whose approved take changed, rewrites `audio.json` and
`pictures.json`, and prints the approved items with no game id and the game ids with no approved item. Options:
`--dry-run`, `--force`. It needs `gst-launch-1.0` with the lame and xingmux plugins.
