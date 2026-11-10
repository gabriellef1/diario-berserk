import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { toPng } from 'html-to-image'
import { useEffect, useRef, useState } from 'react'
import { config } from '@/config'
import { Button, Card, PageHeader } from '@/components/ui'
import { achievements } from '@/domain/achievements'
import { cardAttributes } from '@/domain/card'
import { nowIso } from '@/domain/dates'
import { AchievementIcon, CardEmblem } from '@/icons/achievements'
import { IconDownload, IconLock } from '@/icons'
import { cn } from '@/lib/cn'
import { useDiaryState } from '@/store/DiaryContext'

const LAST_OVERALL_KEY = 'diario-berserk:ultimo-geral'
const BG = '#141210'
const FILE_NAME = 'ficha-guilherme.png'

function readLastOverall(): number | null {
  try {
    const raw = localStorage.getItem(LAST_OVERALL_KEY)
    if (raw === null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeLastOverall(n: number) {
  try {
    localStorage.setItem(LAST_OVERALL_KEY, String(n))
  } catch {
    // Sem storage (aba privada): a carta só não brilha da próxima vez.
  }
}

/** Contagem rápida até o valor. Com movimento reduzido, mostra direto. */
function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const shown = useTransform(mv, (v) => Math.round(v))
  useEffect(() => {
    if (reduce) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] })
    return () => controls.stop()
  }, [mv, value, reduce])
  return <motion.span>{shown}</motion.span>
}

/** Placa de ferro em forma de brasão genérico, borda dourada e rebites. */
function CardPlate() {
  const rivets: [number, number][] = [
    [34, 34],
    [286, 34],
    [22, 150],
    [298, 150],
    [22, 300],
    [298, 300],
    [160, 452],
  ]
  return (
    <svg
      className="absolute inset-0 size-full"
      viewBox="0 0 320 480"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ficha-ferro" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#3a3029" />
          <stop offset="0.55" stopColor="#231e1a" />
          <stop offset="1" stopColor="#171310" />
        </linearGradient>
        <radialGradient id="ficha-luz" cx="0.3" cy="0.12" r="0.7">
          <stop offset="0" stopColor="#dca45c" stopOpacity="0.16" />
          <stop offset="1" stopColor="#dca45c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ficha-ouro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9c08a" />
          <stop offset="0.45" stopColor="#bfa269" />
          <stop offset="1" stopColor="#7d6840" />
        </linearGradient>
        <pattern id="ficha-riscos" width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 9 9 0" stroke="#f2e8d5" strokeOpacity="0.025" strokeWidth="1" />
        </pattern>
      </defs>
      <path
        d="M26 6h268l20 20v320c0 52-60 92-154 128C66 438 6 398 6 346V26z"
        fill="url(#ficha-ferro)"
        stroke="#5b4b33"
        strokeWidth="2"
      />
      <path
        d="M26 6h268l20 20v320c0 52-60 92-154 128C66 438 6 398 6 346V26z"
        fill="url(#ficha-riscos)"
      />
      <path
        d="M26 6h268l20 20v320c0 52-60 92-154 128C66 438 6 398 6 346V26z"
        fill="url(#ficha-luz)"
      />
      <path
        d="M30 15h260l15 15v314c0 47-55 84-145 119C70 428 15 391 15 344V30z"
        fill="none"
        stroke="url(#ficha-ouro)"
        strokeWidth="3"
      />
      <path
        d="M33 22h254l11 11v310c0 43-52 78-138 112C74 421 22 386 22 343V33z"
        fill="none"
        stroke="#897965"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      {rivets.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="4.2" fill="url(#ficha-ouro)" stroke="#141210" strokeWidth="1" />
          <circle cx={x - 1.2} cy={y - 1.2} r="1.2" fill="#f2e8d5" fillOpacity="0.35" />
        </g>
      ))}
    </svg>
  )
}

function Attr({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-8 text-xl leading-7 font-bold text-ink tabular">
        <CountUp value={value} />
      </span>
      <span className="text-sm font-semibold tracking-[0.14em] text-gold">{label}</span>
    </div>
  )
}

