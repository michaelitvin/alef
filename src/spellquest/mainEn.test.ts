import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { hebrewPageUrl } from './english/available'

const boot = vi.fn()
const replace = vi.fn()

beforeEach(() => {
  vi.resetModules()
  boot.mockReset()
  replace.mockReset()
  vi.stubGlobal('location', { search: '?station=x&a=1', hash: '#/summary', replace })
  vi.doMock('./boot', () => ({ boot }))
})
afterEach(() => { vi.doUnmock('./english/available'); vi.unstubAllGlobals() })

it('the Hebrew url keeps the query and the hash', () => {
  expect(hebrewPageUrl({ search: '?station=x', hash: '#h' })).toBe('../spellquest-he/?station=x#h')
  expect(hebrewPageUrl({ search: '', hash: '' })).toBe('../spellquest-he/')
})

it('where English is open, spellquest-en/ boots the English course', async () => {
  vi.doMock('./english/available', async (orig) => ({ ...(await orig<object>()), ENGLISH_AVAILABLE: true }))
  await import('./main.en')
  await vi.waitFor(() => expect(boot).toHaveBeenCalledWith('en'))
  expect(replace).not.toHaveBeenCalled()
})

it('where English is not open, spellquest-en/ redirects and boots nothing', async () => {
  vi.doMock('./english/available', async (orig) => ({ ...(await orig<object>()), ENGLISH_AVAILABLE: false }))
  await import('./main.en')
  await new Promise((r) => setTimeout(r, 50))
  expect(replace).toHaveBeenCalledWith('../spellquest-he/?station=x&a=1#/summary')
  expect(boot).not.toHaveBeenCalled()
})
