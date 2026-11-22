// Spell Quest's preload (src/shared/shell/preload.ts): the syllable lines are not warmed here.
import { createPreloader } from '../../shared/shell/preload'
import { IMAGES } from './images'
import { VOICE_URLS } from './audioFiles'
import { preloadSfx } from '../audio/spellQuestAudio'

export { READY_MS } from '../../shared/shell/preload'
/** Sigalit (print), Dana Yad (the handwriting words), Ktav Yad (shown on the stroke review page) */
export const FONTS: [string, string][] = [["1em 'Sigalit'", 'בָּשִׁ'], ["1em 'Dana Yad'", 'אבג'], ["1em 'Ktav Yad'", 'אבג']]
export const preloadSpellQuestAssets = createPreloader({ fonts: FONTS, images: IMAGES, voices: VOICE_URLS, skipVoice: (id) => id.startsWith('syl-'), sfx: preloadSfx })
