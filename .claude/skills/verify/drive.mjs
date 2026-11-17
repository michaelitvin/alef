#!/usr/bin/env node
// The /verify driver: drives the verify build (vite build --mode verify) in a real browser with touch on, at a phone and
// a tablet size, and prints one PASS or FAIL line per check. See SKILL.md next to it.
//
//   node .claude/skills/verify/drive.mjs [shots-dir]
//
// Environment:
//   ALEF_CDP_URL     a browser to drive (a CDP websocket or http URL). Not set: launch playwright's own Chromium.
//   ALEF_VERIFY_URL  the app's base URL (ends in /alef/), as the browser reaches it. Not set: start `vite preview` of
//                    dist-verify/ here and stop it at the end.
//   ALEF_VERIFY_ONLY a comma-separated list of checks to run (default: all; the names are in CHECKS below)
//
// Every run opens its own browser context and closes it in a finally, also when a check fails or throws, on Ctrl-C
// and at the deadline: a tab left open on a shared browser keeps animating and eats its CPU. It never closes a browser
// it did not launch.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DEADLINE_MS = 45 * 60 * 1000
const VIEWPORTS = [
  { name: 'phone', width: 844, height: 390 },
  { name: 'tablet', width: 1180, height: 820 },
]
/** the parent gate's year: any year 18 to 100 years back opens it (src/shared/parentGate/acceptYear.ts) */
const YEAR_OK = new Date().getFullYear() - 40
const YEAR_CHILD = new Date().getFullYear() - 6

const shots = process.argv[2] ?? join(tmpdir(), `alef-verify-${Date.now()}`)
mkdirSync(shots, { recursive: true })

// ---- the browser's init script: the speechSynthesis recorder (the stories speak with it) and Book 2's audio log ----
const INIT = (pinVisible) => {
  // on a shared browser another client's tab can come to the front and hide ours: the game would pause (its pause
  // cover) and draw nothing. Pin the page visible there (the pause on hiding is then not covered).
  if (pinVisible) {
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => 'visible' })
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => false })
    window.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true)
  }
  window.__spoken = []
  window.__d2audio = []
  class Utterance {
    constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.voice = null; this.onend = null; this.onstart = null; this.onerror = null }
  }
  const voice = { lang: 'he-IL', name: 'verify-he', localService: true, default: true, voiceURI: 'verify-he' }
  // a plain assignment silently does nothing: speechSynthesis is a readonly accessor
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices: () => [voice],
      speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 30) }, 0) },
      cancel() {}, pause() {}, resume() {},
      addEventListener() {}, removeEventListener() {},
    },
  })
  window.SpeechSynthesisUtterance = Utterance
}

// ---- touch: real touch events through CDP (Input.dispatchTouchEvent), as the minigame rules ask ----
async function centre(loc) {
  await loc.waitFor({ state: 'visible' })
  const b = await loc.boundingBox()
  if (!b) throw new Error('no box to touch')
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
/** a tap at the element's centre, or at `at` (a point inside the element's box) */
async function tap(page, loc, at) {
  await page.bringToFront()
  let { x, y } = await centre(loc)
  if (at) { const b = await loc.boundingBox(); x = b.x + at.x; y = b.y + at.y }
  await page.touchscreen.tap(x, y)
}
async function hold(page, loc, ms) {
  await page.bringToFront()
  const { x, y } = await centre(loc)
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await page.waitForTimeout(ms)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach().catch(() => {})
  }
}
async function typeYear(page, year) {
  for (const d of String(year)) await tap(page, page.locator(`[data-year-pad] [data-digit="${d}"]`))
}

