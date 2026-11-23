// Spell Quest art (generated, see asset-sources/spellquest/) plus the tower's picture words (`word-<key>`). Missing images fall back to
// simple SVG in the components (the spell book's `s-book` is English Spell Quest's green file; Spell Quest has none and SpellBook draws its pages).
const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.webp', ''), url]))
export const IMAGES: Record<string, string> = {
  ...byName(import.meta.glob('../tower/assets/sprites/word-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>),
  ...byName(import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>),
}
