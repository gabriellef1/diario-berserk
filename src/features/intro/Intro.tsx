import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { config } from '@/config'
import type { IntroLine } from '@/domain/intro'
import { cn } from '@/lib/cn'

/**
 * "A forja": a entrada do diário.
 * Completa (~4,0s): brasa → "Oi," incandescente → nome martelado letra por letra
 * (três golpes marcantes soltam faíscas no fundo) → o metal esfria e aparece a
 * linha do progresso → o nome sobe pro cabeçalho (layoutId compartilhado).
 * Curta (~1,2s): nome já forjado esfriando + linha. Reduced motion: fade de 400ms.
 * Pular é imediato e sem animação de saída.
 */
type Phase = 'ember' | 'oi' | 'name' | 'cool' | 'exit'

export interface IntroProps {
  kind: 'full' | 'short'
  line: IntroLine
  /** O app começa a aparecer por trás (fase de saída). */
  onExit?: () => void
  onDone: () => void
}

const NAME = config.readerName
const LETTERS = Array.from(NAME)

/** Cadência dos golpes (ms entre letras): irregular, com um golpe duplo no meio. */
function strikeTimes(count: number): number[] {
  const gaps = [150, 110, 170, 90, 70, 210, 140, 190, 120, 160]
  const times: number[] = [0]
  for (let i = 1; i < count; i++)
    times.push((times[i - 1] ?? 0) + (gaps[(i - 1) % gaps.length] ?? 150))
  // Cabe em 1,2s independente do tamanho do nome.
  const last = times[times.length - 1] ?? 1
  const scale = last > 1200 ? 1200 / last : 1
  return times.map((t) => Math.round(t * scale))
}

/** Golpes marcantes: primeiro, o do meio (o duplo) e o último. */
function bigStrikes(count: number): Set<number> {
  return new Set([0, Math.floor(count / 2), count - 1])
}

function burst(el: HTMLElement | null, big: boolean) {
  if (!el) return
  const r = el.getBoundingClientRect()
  window.dispatchEvent(
    new CustomEvent('diario:burst', {
      detail: {
        x: r.left + r.width / 2,
        y: r.top + r.height * 0.7,
        count: big ? 30 : 7,
        power: big ? 1 : 0.4,
      },
    }),
  )
}

function fontsReady(timeoutMs: number): Promise<void> {
  const ready = 'fonts' in document ? document.fonts.ready.then(() => undefined) : Promise.resolve()
  return Promise.race([ready, new Promise<void>((r) => setTimeout(r, timeoutMs))])
}

