import { useState } from 'react'
import { Link } from 'react-router'
import { getEdition } from '@/config'
import { Button, NumberField, PageHeader, Segmented, Sheet, Stat } from '@/components/ui'
import { nowIso } from '@/domain/dates'
import { isVolumeUnlocked } from '@/domain/gates'
import { avgDaysPerVolume, finishedCount, history, pagesPerDay } from '@/domain/stats'
import { IconChevron, Milestone } from '@/icons'
import { cn } from '@/lib/cn'
import { useDiary, useDiaryState } from '@/store/DiaryContext'

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

function FixProgressSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const edition = getEdition(state.editionId)
  const [volume, setVolume] = useState(String(state.reader.currentVolume))
  const [kind, setKind] = useState<'page' | 'chapter' | 'none'>(state.reader.trackBy)
  const [value, setValue] = useState('')
  const v = Number(volume)
  const validVolume = Number.isInteger(v) && v >= 1 && v <= edition.releasedUpTo

  function apply() {
    if (!validVolume) return
    const n = Number(value)
    const position =
      kind !== 'none' && value !== '' && Number.isInteger(n) && n >= 0 ? { kind, value: n } : null
    dispatch(
      { type: 'jumpTo', volume: v, position, at: nowIso() },
      { toast: `Progresso ajustado pro volume ${v}`, undoable: true },
    )
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Corrigir progresso">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <NumberField
          label="Volume que está lendo"
          min={1}
          max={edition.releasedUpTo}
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          error={validVolume ? undefined : `Escolha de 1 a ${edition.releasedUpTo}.`}
        />
        <Segmented<'page' | 'chapter' | 'none'>
          legend="Marcar por"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'page', label: 'Página' },
            { value: 'chapter', label: 'Capítulo' },
            { value: 'none', label: 'Só o volume' },
          ]}
        />
        {kind !== 'none' && (
          <NumberField
            label={kind === 'page' ? 'Página (opcional)' : 'Capítulo (opcional)'}
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
        <p className="text-sm text-ink-2">
          Se voltar pra um volume anterior, o que você escreveu mais à frente fica escondido até
          você chegar lá de novo.
        </p>
        <Button type="submit" variant="primary" disabled={!validVolume}>
          Salvar progresso
        </Button>
      </form>
    </Sheet>
  )
}

export function Jornada() {
  const state = useDiaryState()
  const edition = getEdition(state.editionId)
  const [fixOpen, setFixOpen] = useState(false)
  const cur = state.reader.currentVolume
  const avg = avgDaysPerVolume(state)
  const ppd = pagesPerDay(state, nowIso())
  const hist = history(state)
  const volumes = Array.from({ length: edition.totalVolumes }, (_, i) => i + 1)
  // Na estrada: os lidos, o atual e o próximo marco. O resto vira grade só com números.
  const trail = volumes.filter((v) => v <= cur + 1)
  const ahead = volumes.filter((v) => v > cur + 1)

  return (
    <>
      <PageHeader
        eyebrow="Jornada"
        title="A estrada até aqui"
        lead={`${plural(finishedCount(state), 'volume lido', 'volumes lidos')} de ${edition.totalVolumes}.`}
      />

      <section
        aria-label="Ritmo"
        className="mb-6 grid grid-cols-2 gap-3 rounded-card border border-line bg-surface p-4"
      >
        <Stat
          label="Dias por volume"
          value={avg === null ? 0 : avg.toFixed(avg < 10 ? 1 : 0).replace('.', ',')}
          hint={avg === null ? 'aparece quando terminar um volume' : 'média'}
        />
        <Stat
          label="Páginas por dia"
          value={ppd === null ? 0 : Math.round(ppd)}
          hint={ppd === null ? 'aparece quando marcar páginas' : 'desde o primeiro registro'}
        />
      </section>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-heading">Marcos</h2>
        <Button variant="ghost" onClick={() => setFixOpen(true)}>
          Corrigir progresso
        </Button>
      </div>

      <ol className="relative" aria-label="Volumes">
        {/* Estrada: decoração atrás da lista semântica. */}
        <span
          aria-hidden="true"
          className="absolute top-6 bottom-6 left-[29px] w-0.5 bg-[repeating-linear-gradient(to_bottom,var(--color-line-strong)_0_10px,transparent_10px_18px)]"
        />
        {trail.map((v) => {
          const done = v < cur || (v === cur && state.reader.caughtUp)
          const current = v === cur && !state.reader.caughtUp
          const locked = !isVolumeUnlocked(v, state)
          const soon = v > edition.releasedUpTo
          const h = hist.find((x) => x.volume === v)
          const status = locked
            ? soon
              ? 'em breve'
              : 'bloqueado'
            : current
              ? 'lendo agora'
              : h?.days !== undefined
                ? `lido em ${plural(h.days, 'dia', 'dias')}`
                : 'lido'
          const content = (
            <>
              <span className="relative z-10 flex size-[60px] shrink-0 items-center justify-center">
                <Milestone
                  state={locked ? 'locked' : done ? 'done' : 'current'}
                  size={locked ? 36 : 48}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block font-display text-2xl leading-7 font-bold',
                    locked && 'text-ink-2',
                  )}
                >
                  Volume {v}
                </span>
                <span
                  className={cn(
                    'block text-sm',
                    current ? 'font-semibold text-ember' : 'text-ink-2',
                  )}
                >
                  {status}
                </span>
              </span>
            </>
          )
          return (
            <li key={v} data-volume={v} data-locked={locked || undefined}>
              {locked ? (
                <div className="flex min-h-14 items-center gap-3 py-1 opacity-80">{content}</div>
              ) : (
                <Link
                  to={`/volume/${v}`}
                  className={cn(
                    'flex min-h-16 w-full items-center gap-3 rounded-card py-1 pr-3 text-left transition-colors duration-150 hover:bg-surface',
                    current && 'bg-surface ring-1 ring-gold/60',
                  )}
                >
                  {content}
                  <IconChevron size={20} className="text-ink-2" />
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {ahead.length > 0 && (
        <section className="mt-6" aria-labelledby="mais-a-frente">
          <h3
            id="mais-a-frente"
            className="mb-3 font-sans text-sm font-semibold tracking-normal text-ink-2"
          >
            Mais à frente
          </h3>
          <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-9" aria-label="Volumes bloqueados">
            {ahead.map((v) => {
              const soon = v > edition.releasedUpTo
              return (
                <li
                  key={v}
                  data-volume={v}
                  data-locked
                  aria-label={`Volume ${v}, ${soon ? 'em breve' : 'bloqueado'}`}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-control border text-sm font-semibold text-ink-2 tabular',
                    soon ? 'border-dashed border-line' : 'border-line bg-surface',
                  )}
                >
                  {v}
                </li>
              )
            })}
          </ul>
          {edition.releasedUpTo < edition.totalVolumes && (
            <p className="mt-2 text-sm text-ink-2">Borda tracejada: volume que ainda não saiu.</p>
          )}
        </section>
      )}

      {fixOpen && <FixProgressSheet open onClose={() => setFixOpen(false)} />}
    </>
  )
}
