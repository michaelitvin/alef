# Duel asset sources

This folder records how each shipped asset of the Nikkud Wizard Duel was made.
Use it to make a similar asset, to make a new take of an asset, or to learn which prompt worked.

| File | Contents |
|---|---|
| `audio.json` | One entry for each file in `src/assets/duel/audio/`: the ElevenLabs request of the chosen take, who chose it, the review note, and the earlier attempts (`history`) when a clip needed more than one round. |
| `images.json` | One entry for each file in `src/assets/duel/sprites/`: the Gemini prompt, model, aspect and reference image. Also the retired pictures, with the reason for each. |
| `reference/` | The style concept and the style anchor sheet. Every sprite uses `style-sheet-b.png` as its reference. |
| `tools/gen.py` | ElevenLabs batch generator (speech, sound effects, music). |
| `tools/gen_ref.py` | Gemini image generator with a style-reference image. |
| `tools/export_final.py` | Magenta background → transparent, cropped WebP sprite. |

Read [docs/minigame-rules.md](../../docs/minigame-rules.md) before you make new assets. Its Audio section has the voice and pronunciation rules.

## Keys

The tools read `ELEVENLABS_API_KEY` and `GOOGLE_AI_STUDIO_API_KEY` from the environment or from the repo-root `.env`.
`.env` is gitignored. Do not commit a key. Do not print a key.

## Make audio

1. Write a batch file. Use the `request` objects in `audio.json` as the template:
   ```json
   {"clips": [{"id": "wiz-word-tree", "category": "Words", "title": "עֵץ", "desc": "why this round", "kind": "tts",
     "options": [{"label": "take 1", "voice": "bIHbv24MWmeRgasZH58o", "text": "עֵץ.", "model": "eleven_v4", "lang": "he", "seed": 1}]}]}
   ```
   Give each line 3 or more takes (different `seed`s). Give hard words more takes and more spellings.
2. Run the generator in a work folder outside the repo: `python3 path/to/tools/gen.py batch.json`.
   It writes `clips/` and `manifest.json` into the current folder. Add `--only <id> --force` to make a new version of one clip.
3. Let the parent choose the takes on a review page. Do not ship a voice line that the parent did not hear.
4. Copy the chosen take to `src/assets/duel/audio/voice/<id>.mp3`. Trim the silence at the start and the end.
   Some shipped lines also have a longer pause between sentences (0.7–0.9 s), made with an audio edit after the parent picked the take.
   The game plays speech at 1.15× (`VOICE_RATE`), with the pitch kept.
5. Add the chosen request to `audio.json`.

Text-to-speech output changes from run to run, even with the same `seed`. Keep the chosen MP3; the request only tells you how to get a similar take.

## Make images

1. Write a prompt file. Copy the structure of a prompt in `images.json`: the subject, then the fixed sentences for a single subject on a flat magenta (#FF00FF) background with no text.
2. Render: `python3 tools/gen_ref.py --ref reference/style-sheet-b.png --prompt-file p.txt --out out.png --aspect 1:1`.
3. Export: `SRC='out.png' python3 tools/export_final.py <out-dir>` (set `DEHALO=1` for sprites with a soft glow).
4. Let the parent review the picture without a caption. Ask: what will the child call this?
5. Add the prompt to `images.json`.
