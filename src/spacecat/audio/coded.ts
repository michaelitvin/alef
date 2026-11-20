// Space Cat's coded sound as takes of the audio kit: each effect (synth.ts) and the tune (tune.ts) is registered under
// a `coded:` url, which the kit plays behind the player port like a file (src/shared/gameAudio/coded.ts).
import { registerCoded } from '../../shared/gameAudio/coded'
import { SFX_NAMES, sfxSource, type SfxName } from './synth'
import { tuneSource } from './tune'

const sfxUrl = (name: SfxName) => `coded:spacecat/${name}`
export const TUNE_URL = 'coded:spacecat/tune'

/** effect name → its one take */
export const CODED_SFX = Object.fromEntries(SFX_NAMES.map((n) => [n, [sfxUrl(n)]])) as Record<SfxName, string[]>

for (const n of SFX_NAMES) registerCoded(sfxUrl(n), sfxSource(n))
registerCoded(TUNE_URL, tuneSource)
