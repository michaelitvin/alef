// Tests: type a year on the parent gate's open number pad.
import { act, fireEvent } from '@testing-library/react'

export function enterYear(year: number | string) {
  for (const d of String(year)) {
    const key = document.querySelector(`[data-year-pad] [data-digit="${d}"]`)
    if (!key) throw new Error('the year pad is not open')
    act(() => { fireEvent.click(key) })
  }
}
