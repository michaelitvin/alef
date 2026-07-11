/**
 * Story reading game types (see src/data/stories.yaml)
 */
export interface StoryQuestion {
  /** Fully vocalized Hebrew question */
  question: string
  /** Exactly 3 short vocalized answer options */
  options: string[]
  /** Index (0-2) of the correct option */
  correctIndex: number
}

export interface Story {
  id: string
  /** Fully vocalized Hebrew title */
  title: string
  /** 1-3; controls ordering in the picker */
  difficulty: number
  /** Cover icon for the story list */
  emoji: string
  /** Fully vocalized paragraphs */
  paragraphs: string[]
  questions: StoryQuestion[]
}

export interface StoriesData {
  stories: Story[]
}