export function Intro({ kind, line, onExit, onDone }: IntroProps) {
  const reduce = useReducedMotion() ?? false
  const mode: 'full' | 'short' | 'reduced' = reduce ? 'reduced' : kind
  const [phase, setPhase] = useState<Phase>(mode === 'full' ? 'ember' : 'cool')
  const [struck, setStruck] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([])
  const skipRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef(false)
  const times = strikeTimes(LETTERS.length)
  const bigs = bigStrikes(LETTERS.length)
  const celebrate = line.kind === 'celebrate'

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, [onDone])

  // Pular: sem animação de saída. Primeiro tira o layoutId (senão o cabeçalho
  // "puxa" o nome mesmo assim), depois desmonta.
  const skip = useCallback(() => setSkipped(true), [])
  useEffect(() => {
    if (skipped) finish()
  }, [skipped, finish])

  // Linha do tempo.
  useEffect(() => {
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    let cancelled = false

    if (mode === 'reduced') {
      at(1600, finish)
    } else if (mode === 'short') {
      at(700, () => setPhase('exit'))
      at(1200, finish)
    } else {
      void fontsReady(800).then(() => {
        if (cancelled) return
        at(200, () => setPhase('oi'))
        at(750, () => setPhase('name'))
        times.forEach((t, i) => at(750 + t, () => setStruck(i + 1)))
        at(2100, () => setPhase('cool'))
        at(3400, () => setPhase('exit'))
        at(4000, finish)
      })
    }
    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
    // `times`/`mode` são derivados de constantes; a linha do tempo roda uma vez.
  }, [mode, finish]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cada golpe solta faíscas no fundo, depois que a letra está no lugar.
  useLayoutEffect(() => {
    if (struck === 0 || mode !== 'full') return
    const i = struck - 1
    const el = letterRefs.current[i] ?? null
    const id = window.requestAnimationFrame(() => burst(el, bigs.has(i)))
    return () => window.cancelAnimationFrame(id)
  }, [struck, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Estouro maior quando a entrada comemora um volume concluído.
  useEffect(() => {
    if (!celebrate || phase !== 'cool' || mode === 'reduced') return
    const el = letterRefs.current[Math.floor(LETTERS.length / 2)] ?? null
    const id = window.setTimeout(() => {
      burst(el, true)
      burst(letterRefs.current[0] ?? null, true)
      burst(letterRefs.current[LETTERS.length - 1] ?? null, true)
    }, 120)
    return () => window.clearTimeout(id)
  }, [celebrate, phase, mode])

  // Foco no "pular"; qualquer tecla (menos as de navegação) pula.
  useEffect(() => {
    skipRef.current?.focus()
    const ignore = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'])
    function onKey(e: KeyboardEvent) {
      if (ignore.has(e.key)) return
      e.preventDefault()
      skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skip])

  useEffect(() => {
    if (phase === 'exit') onExit?.()
  }, [phase, onExit])

  const hot = phase === 'oi' || phase === 'name'
  const cold = phase === 'cool' || phase === 'exit'
  const showName = mode !== 'full' || phase === 'name' || cold
  const showOi = mode !== 'full' || phase !== 'ember'
  const exiting = phase === 'exit'
  const fine = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Entrada do diário"
      data-testid="intro"
      data-phase={phase}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center select-none"
      style={{
        background:
          'radial-gradient(ellipse 120% 90% at 50% 45%, rgb(10 9 8 / 0.25) 0%, rgb(10 9 8 / 0.7) 100%)',
        cursor: 'pointer',
      }}
      initial={mode === 'reduced' ? { opacity: 0 } : false}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: mode === 'reduced' ? 0.4 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      onPointerDown={skip}
    >
      {/* Filtro de calor, só com ponteiro fino (celular usa a varredura de gradiente). */}
      {fine && mode === 'full' && (
        <svg width="0" height="0" aria-hidden="true" className="absolute">
          <filter id="forge-heat" x="-5%" y="-10%" width="110%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.07" numOctaves={2} seed={7}>
              <animate
                attributeName="baseFrequency"
                dur="1.8s"
                values="0.012 0.07;0.018 0.09;0.012 0.07"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              scale={3}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}

      <p className="sr-only">
        Oi, {NAME}. {line.text}
      </p>

      {/* Brilho de brasa no centro (fase 0) e calor atrás do metal. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 left-1/2 size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-700',
          phase === 'ember' ? 'opacity-40' : hot ? 'opacity-60' : 'opacity-0',
        )}
        style={{
          background:
            'radial-gradient(closest-side, rgb(224 122 46 / 0.35), rgb(134 46 50 / 0.18) 45%, transparent 72%)',
        }}
      />

      <div aria-hidden="true" className="relative max-w-full" style={{ paddingInline: 24 }}>
        {/* "Oi," */}
        <div
          className={cn(
            'font-display leading-none font-semibold transition-opacity duration-500',
            showOi ? 'opacity-100' : 'opacity-0',
          )}
          style={{ fontSize: 'clamp(2.25rem, 11vw, 4rem)' }}
        >
          <span
            className={cn(hot ? 'forge-hot' : 'forge-cold')}
            style={fine && hot ? { filter: 'url(#forge-heat)' } : undefined}
          >
            Oi,
          </span>
        </div>

        {/* Nome martelado. Duas camadas: quente (some) e fria (aparece). */}
        <div
          className="relative mt-1 font-display leading-none font-bold whitespace-nowrap"
          style={{ fontSize: 'clamp(3rem, 19vw, 7.5rem)', letterSpacing: '0.01em' }}
        >
          <span
            className={cn(
              'forge-hot absolute inset-0 transition-opacity duration-[900ms]',
              hot && showName ? 'opacity-100' : 'opacity-0',
            )}
          >
            {LETTERS.map((l, i) => (
              <span key={i} className={cn('inline-block', i >= struck && 'invisible')}>
                {l}
              </span>
            ))}
          </span>
          {skipped || !cold ? (
            <span
              className={cn(
                mode === 'full' ? 'forge-cold transition-opacity duration-[900ms]' : 'forge-cold',
                cold ? 'opacity-100' : 'opacity-0',
                mode === 'short' && !exiting && 'forge-cooling',
              )}
            >
              {LETTERS.map((l, i) => (
                <motion.span
                  key={i}
                  ref={(el) => {
                    letterRefs.current[i] = el
                  }}
                  className={cn(
                    'inline-block',
                    i >= struck && mode === 'full' && 'invisible',
                    mode === 'full' && i < struck && bigs.has(i) && 'forge-strike',
                  )}
                  initial={false}
                  animate={
                    mode === 'full' && i < struck
                      ? { scale: 1, opacity: 1 }
                      : mode === 'full'
                        ? { scale: 1.15, opacity: 0 }
                        : { scale: 1, opacity: 1 }
                  }
                  transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                >
                  {l}
                </motion.span>
              ))}
            </span>
          ) : (
            <motion.span
              layoutId="reader-name"
              className={cn(
                'forge-cold inline-block',
                mode === 'short' && !exiting && 'forge-cooling',
              )}
              transition={{ layout: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
            >
              {LETTERS.map((l, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    letterRefs.current[i] = el
                  }}
                  className="inline-block"
                >
                  {l}
                </span>
              ))}
            </motion.span>
          )}
        </div>

        {/* Fio de fumaça quando esfria. */}
        {cold && mode === 'full' && !exiting && (
          <svg
            viewBox="0 0 60 90"
            width="30"
            height="45"
            className="forge-smoke absolute -top-10 left-[62%]"
            fill="none"
            stroke="#c0b39e"
            strokeWidth="1.2"
            strokeLinecap="round"
          >
            <path d="M30 88c-8-10 6-18-2-30s10-18 0-30 8-16 0-26" />
          </svg>
        )}
      </div>

      {/* Linha do progresso: só número de volume, nunca conteúdo. */}
      <p
        aria-hidden="true"
        data-testid="intro-line"
        className={cn(
          'mt-5 text-base font-semibold text-ink-2 transition-opacity duration-500',
          cold ? 'opacity-100' : 'opacity-0',
          line.kind === 'celebrate' && 'text-ember',
          line.kind === 'anniversary' && 'text-blood-text',
        )}
      >
        {line.text}
      </p>

      <button
        ref={skipRef}
        type="button"
        data-testid="intro-skip"
        onClick={(e) => {
          e.stopPropagation()
          skip()
        }}
        className="absolute right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] inline-flex min-h-11 items-center rounded-control border border-line px-4 text-sm font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      >
        pular
      </button>
    </motion.div>
  )
}