/** the gate: a hold under 2 s opens nothing, a child's year goes back, an adult's year opens the area */
async function passGate(page, button, area) {
  // a short hold: the page's own clock says how long the finger stayed (a busy shared browser can stretch the wait)
  await page.evaluate(() => {
    window.__hold = {}
    document.addEventListener('pointerdown', () => { window.__hold.down = performance.now() }, { capture: true, once: true })
    document.addEventListener('pointerup', () => { window.__hold.up = performance.now() }, { capture: true, once: true })
  })
  await hold(page, button, 600)
  await page.waitForTimeout(300)
  const held = await page.evaluate(() => window.__hold.up - window.__hold.down)
  if (await page.locator('[data-year-pad]').count()) {
    if (held < 1800) throw new Error(`a ${Math.round(held)} ms hold opened the year pad`)
    // the browser was too slow to release in time: close the pad and go on (not a finding)
    await tap(page, page.locator('[data-pad-backdrop]'), { x: 4, y: 4 })
    await page.locator('[data-year-pad]').waitFor({ state: 'detached' })
  }
  await hold(page, button, 2300)
  await page.locator('[data-year-pad]').waitFor()
  await typeYear(page, YEAR_CHILD)
  await page.waitForTimeout(300)
  if (await page.locator('[data-year-pad]').count()) throw new Error('the pad stayed open after a wrong year')
  if (await page.locator('[data-parent-area]').count()) throw new Error('a child\'s year opened the parent area')
  await hold(page, button, 2300)
  await page.locator('[data-year-pad]').waitFor()
  await typeYear(page, YEAR_OK)
  await page.locator(area).waitFor({ timeout: 10_000 })
}

/** every section of the area opens: each nav button scrolls to its section */
async function eachSection(page) {
  const ids = await page.locator('[data-goto]').evaluateAll((bs) => bs.map((b) => b.getAttribute('data-goto')))
  if (ids.length < 3) throw new Error(`only ${ids.length} sections in the nav`)
  for (const id of ids) {
    await tap(page, page.locator(`[data-goto="${id}"]`))
    const section = page.locator(`[data-section="${id}"]`)
    await section.waitFor({ state: 'visible' })
    // the nav scrolls each section to the top, under the nav (a short page must not stop it lower down)
    const y = await section.evaluate((el) => Math.round(el.getBoundingClientRect().top - el.closest('.parent-area').getBoundingClientRect().top))
    if (y > 100) throw new Error(`the nav left section ${id} ${y} px from the top`)
  }
  return ids
}

/** a game asks boy or girl once per device: tap the boy when the question is open (after its voice) */
async function passGender(page, next, timeout = 60_000) {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    if (await page.locator(next).count()) return
    const boy = page.locator('[data-screen="gender-question"] [data-gender="boy"]')
    if (await boy.count()) {
      await tap(page, boy).catch(() => {})
      await page.waitForTimeout(700)
      continue
    }
    await page.waitForTimeout(250)
  }
  throw new Error(`no ${next} after the play button`)
}

/** Latin or Hebrew text a child can see (rule: speech instead of text); parent text and numbers are marked */
const textOnScreen = (page) => page.evaluate(() => {
  const found = []
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.textContent.trim()
    if (!/[A-Za-zא-ת]/.test(t)) continue
    const el = n.parentElement
    if (!el || el.closest('[data-parent-text],[data-num],style,script,[aria-hidden="true"]')) continue
    if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue
    found.push(t.slice(0, 40))
  }
  return found
})

/** a screenshot; a slow browser's timeout is printed, not a failure (the checks do not depend on it) */
async function shot(page, vp, name) {
  try {
    // a background tab draws no frames: its screenshot waits forever
    await page.bringToFront()
    await page.screenshot({ path: join(shots, `${vp.name}-${name}.png`), animations: 'disabled', timeout: 90_000 })
  } catch (e) {
    console.log(`     no screenshot ${vp.name}-${name}: ${e.message.split('\n')[0]}`)
  }
}

