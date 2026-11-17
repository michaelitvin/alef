// The page's sequencing, pure: which items show, in which order, and what plays next.
import type { PageItem, PageState } from '../pageData.ts'
import type { View } from '../rules.ts'

export interface ShownSection {
  id: string
  title: string
  all: PageItem[]
  shown: PageItem[]
}

/**
 * Items to show in a view. Items he decided during this visit (`touched`) stay visible until he leaves, so that he can
 * change them. Items with a "needs you" line or a flag come first in their section.
 */
export function shownSections(state: PageState, view: View, touched: Set<string>): ShownSection[] {
  const first = (i: PageItem) => (i.ask || i.flagged ? 0 : 1)
  return state.sections.map((s) => {
    const all = state.items.filter((i) => i.section === s.id)
    const shown = all.filter((i) => i.views.includes(view) || touched.has(i.id)).sort((a, b) => first(a) - first(b))
    return { id: s.id, title: s.title, all, shown }
  })
}

/** The page order of the shown items. */
export const pageOrder = (secs: ShownSection[]): string[] => secs.flatMap((s) => s.shown.map((i) => i.id))

/** After OK or a submitted Reject: the next open item after `id` in page order (none at the end). */
export function nextOpenAfter(order: string[], id: string, isOpen: (id: string) => boolean): string | null {
  const i = order.indexOf(id)
  return order.slice(i + 1).find(isOpen) ?? null
}

/** The items a Play all run plays from `from` (or the section's first) to the end of its section. */
export function runFrom(sec: ShownSection, from?: string): string[] {
  const ids = sec.shown.map((i) => i.id)
  const at = from ? ids.indexOf(from) : 0
  return at >= 0 ? ids.slice(at) : ids
}

/** The view to open with: "needs you" when there is anything in it, else every open item. */
export function firstView(state: PageState): View {
  return state.items.some((i) => i.views.includes('focus')) ? 'focus' : 'open'
}
