// Ported from Space Cat Math by Igor (Ray's dad), used by permission. See asset-sources/spacecat/README.md.
// The turning planet: a flat surface picture wrapped on a lit sphere, one pixel table computed once for all planets.
// The phase cache (a fixed number of frames per turn) is from the approved mock; it is emptied when the picture loads.

/** the size of a rendered planet, in px */
export const PLANET_TEX = 128
/** the surface picture is drawn into a texture of this size */
export const TEX_W = 256, TEX_H = 128
/** the axis tilt, in radians */
export const TILT = 0.35
/** the direction of the light (normalized when used) */
export const LIGHT: [number, number, number] = [-0.55, -0.5, 0.67]
/** frames kept per turn */
export const PHASES = 48
/** the air colour of each of the four planets */
export const PLANET_AIR = ['#3fa9f5', '#ff9a3c', '#9b59ff', '#ff6fb5'] as const

export function normalize(x: number, y: number, z: number): [number, number, number] {
  const h = Math.hypot(x, y, z)
  return [x / h, y / h, z / h]
}

export function smoothstep(lo: number, hi: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
  return t * t * (3 - 2 * t)
}

export function hexRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export interface SphereTables { u: Float32Array; v: Int32Array; lit: Float32Array; spec: Float32Array; rim: Float32Array; alpha: Float32Array }

let tables: SphereTables | null = null

/** per pixel of the planet: texture u and v, light, highlight, air rim and the round mask's alpha */
export function sphereTables(): SphereTables {
  if (tables) return tables
  const n = PLANET_TEX, c = n / 2
  const t: SphereTables = {
    u: new Float32Array(n * n), v: new Int32Array(n * n), lit: new Float32Array(n * n),
    spec: new Float32Array(n * n), rim: new Float32Array(n * n), alpha: new Float32Array(n * n),
  }
  const L = normalize(...LIGHT), H = normalize(L[0], L[1], L[2] + 1)
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, x = (i + 0.5 - c) / c, y = (j + 0.5 - c) / c, d = Math.sqrt(x * x + y * y)
    t.alpha[k] = Math.min(1, Math.max(0, (1 - d) * c + 0.5))
    if (d >= 1) continue
    const z = Math.sqrt(1 - d * d)
    const xr = x * Math.cos(TILT) + y * Math.sin(TILT), yr = -x * Math.sin(TILT) + y * Math.cos(TILT)
    t.u[k] = (Math.atan2(xr, z) / (2 * Math.PI) + 0.5) * TEX_W
    t.v[k] = Math.min(TEX_H - 1, Math.floor((Math.asin(yr) / Math.PI + 0.5) * TEX_H))
    const s = smoothstep(-0.25, 0.6, x * L[0] + y * L[1] + z * L[2])
    t.lit[k] = 0.12 + s
    t.spec[k] = Math.pow(Math.max(0, x * H[0] + y * H[1] + z * H[2]), 40) * 0.7
    t.rim[k] = Math.pow(1 - z, 3) * (0.3 + 0.7 * s)
  }
  tables = t
  return t
}

/** bands in the air colour, until the surface picture has loaded */
export function fallbackTexture([r, g, b]: [number, number, number]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(TEX_W * TEX_H * 4)
  for (let y = 0; y < TEX_H; y++) for (let x = 0; x < TEX_W; x++) {
    const k = (y * TEX_W + x) * 4, f = 0.75 + 0.25 * Math.sin(y * 0.25 + Math.sin((x / TEX_W) * Math.PI * 4) * 2)
    out[k] = r * f; out[k + 1] = g * f; out[k + 2] = b * f; out[k + 3] = 255
  }
  return out
}

const phaseIndex = (phase: number) => Math.floor((((phase % 1) + 1) % 1) * PHASES) % PHASES

export class PlanetRenderer {
  private readonly canvas = document.createElement('canvas')
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly out: ImageData | null
  private readonly air: [number, number, number]
  private tex: Uint8ClampedArray
  private readonly cache: HTMLCanvasElement[] = []

  constructor(surfaceUrl: string, airHex: string) {
    this.canvas.width = this.canvas.height = PLANET_TEX
    this.ctx = this.canvas.getContext('2d')
    this.out = this.ctx ? this.ctx.createImageData(PLANET_TEX, PLANET_TEX) : null
    this.air = hexRgb(airHex)
    this.tex = fallbackTexture(this.air)
    const img = new Image()
    img.onload = () => {
      const t = document.createElement('canvas')
      t.width = TEX_W; t.height = TEX_H
      const g = t.getContext('2d', { willReadFrequently: true })
      if (!g) return
      g.drawImage(img, 0, 0, TEX_W, TEX_H)
      this.tex = g.getImageData(0, 0, TEX_W, TEX_H).data
      this.cache.length = 0
    }
    img.src = surfaceUrl
  }

  /** the planet turned to `phase` (one turn per 1; wraps) */
  render(phase: number): HTMLCanvasElement {
    const idx = phaseIndex(phase)
    if (this.cache[idx]) return this.cache[idx]
    if (!this.ctx || !this.out) return this.canvas
    const t = sphereTables(), o = this.out.data, n = this.tex, off = (idx / PHASES) * TEX_W, [ar, ag, ab] = this.air
    for (let k = 0; k < PLANET_TEX * PLANET_TEX; k++) {
      const p = k * 4, a = t.alpha[k]
      if (a <= 0) { o[p + 3] = 0; continue }
      let u = Math.floor(t.u[k] + off)
      if (u >= TEX_W) u -= TEX_W
      const q = (t.v[k] * TEX_W + u) * 4, l = t.lit[k], s = t.spec[k] * 255, r = t.rim[k]
      o[p] = n[q] * l + s + ar * r; o[p + 1] = n[q + 1] * l + s + ag * r; o[p + 2] = n[q + 2] * l + s + ab * r; o[p + 3] = a * 255
    }
    this.ctx.putImageData(this.out, 0, 0)
    const c = document.createElement('canvas')
    c.width = c.height = PLANET_TEX
    c.getContext('2d')?.drawImage(this.canvas, 0, 0)
    this.cache[idx] = c
    return c
  }
}
