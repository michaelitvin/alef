// The page's sequencing, pure: which items show, in which order, and which item is current next. One item at a time:
// only his decision (or Later) moves on to the next item; nothing plays a row of items by itself.
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

/** The first open item in page order: where the page opens, and where a new view starts. */
export const firstOpen = (order: string[], isOpen: (id: string) => boolean): string | null => order.find(isOpen) ?? null

/**
 * After OK, a submitted Reject or Later: the next open item after `id` in page order. At the end it goes round to the
 * open items before `id` (the ones he left for later, or skipped by a tap further down). Never `id` itself; null when
 * nothing else is open, and the view is done.
 */
export function nextOpenAfter(order: string[], id: string, isOpen: (id: string) => boolean): string | null {
  const i = order.indexOf(id)
  const after = order.slice(i + 1).concat(order.slice(0, Math.max(i, 0)))
  return after.find((x) => x !== id && isOpen(x)) ?? null
}

/**
 * The current item after the state comes again (a refresh): the same item while it is still on the page, else the
 * first open item.
 */
export function keepCurrent(order: string[], cur: string | null, isOpen: (id: string) => boolean): string | null {
  return cur && order.includes(cur) ? cur : firstOpen(order, isOpen)
}

/** The view to open with: "needs you" when there is anything in it, else every open item. */
export function firstView(state: PageState): View {
  return state.items.some((i) => i.views.includes('focus')) ? 'focus' : 'open'
}

/** The views other than `view`, each with how many open items it has: the links of the done state. */
export function otherViews(state: PageState, view: View): { view: View; open: number }[] {
  const views: View[] = ['focus', 'open', 'sample', 'all']
  return views
    .filter((v) => v !== view)
    .map((v) => ({ view: v, open: state.items.filter((i) => i.views.includes(v) && i.status === 'open').length }))
}
