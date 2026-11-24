# Staging shares production's origin, and prefixes its saves

Production (`release`, at `/alef/`) and staging (`main`, at `/alef/staging/`) are two builds on one GitHub Pages site,
so they share one origin and one localStorage (GitHub Pages gives a repo one site). To keep the child's real saves safe,
`src/shared/stagingStorage.ts` swaps `window.localStorage` in the staging build for a view that adds `staging:` to every
key, and `?copy-prod` copies the production saves into staging after a confirmation.

## Consequences

- Every entry point must import `src/shared/stagingStorage` before anything that reads storage. Import order is the only
  guard, so a new entry point that forgets it reads and writes the child's real saves.
- `?copy-to-prod` is the one route that writes the child's real saves: it copies staging's saves over them (the logs on
  both sides stay). It downloads a copy of the real data first, and refuses while the real game has not run every save
  migration that staging ran (an older build reads other keys). The staging tools page (`staging-tools/`, in the
  staging build only, linked from nowhere) lists all the staging routes.
- Each deploy replaces the whole site, so a push to either branch rebuilds both builds.
