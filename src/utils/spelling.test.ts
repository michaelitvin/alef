import { describe, it, expect } from 'vitest'
import nikkudYaml from '../data/nikkud.yaml'
import { decodeWord } from './decodeWord'

const TZEIRE = 'צֵירֶה'.normalize('NFC')
const PATACH = 'פַּתָּח'.normalize('NFC')
type Y = { nikkud: { id: string; name: string }[] }
const byId = (id: string) => (nikkudYaml as Y).nikkud.find((n) => n.id === id)!.name.normalize('NFC')

describe('nikkud spelling', () => {
  it('uses צֵירֶה and פַּתָּח in nikkud.yaml', () => {
    expect(byId('tzeire')).toBe(TZEIRE)
    expect(byId('patach')).toBe(PATACH)
  })
  it('decodeWord says פַּתָּח with dagesh', () => {
    expect(decodeWord('אַבָּא')).toContain(PATACH)
  })
})
