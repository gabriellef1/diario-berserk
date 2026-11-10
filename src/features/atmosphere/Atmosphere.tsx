import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  EmberSystem,
  FrameMonitor,
  MAX_DT,
  dprCapFor,
  drawParticles,
  emberCountFor,
  fogLayersFor,
} from './embers'
import { fogDataUrl } from './fog'

/*
 * Fundo contínuo do app: céu, lua vermelha, forja, névoa, brasas e clarão.
 * Fica atrás do conteúdo (z-index 0 + isolate; o conteúdo vai em z-index 1).
 * Só transform/opacity no DOM; o resto é canvas.
 */

type Quality = 'full' | 'lowres' | 'lowres-fog' | 'minimal'

// Cada camada desliza exatamente `shift` px (múltiplo do tile) e volta: loop sem emenda.
const FOG_LAYERS = [
  { seed: 11, tile: 384, shift: 768, duration: 140, opacity: 0.05, offsetY: 0 },
  { seed: 23, tile: 288, shift: 864, duration: 95, opacity: 0.06, offsetY: 90 },
  { seed: 37, tile: 224, shift: 896, duration: 60, opacity: 0.07, offsetY: 160 },
] as const

const SKY = 'linear-gradient(180deg, #0f0d0b 0%, rgb(20 18 16 / 0) 100%)'
const MOON =
  'radial-gradient(circle 18vmin at 22% 84%, rgb(163 36 42 / 0.95) 0%, rgb(134 46 50 / 0.6) 35%, rgb(134 46 50 / 0.2) 65%, transparent 100%), ' +
  'radial-gradient(circle 40vmin at 22% 84%, rgb(134 46 50 / 0.2) 0%, transparent 70%)'
const FORGE =
  'radial-gradient(ellipse 34vmin 16vmin at 85% 102%, rgb(220 164 92 / 0.9) 0%, rgb(134 46 50 / 0.5) 45%, transparent 100%)'
const FLARE =
  'radial-gradient(ellipse 70% 30% at 22% 100%, rgb(220 164 92 / 0.9) 0%, rgb(220 164 92 / 0.3) 45%, transparent 75%)'
const FOG_MASK = 'linear-gradient(to bottom, transparent 0%, rgb(0 0 0 / 0.5) 40%, #000 100%)'

const CSS =
  '@keyframes atm-moon{from{opacity:.22}to{opacity:.35}}' +
  FOG_LAYERS.map(
    (l, i) => `@keyframes atm-fog-${i}{to{transform:translate3d(-${l.shift}px,0,0)}}`,
  ).join('')

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getReduced() {
  return window.matchMedia(REDUCED_QUERY).matches
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReduced, getReduced, () => true)
}

const fogCache: (string | undefined)[] = []

/** Roda em tempo ocioso (com prazo), pra não brigar com o primeiro paint. */
function whenIdle(fn: () => void, timeout: number): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }
  const ric = w.requestIdleCallback?.bind(window)
  const cic = w.cancelIdleCallback?.bind(window)
  if (ric && cic) {
    const id = ric(fn, { timeout })
    return () => cic(id)
  }
  const id = window.setTimeout(fn, Math.min(timeout, 200))
  return () => window.clearTimeout(id)
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/** iOS exige prompt pra DeviceOrientationEvent; nesse caso não usamos giroscópio. */
function gyroWithoutPrompt(): boolean {
  if (typeof DeviceOrientationEvent === 'undefined') return false
  const ctor = DeviceOrientationEvent as unknown as { requestPermission?: unknown }
  return typeof ctor.requestPermission !== 'function'
}

