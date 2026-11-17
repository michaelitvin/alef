// Writes the old review files from the log, for tools that still read them. The log stays the only source: a file is
// written only when it holds exactly what the log held before the new decision (so a hand edit or a stale file is never
// overwritten), atomically (a temporary file and a rename), and the pre-switch file is kept first.
import { constants, copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { legacyViews, sameJson } from './legacy.ts'
import type { LegacyFiles, ReviewEvent } from './model.ts'

function readOr(path: string, empty: unknown): unknown {
  if (!existsSync(path)) return empty
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

/**
 * Write each old file again after new events. `before` is the log before the new events, `after` the log with them.
 * Returns what was written and why a file was left alone; it never throws for one file.
 */
export function writeLegacyFiles(v: LegacyFiles, before: ReviewEvent[], after: ReviewEvent[]): { written: string[]; skipped: string[] } {
  const written: string[] = []
  const skipped: string[] = []
  let was: ReturnType<typeof legacyViews>
  let now: ReturnType<typeof legacyViews>
  try {
    was = legacyViews(v, before)
    now = legacyViews(v, after)
  } catch (err) {
    return { written, skipped: [`${v.choices}: no export (${(err as Error).message})`] }
  }
  now.forEach((view, i) => {
    try {
      if (sameJson(view.data, was[i].data)) return
      const disk = readOr(view.path, view.empty)
      if (!sameJson(disk, was[i].data)) {
        skipped.push(`${view.path}: differs from the log's export, not written`)
        return
      }
      if (existsSync(view.path) && !existsSync(view.frozen)) copyFileSync(view.path, view.frozen, constants.COPYFILE_EXCL)
      const tmp = `${view.path}.kit-tmp`
      writeFileSync(tmp, JSON.stringify(view.data, null, 1))
      renameSync(tmp, view.path)
      written.push(view.path)
    } catch (err) {
      skipped.push(`${view.path}: ${(err as Error).message}`)
    }
  })
  return { written, skipped }
}
