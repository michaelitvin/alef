// The course the page plays, for the screens: Duel2App provides it (Hebrew, or English with `?course=en`). A screen
// rendered without a provider plays the Hebrew course, as before the seam.
import { createContext, useContext } from 'react'
import { HEBREW } from './hebrew'
import type { Course } from './types'
import type { Duel2Actions, Duel2Save } from '../store'

const CourseContext = createContext<Course>(HEBREW)

export const CourseProvider = CourseContext.Provider

export const useCourse = (): Course => useContext(CourseContext)

/** a subscription to the open course's save (the cover's purse, stars and bests): Book 2's store, or the English one */
export function useCourseSave<T>(pick: (s: Duel2Save & Duel2Actions) => T): T {
  return useCourse().store()(pick)
}
