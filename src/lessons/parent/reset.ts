// The lessons' reset for the parent area, loaded on demand (parent/index.ts must not import the store). It clears the
// reading course only: the tower's history (`tower` in the same save) belongs to Spell Quest's section and stays.
import { useProgressStore } from '../../stores/progressStore'

export default function resetLessons() {
  const { tower } = useProgressStore.getState()
  useProgressStore.getState().resetProgress()
  useProgressStore.setState({ tower })
}
