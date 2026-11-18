// The English course: a placeholder until its content is built (the later English tasks replace it); `loadCourse('en')`
// reaches it by dynamic import. Nothing opens it while English is unavailable (./available.ts).
import type { Course } from '../duel2/course/types'

export const ENGLISH: Course = (() => { throw new Error('the English course is not built yet') })()
