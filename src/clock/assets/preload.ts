// Loads what the workshop shows and says before it starts (the playtest: "the fonts jump between print and cursive, and
// some assets load late"). The caption fonts load only when a caption first uses them, so the first cursive caption showed
// in a print fallback and then changed; cases and customers popped in after the clock.
// Waits for the fonts and the images (at most READY_MS); then the effects and the narrator and customer lines load in
// the background. The 576 time phrases are not preloaded here: each round preloads its own.
import { getHowl } from '../../shared/audioCore'
import { IMAGES } from './images'
import { SFX_URLS, VOICE_URLS } from './audioFiles'

/** the most play waits (a slow phone connection; the play button shows a turning ring meanwhile) */
export const READY_MS = 8000
/** Each font with a sample in its script, so the browser fetches the right file. */
const FONTS: [string, string][] = [["1em 'Dana Yad'", 'אבג'], ["1em 'Sigalit'", 'אבג'], ["1em 'Andika'", 'abc']]
/** Decoded images stay referenced, so the browser keeps them ready to paint. */
const kept: HTMLImageElement[] = []
let ready: Promise<void> | null = null

function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    kept.push(img)
    img.onload = () => { void (img.decode?.() ?? Promise.resolve()).catch(() => {}).then(() => resolve()) }
    img.onerror = () => resolve()
    img.src = src
  })
}

/**
 * The narrator and customer lines go into the HTTP cache with plain fetches, a few at a time, after the fonts and images.
 * Not one html5 audio element each: Chrome aborted those fetches, and phones cap the audio players a page may have.
 */
async function warmLines(urls: string[], parallel = 4) {
  const queue = [...urls]
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) await fetch(url).then((r) => r.blob()).catch(() => {})
  }
  await Promise.all(Array.from({ length: parallel }, worker))
}

/** Starts loading (once) and resolves when the fonts and images are ready, or after READY_MS. Never rejects. */
export function preloadClockAssets(): Promise<void> {
  if (ready) return ready
  const fonts = typeof document !== 'undefined' && document.fonts
    ? FONTS.map(([f, sample]) => document.fonts.load(f, sample).then(() => {}, () => {}))
    : []
  const images = Object.values(IMAGES).map(loadImage)
  const all = Promise.all([...fonts, ...images]).then(() => {})
  ready = Promise.race([all, new Promise<void>((r) => window.setTimeout(r, READY_MS))])
  // then the sounds, in the background: the effects (Web Audio, small) and the lines
  void ready.then(() => {
    for (const takes of Object.values(SFX_URLS)) for (const url of takes) getHowl(url)
    if (typeof fetch === 'function') void warmLines(Object.entries(VOICE_URLS).filter(([id]) => !id.startsWith('ph-')).map(([, url]) => url))
  })
  return ready
}
