# Story Reading Game — Design

**Date:** 2026-07-11
**Status:** Approved design, pending implementation plan

## Overview

A new game in the alef Hebrew reading app: a child (~7 years old, first grade) reads a short fully-vocalized Hebrew story and answers comprehension questions. Every word on screen is tappable:

- **First tap** on a word reads it aloud ("אבא").
- **Second tap** on the same word decodes it aloud: letter names + niqqud, ending with the word ("אלף עם קמץ, בית עם דגש ופתח, אלף — אבא").
- **Further taps** on the same word alternate word ↔ decode. Tapping a different word resets its cycle to word-reading.

This works everywhere text appears: story paragraphs, question text, and answer cards.

## Decisions made during brainstorming

| Topic | Decision |
|---|---|
| Content scope | 4 stories at launch, ~40–80 words each, 3–4 questions per story |
| Themes | Animals, adventure/mystery, funny everyday life, magic; one story book-inspired (Mowgli/Shere Khan is public domain; BFG/Harry Potter/Phantom Tollbooth get *original stories in their spirit*, not copies) |
| All audio | Browser TTS (Web Speech API) — no pre-generated files for this game |
| Speech backend | Must be swappable: Hebrew TTS quality is good on Android but poor on Windows/Edge (POC finding). All speech goes through a `SpeechEngine` interface |
| Session flow | Read first, then questions one at a time; story reachable via collapsible panel during quiz |
| Questions | Multiple choice, 3 tappable answer cards; retry on wrong answer |
| Quiz tap rule | Tapping a word in an answer card speaks it; tapping the card outside a word selects the answer |
| Sound effects | Existing mp3 effects (`useSoundEffects`) stay as-is; only speech uses the new engine |

## Architecture

New module following the existing per-game convention (Letters/Nikkud/Words/Sentences):

```
src/
  data/stories.yaml                      # story + question content (pure text, no audio paths)
  types/story.ts                         # Story, StoryQuestion types
  utils/speech/
    types.ts                             # SpeechEngine interface
    webSpeechEngine.ts                   # Web Speech API implementation (default)
  utils/decodeWord.ts                    # pure: vocalized word -> decode sentence
  hooks/useSpeech.ts                     # consumes engine from SpeechProvider context
  components/stories/
    SpeechProvider.tsx                   # supplies the active SpeechEngine + tap-cycle context
    TappableText.tsx                     # renders text as per-word tappable spans
    (quiz/answer-card components as needed)
  pages/Stories/
    StoriesPage.tsx                      # story picker
    StoryReadView.tsx                    # reading screen
    StoryQuizView.tsx                    # question screen
```

Route `/stories`, with a "סִפּוּרִים" entry on the Home screen.

### Data model (`stories.yaml`)

```yaml
stories:
  - id: hakelev-shel-dani
    title: הַכֶּלֶב שֶׁל דָּנִי
    difficulty: 1            # 1-3, controls ordering in the picker
    emoji: 🐶                # cover icon
    paragraphs:              # fully vocalized, 2-4 short paragraphs
      - דָּנִי מָצָא כֶּלֶב קָטָן בַּגַּן...
    questions:
      - question: מָה מָצָא דָּנִי בַּגַּן?
        options: [כֶּלֶב קָטָן, חָתוּל גָּדוֹל, צִפּוֹר]   # short (1-3 words)
        correctIndex: 0
```

- No audio paths: TTS makes stories pure text; adding a story = editing YAML.
- Words are derived by whitespace-splitting at render time (no authored word lists).
- Loaded via the existing `@rollup/plugin-yaml` import path, same as other data files.

### Speech layer

**`SpeechEngine` interface** — the only surface UI code sees:

```ts
interface SpeechEngine {
  speak(text: string, opts?: SpeakOptions): Promise<void>  // resolves on end/error
  cancel(): void
  isAvailable(): boolean          // + readiness handling for async voice loading
}
```