export default function Atmosphere({ enabled = true }: { enabled?: boolean }) {
  const reduced = usePrefersReducedMotion()
  const animated = enabled && !reduced
  const fogWrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flareRef = useRef<HTMLDivElement>(null)

  // Texturas de névoa: geradas uma vez por carregamento, uma camada por vez em
  // tempo ocioso (gerar as três de uma vez travava o primeiro paint).
  useEffect(() => {
    const wrap = fogWrapRef.current
    if (!wrap) return
    const els = wrap.querySelectorAll<HTMLElement>('[data-fog]')
    let cancel: () => void = () => undefined
    const step = (i: number) => {
      const layer = FOG_LAYERS[i]
      const el = els[i]
      if (!layer || !el) return
      fogCache[i] ??= fogDataUrl(layer.seed)
      const url = fogCache[i]
      if (url) el.style.backgroundImage = `url("${url}")`
      cancel = whenIdle(() => step(i + 1), 600)
    }
    cancel = whenIdle(() => step(0), 600)
    return () => cancel()
  }, [])

  useEffect(() => {
    if (!animated) return
    const canvas = canvasRef.current
    const wrap = fogWrapRef.current
    const flare = flareRef.current
    if (!canvas || !wrap || !flare) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const fogEls = wrap.querySelectorAll<HTMLElement>('[data-fog]')

    let quality: Quality = 'full'
    const system = new EmberSystem(
      window.innerWidth,
      window.innerHeight,
      emberCountFor(window.innerWidth),
    )
    const monitor = new FrameMonitor()
    let raf = 0
    let last = 0
    let fpsFrames = 0
    let fpsSince = 0
    let resizeTimer = 0
    let flareTimer = 0
    let flareFade = 0
    const pointer = { tx: 0, ty: 0, x: 0, y: 0 }
    let parallaxDirty = false

    function setQuality(q: Quality) {
      quality = q
      if (canvas) canvas.dataset.quality = q
    }

    function applySize() {
      if (!canvas || !ctx) return
      const w = window.innerWidth
      const h = window.innerHeight
      const dprCap = quality === 'full' ? dprCapFor(w) : 1
      const dpr = Math.min(dprCap, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      // Lógica em px CSS; o DPR entra só aqui (vale pro burst também).
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      system.resize(w, h)
      system.setEmberCount(emberCountFor(w))
      const calmFog = quality === 'lowres-fog' || quality === 'minimal'
      const visible = Math.max(1, fogLayersFor(w) - (calmFog ? 1 : 0))
      fogEls.forEach((el, i) => {
        el.style.display = i < visible ? 'block' : 'none'
        // Sem GPU, camadas largas animadas (mesmo pausadas) são o que mais pesa:
        // congela a névoa onde ela está e tira a animação (medido: volta a 60 fps).
        if (calmFog && el.style.animationName !== 'none') {
          el.style.transform = getComputedStyle(el).transform
          el.style.animation = 'none'
          el.style.willChange = 'auto'
        }
      })
    }

    // Escada de degradação: resolução, depois névoa, depois partículas.
    function degrade() {
      if (quality === 'full') setQuality('lowres')
      else if (quality === 'lowres') setQuality('lowres-fog')
      else {
        setQuality('minimal')
        system.reduce()
      }
      applySize()
      console.info(`[atmosphere] qualidade ${quality}, brasas ${system.emberCount}`)
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      const rawMs = now - last
      last = now
      const dt = Math.min(MAX_DT, rawMs / 1000)
      // Frame logo após retomar a aba não conta como lentidão.
      if (rawMs < 1000 && monitor.push(rawMs)) degrade()

      if (parallaxDirty && wrap) {
        const k = Math.min(1, dt * 5)
        pointer.x += (pointer.tx - pointer.x) * k
        pointer.y += (pointer.ty - pointer.y) * k
        wrap.style.transform = `translate3d(${pointer.x.toFixed(2)}px, ${pointer.y.toFixed(2)}px, 0)`
        if (Math.abs(pointer.tx - pointer.x) < 0.05 && Math.abs(pointer.ty - pointer.y) < 0.05) {
          parallaxDirty = false
        }
      }

      system.update(dt)
      if (ctx) drawParticles(ctx, system)

      fpsFrames++
      const elapsed = now - fpsSince
      if (elapsed >= 1000 && canvas) {
        canvas.dataset.fps = String(Math.round((fpsFrames * 1000) / elapsed))
        canvas.dataset.particles = String(system.particleCount)
        fpsFrames = 0
        fpsSince = now
      }
    }

    function start() {
      if (raf !== 0) return
      last = performance.now()
      fpsSince = last
      fpsFrames = 0
      raf = requestAnimationFrame(frame)
    }

    function stop() {
      if (raf === 0) return
      cancelAnimationFrame(raf)
      raf = 0
    }

    function scheduleFlare() {
      flareTimer = window.setTimeout(fireFlare, 25_000 + Math.random() * 35_000)
    }

    function fireFlare() {
      if (!flare) return
      flare.style.transition = 'opacity 800ms ease-out'
      flare.style.opacity = '0.08'
      flareFade = window.setTimeout(() => {
        flare.style.transition = 'opacity 1600ms ease-in'
        flare.style.opacity = '0'
      }, 800)
      scheduleFlare()
    }

    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(applySize, 150)
    }
    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    const onMouse = (e: MouseEvent) => {
      const nx = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1)
      const ny = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1)
      system.windTarget = nx * 0.6
      pointer.tx = nx * 6
      pointer.ty = ny * 6
      parallaxDirty = true
    }
    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = clamp(num(e.gamma, 0), -15, 15)
      pointer.tx = (gamma / 15) * 6
      parallaxDirty = true
    }
    const onBurst = (e: CustomEvent) => {
      const d: unknown = e.detail
      if (typeof d !== 'object' || d === null) return
      const r = d as Record<string, unknown>
      // x, y em px CSS do viewport; o ctx já está escalado pelo DPR.
      system.burst(
        num(r.x, window.innerWidth / 2),
        num(r.y, window.innerHeight / 2),
        clamp(num(r.count, 20), 0, 300),
        clamp(num(r.power, 0.5), 0, 1),
      )
    }
    const onCalm = (e: CustomEvent) => {
      const d: unknown = e.detail
      if (typeof d !== 'object' || d === null) return
      const s = num((d as Record<string, unknown>).seconds, 0)
      if (s > 0) system.calm(Math.min(s, 120))
    }

    const finePointer = window.matchMedia('(pointer: fine)').matches
    const useGyro = !finePointer && gyroWithoutPrompt()

    applySize()
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    if (finePointer) window.addEventListener('mousemove', onMouse, { passive: true })
    if (useGyro) window.addEventListener('deviceorientation', onOrientation)
    window.addEventListener('diario:burst', onBurst)
    window.addEventListener('diario:calm', onCalm)
    scheduleFlare()
    // As brasas entram depois do primeiro paint (com prazo curto: a entrada conta com elas).
    const cancelStart = whenIdle(() => {
      if (!document.hidden) start()
    }, 300)

    return () => {
      cancelStart()
      stop()
      window.clearTimeout(resizeTimer)
      window.clearTimeout(flareTimer)
      window.clearTimeout(flareFade)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('deviceorientation', onOrientation)
      window.removeEventListener('diario:burst', onBurst)
      window.removeEventListener('diario:calm', onCalm)
      flare.style.opacity = '0'
      flare.style.transition = ''
      wrap.style.transform = ''
      fogEls.forEach((el) => {
        el.style.animation = ''
        el.style.willChange = ''
        el.style.transform = ''
        el.style.display = ''
      })
    }
  }, [animated])

  return (
    <div
      aria-hidden="true"
      data-testid="atmosphere"
      data-animated={animated ? 'true' : 'false'}
      className="pointer-events-none fixed inset-0 isolate z-0 overflow-hidden"
    >
      <style>{CSS}</style>
      <div className="absolute inset-0" style={{ background: SKY }} />
      <div
        className="absolute inset-0"
        style={{
          background: MOON,
          opacity: 0.35,
          animation: animated ? 'atm-moon 20s ease-in-out infinite alternate' : undefined,
        }}
      />
      <div className="absolute inset-0" style={{ background: FORGE, opacity: 0.18 }} />
      <div
        ref={fogWrapRef}
        className="absolute inset-0"
        style={{ maskImage: FOG_MASK, WebkitMaskImage: FOG_MASK }}
      >
        {FOG_LAYERS.map((l, i) => (
          <div
            key={l.seed}
            data-fog=""
            className={
              i === 2 ? 'absolute inset-y-0 left-0 max-md:hidden' : 'absolute inset-y-0 left-0'
            }
            style={{
              width: `calc(100vw + ${l.shift}px)`,
              backgroundSize: `${l.tile}px ${l.tile}px`,
              backgroundPosition: `0 ${l.offsetY}px`,
              backgroundRepeat: 'repeat',
              opacity: l.opacity,
              animation: animated ? `atm-fog-${i} ${l.duration}s linear infinite` : undefined,
              willChange: animated ? 'transform' : undefined,
            }}
          />
        ))}
      </div>
      {animated && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full"
          data-fps="0"
          data-particles="0"
          data-quality="full"
        />
      )}
      {animated && (
        <div
          ref={flareRef}
          className="absolute inset-0"
          style={{ background: FLARE, opacity: 0 }}
        />
      )}
    </div>
  )
}
