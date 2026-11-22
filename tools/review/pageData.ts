// What the server sends the page: derived state only. The page computes no rule of its own.
import type { GameAdapter, Item, Say, Section } from './model.ts'
import type { ItemState, Note, Status, Verdict, View } from './rules.ts'
import { inView } from './rules.ts'

export interface PageTake {
  id: string
  src: string
  label: string
  mirror: boolean
  verdict: Verdict | null
  /** OK comment or reject note. */
  text?: string
  source?: string
  check?: string
  flags: string[]
  current: boolean
}

export interface PageItem {
  id: string
  kind: Item['kind']
  section: string
  caption: string
  hidden: boolean
  nameCheck: boolean
  where?: string
  lang?: string
  glyph?: string
  say?: Say
  picture?: string
  compare?: { src: string; label?: string; mirror: boolean }
  status: Status
  current: string | null
  /** Takes not withdrawn, newest first. */
  takes: PageTake[]
  itemNote: Note | null
  name: Note | null
  /** Notes an agent answered, waiting for him to look again. */
  answered: Note[]
  ask: string | null
  /** The take an open ask is about: OK and Reject act on it. */
  askTake: string | null
  flagged: boolean
  views: View[]
}

export interface PageState {
  title: string
  sections: Section[]
  items: PageItem[]
}

const VIEWS: View[] = ['focus', 'open', 'sample', 'all']

/** URL path of a take or picture under the game's media route. */
export function mediaUrl(src: string): string {
  return 'media/' + src.split('#')[0].split('/').map(encodeURIComponent).join('/')
}

export function toPageItem(s: ItemState): PageItem {
  const it = s.item
  const takes = s.takes
    .filter((t) => !t.withdrawn)
    .map(
      (t): PageTake => ({
        id: t.take.id,
        src: mediaUrl(t.take.src ?? t.take.id),
        label: t.take.label ?? t.take.id,
        mirror: t.take.mirror ?? t.take.id.endsWith('#mirrored'),
        verdict: t.verdict,
        text: t.text,
        source: t.source,
        check: t.take.check,
        flags: t.take.flags ?? [],
        current: t.take.id === s.current?.id,
      }),
    )
    .reverse()
  return {
    id: it.id,
    kind: it.kind,
    section: it.section ?? 'Items',
    caption: it.caption ?? it.id,
    hidden: !!it.hidden,
    nameCheck: !!it.nameCheck,
    where: it.where,
    lang: it.lang,
    glyph: it.glyph,
    say: it.say,
    picture: it.picture ? mediaUrl(it.picture) : undefined,
    compare: it.compare ? { src: mediaUrl(it.compare.src), label: it.compare.label, mirror: !!it.compare.mirror } : undefined,
    status: s.status,
    current: s.current?.id ?? null,
    takes,
    itemNote: s.itemNote,
    name: s.name,
    answered: s.notes.filter((n) => n.state === 'answered'),
    ask: s.ask,
    askTake: s.askTake,
    flagged: s.flagged,
    views: VIEWS.filter((v) => inView(s, v)),
  }
}

/** The page's whole state. Retired items are left out: they left the game. */
export function toPageState(adapter: Pick<GameAdapter, 'title' | 'sections'>, states: ItemState[]): PageState {
  const items = states.filter((s) => s.status !== 'retired').map(toPageItem)
  const known = new Map((adapter.sections ?? []).map((s, i) => [s.id, { ...s, order: s.order ?? i }]))
  for (const it of items) if (!known.has(it.section)) known.set(it.section, { id: it.section, title: it.section, order: 1000 + known.size })
  const sections = [...known.values()].filter((s) => items.some((i) => i.section === s.id)).sort((a, b) => a.order - b.order)
  return { title: adapter.title, sections, items }
}
