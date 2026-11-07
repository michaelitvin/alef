// Workshop art (generated, see asset-sources/clock/). Missing images fall back to simple SVG in the components.
const files = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.webp', ''), url]),
)
// the boy/girl question shows the wizards of the other games (spec 2026-11-07 girls); preloaded with the rest
import wizardBoy from '../../duel2/assets/img/s-wizard-idle.webp'
import wizardGirl from '../../duel2/assets/img/s-wizard-idle-girl.webp'
IMAGES['wizard-boy'] = wizardBoy
IMAGES['wizard-girl'] = wizardGirl
