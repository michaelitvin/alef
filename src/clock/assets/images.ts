// Workshop art (generated, see asset-sources/clock/). Missing images fall back to simple SVG in the components.
const files = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.webp', ''), url]),
)
