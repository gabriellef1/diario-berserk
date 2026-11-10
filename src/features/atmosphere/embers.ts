/*
 * Sistema de partículas do fundo: brasas (sobem devagar, cintilam) e faíscas
 * (burst curto, com gravidade). Lógica pura, sem DOM, pra ser testável.
 * Unidades: px CSS e segundos. Sem alocação por frame: pools fixos.
 */

export const EMBER_PALETTE = ['#dca45c', '#e07a2e', '#bfa269', '#f2e8d5'] as const

export const MAX_EMBERS = 70
export const MIN_EMBERS = 12
/** Tamanho do pool de faíscas (o teto real é `maxTotal - brasas`). */
export const MAX_SPARKS = 200
/** Limite de dt por frame (s): evita "salto" ao voltar de aba oculta. */
export const MAX_DT = 0.05
export const MOBILE_BREAKPOINT = 768

/** Origem das brasas: uma "forja" fora de quadro, rente à borda inferior. */
export const FORGE_X = 0.85
export const FORGE_SPREAD = 0.18
/** Vento base, levemente pra esquerda (-1..1). */
export const BASE_WIND = -0.25

const TAU = Math.PI * 2
const WIND_ACCEL = 45 // px/s² com vento = ±1
const WIND_DRAG = 1.2
const SPARK_GRAVITY = 120 // px/s²
const SPARK_DRAG = 0.8

export interface BurstDetail {
  x: number
  y: number
  count: number
  power: number
}

export interface CalmDetail {
  seconds: number
}

declare global {
  interface WindowEventMap {
    'diario:burst': CustomEvent<BurstDetail>
    'diario:calm': CustomEvent<CalmDetail>
  }
}

export type Rng = () => number

export interface Particle {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  size: number
  /** Índice em EMBER_PALETTE. */
  color: number
  /** Alpha base. */
  alpha: number
  /** Alpha atual, já com cintilação/fade. */
  a: number
  age: number
  /** Vida total (faíscas). Brasas usam 0 = infinita. */
  life: number
  phase: number
  sway: number
  swayFreq: number
  twinkle: number
}

function makeParticle(): Particle {
  return {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 1,
    color: 0,
    alpha: 0,
    a: 0,
    age: 0,
    life: 0,
    phase: 0,
    sway: 0,
    swayFreq: 0,
    twinkle: 0,
  }
}

export function isMobileWidth(width: number): boolean {
  return width < MOBILE_BREAKPOINT
}

export function emberCountFor(width: number): number {
  return isMobileWidth(width) ? 24 : 70
}

/** Teto total (brasas + faíscas). */
export function maxTotalFor(width: number): number {
  return isMobileWidth(width) ? 80 : 200
}

export function dprCapFor(width: number): number {
  return isMobileWidth(width) ? 1.5 : 2
}

