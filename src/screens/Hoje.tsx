import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { config, getEdition } from '@/config'
import { Button, Card, Eyebrow, NumberField, Sheet, Stat } from '@/components/ui'
import { StoreLink } from '@/components/StoreLink'
import { LastTime } from '@/features/LastTime'
import { ReturningDoubts } from '@/features/ReturningDoubts'
import { buyWarning } from '@/domain/collection'
import { nowIso } from '@/domain/dates'
import { finishedCount, pagesPerDay, streak } from '@/domain/stats'
import { IconBook, IconPlus, Milestone } from '@/icons'
import { useDiary, useDiaryState } from '@/store/DiaryContext'

function greeting(date: Date) {
  const h = date.getHours()
  if (h < 5) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function unit(kind: 'page' | 'chapter', n: number) {
  if (kind === 'page') return n === 1 ? 'página' : 'páginas'
  return n === 1 ? 'capítulo' : 'capítulos'
}

function ProgressSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const kind = state.reader.trackBy
  const [goto, setGoto] = useState('')
  const total = state.volumes[String(state.reader.currentVolume)]?.pagesTotal
  const steps = kind === 'page' ? [5, 10, 20, 40] : [1, 2, 3]

  function add(n: number) {
    dispatch(
      { type: 'addProgress', amount: n, at: nowIso() },
      { toast: `+${n} ${unit(kind, n)}`, undoable: true },
    )
    onClose()
  }

  function setAt() {
    const v = Number(goto)
    if (goto === '' || !Number.isInteger(v) || v < 0) return
    dispatch(
      {
        type: 'setPosition',
        position: { kind, value: total ? Math.min(v, total) : v },
        at: nowIso(),
      },
      { toast: 'Posição atualizada', undoable: true },
    )
    setGoto('')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={kind === 'page' ? 'Páginas lidas' : 'Capítulos lidos'}
    >
      <p className="mb-3 text-sm text-ink-2">Quanto você leu agora?</p>
      <div className="grid grid-cols-4 gap-2">
        {steps.map((n) => (
          <Button key={n} className="text-lg tabular" onClick={() => add(n)}>
            +{n}
          </Button>
        ))}
      </div>
      <form
        className="mt-6 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setAt()
        }}
      >
        <NumberField
          className="flex-1"
          label={kind === 'page' ? 'Ou: parei na página' : 'Ou: parei no capítulo'}
          min={0}
          max={total}
          value={goto}
          onChange={(e) => setGoto(e.target.value)}
        />
        <Button type="submit" variant="primary">
          Marcar
        </Button>
      </form>
      <button
        type="button"
        className="mt-5 min-h-11 text-sm font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
        onClick={() =>
          dispatch({ type: 'setTrackBy', trackBy: kind === 'page' ? 'chapter' : 'page' })
        }
      >
        Prefiro marcar por {kind === 'page' ? 'capítulo' : 'página'}
      </button>
    </Sheet>
  )
}

function Celebration({
  volume,
  next,
  onDone,
}: {
  volume: number
  next: number | null
  onDone: () => void
}) {
  const reduce = useReducedMotion()
  useEffect(() => {
    const t = window.setTimeout(onDone, reduce ? 1600 : 2400)
    return () => window.clearTimeout(t)
  }, [onDone, reduce])
  return (
    <motion.div
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-40 flex items-center justify-center bg-bg/90 px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onDone}
    >
      <div className="text-center">
        <motion.div
          className="mx-auto w-fit"
          initial={reduce ? false : { scale: 0.85, filter: 'brightness(0.4)' }}
          animate={{
            scale: 1,
            filter: 'brightness(1)',
            transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
          }}
        >
          <Milestone state="done" size={120} />
        </motion.div>
        <motion.p
          className="mt-4 font-display text-[2.5rem] leading-tight font-bold"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.25, duration: 0.36 } }}
        >
          Volume {volume} concluído
        </motion.p>
        <motion.p
          className="mt-2 text-lg text-ember"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.5, duration: 0.3 } }}
        >
          {next ? `Volume ${next} desbloqueado` : 'Você está em dia com a coleção lançada'}
        </motion.p>
      </div>
    </motion.div>
  )
}

