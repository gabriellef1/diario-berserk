import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { Button, Eyebrow, NumberField } from '@/components/ui'
import { formatDate } from '@/domain/dates'
import { isVolumeUnlocked } from '@/domain/gates'
import { history } from '@/domain/stats'
import { Chapters } from '@/features/Chapters'
import { VolumeNotes } from '@/features/VolumeNotes'
import { IconChevron, Milestone } from '@/icons'
import { useDiary, useDiaryState } from '@/store/DiaryContext'

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** Página de um volume: datas, total de páginas, registro de capítulos e anotação. */
export function Volume() {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const { n } = useParams()
  const volume = Number(n)
  const [pages, setPages] = useState('')

  // Gate: volume à frente não tem página. Volta pra Jornada.
  if (!Number.isInteger(volume) || volume < 1 || !isVolumeUnlocked(volume, state)) {
    return <Navigate to="/jornada" replace />
  }

  const h = history(state).find((x) => x.volume === volume)
  const total = state.volumes[String(volume)]?.pagesTotal
  const current = volume === state.reader.currentVolume && !state.reader.caughtUp
  const done = !current

  function savePages() {
    const v = Number(pages)
    dispatch(
      {
        type: 'setPagesTotal',
        volume,
        pagesTotal: pages === '' || !Number.isInteger(v) || v < 1 ? undefined : v,
      },
      { toast: 'Total de páginas salvo' },
    )
    setPages('')
  }

  return (
    <>
      <Link
        to="/jornada"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-2 hover:text-ink"
      >
        <IconChevron size={18} className="rotate-180" />
        Jornada
      </Link>
      <header className="mb-6 flex items-center gap-4">
        <Milestone state={done ? 'done' : 'current'} size={56} />
        <div>
          <Eyebrow className="mb-0.5">{current ? 'Lendo agora' : 'Lido'}</Eyebrow>
          <h1 className="text-title">Volume {volume}</h1>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-4 rounded-card border border-line bg-surface p-4">
        <div>
          <dt className="text-sm font-semibold text-ink-2">Começou</dt>
          <dd className="mt-0.5 font-semibold">
            {h?.startedAt ? formatDate(h.startedAt) : 'antes do diário'}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-ink-2">Terminou</dt>
          <dd className="mt-0.5 font-semibold">
            {h?.finishedAt ? formatDate(h.finishedAt) : current ? 'lendo agora' : 'antes do diário'}
          </dd>
        </div>
        {h?.days !== undefined && (
          <div>
            <dt className="text-sm font-semibold text-ink-2">Tempo</dt>
            <dd className="mt-0.5 font-semibold">{plural(h.days, 'dia', 'dias')}</dd>
          </div>
        )}
        <div>
          <dt className="text-sm font-semibold text-ink-2">Páginas</dt>
          <dd className="mt-0.5 font-semibold">{total ?? 'não informado'}</dd>
        </div>
      </dl>

      <Chapters volume={volume} />

      <form
        className="mt-8 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          savePages()
        }}
      >
        <NumberField
          className="flex-1"
          label="Total de páginas do volume"
          hint="Opcional. Serve pro aviso de compra e pra barra de progresso."
          min={1}
          value={pages}
          placeholder={total ? String(total) : 'ex.: 224'}
          onChange={(e) => setPages(e.target.value)}
        />
        <Button type="submit" className="mb-[1.625rem]">
          Salvar
        </Button>
      </form>

      <VolumeNotes volume={volume} />
    </>
  )
}
