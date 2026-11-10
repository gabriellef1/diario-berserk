/*
 * Textura de névoa: value noise (fbm) tileável, gerada uma vez em canvas e
 * exportada como data URL. Tom #c0b39e com alpha baixo; a opacidade final
 * vem da camada que usa a textura.
 */

export const FOG_SIZE = 256
/** #c0b39e */
const FOG_RGB = [192, 179, 158] as const

/** PRNG determinístico (mulberry32): a textura é igual em todo carregamento. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * fbm de value noise, valores 0..1. Cada oitava usa um lattice cujo período
 * divide `size`, então a textura repete sem emenda.
 */
export function fogNoise(size = FOG_SIZE, seed = 1, octaves = 4): Float32Array {
  const rng = mulberry32(seed)
  const out = new Float32Array(size * size)
  let amp = 1
  let total = 0
  let period = 4
  for (let o = 0; o < octaves; o++) {
    const lattice = new Float32Array(period * period)
    for (let i = 0; i < lattice.length; i++) lattice[i] = rng()
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * period
      const y0 = Math.floor(fy)
      const y1 = (y0 + 1) % period
      const ty = smooth(fy - y0)
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * period
        const x0 = Math.floor(fx)
        const x1 = (x0 + 1) % period
        const tx = smooth(fx - x0)
        const top = lerp(lattice[y0 * period + x0] ?? 0, lattice[y0 * period + x1] ?? 0, tx)
        const bottom = lerp(lattice[y1 * period + x0] ?? 0, lattice[y1 * period + x1] ?? 0, tx)
        const idx = y * size + x
        out[idx] = (out[idx] ?? 0) + lerp(top, bottom, ty) * amp
      }
    }
    total += amp
    amp *= 0.5
    period *= 2
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) / total
  return out
}

/** Mapeia o ruído (concentrado perto de 0.5) pra um alpha com "buracos". */
export function fogAlpha(n: number): number {
  const t = Math.min(1, Math.max(0, (n - 0.35) / 0.45))
  return t * t
}

/** Data URL PNG da textura. Devolve '' sem canvas 2D (ex.: jsdom). */
export function fogDataUrl(seed: number, size = FOG_SIZE): string {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const noise = fogNoise(size, seed)
  const img = ctx.createImageData(size, size)
  const data = img.data
  for (let i = 0; i < size * size; i++) {
    const o = i * 4
    data[o] = FOG_RGB[0]
    data[o + 1] = FOG_RGB[1]
    data[o + 2] = FOG_RGB[2]
    data[o + 3] = Math.round(fogAlpha(noise[i] ?? 0) * 255)
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}