export function Hoje() {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const edition = getEdition(state.editionId)
  const [progressOpen, setProgressOpen] = useState(false)
  const [celebrate, setCelebrate] = useState<{ volume: number; next: number | null } | null>(null)
  const now = nowIso()
  const { currentVolume: cur, position, caughtUp } = state.reader
  const total = state.volumes[String(cur)]?.pagesTotal
  const warn = buyWarning(state)
  const endCelebration = useCallback(() => setCelebrate(null), [])
  const days = streak(state, now)
  const ppd = pagesPerDay(state, now)

  function finish() {
    const next = cur < edition.releasedUpTo ? cur + 1 : null
    dispatch(
      { type: 'finishVolume', at: nowIso() },
      { toast: `Volume ${cur} marcado como lido`, undoable: true },
    )
    setCelebrate({ volume: cur, next })
  }

  const pct =
    total && position?.kind === 'page' ? Math.min(100, (position.value / total) * 100) : null

  return (
    <>
      <header className="mb-6">
        <Eyebrow className="mb-1">Hoje</Eyebrow>
        <h1 className="text-title">
          {greeting(new Date())}, {config.readerName}
        </h1>
      </header>

      <ReturningDoubts />
      <LastTime />

      {caughtUp ? (
        <Card className="riveted pt-8">
          <Eyebrow>Em dia</Eyebrow>
          <p className="mt-1 font-display text-[2.5rem] leading-tight font-bold">
            Volume {cur} lido
          </p>
          <p className="mt-2 text-ink-2">
            {edition.releasedUpTo < edition.totalVolumes
              ? `Você leu tudo que já saiu. O volume ${edition.releasedUpTo + 1} vem em breve.`
              : 'Você leu todos os volumes da coleção.'}
          </p>
        </Card>
      ) : (
        <Card className="riveted pt-8" aria-labelledby="lendo-agora">
          <Eyebrow>Lendo agora</Eyebrow>
          <p id="lendo-agora" className="mt-1 font-display text-[3.25rem] leading-none font-bold">
            Volume {cur}
          </p>
          <p className="mt-3 text-lg text-ink-2 tabular" data-testid="position">
            {position
              ? `${position.kind === 'page' ? 'Página' : 'Capítulo'} ${position.value}${total && position.kind === 'page' ? ` de ${total}` : ''}`
              : 'Sem página marcada ainda'}
          </p>
          {pct !== null && (
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-bg"
              role="progressbar"
              aria-label="Progresso no volume"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-ember transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button variant="primary" size="lg" onClick={() => setProgressOpen(true)}>
              <IconPlus size={22} />
              {state.reader.trackBy === 'page' ? 'Páginas lidas' : 'Capítulos lidos'}
            </Button>
            <Button size="lg" onClick={finish}>
              <IconBook size={22} />
              Terminei esse volume
            </Button>
          </div>
          <Link
            to="/jornada"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            Corrigir progresso ou total de páginas
          </Link>
        </Card>
      )}

      {warn && (
        <Card className="mt-4 border-ember/60">
          <Eyebrow>Estante</Eyebrow>
          <p className="mt-1 text-lg font-semibold" data-testid="buy-warning">
            {warn.kind === 'low-pages' &&
              `Faltam ~${warn.pagesLeft} páginas e você não tem o volume ${warn.volume}.`}
            {warn.kind === 'missing-next' &&
              `O volume ${warn.volume} ainda não está na sua estante.`}
            {warn.kind === 'missing-current' &&
              `O volume ${warn.volume} não está marcado como seu na Coleção.`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              to="/colecao"
              className="inline-flex min-h-11 items-center font-semibold text-ember underline underline-offset-4"
            >
              Abrir a coleção
            </Link>
            {warn.kind !== 'missing-current' && <StoreLink />}
          </div>
        </Card>
      )}

      <section
        aria-label="Resumo"
        className="mt-4 grid grid-cols-3 gap-3 rounded-card border border-line bg-surface p-4"
      >
        <Stat label="Lidos" value={finishedCount(state)} />
        <Stat label="Dias seguidos" value={days} />
        <Stat label="Pág./dia" value={ppd === null ? 0 : Math.round(ppd)} />
      </section>

      <ProgressSheet open={progressOpen} onClose={() => setProgressOpen(false)} />
      <AnimatePresence>
        {celebrate && (
          <Celebration volume={celebrate.volume} next={celebrate.next} onDone={endCelebration} />
        )}
      </AnimatePresence>
    </>
  )
}
