import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { PlayerSetting } from './PlayerSetting'
import { getPlayer, setGender } from './player'

describe('PlayerSetting (parent area)', () => {
  beforeEach(() => localStorage.clear())
  it('shows the setting and lets the parent change it (shared by all the games)', () => {
    const onChange = vi.fn()
    const { container } = render(<PlayerSetting onChange={onChange} />)
    expect((container.querySelector('input[value="ask"]') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(container.querySelector('input[value="girl"]')!)
    expect(getPlayer()).toMatchObject({ gender: 'girl', by: 'parent' })
    expect(onChange).toHaveBeenCalledWith('girl')
    fireEvent.click(container.querySelector('input[value="ask"]')!)
    expect(getPlayer()).toBeNull()
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
  it('follows a choice the child made', () => {
    setGender('boy', 'child')
    const { container } = render(<PlayerSetting />)
    expect((container.querySelector('input[value="boy"]') as HTMLInputElement).checked).toBe(true)
  })
})
