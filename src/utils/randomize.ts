/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Get N random items from an array
 */
export function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = shuffleArray(array)
  return shuffled.slice(0, count)
}

/**
 * Get a random item from an array
 */
export function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Randomize quiz options for a letter quiz
 * Ensures the correct answer is included and positions are randomized
 */
export function randomizeQuizOptions<T extends { id: string }>(
  correctItem: T,
  distractorIds: string[],
  allItems: T[],
  optionCount: number = 4
): T[] {
  // Get distractor items
  const distractors = distractorIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is T => item !== undefined)

  // If we don't have enough distractors, pick random items
  while (distractors.length < optionCount - 1) {
    const randomItem = getRandomItem(
      allItems.filter(
        (item) =>
          item.id !== correctItem.id &&
          !distractors.some((d) => d.id === item.id)
      )
    )
    if (randomItem) {
      distractors.push(randomItem)
    } else {
      break
    }
  }

  // Combine correct answer with distractors
  const options = [correctItem, ...distractors.slice(0, optionCount - 1)]

  // Shuffle to randomize position of correct answer
  return shuffleArray(options)
}

/**
 * Randomize activity items for a session
 * Shuffles items while optionally limiting the count
 */
export function randomizeActivityItems<T>(
  items: T[],
  maxItems?: number
): T[] {
  const shuffled = shuffleArray(items)
  return maxItems ? shuffled.slice(0, maxItems) : shuffled
}

/**
 * Randomize match pairs
 * Returns pairs with shuffled positions on each side
 */
export function randomizeMatchPairs<T extends { id: string }>(
  items: T[],
  pairCount?: number
): { left: T[]; right: T[] } {
  const selected = pairCount ? getRandomItems(items, pairCount) : items

  return {
    left: shuffleArray([...selected]),
    right: shuffleArray([...selected]),
  }
}

/**
 * Create a seeded random number generator
 * Useful for reproducible randomization
 */
export function createSeededRandom(seed: number) {
  let s = seed

  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/**
 * Shuffle array with seed for reproducibility
 */
export function shuffleArraySeeded<T>(array: T[], seed: number): T[] {
  const random = createSeededRandom(seed)
  const shuffled = [...array]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

/**
 * Generate a session seed based on date (same seed for a day)
 */
export function getDailySessionSeed(): number {
  const today = new Date()
  return (
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate()
  )
}
