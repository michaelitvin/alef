import { useGender, wizardArt } from '../../shared/player'
// Book 2 art (generated, see asset-sources/duel2/) plus the duel's picture words (`word-<key>`). Missing images fall back to
// simple SVG in the components.
const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.webp', ''), url]))
export const IMAGES: Record<string, string> = {
  ...byName(import.meta.glob('../../assets/duel/sprites/word-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>),
  ...byName(import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>),
}

/** The player's wizard picture (s-wizbroom, s-wizard-cast, -dizzy, -idle): the girl wizard (`<name>-girl`) when a girl plays
 * (spec 2026-11-07 girls). Same size and pose as the boy's, so every screen draws it unchanged. */
export function useWizardArt(): (name: string) => string | undefined {
  const gender = useGender()
  return (name) => wizardArt(IMAGES, name, gender)
}
