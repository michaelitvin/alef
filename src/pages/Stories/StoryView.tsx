import { Navigate } from 'react-router-dom'

/** Placeholder until the story reading view lands (next task) */
export function StoryView() {
  return <Navigate to="/stories" replace />
}

export default StoryView
