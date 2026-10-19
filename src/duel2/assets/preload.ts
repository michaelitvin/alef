// Loads what the game shows before the first screen (rule: no font change or late picture while he looks). Waits for the
// fonts and images (at most READY_MS); then the effects and the lines warm in the background.
import { getHowl } from '../../shared/audioCore'
import { IMAGES } from './images'
import { SFX_URLS, VOICE_URLS } from './audioFiles'

export const READY_MS = 8000
const FONTS: [string, string][] = [["1em 'Sigalit'", 'בָּשִׁ']]
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

async function warm(urls: string[], parallel = 4) {
  const queue = [...urls]
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) await fetch(url).then((r) => r.blob()).catch(() => {})
  }
  await Promise.all(Array.from({ length: parallel }, worker))
}

/** Starts loading (once); resolves when the fonts and images are ready, or after READY_MS. Never rejects. */
export function preloadDuel2Assets(): Promise<void> {
  if (ready) return ready
  const fonts = typeof document !== 'undefined' && document.fonts
    ? FONTS.map(([f, sample]) => document.fonts.load(f, sample).then(() => {}, () => {}))
    : []
  const all = Promise.all([...fonts, ...Object.values(IMAGES).map(loadImage)]).then(() => {})
  ready = Promise.race([all, new Promise<void>((r) => window.setTimeout(r, READY_MS))])
  void ready.then(() => {
    for (const takes of Object.values(SFX_URLS)) for (const url of takes) getHowl(url)
    if (typeof fetch === 'function') void warm(Object.entries(VOICE_URLS).filter(([id]) => !id.startsWith('syl-')).map(([, u]) => u))
  })
  return ready
}
