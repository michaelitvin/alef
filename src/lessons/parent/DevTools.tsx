// The lessons' developer tools in the parent area (on production too): dev mode (every level open) and the route list.
import { useProgressStore } from '../../stores/progressStore'

export default function LessonsDevTools() {
  const devMode = useProgressStore((s) => s.settings.devMode)
  const setDevMode = useProgressStore((s) => s.setDevMode)
  return (
    <p>
      <label><input type="checkbox" data-dev="dev-mode" checked={!!devMode} onChange={(e) => setDevMode(e.target.checked)} /> Dev mode (every level open)</label>{' '}
      <a data-dev="routes" href="#/debug/routes">All routes</a>
    </p>
  )
}
