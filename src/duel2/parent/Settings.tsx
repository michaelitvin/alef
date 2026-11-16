// Book 2's section in the parent area. For now it shows the old parent screen's game parts (Task 15 moves them here).
import { Parent } from '../screens/Parent'

export default function Book2Settings() {
  return <Parent embedded onClose={() => {}} onGallery={() => {}} />
}
