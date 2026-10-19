// Parent area (text allowed) — filled in by Task 14.
export function Parent({ onClose, onGallery }: { onClose: () => void; onGallery: () => void }) {
  return <div className="d2-parent"><button onClick={onClose}>Close</button><button onClick={onGallery}>Screens</button></div>
}
