// Space Cat's preload (src/shared/shell/preload.ts): the 8 pictures load and decode before play; then the voice lines
// warm in the background. The digits use the system font: no font to load.
import { createPreloader } from '../../shared/shell/preload'
import { preloadSfx } from '../audio/spaceCatAudio'
import { IMAGES } from './images'
import { VOICE_URLS } from './audioFiles'

const PICTURES: Record<string, string> = {
  bg: IMAGES.bg,
  ...Object.fromEntries(IMAGES.ships.map((u, i) => [`ship-${i + 1}`, u])),
  ...Object.fromEntries(IMAGES.surfaces.map((u, i) => [`surface-${i + 1}`, u])),
}
export const preloadSpaceCat = createPreloader({ fonts: [], images: PICTURES, voices: VOICE_URLS, sfx: preloadSfx })
