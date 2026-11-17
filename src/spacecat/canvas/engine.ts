// The play screen's game loop: one round at a time on the canvas. It turns the child's intents into round events
// (logic/round.ts), keeps the flight time (frozen time is not counted), draws the round and its mark, and reports the
// result once the screen has cleared. The controller (Task 15) decides what comes next.
import type { Sleeper } from '../../shared/sleeper'
import type { SfxName } from '../audio/sfx'
import { IMAGES } from '../assets/images'
import type { RoundContent } from '../content'
import type { Layout } from '../layout'
import { nearestLane, startRound, step, type RoundEvent, type RoundResult, type RoundState } from '../logic/round'
import {
  GEOM, MAX_OFFSET, drawBackground, drawBox, drawHand, drawTopBar, fit, laneUnits, numDisc, planetPos, type Geom,
} from './draw'
import { CLEAR_MS, Effects, MARK_MS, drawFlyNumber, drawRightRing } from './effects'
import { attachInput, type Intent } from './input'
import { PLANET_AIR, PlanetRenderer } from './planet'

/** The engine's time seam: the shared Sleeper's `frame` and `now` (a test steps the frames by hand). */
export type EngineClock = Pick<Sleeper, 'frame' | 'now'>

export interface Hud { dots: number; points: number; hearts: number }

export interface Engine {
  setLayout(l: Layout): void
  setShip(n: 1 | 2 | 3): void
  setHud(h: Hud): void
  /** frozen: the planets stand still until resume() */
  play(c: RoundContent, arrivalMs: number, opts?: { frozen?: boolean }): void
  /** stop and start the planets (demo, tips, pause) */
  freeze(): void
  resume(): void
  /** whether his touches and keys reach the round (off while the demo line or the missing-number line plays) */
  setInput(on: boolean): void
  /** the demo hand; resolves after ms, or at once when he touches the screen (rule: a hint goes away when he acts) */
  demoHand(kind: 'drag' | 'flick', lane: number, ms: number): Promise<void>
  pulseRing(on: boolean): void
  /** after a pause: the same content from the top */
  restart(): void
  onEnd: (r: RoundResult) => void
  onFirstParkedUnderRight?: () => void
  /** every touch or key (the controller ends a tip with it) */
  onTouch?: () => void
  destroy(): void
}

/** the ship glides to its lane at this speed (logical px per s in the wide layout) */
export const SHIP_SPEED = 2600
/** a zoom climbs at this speed */
export const ZOOM_SPEED = 1900
/** resting under the right planet this long without a zoom calls onFirstParkedUnderRight */
export const PARKED_MS = 600
/** a wrong or time-out's heart sound follows its effect after this long */
export const HEART_SFX_MS = 250
/** the longest frame step that counts (a slow or hidden page does not jump the planets) */
const MAX_DT = 0.1
/** the canvas never draws more device pixels than this per CSS pixel (a cheap tablet has to repaint it every frame) */
const MAX_DPR = 2

