// A page that the browser restores from its back/forward cache keeps its stores in memory as they were when he left it.
// Book 2 and the alef app are two pages that share saves (Book 2's tower records into the progress save): without this,
// the next write of the restored page would put its old copy back and undo what the other page saved meanwhile.
interface Persisted { persist: { rehydrate: () => unknown } }

/** read the stores' saves again whenever the page is restored from the cache; returns the clean-up */
export function rehydrateOnRestore(...stores: Persisted[]): () => void {
  const on = (e: Event) => { if ((e as PageTransitionEvent).persisted) for (const s of stores) void s.persist.rehydrate() }
  window.addEventListener('pageshow', on)
  return () => window.removeEventListener('pageshow', on)
}
