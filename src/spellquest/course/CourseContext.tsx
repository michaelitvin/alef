// The course the page plays, for the screens: SpellQuestApp provides it (the page decides the course: Hebrew Spell Quest or English Spell Quest). A screen
// rendered without a provider plays the Hebrew course, as before the seam.
import { createContext, useContext } from 'react'
import { HEBREW } from './hebrew'
import type { Course } from './types'
import type { SpellQuestActions, SpellQuestSave } from '../store'
import { useGender, wizardArt } from '../../shared/player'

const CourseContext = createContext<Course>(HEBREW)

export const CourseProvider = CourseContext.Provider

export const useCourse = (): Course => useContext(CourseContext)

/** a subscription to the open course's save (the cover's purse, stars and bests): Spell Quest's store, or the English one */
export function useCourseSave<T>(pick: (s: SpellQuestSave & SpellQuestActions) => T): T {
  return useCourse().store()(pick)
}

/** the open course's pictures (English: its green files where it has them, else Spell Quest's) */
export const useImages = (): Record<string, string> => useCourse().images

/** The player's wizard picture (s-wizbroom, s-wizard-cast, -dizzy, -idle): the girl wizard (`<name>-girl`) when a girl plays
 * (spec 2026-11-07 girls). Same size and pose as the boy's, so every screen draws it unchanged. */
export function useWizardArt(): (name: string) => string | undefined {
  const gender = useGender()
  const images = useImages()
  return (name) => wizardArt(images, name, gender)
}