// ---- the checks: each gets a fresh page in the run's context, and its own notes ----
const CHECKS = {
  async home(page, base, vp, note) {
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-card="duel"]').waitFor()
    await page.locator('[data-card="clock"]').waitFor()
    const open = await page.locator('[data-path] [data-station][data-open="true"]').count()
    if (!open) throw new Error('no open station on the path')
    note(`${open} open station(s)`)
    await shot(page, vp, 'home')
    await passGate(page, page.locator('[aria-label="settings (hold)"]'), '[data-parent-area="lessons"]')
    if (!page.url().includes('#/settings')) throw new Error(`the area is not on #/settings: ${page.url()}`)
    note(`area sections: ${(await eachSection(page)).join(' ')}`)
    await shot(page, vp, 'home-area')
  },

  async book2(page, base, vp, note) {
    await page.goto(`${base}duel2/`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-screen="cover"]').waitFor()
    await shot(page, vp, 'book2-cover')
    await tap(page, page.locator('[data-screen="cover"] [aria-label="play"]'))
    await passGender(page, '[data-screen="play"]')
    // a fresh save starts at the tower (Book 1): its right rune carries data-correct in the verify build
    const right = page.locator('.nd-rune[data-correct="1"]:not([disabled])').first()
    // the hit shows only until the next round: watch for it from before the tap (a slow driver can miss it by polling)
    await page.evaluate(() => {
      const seen = () => { const r = document.querySelector('.nd-rune.hit, .nd-rune.miss'); if (r && !window.__rune) window.__rune = r.classList.contains('hit') ? 'hit' : 'miss' }
      new MutationObserver(seen).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
    })
    // up to three rounds: on a slow browser the next round can replace the pad between finding the rune and the tap
    const outcomes = []
    for (let i = 0; i < 3 && !outcomes.includes('hit'); i++) {
      await right.waitFor({ timeout: 90_000 })
      await page.evaluate(() => { window.__rune = null })
      // tap at once: the round has a time limit, and a screenshot on a slow browser can outlast it
      await tap(page, right)
      await page.waitForFunction(() => window.__rune, null, { timeout: 30_000 })
      outcomes.push(await page.evaluate(() => window.__rune))
    }
    if (!outcomes.includes('hit')) throw new Error(`no hit in three rounds: ${outcomes.join(' ')}`)
    if (outcomes.length > 1) note(`rounds: ${outcomes.join(' ')} (a miss: the pad changed before the tap)`)
    const text = await textOnScreen(page)
    if (text.length) note(`text on the play screen: ${JSON.stringify(text)}`)
    const audio = await page.evaluate(() => window.__d2audio)
    if (!audio.length) throw new Error('the audio log is empty')
    note(`audio: ${audio.slice(0, 8).join(' ')}${audio.length > 8 ? ` … (${audio.length})` : ''}`)
    await shot(page, vp, 'book2-hit')
  },

  async book2Station(page, base, vp, note) {
    // the path's first open station, as the home screen links it (a fresh save: the tower)
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    const link = page.locator('[data-path] a[data-station][data-open="true"]').first()
    await link.waitFor()
    const id = await link.getAttribute('data-station')
    const href = await link.getAttribute('href')
    await page.goto(new URL(href, page.url()).href, { waitUntil: 'domcontentloaded' })
    await page.locator(`[data-screen="station"][data-station="${id}"]`).waitFor()
    await tap(page, page.locator('[data-station-play]'))
    await passGender(page, `[data-screen="play"][data-session="${id}"]`)
    note(`session: ${id}`)
    await shot(page, vp, `book2-station-${id}`)
  },

  async book2Sheets(page, base, vp, note) {
    for (const [hash, sel] of [['#/glyphs', '.d2-root'], ['#/tower-glyphs', '.nd-glyphs'], ['#/summary', '[data-screen]']]) {
      await page.goto('about:blank')
      await page.goto(`${base}duel2/${hash}`, { waitUntil: 'domcontentloaded' })
      await page.locator(sel).first().waitFor()
      if (await page.locator('[data-screen="cover"]').count()) throw new Error(`${hash} shows the cover: not a verify build?`)
      await page.waitForTimeout(500)
      await shot(page, vp, `book2-${hash.slice(2)}`)
    }
    note('glyphs, tower-glyphs, summary')
  },

  async book2Area(page, base, vp, note) {
    await page.goto(`${base}duel2/`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-screen="cover"]').waitFor()
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="book2"]')
    note(`area sections: ${(await eachSection(page)).join(' ')}`)
    await shot(page, vp, 'book2-area')
  },

  async clock(page, base, vp, note) {
    await page.goto(`${base}clock/`, { waitUntil: 'domcontentloaded' })
    await page.locator('.ck-play').waitFor()
    await shot(page, vp, 'clock-cover')
    await tap(page, page.locator('.ck-play'))
    await passGender(page, '.ck-workshop')
    // the first customer may bring explanations first: each waits for a tap on next
    const until = Date.now() + 180_000
    while (!(await page.locator('.ck-workshop[data-phase="answer"]').count())) {
      if (Date.now() > until) throw new Error(`no question: phase ${await page.locator('.ck-workshop').getAttribute('data-phase')}`)
      const next = page.locator('.ck-next')
      if (await next.count()) await tap(page, next).catch(() => {})
      await page.waitForTimeout(1000)
    }
    const text = await textOnScreen(page)
    if (text.length) note(`text on the workshop: ${JSON.stringify(text)}`)
    await shot(page, vp, 'clock-round')
    const right = page.locator('.ck-workshop [data-correct="1"]')
    if (await right.count()) await tap(page, right.first())
    else await page.locator('[data-test-solve]').evaluate((b) => b.click())
    await page.locator('.ck-workshop:not([data-phase="answer"])').waitFor({ timeout: 10_000 })
    note(`after the answer: ${await page.locator('.ck-workshop').getAttribute('data-phase')}`)
    await shot(page, vp, 'clock-answered')
  },

  async clockArea(page, base, vp, note) {
    await page.goto(`${base}clock/`, { waitUntil: 'domcontentloaded' })
    await page.locator('.ck-play').waitFor()
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="clock"]')
    note(`area sections: ${(await eachSection(page)).join(' ')}`)
    await shot(page, vp, 'clock-area')
  },

  async telemetry(page, base, vp, note) {
    // after the play checks (one context per size, so their events are in this storage): the Data section of Book 2's
    // area counts them, shows the storage line, and a Download gives the export
    await page.goto(`${base}duel2/`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-screen="cover"]').waitFor()
    await page.evaluate(() => {
      window.__downloads = []
      const make = URL.createObjectURL.bind(URL)
      URL.createObjectURL = (b) => { void b.text().then((t) => window.__downloads.push(t)); return make(b) }
    })
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="book2"]')
    const data = page.locator('[data-telemetry-export]')
    await data.scrollIntoViewIfNeeded()
    const count = (key) => data.locator(`[data-log="${key}"] [data-log-count]`).textContent()
    const book2 = await count('alef-duel2-telemetry')
    const clock = await count('alef-clock-telemetry')
    if (!/^[1-9]\d* events$/.test(book2)) throw new Error(`Book 2's log: ${book2}`)
    if (!/^\d+ events$/.test(clock)) throw new Error(`the clock's log: ${clock}`)
    const storage = await data.locator('[data-storage]').textContent()
    if (!/telemetry .* of \d+k chars/.test(storage)) throw new Error(`no storage line: ${storage}`)
    note(`Book 2 ${book2}, clock ${clock}; ${storage.trim()}`)
    await shot(page, vp, 'telemetry-data')
    await tap(page, data.locator('[data-telemetry-download]'))
    await page.waitForFunction(() => window.__downloads.length > 0, null, { timeout: 10_000 })
    const doc = JSON.parse(await page.evaluate(() => window.__downloads[0]))
    const part = doc.games?.find((g) => g.key === 'alef-duel2-telemetry')
    if (doc.v !== 2 || !part || !part.events.length) throw new Error('the download has no Book 2 events')
    const names = [...new Set(part.events.map((e) => e.e))]
    note(`download: ${part.events.length} events (${names.slice(0, 8).join(' ')}${names.length > 8 ? ' …' : ''})`)
  },
}

