// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryLog } from './log.ts'
import type { GameAdapter } from './model.ts'
import type { PageItem, PageState } from './pageData.ts'
import { startServer } from './server.ts'

let server: Server
let base = ''
let dir = ''
const log = memoryLog()

const game: GameAdapter = {
  id: 'g',
  title: 'Test game',
  log: 'unused',
  media: {},
  sections: [{ id: 'pics', title: 'Pictures' }],
  loadItems: () => [
    { id: 'pic-cat', kind: 'image', section: 'pics', caption: 'cat', hidden: true, nameCheck: true, takes: [{ id: 'cut/cat.webp' }, { id: 'cut2/cat-t1.webp' }] },
    { id: 'snd', kind: 'audio', takes: [{ id: 'cut/snd.mp3' }] },
    { id: 'old', kind: 'audio', retired: 'reworded', takes: [{ id: 'cut/old.mp3' }] },
  ],
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'review-srv-'))
  mkdirSync(join(dir, 'cut'))
  writeFileSync(join(dir, 'cut', 'snd.mp3'), Buffer.from('0123456789'))
  writeFileSync(join(dir, 'secret.txt'), 'no')
  game.media = { cut: join(dir, 'cut') }
  server = startServer({ port: 0, games: [game] }, new Map([['g', log]]))
  await new Promise((r) => server.once('listening', r))
  base = `http://localhost:${(server.address() as AddressInfo).port}/g/`
})
afterAll(() => {
  server.close()
  rmSync(dir, { recursive: true, force: true })
})

const post = (body: unknown) => fetch(base + 'api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

describe('review server', () => {
  it('serves derived state without retired items', async () => {
    const s = (await (await fetch(base + 'api/state')).json()) as PageState
    expect(s.title).toBe('Test game')
    expect(s.items.map((i) => i.id)).toEqual(['pic-cat', 'snd'])
    expect(s.sections.map((x) => x.id)).toEqual(['pics', 'Items'])
    const cat = s.items[0]
    expect(cat).toMatchObject({ hidden: true, nameCheck: true, status: 'open', current: 'cut2/cat-t1.webp' })
    expect(cat.takes.map((t) => t.src)).toEqual(['media/cut2/cat-t1.webp', 'media/cut/cat.webp'])
  })

  it('records a parent decision with the time and returns the item derived again', async () => {
    const r = await post({ type: 'ok', item: 'pic-cat', take: 'cut/cat.webp', only: true })
    const { item } = (await r.json()) as { item: PageItem }
    expect(item).toMatchObject({ status: 'ok', current: 'cut/cat.webp' })
    const all = log.read()
    const e = all[all.length - 1]
    expect(e).toMatchObject({ by: 'parent', type: 'ok', item: 'pic-cat', take: 'cut/cat.webp', only: true })
    expect(Date.parse(e.at!)).not.toBeNaN()
  })

  it('refuses agent events, unknown items and takes from the page', async () => {
    expect((await post({ type: 'accept', item: 'snd', take: 'cut/snd.mp3', source: 'x' })).status).toBe(400)
    expect((await post({ type: 'ok', item: 'nope', take: 'x' })).status).toBe(400)
    expect((await post({ type: 'ok', item: 'snd', take: 'cut/other.mp3' })).status).toBe(400)
  })

  it('serves media with ranges and never outside a media root', async () => {
    const r = await fetch(base + 'media/cut/snd.mp3', { headers: { Range: 'bytes=2-4' } })
    expect(r.status).toBe(206)
    expect(await r.text()).toBe('234')
    expect((await fetch(base + 'media/cut/..%2Fsecret.txt')).status).toBe(404)
    expect((await fetch(base + 'media/nope/snd.mp3')).status).toBe(404)
  })

  it('serves the page with its modules as plain JavaScript', async () => {
    const html = await (await fetch(base)).text()
    expect(html).toContain('<script type="module" src="main.ts">')
    const js = await fetch(base + 'render.ts')
    expect(js.headers.get('content-type')).toMatch(/javascript/)
    expect(await js.text()).not.toMatch(/import type|: PageItem/)
    expect((await fetch(base + '../server.ts')).status).toBe(404)
  })
})
