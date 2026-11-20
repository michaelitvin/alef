// The English page's preload (src/shared/shell/preload.ts): the letters' font, the pictures, the voices and effects.
import { createPreloader } from '../../shared/shell/preload'
import { englishAudio } from '../audio'
import { ENGLISH_VOICE_URLS } from './audioFiles'
import { ENGLISH_IMAGES } from './images'
import { ENGLISH_TOWER_ART, towerArtUrls } from './towerArt'

/** Andika: the English letters (single-storey a and g) */
export const ENGLISH_FONTS: [string, string][] = [["1em 'Andika'", 'abg']]
export const preloadEnglishAssets = createPreloader({ fonts: ENGLISH_FONTS, images: { ...ENGLISH_IMAGES, ...towerArtUrls(ENGLISH_TOWER_ART) }, voices: ENGLISH_VOICE_URLS, sfx: englishAudio.preloadSfx })
