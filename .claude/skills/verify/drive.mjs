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
//   ALEF_VERIFY_SIZES a comma-separated list of sizes to run (default: every size not marked optIn; the names are in
//                    VIEWPORTS and FIT_VIEWPORTS below)
// The English fit check (spellquestEnFit) needs the staging verify build (ALEF_STAGING=1): elsewhere the English page is
// closed, and the check is skipped.
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
  { name: 'phone', width: 844, height: 390, mobile: true },
  { name: 'tablet', width: 1180, height: 820 },
  // a phone held upright: only the parent area's checks (the games are played sideways), which assert at each section
  // that nothing scrolls sideways
  { name: 'upright390', width: 390, height: 844, mobile: true, upright: true, only: ['home', 'spellquestHeArea', 'clockArea', 'spacecatArea'] },
  { name: 'upright412', width: 412, height: 915, mobile: true, upright: true, only: ['home', 'spellquestHeArea', 'clockArea', 'spacecatArea'] },
  // Space Cat plays upright and on its side, on a phone and a tablet: its sweep sizes run only when named
  { name: 'phoneUp', width: 412, height: 915, mobile: true, optIn: true },
  { name: 'phoneSide', width: 915, height: 412, mobile: true, optIn: true },
  { name: 'phoneUpSmall', width: 390, height: 844, mobile: true, optIn: true },
  { name: 'tabletUp', width: 800, height: 1280, optIn: true },
  { name: 'tabletSide', width: 1280, height: 800, optIn: true },
]
/** the English fit check's sizes: the smallest phone on its side and a 4:3 tablet */
const FIT_VIEWPORTS = [
  { name: 'fit-740x360', width: 740, height: 360 },
  { name: 'fit-1024x768', width: 1024, height: 768 },
]
/** a check that runs at other sizes than VIEWPORTS */
const SIZES_OF = { spellquestEnFit: FIT_VIEWPORTS }
/** a check that cannot run on this build: printed as SKIP, not a failure */
class Skip extends Error {}
/** the parent gate's year: any year 18 to 100 years back opens it (src/shared/parentGate/acceptYear.ts) */
const YEAR_OK = new Date().getFullYear() - 40
const YEAR_CHILD = new Date().getFullYear() - 6

const shots = process.argv[2] ?? join(tmpdir(), `alef-verify-${Date.now()}`)
mkdirSync(shots, { recursive: true })

// ---- the browser's init script: the speechSynthesis recorder (the stories speak with it) and Spell Quest's audio log ----
const INIT = (pinVisible) => {
  // on a shared browser another client's tab can come to the front and hide ours: the game would pause (its pause
  // cover) and draw nothing. Pin the page visible there (the pause on hiding is then not covered).
  // A check can still force a pause: it sets window.__visOverride = 'hidden' and dispatches visibilitychange itself.
  if (pinVisible) {
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => window.__visOverride ?? 'visible' })
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => window.__visOverride === 'hidden' })
    window.addEventListener('visibilitychange', (e) => { if (!window.__visForced) e.stopImmediatePropagation() }, true)
  }
  // A shared browser's GPU canvases can hang a screenshot of a page that draws every frame: draw 2D canvases on the CPU.
  const getContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    return getContext.call(this, type, type === '2d' ? { ...opts, willReadFrequently: true } : opts)
  }
  window.__spoken = []
  window.__d2audio = []
  window.__scAudio = []
  window.__scText = []
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
  let b = await loc.boundingBox()
  if (!b) throw new Error('no box to touch')
  // a touch lands only inside the viewport: a centre below or above it is scrolled into view first, as a finger
  // scrolls to it (no wait for the element to be still: the games animate)
  const vh = loc.page().viewportSize()?.height ?? Infinity
  if (b.y + b.height / 2 < 0 || b.y + b.height / 2 > vh) {
    await loc.evaluate((e) => e.scrollIntoView({ block: 'center' }))
    b = await loc.boundingBox()
    if (!b) throw new Error('no box to touch')
  }
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

/** nothing scrolls sideways: the page, and the parent area (its own scroll box), are no wider than the screen. On a
 * failure, the elements whose right edge passes the screen's (the outermost of each). */
async function noSideScroll(page, where) {
  const bad = await page.evaluate(() => {
    const W = innerWidth
    const out = []
    if (document.documentElement.scrollWidth > W + 1) out.push(`page ${document.documentElement.scrollWidth} > ${W}`)
    const area = document.querySelector('.parent-area')
    if (area && area.scrollWidth > area.clientWidth + 1) out.push(`area ${area.scrollWidth} > ${area.clientWidth}`)
    if (!out.length) return null
    const edge = area ? area.getBoundingClientRect().left + area.clientWidth : W
    // inside a box that scrolls sideways on purpose (a wide table's), an element may pass the edge
    const scrollsInside = (el) => { for (let p = el.parentElement; p && p !== area; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowX)) return true; return false }
    for (const el of (area ?? document.body).querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (!r.width || r.right <= edge + 1 || scrollsInside(el)) continue
      if (el.parentElement && el.parentElement.getBoundingClientRect().right > edge + 1) continue
      out.push(`<${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : ''}> ends at ${Math.round(r.right)}: "${(el.textContent ?? '').trim().slice(0, 30)}"`)
      if (out.length > 5) break
    }
    return out.join('; ')
  })
  if (bad) throw new Error(`${where} scrolls sideways at ${page.viewportSize().width} px: ${bad}`)
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
  await noSideScroll(page, 'the year pad')
  await typeYear(page, YEAR_OK)
  await page.locator(area).waitFor({ timeout: 10_000 })
}

/** every section of the area opens: each nav button scrolls to its section, and nothing there scrolls sideways */
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
    // the heading must land fully below the nav, whatever height the nav has (one row, two rows)
    const clash = await section.evaluate((el) => {
      const nav = el.closest('.parent-area').querySelector('.pa-nav').getBoundingClientRect()
      const h = el.querySelector('h2').getBoundingClientRect()
      return h.top >= nav.bottom - 0.5 ? null : `heading top ${Math.round(h.top)} is above the nav bottom ${Math.round(nav.bottom)}`
    })
    if (clash) throw new Error(`section ${id}: ${clash}`)
    // a lazy section (a game's settings, its developer tools) loads after the tap: wait for its fallback to go
    await page.waitForFunction((s) => !document.querySelector(`[data-section="${s}"]`)?.textContent.includes('Loading…'), id)
    await noSideScroll(page, `section ${id}`)
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


// ---- the English fit check: drawn Latin text against its orb's ring or its box, at real scale ----
/** the orb sprite's gold ring: its inner edge is this share of the sprite's width from the centre (s-orb.webp) */
const ORB_RING_IN = 0.41

/**
 * In the page: every Latin learning glyph (SVG text with direction ltr) on screen, its ink box on the screen (the font's
 * own ink, measured on a canvas at the drawn size, plus half the outline), and the check of its place: inside the gold
 * ring of its orb, or inside the inner edge of its box's outline. Also the boxes' row rects and the named things they
 * must not touch.
 */
