import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ComboBurst } from './ComboBurst'

describe('ComboBurst', () => {
  it('a streak is an event: stars burst across the screen around a big flame with the count (no words)', () => {
    const { container } = render(<ComboBurst combo={10} />)
    expect(container.querySelectorAll('.nd-burst-star').length).toBeGreaterThanOrEqual(12)
    const center = container.querySelector('.nd-burst-center')!
    expect(center.querySelector('[data-icon="flame"]')).toBeTruthy()
    expect(center.textContent).toContain('10')
    expect(container.textContent).not.toMatch(/[A-Za-zא-ת]/) // no letters: he can't read yet
  })
})
