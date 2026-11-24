import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FACING } from '../assets/facing'
import { IMAGES } from '../assets/images'
import { Customer } from './Customer'

describe('customer facing', () => {
  it('every customer picture is in the facing map, and every picture is drawn facing left', () => {
    const ids = Object.keys(IMAGES).filter((k) => k.endsWith('-idle') && k !== 'cuckoo-idle').map((k) => k.replace('-idle', ''))
    expect(ids.sort()).toEqual(Object.keys(FACING).sort())
    for (const [id, f] of Object.entries(FACING)) expect(f, id).toEqual({ idle: 'left', happy: 'left' })
  })
  it('no customer is mirrored: the picture is drawn as it is, in both orientations', () => {
    for (const id of Object.keys(FACING))
      for (const mood of ['idle', 'happy'] as const) {
        const { container, unmount } = render(<Customer id={id} mood={mood} />)
        expect(container.querySelector('img')!.style.transform, `${id} ${mood}`).toBe('')
        unmount()
      }
  })
})
