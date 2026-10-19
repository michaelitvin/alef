// Screen gallery (parent) — filled in by Task 14.
import type { RunOpts } from '../controller'
export interface GalleryEntry { id: string; label: string; force: NonNullable<RunOpts['force']> }
export function Gallery({ onBack }: { onBack: () => void; onStart: (e: GalleryEntry) => void }) {
  return <div className="d2-parent"><button onClick={onBack}>Back</button></div>
}