const FIT_PROBE = ({ ringIn }) => {
  const ctx = document.createElement('canvas').getContext('2d')
  const scaleOf = (el) => { const m = el.getScreenCTM(); return Math.hypot(m.a, m.b) }
  const box = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom })
  const visible = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false } return true }
  const ink = (t) => {
    const s = scaleOf(t)
    const cs = getComputedStyle(t)
    const px = parseFloat(cs.fontSize) * s
    ctx.font = `${cs.fontWeight} ${px}px ${cs.fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    // the canvas joins ff and fi as the font's liga says, and has no switch for it; a letter spacing that is not zero
    // turns ligatures off (as in CSS), as the game's Latin text has them off
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.01px'
    const m = ctx.measureText(t.textContent)
    const at = new DOMPoint(+t.getAttribute('x'), +t.getAttribute('y')).matrixTransform(t.getScreenCTM())
    const half = (parseFloat(cs.strokeWidth) || 0) * s / 2
    // the canvas and the SVG must use one font: their advances agree (else the measure is of another font)
    const drawn = t.getComputedTextLength() * s
    return {
      left: at.x - m.actualBoundingBoxLeft - half, right: at.x + m.actualBoundingBoxRight + half,
      top: at.y - m.actualBoundingBoxAscent - half, bottom: at.y + m.actualBoundingBoxDescent + half,
      px, fontOk: Math.abs(drawn - m.width) <= Math.max(1, 0.03 * m.width), font: cs.fontFamily,
      // Latin learning text shows each letter on its own: no ff or fi ligature
      ligOk: cs.fontVariantLigatures === 'none',
    }
  }
  const orbs = []
  const boxes = []
  for (const t of document.querySelectorAll('svg text[data-glyph][direction="ltr"]')) {
    if (!t.textContent.trim() || !visible(t)) continue
    const k = ink(t)
    const pick = t.closest('.d2-pick')
    const img = pick && [...pick.children].find((c) => c.tagName === 'image')
    if (img && /s-orb/.test(img.getAttribute('href') ?? '')) {
      const r = img.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const R = r.width * ringIn
      const worst = Math.max(...[[k.left, k.top], [k.right, k.top], [k.left, k.bottom], [k.right, k.bottom]].map(([x, y]) => Math.hypot(x - cx, y - cy)))
      orbs.push({ text: t.textContent, px: +k.px.toFixed(1), ring: +R.toFixed(1), reach: +worst.toFixed(1), ok: worst <= R, fontOk: k.fontOk, font: k.font, ligOk: k.ligOk })
      continue
    }
    const g = t.closest('[data-box]')
    const rect = g && [...g.children].find((c) => c.tagName === 'rect')
    if (rect) {
      const r = rect.getBoundingClientRect()
      const half = (parseFloat(getComputedStyle(rect).strokeWidth) || 0) * scaleOf(rect) / 2
      const slack = Math.min(k.left - (r.left + half), r.right - half - k.right, k.top - (r.top + half), r.bottom - half - k.bottom)
      boxes.push({ text: t.textContent, px: +k.px.toFixed(1), slack: +slack.toFixed(1), ok: slack >= 0, fontOk: k.fontOk, font: k.font, ligOk: k.ligOk })
    }
  }
  const rectsOf = (sel) => [...document.querySelectorAll(sel)].filter(visible).map((e) => box(e.getBoundingClientRect()))
  return {
    orbs, boxes,
    rows: {
      making: rectsOf('[data-making-rung] [data-box] > rect'),
      boxes: rectsOf('svg [data-box] > rect'),
    },
    things: {
      rungs: rectsOf('[data-rung] image'), wizard: rectsOf('image[data-wizard]'), book: rectsOf('[data-book]'),
      hint: rectsOf('.nd-hint-btn'), tower: rectsOf('.nd-tower'),
    },
    view: { w: innerWidth, h: innerHeight },
  }
}

/** a and b overlap (screen rects); `gap`: the free room between them (negative: they overlap by that much) */
const gapOf = (a, b) => Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom)
const unionOf = (rs) => ({ left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)), right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)) })

/**
 * A fresh English save at `stage` (placement done), and a boy already chosen. Written on a page of the origin that is not
 * the app (its icon): the staging app's own localStorage adds the prefix itself, the raw one needs it written.
 */
async function seedEnglish(page, base, stage) {
  await page.goto('about:blank')
  await page.goto(`${base}favicon.svg`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((stage) => {
    localStorage.clear()
    localStorage.setItem('staging:alef-player', JSON.stringify({ gender: 'boy', by: 'parent', at: 1 }))
    if (stage) localStorage.setItem('staging:alef-spellquest-en', JSON.stringify({ version: 1, state: {
      coins: 0, bookOpen: true, stage: { stage, newAnswers: '' },
      settings: { sfx: false, music: false, volume: 0.8, drawing: true, range: 100, path: true },
      placement: { state: null, requested: false, done: { level: stage, answers: 20, at: 1 }, runs: 1 },
      tower: { byMark: {}, confusions: {}, recent: {}, pace: 1 }, introSeen: {}, openedStations: [], lastRunWords: [],
    } }))
  }, stage)
}

/** one session of `station` on the English page at `stage`: its station cover, play, the play screen */
async function englishStation(page, base, station, stage) {
  await seedEnglish(page, base, stage)
  await page.goto(`${base}spellquest-en/?station=${station}`, { waitUntil: 'domcontentloaded' })
  await page.locator(`[data-screen="station"][data-station="${station}"]`).waitFor()
  await tap(page, page.locator('[data-station-play]'))
  await passGender(page, `[data-screen="play"][data-session="${station}"]`)
  await page.evaluate(() => document.fonts.ready)
}

/**
 * Samples the probe every `every` ms for `ms` (orbs fly, rounds change), keeps every distinct glyph's worst sample,
 * the rows and things of each sample, and says what does not fit.
 */
async function sampleFit(page, ms, every, ready, judge) {
  const seen = new Map()
  const bad = []
  let samples = 0
  const until = Date.now() + ms
  while (Date.now() < until) {
    const p = await page.evaluate(FIT_PROBE, { ringIn: ORB_RING_IN })
    if (ready(p)) {
      samples++
      for (const o of p.orbs) {
        const key = `orb ${o.text}`
        const prev = seen.get(key)
        if (!prev || o.reach / o.ring > prev.reach / prev.ring) seen.set(key, o)
      }
      for (const b of p.boxes) {
        const key = `box ${b.text}`
        const prev = seen.get(key)
        if (!prev || b.slack < prev.slack) seen.set(key, b)
      }
      for (const why of judge(p)) if (!bad.includes(why)) bad.push(why)
    }
    await page.waitForTimeout(every)
  }
  for (const [key, v] of seen) {
    if (!v.fontOk) bad.push(`${key}: not drawn in the measured font (${v.font})`)
    if (!v.ligOk) bad.push(`${key}: ligatures are on`)
    if (!v.ok) bad.push(key.startsWith('orb') ? `${key} (${v.px} px) reaches ${v.reach} px from the orb's centre, its ring is at ${v.ring}` : `${key} (${v.px} px) is ${-v.slack} px past its box's edge`)
  }
  return { seen, bad, samples }
}

// ---- Space Cat: touch on the canvas, read through the verify build's probe (window.__scRound, client CSS px) ----
const scProbe = (page) => page.evaluate(() => window.__scRound ?? null)
/** the next round that takes his touch (after the demo, a tip or the missing-number line has let go) */
async function scRound(page, afterN, timeout = 60_000, orIntro = false) {
  // orIntro: also a round whose intro plays (the planets stand still until the intro has ended)
  await page.waitForFunction(([n, intro]) => {
    const r = window.__scRound
    const introNow = intro && document.querySelector('.sc-stage')?.getAttribute('data-phase') === 'intro'
    return document.querySelector('.sc-root')?.getAttribute('data-screen') !== 'play' || (r && r.n > n && r.phase === 'flight' && (introNow || (r.input && !r.frozen)))
  }, [afterN, orIntro], { timeout, polling: 100 })
  // null: the play screen went (the end)
  return (await scScreen(page)) === 'play' ? scProbe(page) : null
}
/** a finger along points [x, y], one move every `stepMs` */
async function touchPath(page, pts, stepMs = 30) {
  await page.bringToFront()
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] })
    for (const [x, y] of pts.slice(1)) {
      await page.waitForTimeout(stepMs)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
    }
    await page.waitForTimeout(stepMs)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await cdp.detach().catch(() => {})
  }
}
const line = (x0, y0, x1, y1, n = 8) => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n])
/** drag the ship sideways from its lane to x (the finger at the ship's row) */
const scDragTo = (page, r, x) => touchPath(page, line(r.lanes[r.shipLane], r.shipY, x, r.shipY))
/** a flick up (a zoom): a fast move up, a fifth of the screen */
const scFlick = (page, r, vp) => touchPath(page, line(r.lanes[r.shipLane ?? 0], r.shipY, r.lanes[r.shipLane ?? 0], r.shipY - vp.height * 0.2, 4), 15)
/** the round ends: its mark shows, then the next round or a screen comes */
async function scEnded(page, n, timeout = 30_000) {
  await page.waitForFunction((k) => { const r = window.__scRound; return !r || r.n > k || r.phase !== 'flight' }, n, { timeout, polling: 100 })
  await page.waitForFunction(() => { const r = window.__scRound; return !r || r.phase !== 'mark' || r.result }, null, { timeout, polling: 100 })
}
/**
 * One round, answered as asked: 'right' or 'wrong' (steer, then flick), 'timeout' (no touch, when the ship is not under
 * the right planet already; else it answers wrong), or 'arrive' (steer to the right planet and wait for it).
 */
async function scAnswer(page, vp, how, after) {
  const r = await scRound(page, after)
  if (!r) return { n: after, did: 'none', result: null }
  const k = r.lanes.length
  const wrongLane = (r.right + (r.shipLane === (r.right + 1) % k ? 2 : 1)) % k
  let did = how
  if (how === 'timeout' && r.shipLane === r.right) did = 'wrong'
  if (did === 'right' || did === 'arrive') { if (r.shipLane !== r.right) await scDragTo(page, r, r.lanes[r.right]) }
  if (did === 'wrong') await scDragTo(page, r, r.lanes[wrongLane])
  if (did === 'right' || did === 'wrong') { await page.waitForTimeout(250); await scFlick(page, { ...r, shipLane: did === 'right' ? r.right : wrongLane }, vp) }
  await page.waitForFunction((n) => { const x = window.__scRound; return x && (x.n > n || x.result) }, r.n, { timeout: 30_000, polling: 100 })
  const result = (await scProbe(page)).result
  return { n: r.n, did, result }
}
/** the screen part showing: cover, play, end, parent */
const scScreen = (page) => page.locator('.sc-root').getAttribute('data-screen')
async function scUntilScreen(page, want, timeout = 60_000) {
  await page.locator(`.sc-root[data-screen="${want}"]`).waitFor({ timeout })
}
/** the child-screen scan (rule): no letters in the DOM outside the parent area, and only digits and signs on the canvas */
async function scNoText(page) {
  const dom = await page.evaluate(() => {
    const c = document.body.cloneNode(true)
    c.querySelectorAll('[data-parent-area],style,script').forEach((n) => n.remove())
    return (c.textContent.match(/[A-Za-zא-ת][^\n]{0,30}/g) ?? [])
  })
  const canvas = await page.evaluate(() => (window.__scText ?? []).filter((t) => !/^[0-9+−×÷=]+$/.test(t)))
  if (dom.length) throw new Error(`text on a child screen: ${JSON.stringify(dom.slice(0, 5))}`)
  if (canvas.length) throw new Error(`text drawn on the canvas: ${JSON.stringify(canvas.slice(0, 5))}`)
}
/** a pause as the tablet locking does it (the page hides), then the page shows again */
async function scHide(page, hidden) {
  await page.evaluate((h) => {
    window.__visForced = true
    window.__visOverride = h ? 'hidden' : 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    window.__visForced = false
  }, hidden)
}
/** the audio log since `from`: the order, and what touches what (rule) */
async function scAudioSummary(page, from = 0) {
  const log = (await page.evaluate(() => window.__scAudio ?? [])).slice(from)
  let minGap = Infinity
  for (let i = 1; i < log.length; i++) {
    if (log[i].kind === 'voice' && log[i - 1].kind === 'sfx') minGap = Math.min(minGap, log[i].t - log[i - 1].t)
  }
  return { n: log.length, order: log.map((e) => `${e.kind[0]}:${e.id}`).join(' '), minSfxToVoice: Number.isFinite(minGap) ? Math.round(minGap) : null }
}
/** a round's box as text (◯ is the ring) */
const scBoxText = (r) => r.box.map((t) => t ?? '◯').join(r.kind === 'jumps' ? ',' : '')
/** a 2-digit ± 1-digit sum whose ones cross ten (rung 15), the ring at the end */
const scRegroups = (r) => {
  if (r.kind !== 'sum' || r.box.length !== 5 || r.box[4] !== null) return false
  const [a, op, b] = [Number(r.box[0]), r.box[1], Number(r.box[2])]
  if (!(a >= 20 && b < 10)) return false
  return op === '+' ? (a % 10) + b >= 10 : op === '−' && a % 10 < b
}
const SC_SAVE = 'alef-spacecat'
/** a version 1 save (the first design's nine rungs) at old rung `top`, as that store persisted it: the migration's input */
const scSeedV1 = (top, extra = {}) => JSON.stringify({
  version: 1,
  state: {
    items: {}, ladder: { top, topRecent: '', topMistake: false, streak: 0 }, speed: { arrivalMs: 8000, underMs: [], hold: 0 }, totalPoints: 30, best: 12,
    ships: [1, 2], ship: 2, heard: { demo: 1, 'zoom-tip': 2, missing: 2, out: 2 }, sinceZero: 0, runs: 3,
    settings: { range: 'auto', times: top >= 7, divide: top >= 9, arrival: 'auto', flightMusic: false }, ...extra,
  },
})
/** the 31 rungs in the ladder's order (src/spacecat/logic/rungs.ts): every rung before the frontier is passed in a seed */
const SC_ORDER = ['1', '2', '3', '4', '5', '6', '7', 'C1', '8', '9', '10', '11', '12', 'S1', 'T1', '13', '14', 'C2', 'T2', '15', '16', 'S2', 'T3', '17', '18', 'T4a', 'T4b', '19', 'H1', 'T5', 'T6']
/** the demo, the tips and the missing-number lines heard; the four intros not yet */
const SC_HEARD = { demo: 1, 'zoom-tip': 2, missing: 2, 'missing-jumps': 2, out: 2 }
const SC_SETTINGS = { range: 'auto', compare: true, jumps: true, times: true, divide: true, missing100: true, hundreds: true, arrival: 'auto', flightMusic: false }
/**
 * A version 2 save in practice with the frontier at `frontier` (every rung before it in the order passed), played a
 * minute ago (no new play day: no warm-up, no re-check), as the store persists it.
 */
const scSeed = (frontier, extra = {}) => {
  const passed = SC_ORDER.slice(0, SC_ORDER.indexOf(frontier))
  if (!SC_ORDER.includes(frontier)) throw new Error(`no rung ${frontier}`)
  return JSON.stringify({
    version: 2,
    state: {
      items: {},
      ladder: {
        rungs: Object.fromEntries(passed.map((id) => [id, { status: 'passed', recent: '', fastRun: 0, strikes: 0, holds: 0 }])),
        day: 1, lastAt: Date.now() - 60_000, checkedOn: 1, fastPasses: { today: 0, lastDay: 0 }, passes: [], mode: { kind: 'practice' },
        strikeLeft: 0, guardLeft: 0, lastMarks: '', recheckDue: false,
      },
      speed: { small: { arrivalMs: 8000, underMs: [], hold: 0 } }, totalPoints: 30, best: 12, ships: [1, 2], ship: 2, heard: SC_HEARD,
      sinceZero: 0, runs: 3, settings: SC_SETTINGS, intro: { day: 1, mistakes: {}, again: [] }, ...extra,
    },
  })
}
/** the save as stored now (the persist wrapper's state and version) */
const scSaved = (page) => page.evaluate((k) => { const j = JSON.parse(localStorage.getItem(k) ?? 'null'); return j && { version: j.version, ...j.state } }, SC_SAVE)

// ---- the checks: each gets a fresh page in the run's context, and its own notes ----
const CHECKS = {
  async home(page, base, vp, note) {
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-card="spellquest-he"]').waitFor()
    await page.locator('[data-card="clock"]').waitFor()
    await page.locator('[data-card="spacecat"]').waitFor()
    note(`Space Cat's credit: ${await page.locator('[data-credit="spacecat"]').textContent()}`)
    // the order of the home's parts; where English Spell Quest is open, it sits right before the cat (the parent's order)
    const parts = await page.evaluate(() => [...document.querySelectorAll('[data-home] > [data-home-part]')].map((e) => e.getAttribute('data-home-part')))
    note(`home: ${parts.join(' ')}`)
    const sc = parts.indexOf('spacecat')
    if (parts.includes('spellquest-en') && parts.slice(sc - 3, sc).join(' ') !== 'spellquest-en spellquest-en-path separator') throw new Error(`English Spell Quest is not right before Space Cat: ${parts.join(' ')}`)
    const open = await page.locator('[data-path] [data-station][data-open="true"]').count()
    if (!open) throw new Error('no open station on the path')
    note(`${open} open station(s)`)
    await shot(page, vp, 'home')
    await passGate(page, page.locator('[aria-label="settings (hold)"]'), '[data-parent-area="lessons"]')
    if (!page.url().includes('#/settings')) throw new Error(`the area is not on #/settings: ${page.url()}`)
    note(`area sections: ${(await eachSection(page)).join(' ')}`)
    await shot(page, vp, 'home-area')
  },

  async spellquestHe(page, base, vp, note) {
    await page.goto(`${base}spellquest-he/`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-screen="cover"]').waitFor()
    await shot(page, vp, 'spellquest-cover')
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
    await shot(page, vp, 'spellquest-hit')
  },

  async spellquestHeStation(page, base, vp, note) {
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
    await shot(page, vp, `spellquest-station-${id}`)
  },

  async spellquestHeSheets(page, base, vp, note) {
    for (const [hash, sel] of [['#/glyphs', '.d2-root'], ['#/tower-glyphs', '.nd-glyphs'], ['#/summary', '[data-screen]']]) {
      await page.goto('about:blank')
      await page.goto(`${base}spellquest-he/${hash}`, { waitUntil: 'domcontentloaded' })
      await page.locator(sel).first().waitFor()
      if (await page.locator('[data-screen="cover"]').count()) throw new Error(`${hash} shows the cover: not a verify build?`)
      await page.waitForTimeout(500)
      await shot(page, vp, `spellquest-${hash.slice(2)}`)
    }
    note('glyphs, tower-glyphs, summary')
  },

  async spellquestHeArea(page, base, vp, note) {
    // Spell Quest is played sideways: upright, the "turn the phone" picture covers its cover. Pass the gate sideways, then turn
    // the phone upright (the area and the developer screens show no picture)
    if (vp.upright) await page.setViewportSize({ width: vp.height, height: vp.width })
    await page.goto(`${base}spellquest-he/`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-screen="cover"]').waitFor()
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="spellquest-he"]')
    if (vp.upright) await page.setViewportSize({ width: vp.width, height: vp.height })
    note(`area sections: ${(await eachSection(page)).join(' ')}`)
    await shot(page, vp, 'spellquest-area')
    // the developer screens the area opens (gallery, stroke review): their Back goes back to the area
    for (const dev of ['gallery', 'strokes']) {
      await tap(page, page.locator(`[data-dev="${dev}"]`))
      const back = page.getByRole('button', { name: 'Back', exact: true })
      await back.waitFor()
      await page.waitForTimeout(500)
      await noSideScroll(page, `the ${dev} screen`)
      await shot(page, vp, `spellquest-${dev}`)
      await tap(page, back)
      await page.locator('[data-parent-area="spellquest-he"]').waitFor()
    }
    note('gallery, strokes')
  },

  async clock(page, base, vp, note) {
    await page.goto(`${base}clock/`, { waitUntil: 'domcontentloaded' })
    await page.locator('.ck-play').waitFor()
    await shot(page, vp, 'clock-cover')
    // the held house on the door: a tap leaves nothing
    await tap(page, page.locator('.ck-cover [aria-label="home (hold)"]'))
    await page.waitForTimeout(400)
    if (!(await page.locator('.ck-cover').count())) throw new Error('a tap on the door\'s house left the door')
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
    // the way home: a short hold on the house stays in the workshop, a 2 s hold goes to alef's home (not the door)
    const house = page.locator('.ck-workshop > [aria-label="home (hold)"]')
    await hold(page, house, 600)
    await page.waitForTimeout(400)
    if (!(await page.locator('.ck-workshop').count())) throw new Error('a short hold on the house left the workshop')
    await hold(page, house, 2300)
    await page.waitForURL((u) => !u.pathname.includes('/clock/'), { timeout: 20_000 })
    note(`after the house: ${new URL(page.url()).pathname}`)
  },

  async clockArea(page, base, vp, note) {
    await page.goto(`${base}clock/`, { waitUntil: 'domcontentloaded' })
    await page.locator('.ck-play').waitFor()
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="clock"]')
    note(`area sections: ${(await eachSection(page)).join(' ')}`)
    await shot(page, vp, 'clock-area')
  },

  async spacecat(page, base, vp, note) {
    // a fresh start: the cover, the demo, the first zoom tip, a level with a wrong answer and a time-out, level done,
    // a lost run, the end screen, play again; the touches the plan lists; the house
    await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(800)
    await shot(page, vp, 'sc-cover')
    await scNoText(page)
    // a tap on the house stays on the cover
    await tap(page, page.locator('.sc-root [aria-label="home (hold)"]').first())
    await page.waitForTimeout(400)
    if ((await scScreen(page)) !== 'cover') throw new Error('a tap on the cover\'s house left the cover')
    await tap(page, page.locator('.sc-root[data-screen="cover"] [aria-label="play"]'))
    await scUntilScreen(page, 'play')
    // the demo: the hand shows the answer while its line plays; he can already play (input on, the planets move)
    await page.locator('.sc-stage[data-phase="demo"]').waitFor({ timeout: 30_000 })
    await page.waitForTimeout(300)
    const d = await scProbe(page)
    if (!d.input || d.frozen) throw new Error('input is off or the planets stand still during the demo line')
    await shot(page, vp, 'sc-demo')
    // the demo round: he answers it (the hand showed him); park under the right planet: the zoom tip comes
    let r = await scRound(page, d.n - 1)
    if (r.shipLane !== r.right) await scDragTo(page, r, r.lanes[r.right])
    const tip = await page.locator('.sc-stage[data-phase="tip"]').waitFor({ timeout: 6000 }).then(() => true, () => false)
    if (tip) { await page.waitForTimeout(900); await shot(page, vp, 'sc-zoom-tip') }
    note(tip ? 'the zoom tip showed after he parked under the right planet' : 'no zoom tip (the round ended first)')
    // (a round that ended already gets no flick: it would land on the next sum)
    const q = await scProbe(page)
    if (q.n === r.n && !q.result) await scFlick(page, { ...q, shipLane: r.right }, vp)
    await scEnded(page, r.n)
    let n = r.n
    // the touches at the edges, over two rounds that then end right with a zoom (no heart lost): a release between two
    // lanes and a slow upward drag (no zoom); a drag that starts on the top bar (it steers)
    const finishRight = async (k) => {
      const q = await scProbe(page)
      if (q.n === k && !q.result) {
        if (q.shipLane !== q.right) { await scDragTo(page, q, q.lanes[q.right]); await page.waitForTimeout(250) }
        await scFlick(page, { ...q, shipLane: q.right }, vp)
      }
      await page.waitForFunction((x) => { const p = window.__scRound; return !p || p.n > x || p.result }, k, { timeout: 30_000, polling: 100 })
      return (await scProbe(page)).result
    }
    r = await scRound(page, n)
    const mid = (r.lanes[1] + r.lanes[2]) / 2
    await touchPath(page, line(r.lanes[r.shipLane], r.shipY, mid, r.shipY))
    await page.waitForTimeout(500)
    const snapped = (await scProbe(page)).shipLane
    if (snapped !== 1 && snapped !== 2) throw new Error(`a release between lanes 2 and 3 parked in lane ${snapped + 1}`)
    await touchPath(page, line(r.lanes[snapped], r.shipY, r.lanes[snapped], r.shipY - vp.height * 0.25, 20), 80)
    await page.waitForTimeout(300)
    if ((await scProbe(page)).result) throw new Error('a slow upward drag zoomed')
    note(`the release-between round: ${await finishRight(r.n)}`)
    await scEnded(page, r.n, 40_000)
    r = await scRound(page, r.n)
    const topY = Math.min(...r.planets.map((q) => q.y)) / 3
    const want = (r.shipLane + 2) % r.lanes.length
    await touchPath(page, line(r.lanes[r.shipLane], topY, r.lanes[want], topY))
    await page.waitForTimeout(600)
    const now = await scProbe(page)
    if (now.shipLane !== want) note(`a drag on the top bar did not steer (lane ${now.shipLane + 1}, wanted ${want + 1})`)
    note(`the top-bar round: ${await finishRight(r.n)}`)
    await scEnded(page, r.n, 40_000)
    n = r.n
    // the rest of the level: right answers with a wrong one and a time-out among them
    const plan = ['right', 'wrong', 'right', 'timeout', 'right', 'right', 'right', 'right', 'right', 'right']
    const results = []
    // a level's end is a beat in flight (no screen, no tap): the stage's phase is `level` for about 2 s, right after the
    // answer that ends the level, so the loop watches for it (a flag from the moment it starts, and a shot while it lasts)
    await page.evaluate(() => {
      window.__scLevelSeen = false
      const mark = () => { if (document.querySelector('.sc-stage[data-phase="level"]')) window.__scLevelSeen = true }
      new MutationObserver(mark).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-phase'] })
    })
    let levelShot = false
    for (const how of plan) {
      if ((await scScreen(page)) !== 'play') break
      if (!results.length) {
        // the flight as he sees it (a screenshot can be slow: it is taken here, where the round has time to spare)
        const f = await scRound(page, n)
        if (f) { await page.waitForTimeout(1500); await shot(page, vp, 'sc-flight') }
      }
      const a = await scAnswer(page, vp, how, n)
      if (a.did === 'none') break
      results.push(`${a.did}→${a.result}`)
      n = a.n
      if (!levelShot) {
        // the beat, or the next round in flight
        const next = await page.waitForFunction((m) => {
          const ph = document.querySelector('.sc-stage')?.getAttribute('data-phase')
          if (ph === 'level') return 'level'
          const x = window.__scRound
          return x && x.n > m && !x.result ? 'round' : false
        }, a.n, { timeout: 8000, polling: 50 }).then((h) => h.jsonValue(), () => null)
        if (next === 'level') { await shot(page, vp, 'sc-level-done'); levelShot = true; await scNoText(page) }
      }
      if (a.did === 'wrong' && results.filter((x) => x.startsWith('wrong')).length === 1) await shot(page, vp, 'sc-wrong-mark')
    }
    note(`level 1: ${results.join(' ')}`)
    // a level's end is a beat in flight (no screen, no tap): the stage's phase is `level` for about 1.5 s
    if (!levelShot && !(await page.evaluate(() => window.__scLevelSeen))) {
      await page.locator('.sc-stage[data-phase="level"]').waitFor({ timeout: 40_000 })
      await shot(page, vp, 'sc-level-done')
    }
    if (!levelShot) note('the level beat: seen, but over before its shot')
    await scUntilScreen(page, 'play')
    // lose the run: wrong answers until the hearts run out
    for (let i = 0; i < 3; i++) { const a = await scAnswer(page, vp, 'wrong', n); n = a.n; if (i === 0) await page.waitForTimeout(100) }
    await scUntilScreen(page, 'end', 40_000)
    await page.waitForTimeout(1500)
    await shot(page, vp, 'sc-end')
    await scNoText(page)
    if (!(await page.locator('.sc-root[data-screen="end"] [aria-label="home (hold)"]').count())) throw new Error('no house on the end screen')
    // play again: a new run, no demo now
    await tap(page, page.locator('.sc-root[data-screen="end"] [aria-label="play"]'))
    await scUntilScreen(page, 'play')
    r = await scRound(page, 0)
    if ((await page.locator('.sc-stage').getAttribute('data-phase')) === 'demo') throw new Error('the demo came again in the second run')
    const audio = await scAudioSummary(page)
    note(`audio: ${audio.n} events, smallest effect→voice gap ${audio.minSfxToVoice} ms`)
    note(`audio order: ${audio.order.slice(0, 600)}`)
    note(`canvas strings: ${JSON.stringify(await page.evaluate(() => window.__scText))}`)
    await scNoText(page)
    // the house: a short hold stays, a 2 s hold goes to alef's home screen (never the game's cover)
    const house = page.locator('.sc-stage [aria-label="home (hold)"]')
    await hold(page, house, 600)
    await page.waitForTimeout(400)
    if ((await scScreen(page)) !== 'play') throw new Error('a short hold on the house left the play screen')
    await hold(page, house, 2300)
    await page.waitForURL((u) => !u.pathname.includes('/spacecat/'), { timeout: 20_000 })
    note(`after the house: ${new URL(page.url()).pathname}`)
  },

  async spacecatPause(page, base, vp, note) {
    // pauses (the page hides): during the demo, during flight and a zoom, during the missing-number line
    await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate((k) => localStorage.removeItem(k), SC_SAVE)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await tap(page, page.locator('.sc-root[data-screen="cover"] [aria-label="play"]'))
    await page.locator('.sc-stage[data-phase="demo"]').waitFor({ timeout: 30_000 })
    await page.waitForTimeout(800)
    const before = (await page.evaluate(() => window.__scAudio.length))
    await scHide(page, true)
    await page.locator('.sc-stage[data-paused]').waitFor()
    await page.waitForTimeout(1200)
    await shot(page, vp, 'sc-pause')
    await scNoText(page)
    const during = await scAudioSummary(page, before)
    await scHide(page, false)
    await tap(page, page.locator('.sc-pause [aria-label="play"]'))
    await page.locator('.sc-stage:not([data-paused])[data-phase="demo"]').waitFor({ timeout: 10_000 })
    note(`pause in the demo: the demo starts again; audio during the pause: ${during.order || 'none'}`)
    // a pause in flight, during a zoom: the same sum from the top, no heart lost
    let r = await scRound(page, 0)
    await scEnded(page, r.n, 60_000).catch(() => {})
    r = await scRound(page, r.n)
    await scDragTo(page, r, r.lanes[r.right])
    await scFlick(page, { ...r, shipLane: r.right }, vp)
    await page.waitForTimeout(120)
    await scHide(page, true)
    await page.locator('.sc-stage[data-paused]').waitFor()
    await scHide(page, false)
    await tap(page, page.locator('.sc-pause [aria-label="play"]'))
    const again = await scRound(page, r.n)
    if (again.right !== r.right) note(`after the pause the right lane moved (${r.right + 1} → ${again.right + 1}): a fresh sum, not the same one?`)
    note(`pause in a zoom: round ${r.n} → ${again.n}, ${again.result ? 'ended at once' : 'from the top'}`)
    // the missing-number line: the frontier at rung 6 (the ring at b), the line not heard yet
    await page.goto('about:blank')
    await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SC_SAVE, scSeed('6', { heard: { demo: 1, 'zoom-tip': 2 } })])
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await tap(page, page.locator('.sc-root[data-screen="cover"] [aria-label="play"]'))
    await scUntilScreen(page, 'play')
    let n = 0
    let seen = false
    for (let i = 0; i < 12 && !seen; i++) {
      const got = await page.locator('.sc-stage[data-phase="missing"]').waitFor({ timeout: 12_000 }).then(() => true, () => false)
      if (got) { seen = true; break }
      const a = await scAnswer(page, vp, 'right', n)
      n = a.n
    }
    if (!seen) { note('no missing-number round in 12 rounds at rung 6'); return }
    await page.waitForTimeout(700)
    await shot(page, vp, 'sc-missing')
    await scHide(page, true)
    await page.locator('.sc-stage[data-paused]').waitFor()
    await scHide(page, false)
    await tap(page, page.locator('.sc-pause [aria-label="play"]'))
    await page.locator('.sc-stage:not([data-paused])[data-phase="missing"]').waitFor({ timeout: 10_000 })
    note('pause in the missing-number line: the line starts again')
    await scNoText(page)
  },

  async spacecatRungs(page, base, vp, note) {
    // rungs of each strand from a seeded save (the frontier there, the intros heard): a right, a wrong and a time-out
    // answer each, a screenshot of each rung's first round
    const out = []
    for (const at of ['2', '4', '6', '9', '11', '12', '13', '17', '19', 'H1', 'C2', 'S2', 'T3', 'T4b', 'T6']) {
      await page.goto('about:blank')
      await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
      const seed = scSeed(at, { heard: { ...SC_HEARD, compare: 2, jumps: 2, times: 2, divide: 2 } })
      await page.evaluate(([k, v]) => { localStorage.setItem(k, v); window.__scText.length = 0 }, [SC_SAVE, seed])
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
      await tap(page, page.locator('.sc-root[data-screen="cover"] [aria-label="play"]'))
      await scUntilScreen(page, 'play')
      const res = []
      let n = 0
      for (const how of ['right', 'wrong', 'timeout']) {
        if ((await scScreen(page)) !== 'play') break
        const r = await scRound(page, n)
        if (!r) break
        if (how === 'right') { await page.waitForTimeout(600); await shot(page, vp, `sc-rung${at}`) }
        const a = await scAnswer(page, vp, how, r.n - 1)
        n = a.n
        res.push(`${scBoxText(r)} ${a.did}→${a.result}`)
      }
      await scNoText(page)
      out.push(`rung ${at}: ${res.join('; ')}`)
    }
    for (const o of out) note(o)
  },

  async spacecatKinds(page, base, vp, note) {
    // the new kinds of round, each from a save with its rung at the frontier and its intro not heard yet: a comparison
    // (three lanes, the drawn signs), a jump row (it hops in), the same number added (dots from the start), times (the
    // pods on the intro's cue), divide (the pods share) and a 2-digit sum with regrouping. Each: the intro's cues, a
    // screenshot in flight and after the right answer
    const KINDS = [
      { at: 'C1', name: 'compare', is: (r) => r.kind === 'compare', lanes: 3 },
      { at: 'S1', name: 'jumps', is: (r) => r.kind === 'jumps', lanes: 4 },
      { at: 'T1', name: 'thrice', is: (r) => r.kind === 'sum' && r.box.filter((t) => t === '+').length === 2, lanes: 4, pods: true },
      { at: 'T2', name: 'times', is: (r) => r.kind === 'sum' && r.box.includes('×'), lanes: 4 },
      { at: 'T4a', name: 'divide', is: (r) => r.kind === 'sum' && r.box.includes('÷'), lanes: 4 },
      { at: '15', name: 'regroup', is: scRegroups, lanes: 4 },
    ]
    const problems = []
    for (const k of KINDS) {
      await page.goto('about:blank')
      await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
      await page.evaluate(([key, v]) => { localStorage.setItem(key, v); window.__scText.length = 0; window.__scAudio.length = 0 }, [SC_SAVE, scSeed(k.at)])
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
      await tap(page, page.locator('.sc-root[data-screen="cover"] [aria-label="play"]'))
      await scUntilScreen(page, 'play')
      let n = 0
      let found = null
      const seen = []
      for (let i = 0; i < 14 && !found; i++) {
        const r = await scRound(page, n, 60_000, true)
        if (!r) break
        seen.push(scBoxText(r))
        if (!k.is(r)) { await scRound(page, r.n - 1); n = (await scAnswer(page, vp, 'right', r.n - 1)).n; continue }
        found = r
        if (r.lanes.length !== k.lanes) problems.push(`${k.name}: ${r.lanes.length} lanes, wanted ${k.lanes}`)
        // the intro (if any) as it plays: each cue's glow, a screenshot at each new cue
        // (two screenshots a cue: a glow pulses). He does not answer while the line plays: the round may end first
        const cues = []
        const t0 = Date.now()
        const phase = await page.locator('.sc-stage').getAttribute('data-phase')
        let endedIn = null
        if (phase === 'intro') {
          while (Date.now() - t0 < 15_000) {
            const q = await scProbe(page)
            if (!q || q.n !== r.n || q.result) { endedIn = q?.result ?? 'ended'; break }
            const fresh = q.cues.filter((c) => !cues.includes(c))
            for (const c of fresh) {
              cues.push(c)
              await shot(page, vp, `sc-kind-${k.name}-cue-${c}`)
              await page.waitForTimeout(250)
              await shot(page, vp, `sc-kind-${k.name}-cue-${c}-2`)
            }
            if ((await page.locator('.sc-stage').getAttribute('data-phase')) !== 'intro') break
            await page.waitForTimeout(60)
          }
          const t = Math.round((Date.now() - t0) / 100) / 10
          note(`${k.name}: intro ${endedIn ? `still playing when the round ended (${endedIn}) after ${t} s` : `ended after ${t} s, then the planets moved`}; cues ${cues.join(' ') || '-'}`)
          // the intro plays before the planets move: they move only after it (a check of the fix)
          if (!endedIn) {
            const moving = await scRound(page, r.n - 1, 15_000).catch(() => null)
            if (!moving) problems.push(`${k.name}: the planets did not move after the intro`)
          }
        } else {
          await page.waitForTimeout(900)
        }
        const q = await scProbe(page)
        if (!endedIn && k.pods && !q.pods) problems.push(`${k.name}: no pods in flight`)
        if (phase === 'intro') await page.waitForTimeout(600)
        await shot(page, vp, `sc-kind-${k.name}-flight`)
        // the round he answers: this one, or (it ended in the intro) the next of the same seed
        const a = await scAnswer(page, vp, 'right', endedIn ? r.n : r.n - 1)
        await page.waitForTimeout(500)
        await shot(page, vp, `sc-kind-${k.name}-after`)
        if (a.result !== 'right') problems.push(`${k.name}: ${a.did}→${a.result}`)
        note(`${k.name} (${k.at}): ${scBoxText(r)} labels ${r.labels.join(' ')}; intro ${phase === 'intro' ? 'played' : 'none'}, cues ${cues.join(' ') || '-'}; pods ${q.pods}; ${a.result}`)
      }
      if (!found) problems.push(`${k.name}: none in 14 rounds (${seen.join(', ')})`)
      const audio = await scAudioSummary(page)
      note(`${k.name} audio: ${audio.order.slice(0, 300)}`)
      await scNoText(page)
    }
    if (problems.length) throw new Error(problems.join('; '))
  },

  async spacecatPlacement(page, base, vp, note) {
    // a fresh save: the demo, then the placement's probes until it ends with a frontier; the export holds the placement
    // events and the probe rounds; the parent area says where he is
    await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate((k) => localStorage.removeItem(k), SC_SAVE)
    const since = Date.now()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await tap(page, page.locator('.sc-root[data-screen="cover"] [aria-label="play"]'))
    await scUntilScreen(page, 'play')
    let n = 0
    const walk = []
    let mode = 'placement'
    // right answers, with one wrong among the first probes, until the placement ends
    for (let i = 0; i < 30 && mode === 'placement'; i++) {
      const sc = await scScreen(page)
      if (sc === 'end') throw new Error('the run ended in the placement')
      const r = await scRound(page, n)
      if (!r) continue
      if (i === 3) await shot(page, vp, 'sc-placement-probe')
      const a = await scAnswer(page, vp, i === 4 ? 'wrong' : 'right', r.n - 1)
      n = a.n
      await page.waitForTimeout(300)
      const s = await scSaved(page)
      mode = s?.ladder?.mode?.kind ?? 'none'
      walk.push(`${scBoxText(r)}${a.result === 'right' ? '' : `(${a.result})`}${mode === 'placement' ? `→${s.ladder.mode.at}` : ''}`)
    }
    note(`probes: ${walk.join(' ')}`)
    if (mode === 'placement') throw new Error('the placement did not end in 30 rounds')
    const s = await scSaved(page)
    const placed = Object.entries(s.ladder.rungs).filter(([, v]) => v.status === 'placed' || v.status === 'passed').map(([k]) => k)
    note(`after the placement: mode ${mode}, ${placed.length} rungs placed (${placed.join(' ')})`)
    await scAudioSummary(page).then((a) => note(`audio: ${a.order.slice(0, 400)}`))
    // the parent area: where he is, and the export's events
    await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await page.evaluate(() => {
      window.__downloads = []
      const make = URL.createObjectURL.bind(URL)
      URL.createObjectURL = (b) => { void b.text().then((t) => window.__downloads.push(t)); return make(b) }
    })
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="spacecat"]')
    const where = (await page.locator('[data-where]').textContent()).trim()
    note(`where he is: ${where}`)
    if (!/^Working on: /.test(where) || /finding/i.test(where)) throw new Error(`where he is: ${where}`)
    await page.locator('[data-where]').scrollIntoViewIfNeeded()
    await shot(page, vp, 'sc-placement-area')
    const data = page.locator('[data-telemetry-export]')
    await data.scrollIntoViewIfNeeded()
    await tap(page, data.locator('[data-telemetry-download]'))
    await page.waitForFunction(() => window.__downloads.length > 0, null, { timeout: 10_000 })
    const doc = JSON.parse(await page.evaluate(() => window.__downloads[0]))
    const ev = (doc.games?.find((g) => g.key === 'alef-spacecat-telemetry')?.events ?? []).filter((e) => typeof e.t !== 'number' || e.t >= since)
    const pl = ev.filter((e) => e.e === 'placement')
    const probes = ev.filter((e) => e.e === 'round' && e.part === 'probe')
    note(`export: placement ${pl.map((e) => `${e.phase}(${e.kind}${e.phase === 'end' ? ` ${e.probes} probes, ${e.mistakes} mistakes, frontier ${e.frontier}` : ''})`).join(' ')}; ${probes.length} probe rounds`)
    if (!pl.some((e) => e.phase === 'end' && e.frontier)) throw new Error('no placement end with a frontier in the export')
    if (!probes.length) throw new Error("no round with part 'probe' in the export")
  },

  async spacecatMigration(page, base, vp, note) {
    // a version 1 save at old rung 6: it loads as version 2 with its rungs placed (1 to 7, 9 to 11; 8 not), the
    // migration's placement plays, nothing breaks
    await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SC_SAVE, scSeedV1(6)])
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await shot(page, vp, 'sc-migration-cover')
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="spacecat"]')
    // the settings section loads lazily: wait for its table
    await page.locator('[data-rungs] [data-rung]').first().waitFor()
    const status = await page.locator('[data-rungs] [data-rung]').evaluateAll((rows) => Object.fromEntries(rows.map((r) => [r.getAttribute('data-rung'), r.getAttribute('data-status')])))
    const placed = Object.keys(status).filter((k) => status[k] === 'placed')
    note(`placed: ${placed.join(' ')}; where: ${(await page.locator('[data-where]').textContent()).trim()}`)
    const want = ['1', '2', '3', '4', '5', '6', '7', '9', '10', '11']
    if (want.some((r) => status[r] !== 'placed') || status['8'] === 'placed' || placed.length !== want.length) throw new Error(`the placed rungs: ${placed.join(' ')}`)
    await page.locator('[data-rungs]').scrollIntoViewIfNeeded()
    await shot(page, vp, 'sc-migration-area')
    await page.locator('[data-parent-close]').scrollIntoViewIfNeeded()
    await tap(page, page.locator('[data-parent-close]'))
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await tap(page, page.locator('.sc-root[data-screen="cover"] [aria-label="play"]'))
    await scUntilScreen(page, 'play')
    let n = 0
    const res = []
    for (let i = 0; i < 4; i++) {
      const r = await scRound(page, n)
      if (!r) break
      if ((await page.locator('.sc-stage').getAttribute('data-phase')) === 'demo') throw new Error('the demo came after a migration')
      const a = await scAnswer(page, vp, 'right', r.n - 1)
      n = a.n
      res.push(`${scBoxText(r)} ${a.result}`)
    }
    const s = await scSaved(page)
    note(`rounds: ${res.join(', ')}; save version ${s.version}, mode ${s.ladder.mode.kind}${s.ladder.mode.at ? ` at ${s.ladder.mode.at}` : ''}; points ${s.totalPoints}`)
    if (s.version !== 2) throw new Error(`the save is version ${s.version}`)
    if (s.totalPoints < 30) throw new Error('the migration lost his points')
    await scNoText(page)
  },

  async spacecatTurn(page, base, vp, note) {
    // the screen turns mid-round (a phone or a tablet rotated): the layout follows the new shape, the round goes on in
    // the same lane, and he answers it in the new layout; then it turns back
    await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SC_SAVE, scSeed('3')])
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await tap(page, page.locator('.sc-root[data-screen="cover"] [aria-label="play"]'))
    await scUntilScreen(page, 'play')
    const turned = { ...vp, width: vp.height, height: vp.width }
    const res = []
    let n = 0
    try {
      for (const [i, size] of [turned, vp].entries()) {
        const r = await scRound(page, n)
        if (!r) throw new Error('no round to turn in')
        await page.setViewportSize({ width: size.width, height: size.height })
        await page.waitForTimeout(700)
        const q = await scProbe(page)
        if (q.n !== r.n || q.result) throw new Error(`the turn ended the round (n ${r.n} → ${q.n}, ${q.result})`)
        if (q.shipLane !== r.shipLane) throw new Error(`the turn moved the ship (lane ${r.shipLane + 1} → ${q.shipLane + 1})`)
        await shot(page, vp, `sc-turned-${i ? 'back' : 'over'}`)
        const a = await scAnswer(page, size, 'right', r.n - 1)
        n = a.n
        res.push(`${size.width}×${size.height}: ${a.result}`)
      }
    } finally {
      await page.setViewportSize({ width: vp.width, height: vp.height })
    }
    note(`turned mid-round, then answered: ${res.join(', ')}`)
    await scNoText(page)
  },

  async spacecatArea(page, base, vp, note) {
    // the gate from the cover, each section, the device's sound (effects off holds in the game), the export
    await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await page.evaluate(() => {
      window.__downloads = []
      const make = URL.createObjectURL.bind(URL)
      URL.createObjectURL = (b) => { void b.text().then((t) => window.__downloads.push(t)); return make(b) }
    })
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="spacecat"]')
    note(`area sections: ${(await eachSection(page)).join(' ')}`)
    await shot(page, vp, 'sc-area')
    // the ladder's view: where he is, the rungs by strand, the recent changes (the ladder events of the runs before)
    await page.locator('[data-spacecat-settings]').scrollIntoViewIfNeeded()
    await shot(page, vp, 'sc-area-settings')
    await page.locator('[data-rungs] [data-rung]').first().waitFor()
    const where = (await page.locator('[data-where]').textContent()).trim()
    const rows = await page.locator('[data-rungs] [data-rung]').count()
    const strands = await page.locator('[data-rungs] [data-strand]').evaluateAll((b) => b.map((x) => `${x.getAttribute('data-strand')} ${x.querySelectorAll('[data-rung]').length}`))
    const recent = await page.locator('[data-recent] li').allTextContents()
    note(`where he is: ${where}; ${rows} rungs (${strands.join(', ')}); recent: ${recent.slice(0, 4).join(' | ') || 'none'}`)
    if (rows !== 31 || strands.length !== 3) throw new Error(`the rung table: ${rows} rows, strands ${strands.join(', ')}`)
    if (!/^Working on: .*Passed \d+ of 31 rungs/.test(where.replace(/\s+/g, ' '))) throw new Error(`where he is: ${where}`)
    await page.locator('[data-recent], [data-rungs]').last().scrollIntoViewIfNeeded()
    await shot(page, vp, 'sc-area-recent')
    await page.locator('[data-relevel-box]').scrollIntoViewIfNeeded()
    await shot(page, vp, 'sc-area-switches')
    const data = page.locator('[data-telemetry-export]')
    await data.scrollIntoViewIfNeeded()
    const count = await data.locator('[data-log="alef-spacecat-telemetry"] [data-log-count]').textContent()
    note(`Space Cat's log: ${count}`)
    await shot(page, vp, 'sc-area-data')
    await tap(page, data.locator('[data-telemetry-download]'))
    await page.waitForFunction(() => window.__downloads.length > 0, null, { timeout: 10_000 })
    const doc = JSON.parse(await page.evaluate(() => window.__downloads[0]))
    const part = doc.games?.find((g) => g.key === 'alef-spacecat-telemetry')
    if (!part) throw new Error('the export has no Space Cat part')
    note(`export: ${doc.games.map((g) => `${g.key} ${g.events.length}`).join(', ')}; Space Cat's events: ${[...new Set(part.events.map((e) => e.e))].join(' ')}`)
    // the export of every game: tick each log
    const picks = data.locator('[data-log-pick]')
    for (let i = 0; i < await picks.count(); i++) if (!(await picks.nth(i).isChecked())) await tap(page, picks.nth(i))
    await tap(page, data.locator('[data-telemetry-download]'))
    await page.waitForFunction(() => window.__downloads.length > 1, null, { timeout: 10_000 })
    const every = JSON.parse(await page.evaluate(() => window.__downloads[1]))
    if (every.games.length < 3 || !every.games.some((g) => g.key === 'alef-spacecat-telemetry')) throw new Error(`the export of every game: ${every.games.map((g) => g.key).join(' ')}`)
    note(`export of every game: ${every.games.map((g) => `${g.key} ${g.events.length}`).join(', ')}`)
    // effects off on this device: in the game no coded effect plays, a voice still does
    await page.locator('[data-section="sound"]').scrollIntoViewIfNeeded()
    const sfx = page.locator('[data-sound-sfx]')
    if (await sfx.isChecked()) await tap(page, sfx)
    await page.locator('[data-parent-close]').scrollIntoViewIfNeeded()
    await tap(page, page.locator('[data-parent-close]'))
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    const from = await page.evaluate(() => window.__scAudio.length)
    await tap(page, page.locator('[data-info]').first())
    await tap(page, page.locator('.sc-root[data-screen="cover"] [aria-label="play"]'))
    await scUntilScreen(page, 'play')
    const r = await scRound(page, 0)
    await scAnswer(page, vp, 'wrong', r.n - 1)
    await page.waitForTimeout(1500)
    const a = await scAudioSummary(page, from)
    note(`effects off: ${a.order}`)
    if (/s:/.test(a.order)) throw new Error(`a coded effect played with effects off: ${a.order}`)
    // find his level again (last: it starts a placement): the confirm, then the area says he is being placed
    await page.goto(`${base}spacecat/`, { waitUntil: 'domcontentloaded' })
    await page.locator('.sc-root[data-screen="cover"]:not([data-loading])').waitFor({ timeout: 90_000 })
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="spacecat"]')
    page.once('dialog', (d) => void d.accept())
    await page.locator('[data-relevel]').scrollIntoViewIfNeeded()
    await tap(page, page.locator('[data-relevel]'))
    await page.waitForTimeout(500)
    const after = await scSaved(page)
    note(`find his level again: mode ${after.ladder.mode.kind} (${after.ladder.mode.why ?? '-'}); where: ${(await page.locator('[data-where]').textContent()).trim()}`)
    if (after.ladder.mode.kind !== 'placement') throw new Error('find his level again started no placement')
  },

  async telemetry(page, base, vp, note) {
    // after the play checks (one context per size, so their events are in this storage): the Data section of Spell Quest's
    // area counts them, shows the storage line, and a Download gives the export
    await page.goto(`${base}spellquest-he/`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-screen="cover"]').waitFor()
    await page.evaluate(() => {
      window.__downloads = []
      const make = URL.createObjectURL.bind(URL)
      URL.createObjectURL = (b) => { void b.text().then((t) => window.__downloads.push(t)); return make(b) }
    })
    await passGate(page, page.locator('[aria-label="parent settings (hold)"]'), '[data-parent-area="spellquest-he"]')
    const data = page.locator('[data-telemetry-export]')
    await data.scrollIntoViewIfNeeded()
    const count = (key) => data.locator(`[data-log="${key}"] [data-log-count]`).textContent()
    const spellquest = await count('alef-spellquest-he-telemetry')
    const clock = await count('alef-clock-telemetry')
    if (!/^[1-9]\d* events$/.test(spellquest)) throw new Error(`Hebrew Spell Quest log: ${spellquest}`)
    if (!/^\d+ events$/.test(clock)) throw new Error(`the clock's log: ${clock}`)
    const storage = await data.locator('[data-storage]').textContent()
    if (!/telemetry .* of \d+k chars/.test(storage)) throw new Error(`no storage line: ${storage}`)
    note(`Spell Quest ${spellquest}, clock ${clock}; ${storage.trim()}`)
    await shot(page, vp, 'telemetry-data')
    await tap(page, data.locator('[data-telemetry-download]'))
    await page.waitForFunction(() => window.__downloads.length > 0, null, { timeout: 10_000 })
    const doc = JSON.parse(await page.evaluate(() => window.__downloads[0]))
    const part = doc.games?.find((g) => g.key === 'alef-spellquest-he-telemetry')
    if (doc.v !== 2 || !part || !part.events.length) throw new Error('the download has no Spell Quest events')
    const names = [...new Set(part.events.map((e) => e.e))]
    note(`download: ${part.events.length} events (${names.slice(0, 8).join(' ')}${names.length > 8 ? ' …' : ''})`)
  },

  async spellquestEnFit(page, base, vp, note) {
    // the English page is open only on staging (src/spellquest/english/available.ts)
    if (!base.endsWith('/staging/')) throw new Skip('the English page needs the staging verify build (ALEF_STAGING=1)')
    const problems = []
    const report = (screen, r, extra = '') => {
      const orbs = [...r.seen.values()].filter((v) => 'ring' in v)
      const boxes = [...r.seen.values()].filter((v) => 'slack' in v)
      const tight = orbs.length ? Math.max(...orbs.map((o) => o.reach / o.ring)) : null
      note(`${screen}: ${r.samples} samples, ${orbs.length} orb glyphs${tight !== null ? ` (closest to the ring ${(tight * 100).toFixed(0)}%)` : ''}, ${boxes.length} box glyphs${boxes.length ? ` (least room ${Math.min(...boxes.map((b) => b.slack))} px)` : ''}${extra}`)
      if (!r.samples) problems.push(`${screen}: nothing to measure`)
      problems.push(...r.bad.map((b) => `${screen}: ${b}`))
    }
    // the broom: word orbs (from stage 2, more of them later), each orb's drawn word inside its gold ring; waves come at their
    // own pace, so it watches long enough to see words
    const words = new Set()
    // stages 4 and 6, and stage 6 again (up to two more times) while no word came
    for (const [i, stage] of [4, 6, 6, 6].entries()) {
      if (i >= 2 && words.size) break
      await englishStation(page, base, 'broom', stage)
      const r = await sampleFit(page, 20_000, 300, (p) => p.orbs.length > 0, (p) => { p.orbs.forEach((o) => o.text.length > 2 && words.add(o.text)); return [] })
      report(`broom st${stage}`, r)
      await shot(page, vp, `en-broom-st${stage}`)
    }
    note(`broom words seen: ${[...words].join(' ') || 'none'}`)
    if (!words.size) problems.push('broom: no word orb came in the time watched')
    // the cauldron: the word's boxes and the tiles (orbs)
    for (const stage of [4, 6]) {
      await englishStation(page, base, 'cauldron', stage)
      report(`cauldron st${stage}`, await sampleFit(page, 6_000, 500, (p) => p.boxes.length > 0, () => []))
      await shot(page, vp, `en-cauldron-st${stage}`)
    }
    // the ladder: the rung he makes, clear of the built rungs (the foot) and the wizard
    {
      await englishStation(page, base, 'ladder', 4)
      let least = Infinity
      const r = await sampleFit(page, 6_000, 500, (p) => p.rows.making.length > 0, (p) => {
        const row = unionOf(p.rows.making)
        const out = []
        for (const [name, rs] of [['a built rung', p.things.rungs], ['the wizard', p.things.wizard]]) {
          for (const t of rs) {
            const g = gapOf(row, t)
            least = Math.min(least, g)
            if (g < 0) out.push(`the making rung's boxes overlap ${name} by ${(-g).toFixed(0)} px`)
          }
        }
        return out
      })
      report('ladder st4', r, `, the row's least room to the foot or the wizard ${least === Infinity ? '-' : least.toFixed(0)} px`)
      await shot(page, vp, 'en-ladder-st4')
    }
    // the tower: the ? of a word round never on the tower (its door)
    {
      // a word round brings the ?. Its letter rounds come first (a new stage's units): it waits, and answers nothing (a
      // session of right answers ends before the word rounds come); a session that ends first is played again
      let found = false
      for (let attempt = 0; attempt < 3 && !found; attempt++) {
        await englishStation(page, base, 'tower', 6)
        const until = Date.now() + 180_000
        while (Date.now() < until && !(found = (await page.locator('.nd-hint-btn').count()) > 0)) {
          if (!(await page.locator('[data-screen="play"]').count())) break
          await page.waitForTimeout(1500)
        }
      }
      if (!found) problems.push('tower st6: no word round with its ? came')
      else {
        await page.waitForTimeout(400)
        const p = await page.evaluate(FIT_PROBE, { ringIn: ORB_RING_IN })
        const g = gapOf(p.things.hint[0], p.things.tower[0])
        note(`tower st6: the ? is ${g.toFixed(0)} px from the tower`)
        if (g < 0) problems.push(`tower st6: the ? overlaps the tower by ${(-g).toFixed(0)} px`)
        await shot(page, vp, 'en-tower-st6')
      }
    }
    // the spell book with its longest word (5 boxes): the gallery's test-build link
    {
      await seedEnglish(page, base, 4)
      await page.goto(`${base}spellquest-en/#/gallery/spell-long`, { waitUntil: 'domcontentloaded' })
      await page.locator('[data-screen="play"]').waitFor({ timeout: 20_000 }).catch(() => {})
      await page.evaluate(() => document.fonts.ready)
      let fiveBoxes = false
      // the boxes fill as he drops (a tap drops the tile into the next box): the right tile of four boxes, so their
      // letters are measured too (the fifth casts the spell)
      const until = Date.now() + 40_000
      while (Date.now() < until && (await page.locator('[data-box][data-filled]').count()) < 4) {
        const right = page.locator('[data-correct-orb]').first()
        if (await right.count()) await tap(page, right).catch(() => {})
        await page.waitForTimeout(1200)
      }
      const r = await sampleFit(page, 4_000, 500, (p) => p.rows.boxes.length > 0, (p) => {
        fiveBoxes ||= p.rows.boxes.length === 5
        const row = unionOf(p.rows.boxes)
        const book = p.things.book[0]
        if (!book) return ['no book']
        // the boxes' page: right of the spine (English reads from the left page, where the picture is)
        const page = { left: (book.left + book.right) / 2, right: book.right, top: book.top, bottom: book.bottom }
        return row.left < page.left || row.right > page.right || row.top < page.top || row.bottom > page.bottom ? ['the boxes leave their page'] : []
      })
      if (!fiveBoxes) problems.push('spell: the long fixture did not show 5 boxes')
      if (![...r.seen.keys()].some((k) => k.startsWith('box'))) problems.push('spell: no box was filled')
      report('spell (5 boxes)', r)
      await shot(page, vp, 'en-spell-long')
    }
    // the spell book's written word (stage 4 on): a box per letter, the longest (jumping, 7 letters), on the slate on the
    // book's pages; a small letter (the middle line to the baseline) at least 30 px high
    {
      await seedEnglish(page, base, 4)
      await page.goto(`${base}spellquest-en/#/gallery/spell-write`, { waitUntil: 'domcontentloaded' })
      await page.locator('[data-write-box]').first().waitFor({ timeout: 20_000 }).catch(() => {})
      await page.evaluate(() => document.fonts.ready)
      const g = await page.evaluate(() => {
        const rect = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom } }
        const book = document.querySelector('[data-book]')
        const slate = document.querySelector('[data-spell-write] [data-draw-board]')
        const lines = [...document.querySelectorAll('[data-spell-write] [data-lines] line')].map((l) => l.getBoundingClientRect().top)
        return {
          book: book && rect(book), slate: slate && rect(slate), boxes: [...document.querySelectorAll('[data-write-box]')].map(rect),
          small: lines.length === 4 ? lines[2] - lines[1] : 0,
          view: { w: window.innerWidth, h: window.innerHeight },
        }
      })
      const out = (a, b) => a.left < b.left - 0.5 || a.right > b.right + 0.5 || a.top < b.top - 0.5 || a.bottom > b.bottom + 0.5
      if (g.boxes.length !== 7) problems.push(`spell (written): ${g.boxes.length} letter boxes, not 7`)
      if (!g.book || !g.slate) problems.push('spell (written): no book or no slate')
      else {
        if (out(g.slate, g.book)) problems.push('spell (written): the slate leaves the book')
        g.boxes.forEach((b, i) => { if (out(b, g.slate)) problems.push(`spell (written): letter box ${i} leaves the slate`) })
        g.boxes.slice(1).forEach((b, i) => { if (b.left < g.boxes[i].right) problems.push(`spell (written): letter boxes ${i} and ${i + 1} overlap`) })
        if (g.boxes.some((b) => b.right > g.view.w || b.bottom > g.view.h || b.left < 0)) problems.push('spell (written): a letter box is off the screen')
      }
      if (g.small < 30) problems.push(`spell (written): a small letter is ${g.small.toFixed(0)} px high (under 30)`)
      note(`spell (written, 7 letters): ${g.boxes.length} boxes, a small letter ${g.small.toFixed(0)} px high`)
      await shot(page, vp, 'en-spell-write')
    }
    if (problems.length) throw new Error(`${problems.length} misfit(s):\n     ${problems.join('\n     ')}`)
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
  // ALEF_VERIFY_SIZES: a comma-separated list of the sizes to run (default: all)
  const sizes = process.env.ALEF_VERIFY_SIZES?.split(',').map((s) => s.trim())
  console.log(`base ${base}  browser ${cdp ? 'connected' : 'launched'}  shots ${shots}`)
  let failed = 0
  for (const vp of [...VIEWPORTS, ...FIT_VIEWPORTS].filter((v) => (sizes ? sizes.includes(v.name) : !v.optIn))) {
    const sized = names.filter((n) => (SIZES_OF[n] ?? VIEWPORTS).includes(vp) && (!vp.only || vp.only.includes(n)))
    if (!sized.length) continue
    // one context per size: its own storage (a fresh save, boy or girl not set yet), touch on
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: !!vp.mobile, locale: 'he-IL' })
    contexts.add(context)
    try {
      // a shared browser may be busy: generous waits (a screenshot can take tens of seconds)
      context.setDefaultTimeout(60_000)
      await context.addInitScript(INIT, !!cdp)
      for (const name of sized) {
        const page = await context.newPage()
        const notes = []
        const errors = []
        page.on('pageerror', (e) => errors.push(e.stack ?? e.message))
        const t0 = Date.now()
        try {
          await CHECKS[name](page, base, vp, (s) => notes.push(s))
          if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`)
          console.log(`PASS ${vp.name} ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)${notes.length ? `\n     ${notes.join('\n     ')}` : ''}`)
        } catch (e) {
          if (e instanceof Skip) { console.log(`SKIP ${vp.name} ${name}: ${e.message}`); continue }
          failed++
          await shot(page, vp, `FAIL-${name}`).catch(() => {})
          // the first line, and playwright's "waiting for locator(…)" line: which element it waited for
          const why = /misfit/.test(e.message) ? e.message : e.message.split('\n').filter((l, i) => i === 0 || /waiting for/.test(l)).slice(0, 2).join(' ')
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
