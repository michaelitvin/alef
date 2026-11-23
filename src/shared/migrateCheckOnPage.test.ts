// `?migrate-check` on a staging page: the check finishes before a store module evaluates, so a store imported after
// stagingStorage reads the post-check storage; the end page shows the result and offers the before and after files;
// its Continue reloads without the query; the result is stored.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encodeChunk } from './telemetryCodec'
import { chunkKey, openJson } from './telemetryChunks'

const prod = window.localStorage
const OLD = 'alef-duel2-telemetry'

describe('?migrate-check on the page', () => {
  const real = Object.getOwnPropertyDescriptor(window, 'localStorage')
  beforeEach(() => { prod.clear(); document.body.replaceChildren(); vi.resetModules(); window.history.replaceState(null, '', '/?migrate-check&x=1') })
  afterEach(() => { if (real) Object.defineProperty(window, 'localStorage', real); window.history.replaceState(null, '', '/'); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  /** the end page, once the check has shown it */
  const endPage = () => vi.waitFor(() => { const e = document.querySelector('[data-migrate-check-end]'); if (!e) throw new Error('no end page'); return e as HTMLElement }, { timeout: 5000 })
  const press = (id: string) => (document.querySelector(`[data-migrate-check-button="${id}"]`) as HTMLButtonElement).click()

  it('the end page: the verdict and one row per key, the before and after downloads; Continue reloads without the query; a store imported after it sees the migrated save', async () => {
    const { installStagingStorage, migrateCheckGate, STAGING_PREFIX } = await import('./stagingStorage')
    // (a production page migrates on import, so production's old keys are put in after it)
    const save = JSON.stringify({ state: { bookOpen: true, firstDuelImported: true, stage: { stage: 2 }, coins: 4, settings: { range: 100 } }, version: 7 })
    prod.setItem('alef-duel2', save)
    const k = chunkKey(OLD, 1_000, 'sa')
    prod.setItem(k, encodeChunk([{ t: 1_000, s: 'sa', run: 1, e: 'answer', g: 'book2' }] as never))
    prod.setItem(OLD, openJson([], [k]))
    const eng = JSON.stringify({ state: { bookOpen: false, firstDuelImported: false, coins: 2 }, version: 1 })
    prod.setItem('alef-english', eng)
    prod.setItem('alef-english-telemetry', openJson([{ t: 2_000, s: 'sb', run: 1, e: 'answer', g: 'english' }] as never, []))
    prod.setItem(`${STAGING_PREFIX}alef-migration-check`, '{"v":1,"at":1,"verdict":"pass","rows":[{"key":"alef-spellquest"}]}') // the last check's
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const reload = vi.fn()
    const files: [string, string][] = []
    const pending = installStagingStorage(window, reload, (json, name) => files.push([name, json]))
    expect(pending).not.toBeNull()
    const page = await endPage()
    expect(page.querySelector('[data-migrate-check-verdict]')!.textContent).toBe('Migration check: PASS')
    const rows = [...page.querySelectorAll('[data-migrate-check-row]')].map((r) => r.getAttribute('data-migrate-check-row'))
    expect(rows).toEqual(expect.arrayContaining(['alef-spellquest-he', 'alef-spellquest-en', 'alef-spellquest-he-telemetry', 'alef-spellquest-en-telemetry', 'alef-migrations']))
    expect(page.querySelectorAll('[data-ok="false"]')).toHaveLength(0)
    expect(JSON.parse(prod.getItem(`${STAGING_PREFIX}alef-migration-check`)!).rows.some((r: { key: string }) => r.key === 'alef-spellquest')).toBe(false)
    // the gate is shut while the page shows: the app does not boot under it
    expect(await Promise.race([migrateCheckGate(pending).then(() => 'open'), new Promise((r) => setTimeout(() => r('shut'), 50))])).toBe('shut')
    expect(reload).not.toHaveBeenCalled()

    press('before')
    press('after')
    const day = new Date().toISOString().slice(0, 10)
    expect(files.map(([n]) => n)).toEqual([`alef-migrate-check-before-${day}.json`, `alef-migrate-check-after-${day}.json`])
    const before = JSON.parse(files[0]![1]), after = JSON.parse(files[1]![1])
    for (const [f, label] of [[before, 'before'], [after, 'after']] as const) {
      expect(f).toMatchObject({ v: 1, kind: 'alef-prod-storage', label, userAgent: navigator.userAgent })
      expect(new Date(f.exportedAt).toISOString()).toBe(f.exportedAt)
      expect(f).not.toHaveProperty('host')
    }
    expect(Object.keys(before.keys).sort()).toEqual(['alef-duel2', 'alef-english', 'alef-english-telemetry', OLD, k].sort())
    for (const key of Object.keys(before.keys)) expect(before.keys[key]).toBe(prod.getItem(key)) // byte-equal copies
    expect(Object.keys(after.keys)).toEqual(expect.arrayContaining(['alef-spellquest-he', 'alef-spellquest-en', 'alef-spellquest-he-telemetry', 'alef-spellquest-en-telemetry', 'alef-migrations']))
    expect(Object.keys(after.keys).some((x) => x.startsWith(STAGING_PREFIX) || x === 'alef-duel2' || x === 'alef-english')).toBe(false)
    expect(JSON.parse(after.keys['alef-spellquest-he']).state).toMatchObject({ screensOpen: true, coins: 4 })
    expect(after.keys['alef-spellquest-en']).toBe(prod.getItem(`${STAGING_PREFIX}alef-spellquest-en`))

    press('continue')
    expect(await pending).toBe(true)
    expect(reload).toHaveBeenCalledWith(expect.stringMatching(/\/\?x=1$/)) // without ?migrate-check
    vi.stubGlobal('localStorage', window.localStorage) // in a browser the global is the window's (now the prefixed view)
    // a store module that evaluates now reads the post-check storage
    const { useSpellQuestStore } = await import('../spellquest/store')
    expect(useSpellQuestStore.getState().screensOpen).toBe(true)
    expect(useSpellQuestStore.getState().coins).toBe(4)
    expect(prod.getItem(`${STAGING_PREFIX}alef-duel2`)).toBeNull()
    expect(prod.getItem('alef-duel2')).toBe(save) // production untouched
    expect(prod.getItem('alef-english')).toBe(eng)
    expect(JSON.parse(prod.getItem(`${STAGING_PREFIX}alef-migration-check`)!).verdict).toBe('pass')
  })

  it('the gate opens at once without a check, and when the reload cannot be asked for', async () => {
    const { migrateCheckGate, installStagingStorage } = await import('./stagingStorage')
    await expect(migrateCheckGate()).resolves.toBeUndefined()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    prod.setItem('alef-duel2', '{"state":{},"version":7}')
    const failing = installStagingStorage(window, () => { throw new Error('no navigation') })
    await endPage()
    press('continue')
    await expect(migrateCheckGate(failing)).resolves.toBeUndefined()
  })

  it('a check that throws shows a FAIL with the error (no downloads) and writes it; Continue reloads; the gate opens on any error', async () => {
    vi.doMock('./migrateCheck', async (orig) => ({ ...(await orig<typeof import('./migrateCheck')>()), runMigrateCheck: () => { throw new Error('boom') } }))
    const { installStagingStorage, migrateCheckGate, STAGING_PREFIX } = await import('./stagingStorage')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    prod.setItem('alef-duel2', '{"state":{},"version":7}')
    const reload = vi.fn()
    const pending = installStagingStorage(window, reload)
    const page = await endPage()
    expect(page.querySelector('[data-migrate-check-verdict]')!.textContent).toBe('Migration check: FAIL')
    expect(page.textContent).toMatch(/boom/)
    expect((page.querySelector('[data-migrate-check-button="before"]') as HTMLButtonElement).disabled).toBe(true)
    press('continue')
    expect(await pending).toBe(true)
    expect(reload).toHaveBeenCalled()
    const r = JSON.parse(prod.getItem(`${STAGING_PREFIX}alef-migration-check`)!)
    expect(r.verdict).toBe('fail')
    expect(r.message).toMatch(/boom/)
    vi.doUnmock('./migrateCheck')
    await expect(migrateCheckGate(Promise.reject(new Error('x')))).resolves.toBeUndefined()
  })

  it('a refused confirm runs nothing', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { installStagingStorage } = await import('./stagingStorage')
    expect(installStagingStorage(window, vi.fn())).toBeNull()
  })
})
