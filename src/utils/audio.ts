import { preloadAudio } from '../hooks/useAudio'
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

/**
 * Nikkud names for TTS
 */
const NIKKUD_NAMES_HEBREW: Record<string, string> = {
  patach: 'פַּתָּח',
  kamatz: 'קָמָץ',
  segol: 'סֶגוֹל',
  tsere: 'צֵירֵי',
  chirik: 'חִירִיק',
  cholam: 'חוֹלָם',
  kubutz: 'קֻבּוּץ',
  shuruk: 'שׁוּרוּק',
  shva: 'שְׁוָא',
}

/**
 * Audio manifest entry
 */
export interface AudioEntry {
  file: string
  status: 'recorded' | 'pending'
}

/**
 * Audio manifest structure
 */
export interface AudioManifest {
  letters: Record<
    string,
    {
      name: AudioEntry
      sound: AudioEntry
    }
  >
  nikkud: Record<
    string,
    {
      name: AudioEntry
      sound: AudioEntry
    }
  >
  combinations: Record<string, AudioEntry>
  words: Record<string, AudioEntry>
  sentences: Record<string, AudioEntry>
  effects: Record<string, AudioEntry>
}

/**
 * Base path for audio files
 * Uses Vite's base URL to ensure correct path in both dev and production
 */
const AUDIO_BASE_PATH = `${import.meta.env.BASE_URL}assets/audio`

/**
 * Get the full path for an audio file
 */
export function getAudioPath(
  category: 'letters' | 'nikkud' | 'combinations' | 'words' | 'sentences' | 'effects',
  filename: string
): string {
  return `${AUDIO_BASE_PATH}/${category}/${filename}`
}

/**
 * Get letter audio paths (for pre-recorded files)
 */
export function getLetterAudioPaths(letterId: string): {
  name: string
  sound: string
} {
  return {
    name: getAudioPath('letters', `${letterId}-name.mp3`),
    sound: getAudioPath('letters', `${letterId}-sound.mp3`),
  }
}

/**
 * Get letter name audio - uses TTS if enabled, otherwise falls back to pre-recorded
 * Uses [letter_name] context prefix for better TTS articulation
 * @param priority - If true, skip queue for immediate playback
 */
export async function getLetterNameAudio(letterId: string, priority = true): Promise<string> {
  if (isTTSEnabled() && LETTER_NAMES_HEBREW[letterId]) {
    return getTTS(`[letter_name]${LETTER_NAMES_HEBREW[letterId]}`, undefined, priority)
  }
  return getAudioPath('letters', `${letterId}-name.mp3`)
}

/**
 * Get TTS for a vowel sound (nikkud) with context prefix
 * @param priority - If true, skip queue for immediate playback
 */
export async function getVowelSoundTTS(sound: string, priority = true): Promise<string> {
  return getTTS(`[vowel_sound]${sound}`, undefined, priority)
}

/**
 * Get TTS for a consonant sound with context prefix
 * @param priority - If true, skip queue for immediate playback
 */
export async function getConsonantSoundTTS(sound: string, priority = true): Promise<string> {
  return getTTS(`[consonant_sound]${sound}`, undefined, priority)
}

/**
 * Get TTS for a syllable (consonant + vowel) with context prefix
 * @param priority - If true, skip queue for immediate playback
 */
export async function getSyllableSoundTTS(sound: string, priority = true): Promise<string> {
  return getTTS(`[syllable]${sound}`, undefined, priority)
}

/**
 * Get word audio - uses TTS if enabled
 * @param priority - If true, skip queue for immediate playback
 */
export async function getWordAudio(word: string, priority = true): Promise<string> {
  if (isTTSEnabled()) {
    return getTTS(word, undefined, priority)
  }
  // Fallback to pre-recorded (by word ID/slug)
  return getAudioPath('words', `${word}.mp3`)
}

/**
 * Get sentence audio - uses TTS if enabled
 * @param priority - If true, skip queue for immediate playback
 */
export async function getSentenceAudio(sentence: string, priority = true): Promise<string> {
  if (isTTSEnabled()) {
    return getTTS(sentence, undefined, priority)
  }
  // Fallback to pre-recorded
  return getAudioPath('sentences', `${sentence}.mp3`)
}

/**
 * Get nikkud name audio - uses TTS if enabled
 * @param priority - If true, skip queue for immediate playback
 */
export async function getNikkudNameAudio(nikkudId: string, priority = true): Promise<string> {
  if (isTTSEnabled() && NIKKUD_NAMES_HEBREW[nikkudId]) {
    return getTTS(NIKKUD_NAMES_HEBREW[nikkudId], undefined, priority)
  }
  return getAudioPath('nikkud', `${nikkudId}-name.mp3`)
}

/**
 * Get combination audio (letter + nikkud) - uses TTS if enabled
 * @param priority - If true, skip queue for immediate playback
 */
export async function getCombinationAudio(
  letter: string,
  nikkudChar: string,
  priority = true
): Promise<string> {
  if (isTTSEnabled()) {
    // Combine the letter with the nikkud character for TTS
    return getTTS(`${letter}${nikkudChar}`, undefined, priority)
  }
  // Fallback to pre-recorded
  return getAudioPath('combinations', `${letter}-${nikkudChar}.mp3`)
}

/**
 * Preload TTS for letter names (when TTS is enabled)
 * Uses [letter_name] prefix to match getLetterNameAudio cache keys
 */
