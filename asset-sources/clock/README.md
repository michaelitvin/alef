# Clock asset sources

This folder records how each shipped asset of the Clockmaker's Workshop clock game was made.
Use it to make a similar asset, to make a new take of an asset, or to learn which prompt worked.

The generation tools (the ElevenLabs batch generator, the take checker, the sync script, the provenance writer)
and the reference images (the style sheet) are kept outside this repository. This folder holds only the requests,
so that the requests stay with the assets they made.

## `audio.json`

`note` says how the file was made. `files` has one entry for each file in `src/clock/assets/audio/`:

| Field | Contents |
|---|---|
| `id` | The clip id, for example `ph-he-3-15` (a time phrase), `exp-hands-en` (a narrator line), `sfx-chime-1`, `music-1` |
| `kind` | `tts` (voice), `sfx` or `music` |
| `file` | The shipped file in the repo |
| `where` | Where the clip plays in the game |
| `caption` | The text on the screen (voice), or the description of the sound |
| `take` | The chosen take in the pipeline's clip store |
| `request` | The ElevenLabs request of that take: for voice the spoken text with its audio tag, the model, the language code, the voice settings and the seed; for effects the text, length and prompt influence; for music the prompt and length |
| `earlier_takes` | The takes that were made before the chosen one (file and seed), or `null` |

The spoken text can differ from the caption (pronunciation fixes, see the rules). The repo exports the clip catalogue
(id, caption, spoken text, voice settings, where it plays) with `scripts/clock/export-audio-catalog.ts`.

`src/clock/assets/voiceWords.json` holds, for every voice file, the words the voice says (`w`, the spoken text without
its audio tag) and the start time of each word in the shipped file (`t`, seconds, from the ElevenLabs character alignment,
shifted by the silence the sync cut off). The game maps these words onto the caption words
(`src/clock/audio/wordTiming.ts`), so a respelled or split word still lights the right caption word. A test checks that
every voice file has timings that map onto its caption.

Text-to-speech output changes from run to run, even with the same `seed`. Keep the chosen MP3; the request only
tells you how to get a similar take.

## `images.json`

One entry for each picture in `src/clock/assets/img/`:

| Field | Contents |
|---|---|
| `name` | The picture, for example `bear-happy`, `case-cuckoo`, `tower-3` |
| `prompt` | The full Gemini prompt |
| `model` | The Gemini image model |
| `reference` | The reference images that went with the prompt (the style sheet, and for a pose an earlier render of the same subject) |

## Rules

Read [docs/minigame-rules.md](../../docs/minigame-rules.md) before you make new assets. It has the voice,
pronunciation, art and review rules. The tools read their API keys from the environment or from a gitignored `.env`.
Do not commit a key. Do not print a key.
