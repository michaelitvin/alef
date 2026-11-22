// Types that the run (controller.ts) and the screens share, kept out of components/ so that the run never imports a view.

/**
 * the part of a syllable an explanation's step lights while it is spoken; the ladder's demo (course.ladderDemo) lights the
 * foot rung ('foot') and the place the new letter goes ('gap')
 */
export type Highlight = 'letter' | 'vowel' | 'all' | 'left' | 'right' | 'none' | 'foot' | 'gap'
