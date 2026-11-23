import { expect, it } from 'vitest'
import { englishAvailable } from './available'

it('production sees no English until it is released', () => {
  expect(englishAvailable({ staging: false, dev: false, test: false, released: false })).toBe(false)
  expect(englishAvailable({ staging: true, dev: false, test: false, released: false })).toBe(true)
  expect(englishAvailable({ staging: false, dev: false, test: false, released: true })).toBe(true)
})