**`WebSpeechEngine`** (default):
- Picks a Hebrew voice (`lang` starts with `he`), preferring local voices; handles async `getVoices()` via `voiceschanged` with a short timeout.
- Speaks at rate ~0.85 (kid-friendly); every `speak()` cancels the previous utterance — last tap wins.
- Respects volume/sound settings from the existing progress store.

**Swappability requirement:** components never touch `speechSynthesis` directly. A future engine (pre-generated mp3 lookup, cloud TTS) is one new class + one line in `SpeechProvider`. `decodeWord()` produces *text*, so any engine can handle the decode path (an mp3 engine would map text → file internally).

### Decode algorithm (`decodeWord`)

Pure function: vocalized word → Hebrew decode sentence.

1. Strip punctuation; split into clusters: base letter + optional dagesh + optional shin/sin dot + optional niqqud mark(s).
2. Map each cluster to a phrase using names from the existing `letters.yaml` / `nikkud.yaml`:
   - `בּ + ַ` → "בית עם דגש ופתח"
   - letter with no niqqud (final א in אבא) → just "אלף"
   - final forms → "מם סופית" etc.; shva → "שווא"; שׁ → "שין", שׂ → "שין שמאלית"
3. Special cases: vav as holam male (וֹ → "חולם מלא") or shuruk (וּ → "שורוק") when vocalic; final kamatz-he; patach genuva under ח/ע at word end.
4. Join with commas, append " — <word>": `"אלף עם קמץ, בית עם דגש ופתח, אלף — אבא"`.

Unknown character → fall back to returning just the word (second tap degrades to repeat-reading) + `console.warn` to catch authoring gaps.

### TappableText & tap-cycle

- Splits text on whitespace; each word is a tappable inline span. RTL flow preserved; punctuation rendered but excluded from speech.
- Tap-cycle state keyed by word *identity* (location, not text) and shared screen-wide via context, so story text, question, and answers form one "last tapped word" space.
- Active word highlights (theme colors + gentle Framer Motion pulse) while speaking.

### Pages & flow

1. **StoriesPage** — card per story (emoji + vocalized title + difficulty stars); completed stories get a badge.
2. **StoryReadView** — title + paragraphs via TappableText, large font, generous line spacing for niqqud; "סִיַּמְתִּי לִקְרֹא ←" button at the bottom.
3. **StoryQuizView** — one question at a time; question + 3 answer cards, all TappableText. Wrong answer: gentle shake + error sound, retry allowed. Right: success sound, advance. Collapsible "הַסִּפּוּר" panel above for peeking back.
4. **Completion** — celebration (existing rewards/confetti pattern), back to picker.
5. **Progress** — story completion + per-question first-try correctness recorded in the existing Zustand `progressStore`; v1 surfaces completion badges only.

## Error handling

- **No Hebrew voice:** one-time kid-friendly banner ("אין קול עברי במכשיר הזה"); taps highlight without sound; game never blocks.
- **Voices not yet loaded:** taps before engine readiness wait for resolution (short timeout) rather than being dropped.
- **Rapid taps:** previous utterance always cancelled.
- **Decode gaps:** fall back to word-only speech, warn in console.
- **Accepted limitation:** some TTS engines mispronounce isolated vocalized words; the swappable engine is the escape hatch.

## Testing

Add **Vitest** (repo currently has no test runner despite CLAUDE.md's `npm test`):

- Table-driven unit tests for `decodeWord` — highest-risk logic (אבא, אמא, בית, ילדה, שולחן, חתול, final letters, shuruk/holam male, patach genuva).
- Unit tests for the tap-cycle reducer (same word alternates; different word resets).
- Component test for `TappableText` with a mock `SpeechEngine`.
- Manual verification on Android Chrome and Windows Edge (real TTS quality can't be automated).

## Out of scope (YAGNI)

- Illustrations/page-turn storybook layout
- Mixed question types (true/false, picture matching)
- Additional speech engines beyond `WebSpeechEngine` (interface only)
- Leveled story library beyond the initial 4
