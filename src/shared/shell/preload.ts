// Loads what a game shows before its first screen (rule: no font change or late picture while he looks). Waits for the
// fonts and the images (at most READY_MS); then the effects and the voice lines warm in the background.
//
//   export const preloadMyGame = createPreloader({ fonts, images: IMAGES, voices: VOICE_URLS, skipVoice, sfx: preloadSfx })

/** the most play waits (a slow phone connection; the play button shows a turning ring meanwhile) */
export const READY_MS = 8000

export interface PreloadConfig {
  /** each font with a sample in its script, so the browser fetches the right file */
  fonts: [string, string][]
  /** every picture of the game: each one loads and decodes before play */
  images: Record<string, string>
  /** the voice lines, warmed into the HTTP cache after the fonts and images */
  voices: Record<string, string>
  /** lines that are not warmed here (each round preloads its own) */
  skipVoice?: (id: string) => boolean
  /** starts loading the effects, after the fonts and images */
  sfx?: () => void
}

/** Decoded images stay referenced, so the browser keeps them ready to paint. */
const kept: HTMLImageElement[] = []

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
 * The lines go into the HTTP cache with plain fetches, a few at a time. Not one html5 audio element each: Chrome
 * aborted those fetches, and phones cap the audio players a page may have.
 */
async function warm(urls: string[], parallel = 4) {
  const queue = [...urls]
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) await fetch(url).then((r) => r.blob()).catch(() => {})
  }
  await Promise.all(Array.from({ length: parallel }, worker))
}

/** A game's preload: starts loading on the first call (once); resolves when the fonts and images are ready, or after READY_MS. Never rejects. */
export function createPreloader(c: PreloadConfig): () => Promise<void> {
  let ready: Promise<void> | null = null
  return () => {
    if (ready) return ready
    const fonts = typeof document !== 'undefined' && document.fonts
      ? c.fonts.map(([f, sample]) => document.fonts.load(f, sample).then(() => {}, () => {}))
      : []
    const all = Promise.all([...fonts, ...Object.values(c.images).map(loadImage)]).then(() => {})
    ready = Promise.race([all, new Promise<void>((r) => window.setTimeout(r, READY_MS))])
    void ready.then(() => {
      c.sfx?.()
      if (typeof fetch === 'function') void warm(Object.entries(c.voices).filter(([id]) => !c.skipVoice?.(id)).map(([, u]) => u))
    })
    return ready
  }
}
