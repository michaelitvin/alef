// The English tower's green look (design Part 2: the wizard fully green): the tower and the wizard's poses, in place of the
// tower's own (src/spellquest/tower/assets/sprites.ts), which the Hebrew board keeps.
import type { TowerArt } from '../../spellquest/tower/assets/sprites'

const files = import.meta.glob('./img/tower-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const file = (name: string): string => {
  const url = files[`./img/tower-${name}.webp`]
  if (!url) throw new Error(`no green file tower-${name}`)
  return url
}

/** every file of the art, for the preload */
export const towerArtUrls = (a: TowerArt): Record<string, string> => ({
  tower: a.tower,
  ...Object.fromEntries(Object.entries(a.wizard).map(([k, v]) => [`wizard-${k}`, v])),
  ...Object.fromEntries(Object.entries(a.wizardGirl).map(([k, v]) => [`wizard-${k}-girl`, v])),
})

export const ENGLISH_TOWER_ART: TowerArt = {
  tower: file('tower'),
  wizard: { idle: file('wizard-idle'), cast: file('wizard-cast'), dizzy: file('wizard-dizzy') },
  wizardGirl: { idle: file('wizard-idle-girl'), cast: file('wizard-cast-girl'), dizzy: file('wizard-dizzy-girl') },
}
