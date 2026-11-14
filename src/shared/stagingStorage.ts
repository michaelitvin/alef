// Staging (main, served at /alef/staging/) is on the same origin as production (release, at /alef/), so the two
// share one localStorage. In the staging build, every localStorage key gets a prefix: a staging session never reads
// or changes the child's real saves, and new keys on any branch are covered without a change here.
// Each entry point imports this module first, before any store reads localStorage.
// A parent can open a staging URL with ?copy-prod to replace staging's saves with a copy of production's.

export const STAGING_PREFIX = 'staging:'

export const isStaging = import.meta.env.BASE_URL.endsWith('/staging/')

/** A Storage that keeps its keys under `prefix` in `inner` and sees no other key. */
export function prefixedStorage(inner: Storage, prefix: string): Storage {
  const ownKeys = () => {
    const keys: string[] = []
    for (let i = 0; i < inner.length; i++) {
      const k = inner.key(i)
      if (k?.startsWith(prefix)) keys.push(k.slice(prefix.length))
    }
    return keys
  }
  return {
    get length() { return ownKeys().length },
    key: (i) => ownKeys()[i] ?? null,
    getItem: (k) => inner.getItem(prefix + k),
    setItem: (k, v) => inner.setItem(prefix + k, v),
    removeItem: (k) => inner.removeItem(prefix + k),
    clear: () => ownKeys().forEach((k) => inner.removeItem(prefix + k)),
  }
}

/** Replace the saves under `prefix` with a copy of every save that has no prefix. */
export function copyUnprefixedOver(storage: Storage, prefix: string) {
  const all: string[] = []
  for (let i = 0; i < storage.length; i++) all.push(storage.key(i)!)
  all.filter((k) => k.startsWith(prefix)).forEach((k) => storage.removeItem(k))
  all.filter((k) => !k.startsWith(prefix)).forEach((k) => storage.setItem(prefix + k, storage.getItem(k)!))
}

if (isStaging) {
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.has('copy-prod')) {
      if (window.confirm('Replace all staging saves with a copy of the production saves?')) {
        copyUnprefixedOver(window.localStorage, STAGING_PREFIX)
      }
      url.searchParams.delete('copy-prod')
      window.history.replaceState(null, '', url)
    }
    const prefixed = prefixedStorage(window.localStorage, STAGING_PREFIX)
    Object.defineProperty(window, 'localStorage', { value: prefixed, configurable: true })
  } catch { /* no storage: nothing to keep apart */ }
}
