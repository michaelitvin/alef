// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
const hlog = memoryLog()
/** A game whose old files tools still read. */
const legacyGame: GameAdapter = {
  id: 'h',
  title: 'Old files',
  log: 'unused',
  media: {},
  loadItems: () => [{ id: 'v', kind: 'audio', takes: [{ id: 'v/a.mp3', round: 2 }] }],
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'review-srv-'))
  mkdirSync(join(dir, 'cut'))
  writeFileSync(join(dir, 'cut', 'snd.mp3'), Buffer.from('0123456789'))
  writeFileSync(join(dir, 'secret.txt'), 'no')
  game.media = { cut: join(dir, 'cut') }
  legacyGame.legacy = { choices: join(dir, 'choices.json'), queue: join(dir, 'queue.json'), frozenChoices: join(dir, 'choices.pre-kit.json') }
  server = startServer({ port: 0, games: [game, legacyGame] }, new Map([['g', log], ['h', hlog]]))
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

  it("keeps the round of the take, and writes a game's old files again after a decision", async () => {
    const r = await fetch(base.replace(/g\/$/, 'h/api/event'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'reject', item: 'v', take: 'v/a.mp3', text: 'flat' }) })
    expect(r.status).toBe(200)
    expect(hlog.read()[0]).toMatchObject({ type: 'reject', round: 2 })
    const choices = JSON.parse(readFileSync(join(dir, 'choices.json'), 'utf8')) as unknown
    expect(choices).toMatchObject({ v: { ok: [], rejected: [{ file: 'v/a.mp3', note: 'flat' }] } })
    expect(JSON.parse(readFileSync(join(dir, 'queue.json'), 'utf8'))).toEqual(['v'])
  })

  it('serves media with ranges and never outside a media root', async () => {
    const r = await fetch(base + 'media/cut/snd.mp3', { headers: { Range: 'bytes=2-4' } })
    expect(r.status).toBe(206)
    expect(await r.text()).toBe('234')
    expect((await fetch(base + 'media/cut/..%2Fsecret.txt')).status).toBe(404)
    expect((await fetch(base + 'media/nope/snd.mp3')).status).toBe(404)
  })

  it('gzips big text, and answers an unchanged state with a 304', async () => {
    // enough items for the state to be worth compressing
    const items = game.loadItems
    const pads = Array.from({ length: 40 }, (_, i) => ({ id: 'pad' + i, kind: 'audio' as const, takes: [{ id: 'cut/snd.mp3' }] }))
    game.loadItems = async () => [...(await items()), ...pads]
    const r = await fetch(base + 'api/state')
    expect(r.headers.get('content-encoding')).toBe('gzip')
    const etag = r.headers.get('etag')!
    expect(etag).toBeTruthy()
    const body = await r.text()
    const again = await fetch(base + 'api/state', { headers: { 'If-None-Match': etag } })
    expect(again.status).toBe(304)
    expect(await again.text()).toBe('')
    await post({ type: 'note', item: 'snd', text: 'changed' })
    const changed = await fetch(base + 'api/state', { headers: { 'If-None-Match': etag } })
    expect(changed.status).toBe(200)
    expect(await changed.text()).not.toBe(body)
  })

  it('media: a replay is a 304, also for a range request, and a file made again under its name is sent again', async () => {
    const r = await fetch(base + 'media/cut/snd.mp3')
    const etag = r.headers.get('etag')!
    expect(r.headers.get('last-modified')).toBeTruthy()
    expect((await fetch(base + 'media/cut/snd.mp3', { headers: { 'If-None-Match': etag } })).status).toBe(304)
    expect((await fetch(base + 'media/cut/snd.mp3', { headers: { 'If-None-Match': etag, Range: 'bytes=0-' } })).status).toBe(304)
    writeFileSync(join(dir, 'cut', 'snd.mp3'), Buffer.from('a new take, longer'))
    const n = await fetch(base + 'media/cut/snd.mp3', { headers: { 'If-None-Match': etag } })
    expect(n.status).toBe(200)
    expect(await n.text()).toBe('a new take, longer')
  })

  it('serves the page with its modules as plain JavaScript', async () => {
    const html = await (await fetch(base)).text()
    expect(html).toContain('<script type="module" src="main.ts">')
    const js = await fetch(base + 'render.ts')
    expect(js.headers.get('content-type')).toMatch(/javascript/)
    expect(await js.text()).not.toMatch(/import type|: PageItem/)
    for (const m of ['main.ts', 'flow.ts', 'player.ts', 'save.ts']) expect((await fetch(base + m)).status).toBe(200)
    expect(html).toContain("fetch('api/state'")
    expect((await fetch(base + '../server.ts')).status).toBe(404)
  })
})