export function fogLayersFor(width: number): number {
  return isMobileWidth(width) ? 2 : 3
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function pickColor(r: number): number {
  if (r < 0.4) return 0 // ember
  if (r < 0.7) return 1 // laranja
  if (r < 0.95) return 2 // dourado
  return 3 // quase branca, rara
}

export class EmberSystem {
  readonly embers: Particle[]
  readonly sparks: Particle[]
  width: number
  height: number
  emberCount = 0
  sparkCount = 0
  /** Teto de brasas. Só desce (redução adaptativa), nunca volta a subir. */
  cap = MAX_EMBERS
  /** Teto total de partículas (brasas + faíscas). */
  maxTotal: number
  wind = BASE_WIND
  /** Vento do ponteiro (-1..1), somado ao vento base. */
  windTarget = 0
  calmLeft = 0
  calmFactor = 1
  private readonly rng: Rng

  constructor(width: number, height: number, count: number, rng: Rng = Math.random) {
    this.rng = rng
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.maxTotal = maxTotalFor(this.width)
    this.embers = Array.from({ length: MAX_EMBERS }, makeParticle)
    this.sparks = Array.from({ length: MAX_SPARKS }, makeParticle)
    this.setEmberCount(count, true)
  }

  get particleCount(): number {
    return this.emberCount + this.sparkCount
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.maxTotal = maxTotalFor(this.width)
    for (let i = 0; i < MAX_EMBERS; i++) {
      const p = this.embers[i]
      if (!p?.active) continue
      if (p.x > this.width) p.x = this.spawnX()
      if (p.y > this.height) p.y = this.height - this.rng() * this.height * 0.5
    }
  }

  /** Define quantas brasas ficam ativas, respeitando o teto. */
  setEmberCount(count: number, scatter = false): number {
    const target = clamp(Math.round(count), 0, this.cap)
    for (let i = 0; i < MAX_EMBERS; i++) {
      const p = this.embers[i]
      if (!p) continue
      if (i < target) {
        if (!p.active) this.spawnEmber(p, scatter)
      } else {
        p.active = false
      }
    }
    this.emberCount = target
    return target
  }

  /** Redução adaptativa: corta `factor` das brasas (mínimo MIN_EMBERS) e abaixa o teto. */
  reduce(factor = 0.3): number {
    const next = Math.max(MIN_EMBERS, Math.round(this.emberCount * (1 - factor)))
    this.cap = Math.min(this.cap, next)
    return this.setEmberCount(next)
  }

  /** Solta faíscas a partir de (x, y) em px CSS. Devolve quantas realmente nasceram. */
  burst(x: number, y: number, count: number, power: number): number {
    const room = Math.min(MAX_SPARKS - this.sparkCount, this.maxTotal - this.particleCount)
    const n = clamp(Math.round(count), 0, Math.max(0, room))
    const pw = clamp(power, 0, 1)
    let spawned = 0
    for (let i = 0; i < MAX_SPARKS && spawned < n; i++) {
      const p = this.sparks[i]
      if (!p || p.active) continue
      this.spawnSpark(p, x, y, pw)
      spawned++
    }
    this.sparkCount += spawned
    return spawned
  }

  /** Acalma as brasas (alpha reduzido) por N segundos. */
  calm(seconds: number): void {
    this.calmLeft = Math.max(this.calmLeft, seconds)
  }

  update(dt: number): void {
    if (dt <= 0) return
    const ease = Math.min(1, dt * 1.5)
    this.wind += (BASE_WIND + this.windTarget - this.wind) * ease
    this.calmLeft = Math.max(0, this.calmLeft - dt)
    this.calmFactor += ((this.calmLeft > 0 ? 0.3 : 1) - this.calmFactor) * ease

    const w = this.width
    for (let i = 0; i < this.emberCount; i++) {
      const p = this.embers[i]
      if (!p?.active) continue
      p.age += dt
      p.vx += (this.wind * WIND_ACCEL - p.vx * WIND_DRAG) * dt
      p.x += (p.vx + Math.sin(p.age * p.swayFreq + p.phase) * p.sway) * dt
      p.y += p.vy * dt
      p.a = p.alpha * (0.6 + 0.4 * Math.sin(p.age * p.twinkle + p.phase)) * this.calmFactor
      if (p.y < -p.size) {
        this.spawnEmber(p, false)
      } else if (p.x < -4) {
        p.x += w + 8
      } else if (p.x > w + 4) {
        p.x -= w + 8
      }
    }

    if (this.sparkCount === 0) return
    for (let i = 0; i < MAX_SPARKS; i++) {
      const p = this.sparks[i]
      if (!p?.active) continue
      p.age += dt
      if (p.age >= p.life) {
        p.active = false
        this.sparkCount--
        continue
      }
      p.vy += SPARK_GRAVITY * dt
      p.vx -= p.vx * SPARK_DRAG * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      const t = 1 - p.age / p.life
      p.a = p.alpha * t * (0.75 + 0.25 * Math.sin(p.age * 40 + p.phase))
    }
  }

  /**
   * X de nascimento: 70% perto da forja (±FORGE_SPREAD em volta de FORGE_X),
   * 30% espalhadas, evitando a faixa central (30% a 70%) onde fica o texto.
   */
  private spawnX(): number {
    const r = this.rng
    const w = this.width
    if (r() < 0.7) {
      return clamp(FORGE_X + (r() - 0.5) * 2 * FORGE_SPREAD, 0, 1) * w
    }
    let u = r()
    if (u > 0.3 && u < 0.7 && r() < 0.75) {
      u = r() < 0.5 ? r() * 0.3 : 0.7 + r() * 0.3
    }
    return u * w
  }

  private spawnEmber(p: Particle, scatter: boolean): void {
    const r = this.rng
    const h = this.height
    p.active = true
    p.x = this.spawnX()
    // Nascem na metade inferior; no primeiro frame espalha pela tela toda.
    p.y = scatter ? r() * h : h * 0.5 + r() * (h * 0.5 + 8)
    p.vx = 0
    p.vy = -(10 + r() * 22)
    p.size = 1 + r() * 2
    p.color = pickColor(r())
    p.alpha = 0.35 + r() * 0.5
    p.age = r() * 10
    p.life = 0
    p.phase = r() * TAU
    p.sway = 4 + r() * 10
    p.swayFreq = 0.3 + r() * 0.8
    p.twinkle = 1 + r() * 3
    p.a = p.alpha * 0.8
  }

  private spawnSpark(p: Particle, x: number, y: number, power: number): void {
    const r = this.rng
    const angle = -Math.PI / 2 + (r() - 0.5) * 1.3
    const speed = (90 + 260 * power) * (0.5 + r())
    p.active = true
    p.x = x
    p.y = y
    p.vx = Math.cos(angle) * speed
    p.vy = Math.sin(angle) * speed
    p.size = 1 + r() * 1.5
    const c = r()
    p.color = c < 0.45 ? 3 : c < 0.8 ? 0 : 1
    p.alpha = 0.7 + 0.3 * power
    p.a = p.alpha
    p.age = 0
    p.life = 0.6 + r() * 0.8
    p.phase = r() * TAU
    p.sway = 0
    p.swayFreq = 0
    p.twinkle = 0
  }
}

/**
 * Monitor de frame em janelas de 1s: se duas janelas seguidas tiverem média
 * acima de `thresholdMs`, `push` devolve true (uma vez) e entra em cooldown.
 */
export class FrameMonitor {
  readonly thresholdMs: number
  readonly windowMs: number
  readonly cooldownMs: number
  private acc = 0
  private frames = 0
  private badWindows = 0
  private sinceTrigger: number

  constructor(thresholdMs = 24, windowMs = 1000, cooldownMs = 5000) {
    this.thresholdMs = thresholdMs
    this.windowMs = windowMs
    this.cooldownMs = cooldownMs
    this.sinceTrigger = cooldownMs
  }

  push(frameMs: number): boolean {
    this.acc += frameMs
    this.frames++
    this.sinceTrigger += frameMs
    if (this.acc < this.windowMs) return false
    const avg = this.acc / this.frames
    this.acc = 0
    this.frames = 0
    this.badWindows = avg > this.thresholdMs ? this.badWindows + 1 : 0
    if (this.badWindows >= 2 && this.sinceTrigger >= this.cooldownMs) {
      this.badWindows = 0
      this.sinceTrigger = 0
      return true
    }
    return false
  }
}

/** Desenha brasas e faíscas. O ctx já deve estar escalado pelo DPR. */
export function drawParticles(ctx: CanvasRenderingContext2D, sys: EmberSystem): void {
  ctx.clearRect(0, 0, sys.width, sys.height)
  for (let i = 0; i < sys.emberCount; i++) {
    const p = sys.embers[i]
    if (!p?.active || p.a <= 0.01) continue
    ctx.globalAlpha = p.a
    ctx.fillStyle = EMBER_PALETTE[p.color] ?? EMBER_PALETTE[0]
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * 0.5, 0, TAU)
    ctx.fill()
  }
  if (sys.sparkCount > 0) {
    for (let i = 0; i < MAX_SPARKS; i++) {
      const p = sys.sparks[i]
      if (!p?.active || p.a <= 0.01) continue
      ctx.globalAlpha = p.a
      ctx.fillStyle = EMBER_PALETTE[p.color] ?? EMBER_PALETTE[0]
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 0.5, 0, TAU)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}