export async function preloadLetterNamesTTS(): Promise<void> {
  if (!isTTSEnabled()) return
  const texts = Object.values(LETTER_NAMES_HEBREW).map(name => `[letter_name]${name}`)
  await preloadTTS(texts) // preloadTTS uses priority=false internally
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

/**
 * Preload TTS for nikkud names (when TTS is enabled)
 */
export async function preloadNikkudNamesTTS(): Promise<void> {
  if (!isTTSEnabled()) return
  const texts = Object.values(NIKKUD_NAMES_HEBREW)
  await preloadTTS(texts)
}

/**
 * Preload TTS for specific text strings (sounds, words, sentences)
 */
export async function preloadSounds(sounds: string[]): Promise<void> {
  if (!isTTSEnabled()) return
  if (sounds.length > 0) {
    await preloadTTS(sounds)
  }
}

/**
 * Get nikkud audio paths
 */
export function getNikkudAudioPaths(nikkudId: string): {
  name: string
  sound: string
} {
  return {
    name: getAudioPath('nikkud', `${nikkudId}-name.mp3`),
    sound: getAudioPath('nikkud', `${nikkudId}-sound.mp3`),
  }
}

/**
 * Get combination audio path
 */
export function getCombinationAudioPath(letterId: string, nikkudId: string): string {
  return getAudioPath('combinations', `${letterId}-${nikkudId}.mp3`)
}

/**
 * Get word audio path
 */
export function getWordAudioPath(wordId: string): string {
  return getAudioPath('words', `${wordId}.mp3`)
}

/**
 * Get sentence audio path
 */
export function getSentenceAudioPath(sentenceId: string): string {
  return getAudioPath('sentences', `${sentenceId}.mp3`)
}

/**
 * Get effect audio path
 */
export function getEffectAudioPath(effectName: string): string {
  return getAudioPath('effects', `${effectName}.mp3`)
}

/**
 * Preload audio for a specific level node
 */
export function preloadNodeAudio(
  nodeId: string,
  level: 'letters' | 'nikkud' | 'words' | 'sentences'
): void {
  const paths: string[] = []

  // Extract the content ID from the node ID (e.g., 'letters-alef' -> 'alef')
  const contentId = nodeId.split('-').slice(1).join('-')

  switch (level) {
    case 'letters': {
      const letterPaths = getLetterAudioPaths(contentId)
      paths.push(letterPaths.name, letterPaths.sound)
      break
    }
    case 'nikkud': {
      const nikkudPaths = getNikkudAudioPaths(contentId)
      paths.push(nikkudPaths.name, nikkudPaths.sound)
      break
    }
    case 'words': {
      paths.push(getWordAudioPath(contentId))
      break
    }
    case 'sentences': {
      paths.push(getSentenceAudioPath(contentId))
      break
    }
  }

  preloadAudio(paths)
}

/**
 * Preload audio for the next N nodes
 */
export function preloadNextNodes(
  nodeIds: string[],
  level: 'letters' | 'nikkud' | 'words' | 'sentences',
  count: number = 2
): void {
  const nodesToPreload = nodeIds.slice(0, count)
  nodesToPreload.forEach((nodeId) => preloadNodeAudio(nodeId, level))
}

/**
 * Preload essential UI sound effects
 */
export function preloadEffects(): void {
  const effects = ['success', 'error', 'tap', 'unlock', 'celebrate']
  const paths = effects.map((effect) => getEffectAudioPath(effect))
  preloadAudio(paths)
}

/**
 * Check if an audio file exists (returns false if 404)
 */
export async function audioExists(path: string): Promise<boolean> {
  try {
    const response = await fetch(path, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Audio preloader class for managing background loading
 */
export class AudioPreloader {
  private loadedNodes: Set<string> = new Set()
  private loading: Set<string> = new Set()

  /**
   * Preload a node's audio if not already loaded
   */
  async preloadNode(
    nodeId: string,
    level: 'letters' | 'nikkud' | 'words' | 'sentences'
  ): Promise<void> {
    if (this.loadedNodes.has(nodeId) || this.loading.has(nodeId)) {
      return
    }

    this.loading.add(nodeId)

    try {
      preloadNodeAudio(nodeId, level)
      this.loadedNodes.add(nodeId)
    } finally {
      this.loading.delete(nodeId)
    }
  }

  /**
   * Preload audio for current node and next N nodes
   */
  async preloadWithLookahead(
    currentNodeId: string,
    allNodeIds: string[],
    level: 'letters' | 'nikkud' | 'words' | 'sentences',
    lookahead: number = 2
  ): Promise<void> {
    const currentIndex = allNodeIds.indexOf(currentNodeId)
    if (currentIndex === -1) return

    // Preload current node
    await this.preloadNode(currentNodeId, level)

    // Preload next N nodes in background
    const nextNodes = allNodeIds.slice(currentIndex + 1, currentIndex + 1 + lookahead)
    nextNodes.forEach((nodeId) => {
      this.preloadNode(nodeId, level).catch(console.error)
    })
  }

  /**
   * Check if a node's audio is loaded
   */
  isLoaded(nodeId: string): boolean {
    return this.loadedNodes.has(nodeId)
  }

  /**
   * Clear preloader state
   */
  clear(): void {
    this.loadedNodes.clear()
    this.loading.clear()
  }
}

// Singleton instance
export const audioPreloader = new AudioPreloader()
