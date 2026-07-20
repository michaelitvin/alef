import { describe, it, expect } from 'vitest'
import storiesYaml from './stories.yaml'
import type { StoriesData } from '../types/story'
import { decodeWord, stripPunctuation } from '../utils/decodeWord'

const { stories } = storiesYaml as StoriesData

describe('stories.yaml', () => {
  it('has 9 stories', () => {
    expect(stories).toHaveLength(9)
  })

  it('has unique ids', () => {
    const ids = stories.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(stories.map((s) => [s.id, s] as const))(
    '%s has valid questions',
    (_id, story) => {
      expect(story.questions.length).toBeGreaterThanOrEqual(3)
      expect(story.questions.length).toBeLessThanOrEqual(4)
      expect(story.difficulty).toBeGreaterThanOrEqual(1)
      expect(story.difficulty).toBeLessThanOrEqual(3)
      expect(story.emoji.length).toBeGreaterThan(0)
      for (const q of story.questions) {
        expect(q.options).toHaveLength(3)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThanOrEqual(2)
      }
    }
  )

  it.each(stories.map((s) => [s.id, s] as const))(
    'every word in %s decodes without fallback',
    (_id, story) => {
      const texts = [
        story.title,
        ...story.paragraphs,
        ...story.questions.flatMap((q) => [q.question, ...q.options]),
      ]
      for (const text of texts) {
        for (const word of text.split(/\s+/).filter(Boolean)) {
          if (stripPunctuation(word).length === 0) continue // pure punctuation like "—"
          const decoded = decodeWord(word)
          // fallback output contains no " - " separator
          expect(decoded, `word "${word}" did not decode`).toContain(' - ')
        }
      }
    }
  )
})
