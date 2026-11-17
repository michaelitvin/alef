// Space Cat's preload (src/shared/shell/preload.ts): the 9 pictures before the cover's play starts.
import { createPreloader } from '../../shared/shell/preload'
import { IMAGES } from './images'

const FLAT: Record<string, string> = {
  bg: IMAGES.bg, thumbs: IMAGES.thumbs,
  ...Object.fromEntries(IMAGES.ships.map((u, i) => [`ship-${i + 1}`, u])),
  ...Object.fromEntries(IMAGES.surfaces.map((u, i) => [`surface-${i + 1}`, u])),
}
export const preloadSpaceCat = createPreloader({ fonts: [], images: FLAT, voices: {} })
