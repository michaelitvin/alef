// Which course a page plays: Hebrew, or English with `?course=en` where English is available (src/spellquest/english/available.ts).
import type { Course, CourseId } from './types'

export function courseIdFromUrl(search: string, available: boolean): CourseId {
  return available && new URLSearchParams(search).get('course') === 'en' ? 'en' : 'he'
}

/** The English course loads by dynamic import, so the Hebrew page never loads English data. */
export async function loadCourse(id: CourseId): Promise<Course> {
  if (id === 'en') return (await import('../english/course')).ENGLISH
  return (await import('./hebrew')).HEBREW
}
