# Book 2 asset sources

This folder records how each shipped asset of Book 2 (letters and syllables) was made. Use it to make a similar asset,
to make a new take of an asset, or to learn which request worked.

The generation tools (the ElevenLabs batch generator, the take checker, the sync script, the provenance writer, the
review page) and the reference images are kept outside this repository. This folder holds only the requests, so that
they stay with the assets they made.

## `audio.json`

One entry for each file in `src/duel2/assets/audio/`:

| Field | Contents |
|---|---|
| `id` | The clip id: `syl-<sound>-<vowel group>` (a syllable sound, e.g. `syl-b-a`; `0` = a silent letter), `ln-<item>` (a letter name), `w-<word>` (a word), `<line>-<n>` (a wizard line variation), `sfx-<name>-<n>`, `music-<kind>-<n>` |
| `kind` | `tts` (voice), `sfx` or `music` |
| `file` | The shipped file in the repo |
| `where` | Where the clip plays in the game |
| `caption` | The text the clip says (voice), or empty |
| `take` | The chosen take in the pipeline's clip store |
| `request` | The ElevenLabs request of that take: the spoken text with its audio tag, the model, the language code, the voice settings and the seed (voice); the text, length and prompt influence (effects); the prompt and length (music) |
| `earlier_takes` | The takes made before the chosen one (file and seed), or `null` |

The spoken text can differ from the caption (pronunciation fixes, see the rules). The repo exports the clip catalogue
(id, caption, spoken text, voice settings, where it plays, the glyph to show in review) with
`node scripts/duel2/export-audio-catalog.ts`.

## `images.json`

One entry for each image in `src/duel2/assets/img/`: `{name, prompt, reference, model}`.