const explanations: { sigla: string; text: string }[] = [
  { sigla: 'RIT', text: 'Ritmo: sua média de páginas por dia. 40 por dia bate 99.' },
  { sigla: 'CON', text: 'Constância: sua maior sequência de dias lendo. 30 dias bate 99.' },
  { sigla: 'CUR', text: 'Curiosidade: dúvidas que você registrou. 12 dúvidas bate 99.' },
  { sigla: 'COL', text: 'Coleção: quanto dos volumes lançados está na sua estante.' },
  {
    sigla: 'GER',
    text: 'Geral: média dos quatro, mais 1 ponto por volume lido (até 10).',
  },
]

type SaveStatus = 'idle' | 'working' | 'ready' | 'done'

function downloadDataUrl(dataUrl: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = FILE_NAME
  document.body.append(a)
  a.click()
  a.remove()
}

export function Ficha() {
  const state = useDiaryState()
  const reduce = useReducedMotion()
  const attrs = cardAttributes(state, nowIso())
  const [previous] = useState(readLastOverall)
  const rose = previous !== null && attrs.geral > previous
  const cardRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [png, setPng] = useState<{ file: File; dataUrl: string } | null>(null)

  useEffect(() => {
    writeLastOverall(attrs.geral)
  }, [attrs.geral])

  const unlockedIds = new Set(achievements.filter((a) => a.unlocked(state)).map((a) => a.id))

  async function save() {
    const node = cardRef.current
    if (!node) return
    setStatus('working')
    setError(null)
    setPng(null)
    try {
      await document.fonts.ready
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: BG, cacheBust: true })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], FILE_NAME, { type: 'image/png' })
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        setPng({ file, dataUrl })
        setStatus('ready')
      } else {
        downloadDataUrl(dataUrl)
        setStatus('done')
      }
    } catch {
      setError('Não deu pra gerar a imagem agora. Tenta de novo?')
      setStatus('idle')
    }
  }

  async function share() {
    if (!png) return
    setError(null)
    try {
      await navigator.share({ files: [png.file], title: 'Minha ficha de leitor' })
      setStatus('done')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      // Compartilhamento falhou: cai pro download.
      downloadDataUrl(png.dataUrl)
      setStatus('done')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Ficha"
        title="Ficha do leitor"
        lead="Sua carta sobe conforme você lê. Cada página conta."
      />

      <motion.div
        className="mx-auto w-full max-w-[320px]"
        initial={false}
        animate={
          rose && !reduce
            ? {
                filter: [
                  'drop-shadow(0 0 0 rgb(220 164 92 / 0))',
                  'drop-shadow(0 0 22px rgb(220 164 92 / 0.45))',
                  'drop-shadow(0 0 8px rgb(220 164 92 / 0.18))',
                ],
                transition: { duration: 1.6, delay: 0.5, ease: 'easeOut' },
              }
            : undefined
        }
      >
        <div
          ref={cardRef}
          data-testid="reader-card"
          role="img"
          aria-label={`Ficha de ${config.readerName}: geral ${attrs.geral}, ritmo ${attrs.ritmo}, constância ${attrs.constancia}, curiosidade ${attrs.curiosidade}, coleção ${attrs.colecao}, ${attrs.volumesLidos} volumes lidos.`}
          className="relative aspect-[2/3] w-full font-sans text-ink select-none"
        >
          <CardPlate />
          <div className="absolute inset-0 flex flex-col px-[11%] pt-[11%] pb-[17%]">
            <div className="flex items-start justify-between">
              <div className="flex flex-col items-center pt-1">
                <span
                  data-testid="card-overall"
                  className="text-[3.25rem] leading-none font-bold text-ember tabular"
                >
                  <CountUp value={attrs.geral} />
                </span>
                <span className="mt-1 text-base font-semibold tracking-[0.2em] text-gold">LEI</span>
                <span className="mt-2 h-px w-8 bg-gold/60" />
              </div>
              <CardEmblem size={108} />
            </div>

            <p className="mt-3 border-y border-gold/50 py-1.5 text-center text-[1.3rem] leading-7 font-bold tracking-[0.14em]">
              {config.readerName.toLocaleUpperCase('pt-BR')}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-y-1">
              <div className="flex flex-col gap-1 border-r border-gold/30 pr-3">
                <Attr label="RIT" value={attrs.ritmo} />
                <Attr label="CON" value={attrs.constancia} />
              </div>
              <div className="flex flex-col gap-1 pl-4">
                <Attr label="CUR" value={attrs.curiosidade} />
                <Attr label="COL" value={attrs.colecao} />
              </div>
            </div>

            <p className="mt-3 flex items-baseline justify-center gap-2">
              <span className="text-sm font-semibold tracking-[0.14em] text-gold">VOL</span>
              <span className="text-xl leading-7 font-bold text-ink tabular">
                <CountUp value={attrs.volumesLidos} />
              </span>
              <span className="text-sm font-semibold text-ink-2">
                {attrs.volumesLidos === 1 ? 'lido' : 'lidos'}
              </span>
            </p>

            <p className="mt-auto text-center text-xs font-semibold tracking-[0.06em] text-ink-2">
              {config.signature}
            </p>
          </div>
        </div>
      </motion.div>

      {rose && (
        <p className="mt-3 text-center text-sm font-semibold text-ember" role="status">
          Seu geral subiu de {previous} pra {attrs.geral}.
        </p>
      )}

      <div className="mx-auto mt-5 flex w-full max-w-[320px] flex-col gap-2">
        <Button
          data-testid="save-card"
          onClick={() => void save()}
          disabled={status === 'working'}
          aria-busy={status === 'working'}
        >
          <IconDownload size={20} />
          {status === 'working' ? 'Gerando imagem...' : 'Salvar carta como imagem'}
        </Button>
        {status === 'ready' && png && (
          <Button variant="primary" onClick={() => void share()}>
            Mandar pra Gabs
          </Button>
        )}
        {status === 'done' && (
          <p className="text-center text-sm text-ink-2" role="status">
            Pronto, a carta foi salva.
          </p>
        )}
        {error && (
          <p className="text-center text-sm text-blood-text" role="alert">
            {error}
          </p>
        )}
      </div>

      <Card className="mt-6" aria-labelledby="como-calcula">
        <h2 id="como-calcula" className="text-heading">
          Como cada número sobe
        </h2>
        <p className="mt-1 text-sm text-ink-2">Todo atributo começa em 40 e vai até 99.</p>
        <dl className="mt-3 flex flex-col gap-2">
          {explanations.map((e) => (
            <div key={e.sigla} className="flex gap-3">
              <dt className="w-10 shrink-0 text-sm font-semibold tracking-[0.1em] text-gold">
                {e.sigla}
              </dt>
              <dd className="text-sm text-ink-2">{e.text}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <section className="mt-8" aria-labelledby="conquistas">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="conquistas" className="text-heading">
            Conquistas
          </h2>
          <p className="text-sm font-semibold text-ink-2 tabular">
            {unlockedIds.size} de {achievements.length}
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {achievements.map((a) => {
            const on = unlockedIds.has(a.id)
            return (
              <li
                key={a.id}
                data-testid="achievement"
                data-unlocked={on ? 'true' : 'false'}
                className={cn(
                  'flex items-start gap-3 rounded-card border p-3',
                  on ? 'border-gold/50 bg-raised' : 'border-line bg-surface',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-11 shrink-0 items-center justify-center rounded-full border',
                    on
                      ? 'border-gold bg-bg text-ember shadow-[0_0_12px_rgb(220_164_92/0.25)]'
                      : 'border-line bg-bg text-line-strong',
                  )}
                >
                  {on ? <AchievementIcon kind={a.icon} size={22} /> : <IconLock size={20} />}
                </span>
                <div className="min-w-0">
                  <p className={cn('font-semibold', on ? 'text-ink' : 'text-ink-2')}>
                    {a.title}
                    <span className="sr-only">{on ? ' (desbloqueada)' : ' (bloqueada)'}</span>
                  </p>
                  <p className="text-sm text-ink-2">{a.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
