// The lessons' audio: letter names and syllables through TTS (the recorded-file fallback for letter names stays).
import { getTTS, isTTSEnabled, preloadTTS } from '../services/tts'

/**
 * Hebrew letter names for TTS
 */
const LETTER_NAMES_HEBREW: Record<string, string> = {
  alef: 'אָלֶף',
  bet: 'בֵּית',
  gimel: 'גִּימֶל',
  dalet: 'דָּלֶת',
  he: 'הֵא',
  vav: 'וָו',
  zayin: 'זַיִן',
  chet: 'חֵת',
  tet: 'טֵית',
  yod: 'יוֹד',
  kaf: 'כָּף',
  lamed: 'לָמֶד',
  mem: 'מֵם',
  nun: 'נוּן',
  samech: 'סָמֶך',
  ayin: 'עַיִן',
  pe: 'פֵּא',
  tsadi: 'צָדִי',
  qof: 'קוֹף',
  resh: 'רֵישׁ',
  shin: 'שִׁין',
  tav: 'תָּו',
  // Final forms (sofiyot)
  'kaf-sofit': 'כָּף סוֹפִית',
  'mem-sofit': 'מֵם סוֹפִית',
  'nun-sofit': 'נוּן סוֹפִית',
  'pe-sofit': 'פֵּא סוֹפִית',
  'tsadi-sofit': 'צָדִי סוֹפִית',
}

/** Base path for recorded audio files (Vite's base URL, so it works in dev and production) */
const AUDIO_BASE_PATH = `${import.meta.env.BASE_URL}assets/audio`

/**
 * Get letter name audio - uses TTS if enabled, otherwise falls back to pre-recorded
 * Uses [letter_name] context prefix for better TTS articulation
 * @param priority - If true, skip queue for immediate playback
 */
export async function getLetterNameAudio(letterId: string, priority = true): Promise<string> {
  if (isTTSEnabled() && LETTER_NAMES_HEBREW[letterId]) {
    return getTTS(`[letter_name]${LETTER_NAMES_HEBREW[letterId]}`, undefined, priority)
  }
  return `${AUDIO_BASE_PATH}/letters/${letterId}-name.mp3`
}

/**
 * Get TTS for a syllable (consonant + vowel) with context prefix
 * @param priority - If true, skip queue for immediate playback
 */
export async function getSyllableSoundTTS(sound: string, priority = true): Promise<string> {
  return getTTS(`[syllable]${sound}`, undefined, priority)
}

/**
 * Preload TTS for specific letter IDs
 * Uses [letter_name] prefix to match getLetterNameAudio cache keys
 */
export async function preloadLetterNamesByIds(letterIds: string[]): Promise<void> {
  if (!isTTSEnabled()) return
  const texts = letterIds
    .map(id => LETTER_NAMES_HEBREW[id])
    .filter((name): name is string => !!name)
    .map(name => `[letter_name]${name}`)
  if (texts.length > 0) {
    await preloadTTS(texts)
  }
}
