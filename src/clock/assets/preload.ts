// The clock's preload (src/shared/shell/preload.ts). The playtest: "the fonts jump between print and cursive, and some
// assets load late". The 576 time phrases are not warmed here: each round preloads its own.
import { createPreloader } from '../../shared/shell/preload'
import { preloadSfx } from '../audio/clockAudio'
import { IMAGES } from './images'
import { VOICE_URLS } from './audioFiles'

export { READY_MS } from '../../shared/shell/preload'
const FONTS: [string, string][] = [["1em 'Dana Yad'", 'אבג'], ["1em 'Sigalit'", 'אבג'], ["1em 'Andika'", 'abc']]
export const preloadClockAssets = createPreloader({ fonts: FONTS, images: IMAGES, voices: VOICE_URLS, skipVoice: (id) => id.startsWith('ph-'), sfx: preloadSfx })
