/** The parent gate's question: a year of birth of an adult, 18 to 100 years before now. Nothing about it is stored. */
export function acceptYear(y: number, now: Date = new Date()): boolean {
  const year = now.getFullYear()
  return Number.isInteger(y) && y >= year - 100 && y <= year - 18
}