const defaultClock: EngineClock = {
  frame: (fn) => { const id = requestAnimationFrame(() => fn()); return () => cancelAnimationFrame(id) },
  now: () => performance.now(),
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const loadImage = (src: string) => { const i = new Image(); i.src = src; return i }
const loaded = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

interface Hand { kind: 'drag' | 'flick'; lane: number; ms: number; total: number; from: number; resolve: () => void }

export function createEngine(canvas: HTMLCanvasElement, hooks: { sfx: (name: SfxName) => void; clock?: EngineClock }): Engine {
  const clock = hooks.clock ?? defaultClock
  const g = canvas.getContext('2d')
  const bg = loadImage(IMAGES.bg)
  const ships = IMAGES.ships.map(loadImage)
  const planets = PLANET_AIR.map((air, i) => new PlanetRenderer(IMAGES.surfaces[i], air))
  const fx = new Effects()
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 2.2 + 1, v: Math.random() * 0.06 + 0.02 }))

  let G: Geom = GEOM.wide
  let shipN: 1 | 2 | 3 = 1
  let hud: Hud = { dots: 0, points: 0, hearts: 3 }
  let hudAtStart: Hud = hud
  let shownPoints = 0
  let last: { c: RoundContent; arrivalMs: number; frozen: boolean; lane: number } | null = null
  let content: RoundContent | null = null
  let round: RoundState | null = null
  let phase: 'idle' | 'flight' | 'mark' = 'idle'
  let frozen = false
  let inputOn = true
  let t = 0
  let p = 0
  let ambient = 0
  const ship = { x: G.lanes[1], tx: G.lanes[1], zoomY: 0, spin: 0, tilt: 0, zoomBack: 0 }
  let zooming = false
  let pendingZoom = false
  let offs = [0, 0, 0, 0]
  let spins = [0.08, 0.08, 0.08, 0.08]
  let looks = [0, 1, 2, 3]
  let gone = [false, false, false, false]
  let parked = 0
  let parkedFired = false
  let markMs = 0
  let heartSfxDue = false
  let flyFrom = { x: 0, y: 0 }
  let ringPulse = false
  let hand: Hand | null = null

  const laneOf = (x: number) => nearestLane(laneUnits(G, x), round?.lane ?? 1)
  const send = (e: RoundEvent) => {
    if (!round) return
    round = step(round, e)
    if (round.done && phase === 'flight') toMark(round.done)
  }

  function endHand() {
    if (!hand) return
    const h = hand
    hand = null
    if (h.kind === 'drag') ship.x = ship.tx = h.from
    h.resolve()
  }

  function startZoom() {
    if (!round || zooming || round.done) return
    zooming = true
    pendingZoom = false
    ship.tx = G.lanes[round.lane]
    send({ type: 'zoom', t })
  }

  function onIntent(i: Intent) {
    if (!round || phase !== 'flight') return
    send({ type: 'touch', t })
    engine.onTouch?.()
    endHand()
    const [lo, hi] = [G.lanes[0], G.lanes[G.lanes.length - 1]]
    switch (i.type) {
      case 'touch': return
      case 'drag': ship.tx = clamp(i.x, lo, hi); pendingZoom = false; return
      case 'release': ship.tx = G.lanes[nearestLane(laneUnits(G, ship.tx), round.lane)]; return
      case 'key': {
        const cur = nearestLane(laneUnits(G, ship.tx), round.lane)
        ship.tx = G.lanes[clamp(cur + i.dir, 0, G.lanes.length - 1)]
        return
      }
      case 'tapPlanet': ship.tx = G.lanes[i.lane]; pendingZoom = true; return
      case 'flick': case 'keyZoom': startZoom()
    }
  }

  function toMark(res: RoundResult) {
    phase = 'mark'
    markMs = 0
    zooming = false
    pendingZoom = false
    ringPulse = false
    endHand()
    const c = content!
    const at = planetPos(G, res.lane, p, offs[res.lane])
    const rp = planetPos(G, c.rightLane, p, offs[c.rightLane])
    flyFrom = { x: rp.x, y: rp.y }
    if (res.result === 'right') {
      gone[res.lane] = true
      fx.burst(G, at.x, at.y, PLANET_AIR[looks[res.lane]], res.points === 2 ? 2 : 1)
      fx.flash = res.points === 2 ? 0.55 : 0.3
      fx.flashCol = 'gold'
      if (res.points === 2) fx.plus = { v: 2, t: 0 }
      hud = { ...hud, dots: Math.min(7, hud.dots + 1), points: hud.points + res.points }
      hooks.sfx(res.points === 2 ? 'right-zoom' : 'right')
    } else {
      if (res.result === 'wrong') {
        gone[res.lane] = true
        fx.burst(G, at.x, at.y, '#ff5a5a', 1)
        fx.flash = 0.7
        fx.flashCol = 'red'
        fx.shake = 0.5
        ship.zoomBack = ship.zoomY
        hooks.sfx('wrong')
      } else {
        hooks.sfx('timeout')
      }
      if (hud.hearts > 0) fx.breakHeart(hud.hearts - 1)
      hud = { ...hud, hearts: Math.max(0, hud.hearts - 1) }
      heartSfxDue = true
    }
  }

  function update(dt: number) {
    ambient += dt
    fx.update(G, dt)
    for (const s of stars) {
      s.y += s.v * dt * (phase === 'flight' && !frozen ? 1 : 0.3)
      if (s.y > 1) { s.y = 0; s.x = Math.random() }
    }
    shownPoints += Math.sign(hud.points - shownPoints) * Math.min(Math.abs(hud.points - shownPoints), dt * 12)
    if (hand) {
      hand.ms += dt * 1000
      if (hand.kind === 'drag') {
        const k = hand.ms / hand.total, to = G.lanes[hand.lane]
        const e = k < 0.4 ? ease(k / 0.4) : k < 0.6 ? 1 : k < 0.95 ? 1 - ease((k - 0.6) / 0.35) : 0
        ship.x = ship.tx = hand.from + (to - hand.from) * e
      }
      if (hand.ms >= hand.total) endHand()
    }
    if (phase === 'flight' && round) flight(dt)
    else if (phase === 'mark' && !frozen) mark(dt)
  }

  function flight(dt: number) {
    const r = round!
    const px = ship.x, sp = SHIP_SPEED * G.k * dt
    ship.x += clamp(ship.tx - ship.x, -sp, sp)
    ship.tilt += (clamp((ship.x - px) / Math.max(dt, 1e-3) / (2200 * G.k), -0.35, 0.35) - ship.tilt) * Math.min(1, dt * 10)
    if (!(hand && hand.kind === 'drag')) {
      const ln = laneOf(ship.x)
      if (ln !== r.lane) send({ type: 'lane', lane: ln, t })
    }
    if (pendingZoom && Math.abs(ship.x - ship.tx) < 2) startZoom()
    if (phase !== 'flight') return
    const under = Math.abs(ship.x - G.lanes[r.rightLane]) < 3
    if (!frozen && !zooming && !hand && r.input && under && !parkedFired) {
      parked += dt * 1000
      if (parked >= PARKED_MS) { parkedFired = true; engine.onFirstParkedUnderRight?.() }
    } else parked = 0
    if (frozen) return
    t += dt * 1000
    p = Math.min(1, t / r.arrivalMs)
    if (zooming) {
      ship.zoomY += ZOOM_SPEED * G.k * dt
      const pp = planetPos(G, round!.lane, p, offs[round!.lane])
      if (G.shipY - ship.zoomY - G.shipS * 0.45 <= pp.y + pp.r * 0.8) send({ type: 'hit', t })
    } else if (p >= 1) {
      t = r.arrivalMs
      send({ type: 'arrive', t })
    }
  }

  function mark(dt: number) {
    markMs += dt * 1000
    const res = round!.done!
    if (heartSfxDue && markMs >= HEART_SFX_MS) { heartSfxDue = false; hooks.sfx('heart') }
    if (res.result === 'wrong') {
      const k = Math.min(1, markMs / 700)
      ship.spin = (1 - Math.pow(1 - k, 3)) * Math.PI * 4
      ship.zoomY = Math.max(0, ship.zoomBack * (1 - markMs / 500))
    } else if (res.result === 'right') {
      ship.zoomY = Math.max(0, ship.zoomY - SHIP_SPEED * G.k * dt)
    }
    if (markMs >= MARK_MS + CLEAR_MS) {
      phase = 'idle'
      ship.spin = 0
      ship.zoomY = 0
      engine.onEnd(res)
    }
  }

  // ---------- drawing

  function resize(): { cw: number; ch: number } {
    const dpr = Math.min(MAX_DPR, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)
    const cw = Math.round((canvas.clientWidth || G.W) * dpr), ch = Math.round((canvas.clientHeight || G.H) * dpr)
    if (canvas.width !== cw) canvas.width = cw
    if (canvas.height !== ch) canvas.height = ch
    return { cw, ch }
  }

  function drawPlanet(i: number, at: { x: number; y: number; r: number }, alpha: number, glow: boolean) {
    if (!g) return
    const air = PLANET_AIR[looks[i]]
    g.save()
    g.globalAlpha = alpha
    if (glow) {
      const k = 0.75 + 0.25 * Math.sin(ambient * 3 + i)
      const gr = g.createRadialGradient(at.x, at.y, at.r * 0.9, at.x, at.y, at.r * 1.32)
      gr.addColorStop(0, air + 'aa'); gr.addColorStop(1, air + '00')
      g.globalAlpha = alpha * k; g.fillStyle = gr; g.beginPath(); g.arc(at.x, at.y, at.r * 1.32, 0, Math.PI * 2); g.fill()
      g.globalAlpha = alpha
    }
    g.drawImage(planets[looks[i]].render(ambient * spins[i] + i * 0.27), at.x - at.r, at.y - at.r, at.r * 2, at.r * 2)
    g.restore()
  }

  function drawShip() {
    if (!g) return
    const x = ship.x, y = G.shipY - ship.zoomY, s = G.shipS, im = ships[shipN - 1]
    if (zooming) {
      g.strokeStyle = 'rgba(255,216,74,.85)'; g.lineWidth = 4 * G.k
      for (let i = 0; i < 6; i++) {
        const xx = x + (Math.random() - 0.5) * s * 0.7, yy = y + s * 0.45 + Math.random() * 30 * G.k
        g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + (60 + Math.random() * 90) * G.k); g.stroke()
      }
    }
    g.save(); g.translate(x, y); g.rotate(ship.tilt + ship.spin)
    if (loaded(im)) { const ar = im.naturalHeight / im.naturalWidth; g.drawImage(im, -s / 2, (-s * ar) / 2, s, s * ar) }
    g.restore()
  }

  function drawHandNow() {
    if (!g || !hand) return
    if (hand.kind === 'drag') { drawHand(g, ship.x + 4 * G.k, G.shipY - G.shipS * 0.15, G.k * 1.05); return }
    const c = (ambient % 1.6) / 1.6, k = c < 0.25 ? 0 : c < 0.55 ? ease((c - 0.25) / 0.3) : 1, a = c < 0.8 ? 1 : 1 - (c - 0.8) / 0.2
    const y0 = G.shipY - G.shipS * 0.1, y1 = y0 - G.H * 0.22, y = y0 + (y1 - y0) * k
    if (k > 0) {
      g.save(); g.globalAlpha = a * 0.6
      const gr = g.createLinearGradient(0, y, 0, y0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#fff0')
      g.strokeStyle = gr; g.lineWidth = 16 * G.k; g.lineCap = 'round'; g.beginPath(); g.moveTo(ship.x, y0); g.lineTo(ship.x, y + 10); g.stroke()
      g.restore()
    }
    g.save(); g.globalAlpha = a; drawHand(g, ship.x, y, G.k * 1.05); g.restore()
  }

  function render() {
    if (!g) return
    const { cw, ch } = resize()
    g.setTransform(1, 0, 0, 1, 0, 0)
    drawBackground(g, bg, cw, ch)
    const f = fit(G, cw, ch)
    const sh = fx.shake > 0 ? fx.shake * 34 * G.k : 0
    g.setTransform(f.scale, 0, 0, f.scale, f.ox + (Math.random() - 0.5) * sh * f.scale, f.oy + (Math.random() - 0.5) * sh * f.scale)
    g.fillStyle = '#fff'
    for (const s of stars) { g.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(ambient * 2 + s.x * 40)); g.fillRect(s.x * G.W, s.y * G.H, s.s, s.s * 2.5) }
    g.globalAlpha = 1
    const res = phase === 'mark' ? round!.done : null
    if (content && phase !== 'idle') {
      const fade = res && markMs > MARK_MS ? Math.max(0, 1 - (markMs - MARK_MS) / CLEAR_MS) : 1
      const pDraw = res && res.result === 'timeout' ? 1 + (markMs / 1000) * 1.2 : p
      const glow = phase === 'flight' && !frozen && inputOn && !hand
      for (let i = 0; i < 4; i++) {
        if (gone[i]) continue
        const at = planetPos(G, i, pDraw, offs[i])
        if (res && i === content.rightLane) drawRightRing(g, G, at, fade)
        drawPlanet(i, at, fade, glow)
        if (!(res && i === content.rightLane)) numDisc(g, content.labels[i], at.x, at.y, at.r, fade)
      }
    }
    drawShip()
    const top = drawTopBar(g, G, { dots: hud.dots, points: shownPoints, hearts: hud.hearts }, fx.heartBreak)
    if (content && phase !== 'idle') {
      const ring = drawBox(g, G, content.box, ambient, ringPulse)
      if (res) drawFlyNumber(g, G, content.flyNumber, flyFrom, ring, markMs)
    }
    drawHandNow()
    fx.drawPlus(g, G, top.pointsAt)
    fx.drawParts(g)
    g.setTransform(1, 0, 0, 1, 0, 0)
    fx.drawFlash(g, cw, ch)
  }

  // ---------- loop and input

  let lastNow = clock.now()
  let cancel: () => void = () => {}
  let alive = true
  const loop = () => {
    if (!alive) return
    const now = clock.now()
    const dt = Math.min(MAX_DT, Math.max(0, (now - lastNow) / 1000))
    lastNow = now
    update(dt)
    render()
    cancel = clock.frame(loop)
  }
  cancel = clock.frame(loop)

  const rect = () => {
    const b = canvas.getBoundingClientRect()
    return b.width > 0 ? b : { left: 0, top: 0, width: G.W, height: G.H }
  }
  const detach = attachInput(canvas, {
    toLogical: (cx, cy) => {
      const b = rect(), f = fit(G, b.width, b.height)
      return { x: (cx - b.left - f.ox) / f.scale, y: (cy - b.top - f.oy) / f.scale }
    },
    height: () => rect().height,
    planetAt: (x, y) => {
      if (zooming || !round) return null
      for (let i = 0; i < 4; i++) {
        if (gone[i]) continue
        const at = planetPos(G, i, p, offs[i])
        if (Math.hypot(x - at.x, y - at.y) < at.r * 1.15) return i
      }
      return null
    },
    enabled: () => inputOn && phase === 'flight' && !!round && !round.done,
  }, onIntent)

  const engine: Engine = {
    setLayout(l) {
      const lane = laneOf(ship.x), tLane = laneOf(ship.tx)
      G = GEOM[l]
      ship.x = G.lanes[lane]; ship.tx = G.lanes[tLane]
    },
    setShip(n) { shipN = n },
    setHud(h) { hud = { ...h }; if (phase !== 'flight') hudAtStart = hud },
    play(c, arrivalMs, opts) {
      endHand()
      const lane = round ? round.lane : laneOf(ship.x)
      ship.x = ship.tx = G.lanes[lane]
      last = { c, arrivalMs, frozen: !!opts?.frozen, lane }
      content = c
      round = startRound(c.labels.map(Number), c.rightLane, lane, arrivalMs)
      phase = 'flight'
      frozen = !!opts?.frozen
      t = 0; p = 0
      zooming = false; pendingZoom = false
      ship.zoomY = 0; ship.spin = 0; ship.zoomBack = 0
      offs = [0, 1, 2, 3].map(() => Math.round((Math.random() * 2 - 1) * MAX_OFFSET))
      spins = [0, 1, 2, 3].map(() => 0.05 + Math.random() * 0.09)
      looks = shuffle([0, 1, 2, 3])
      gone = [false, false, false, false]
      parked = 0; parkedFired = false; markMs = 0; heartSfxDue = false; ringPulse = false
      hudAtStart = { ...hud }
    },
    freeze() { frozen = true },
    resume() { frozen = false },
    setInput(on) { inputOn = on },
    demoHand(kind, lane, ms) {
      endHand()
      return new Promise<void>((resolve) => { hand = { kind, lane, ms: 0, total: ms, from: ship.x, resolve } })
    },
    pulseRing(on) { ringPulse = on },
    restart() {
      if (!last) return
      const l = last
      endHand()
      fx.clear()
      hud = { ...hudAtStart }
      shownPoints = hud.points
      round = null
      ship.x = ship.tx = G.lanes[l.lane]
      engine.play(l.c, l.arrivalMs, { frozen: l.frozen })
    },
    onEnd: () => {},
    destroy() {
      alive = false
      cancel()
      detach()
      endHand()
    },
  }
  return engine
}
