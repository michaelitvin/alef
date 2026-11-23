// Which course a page plays: its entry page says (spellquest-he/ or spellquest-en/); English only where it is available (src/spellquest/english/available.ts).
import type { Course, CourseId } from './types'

export function courseIdFor(requested: CourseId, available: boolean): CourseId {
  return available && requested === 'en' ? 'en' : 'he'
}

/** The English course loads by dynamic import, so the Hebrew page never loads English data. */
export async function loadCourse(id: CourseId): Promise<Course> {
  if (id === 'en') return (await import('../english/course')).ENGLISH
  return (await import('./hebrew')).HEBREW
}
