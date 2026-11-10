import { describe, expect, it } from 'vitest'
import {
  EmberSystem,
  FORGE_SPREAD,
  FORGE_X,
  FrameMonitor,
  MIN_EMBERS,
  emberCountFor,
  maxTotalFor,
} from './embers'
import { mulberry32 } from './fog'

const W = 1200
const H = 800

function make(count = 70, seed = 7) {
  return new EmberSystem(W, H, count, mulberry32(seed))
}

function step(sys: EmberSystem, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds; t += dt) sys.update(dt)
}

describe('brasas', () => {
  it('quantidade depende da largura', () => {
    expect(emberCountFor(375)).toBe(24)
    expect(emberCountFor(1024)).toBe(70)
    expect(maxTotalFor(375)).toBe(80)
    expect(maxTotalFor(1024)).toBe(200)
  })

  it('sobem com o tempo', () => {
    const sys = make(10)
    // Longe do topo pra ninguém renascer durante o passo.
    sys.embers.slice(0, 10).forEach((p) => {
      p.y = H * 0.75
    })
    const before = sys.embers.slice(0, 10).map((p) => p.y)
    step(sys, 1)
    sys.embers.slice(0, 10).forEach((p, i) => {
      expect(p.active).toBe(true)
      expect(p.y).toBeLessThan(before[i] ?? Infinity)
    })
  })

  it('renascem na metade inferior ao sair pelo topo', () => {
    const sys = make(5)
    const p = sys.embers[0]
    if (!p) throw new Error('sem partícula')
    p.y = -10
    sys.update(0.016)
    expect(p.active).toBe(true)
    expect(p.y).toBeGreaterThanOrEqual(H * 0.5)
    expect(p.y).toBeLessThanOrEqual(H + 8)
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(W)
  })

  it('nascem concentradas na forja e evitam a faixa central', () => {
    const sys = make(70)
    let forge = 0
    let center = 0
    const n = 2000
    const p = sys.embers[0]
    if (!p) throw new Error('sem partícula')
    for (let i = 0; i < n; i++) {
      p.y = -10
      sys.update(0.001)
      const u = p.x / W
      if (Math.abs(u - FORGE_X) <= FORGE_SPREAD) forge++
      if (u > 0.3 && u < 0.7) center++
    }
    expect(forge / n).toBeGreaterThan(0.6)
    expect(center / n).toBeLessThan(0.15)
  })

  it('calm reduz o alpha por um tempo e depois volta', () => {
    const sys = make(10)
    sys.calm(2)
    step(sys, 1.5)
    expect(sys.calmFactor).toBeLessThan(0.6)
    step(sys, 6)
    expect(sys.calmFactor).toBeGreaterThan(0.95)
  })
})

describe('faíscas (burst)', () => {
  it('adiciona N faíscas que sobem no início', () => {
    const sys = make(10)
    expect(sys.burst(600, 400, 20, 0.8)).toBe(20)
    expect(sys.sparkCount).toBe(20)
    expect(sys.particleCount).toBe(30)
    const active = sys.sparks.filter((p) => p.active)
    expect(active).toHaveLength(20)
    active.forEach((p) => {
      expect(p.vy).toBeLessThan(0)
    })
  })

  it('respeita o teto total de partículas', () => {
    const sys = make(70)
    expect(sys.burst(0, 0, 500, 1)).toBe(130)
    expect(sys.particleCount).toBe(200)
    expect(sys.burst(0, 0, 10, 1)).toBe(0)
  })

  it('morrem depois da vida curta e liberam espaço', () => {
    const sys = make(10)
    sys.burst(600, 400, 30, 0.5)
    step(sys, 1.5)
    expect(sys.sparkCount).toBe(0)
    expect(sys.sparks.some((p) => p.active)).toBe(false)
    expect(sys.burst(600, 400, 30, 0.5)).toBe(30)
  })
})

describe('redução adaptativa', () => {
  it('corta 30% com mínimo de 12 e nunca volta a subir', () => {
    const sys = make(70)
    expect(sys.reduce()).toBe(49)
    expect(sys.emberCount).toBe(49)
    expect(sys.setEmberCount(70)).toBe(49)

    const small = make(15)
    expect(small.reduce()).toBe(MIN_EMBERS)
    expect(small.reduce()).toBe(MIN_EMBERS)
  })

  it('monitor dispara após 2 janelas lentas e respeita o cooldown', () => {
    const m = new FrameMonitor()
    let triggers = 0
    let firstAt = -1
    let elapsed = 0
    while (elapsed < 10_000) {
      elapsed += 30
      if (m.push(30)) {
        triggers++
        if (firstAt < 0) firstAt = elapsed
      }
    }
    expect(firstAt).toBeGreaterThanOrEqual(2000)
    expect(firstAt).toBeLessThan(2100)
    // ~2s, ~7s (cooldown de 5s)
    expect(triggers).toBe(2)
  })

  it('monitor não dispara com frames rápidos nem com uma janela isolada', () => {
    const m = new FrameMonitor()
    for (let i = 0; i < 600; i++) expect(m.push(16)).toBe(false)
    for (let i = 0; i < 34; i++) expect(m.push(30)).toBe(false)
    for (let i = 0; i < 200; i++) expect(m.push(16)).toBe(false)
  })
})