// ---- the run ----
let browser = null
let launched = false
const contexts = new Set()
let preview = null

async function cleanup() {
  for (const c of contexts) await c.close().catch(() => {})
  contexts.clear()
  // a browser it launched closes; a browser it connected to stays up (only the connection goes, with the process)
  if (browser && launched) await browser.close().catch(() => {})
  browser = null
  if (preview) { preview.kill('SIGTERM'); preview = null }
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { void cleanup().finally(() => process.exit(130)) })

function startPreview() {
  return new Promise((resolve, reject) => {
    preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'dist-verify'], { stdio: ['ignore', 'pipe', 'inherit'] })
    let out = ''
    preview.stdout.on('data', (d) => {
      out += d
      // eslint-disable-next-line no-control-regex
      const m = out.replace(/\x1b\[[0-9;]*m/g, '').match(/Local:\s+(\S+)/)
      if (m) resolve(m[1].endsWith('/') ? m[1] : `${m[1]}/`)
    })
    preview.on('exit', (c) => reject(new Error(`vite preview exited (${c}); built dist-verify/ first?`)))
  })
}

async function run() {
  const base = process.env.ALEF_VERIFY_URL ?? await startPreview()
  const cdp = process.env.ALEF_CDP_URL
  if (cdp) browser = await chromium.connectOverCDP(cdp)
  else { browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); launched = true }
  const only = process.env.ALEF_VERIFY_ONLY?.split(',').map((s) => s.trim())
  const names = Object.keys(CHECKS).filter((n) => !only || only.includes(n))
  console.log(`base ${base}  browser ${cdp ? 'connected' : 'launched'}  shots ${shots}`)
  let failed = 0
  for (const vp of VIEWPORTS) {
    // one context per size: its own storage (a fresh save, boy or girl not set yet), touch on
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: vp.name === 'phone', locale: 'he-IL' })
    contexts.add(context)
    try {
      // a shared browser may be busy: generous waits (a screenshot can take tens of seconds)
      context.setDefaultTimeout(60_000)
      await context.addInitScript(INIT, !!cdp)
      for (const name of names) {
        const page = await context.newPage()
        const notes = []
        const errors = []
        page.on('pageerror', (e) => errors.push(e.message))
        const t0 = Date.now()
        try {
          await CHECKS[name](page, base, vp, (s) => notes.push(s))
          if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`)
          console.log(`PASS ${vp.name} ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)${notes.length ? `\n     ${notes.join('\n     ')}` : ''}`)
        } catch (e) {
          failed++
          await shot(page, vp, `FAIL-${name}`).catch(() => {})
          // the first line, and playwright's "waiting for locator(…)" line: which element it waited for
          const why = e.message.split('\n').filter((l, i) => i === 0 || /waiting for/.test(l)).slice(0, 2).join(' ')
          console.log(`FAIL ${vp.name} ${name}: ${why}${notes.length ? `\n     ${notes.join('\n     ')}` : ''}`)
        } finally {
          await page.close().catch(() => {})
        }
      }
    } finally {
      await context.close().catch(() => {})
      contexts.delete(context)
    }
  }
  return failed
}

let timer
const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`deadline (${DEADLINE_MS / 60000} min)`)), DEADLINE_MS) })
let code = 0
try {
  const failed = await Promise.race([run(), deadline])
  console.log(failed ? `${failed} check(s) failed` : 'all checks passed')
  code = failed ? 1 : 0
} catch (e) {
  console.log(`ERROR ${e.message}`)
  code = 2
} finally {
  clearTimeout(timer)
  await cleanup()
}
process.exit(code)
