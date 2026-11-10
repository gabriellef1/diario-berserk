import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui'
import { chapterNumber, type VolumeChapters } from '@/data/chapters/types'
import { chapterViews, loadReadableVolume, type ChapterView } from '@/domain/chapters'
import { nowIso } from '@/domain/dates'
import { isVolumeUnlocked } from '@/domain/gates'
import { TextArea } from '@/features/TextArea'
import { IconCheck, IconChevron, IconLock, IconUndo } from '@/icons'
import { cn } from '@/lib/cn'
import { useDiary, useDiaryState } from '@/store/DiaryContext'

/**
 * Registro de capítulos de um volume. Tudo que aparece aqui vem de
 * chapterViews(): capítulo não lido chega sem resumo (e sem título, se o
 * título entrega algo). Só o volume em andamento tem botões de marcar.
 */
export function Chapters({ volume }: { volume: number }) {
  const state = useDiaryState()
  const [loaded, setLoaded] = useState<{ volume: number; data: VolumeChapters | null } | null>(null)
  const unlocked = isVolumeUnlocked(volume, state)
  const data: VolumeChapters | null | 'loading' =
    loaded?.volume === volume ? loaded.data : 'loading'

  useEffect(() => {
    let alive = true
    void loadReadableVolume(state, volume).then((d) => {
      if (alive) setLoaded({ volume, data: d })
    })
    return () => {
      alive = false
    }
    // Só recarrega se mudar de volume ou se ele destravar: o gate roda em cima dos dados.
  }, [volume, unlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!unlocked) return null
  if (data === 'loading') {
    return <p className="mt-8 text-sm text-ink-2">Abrindo o registro…</p>
  }
  if (data === null) {
    return (
      <p className="mt-8 text-sm text-ink-2">Este volume ainda não tem registro de capítulos.</p>
    )
  }

  const views = chapterViews(state, data)
  const current = volume === state.reader.currentVolume && !state.reader.caughtUp
  const read = views.filter((v) => v.read).length

  return (
    <section className="mt-8" aria-labelledby="capitulos-title" data-testid="chapters">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="capitulos-title" className="text-heading">
          Registro de capítulos
        </h2>
        <p className="text-sm font-semibold text-ink-2 tabular">
          {read} de {views.length}
        </p>
      </div>
      {state.settings.hideSummaries && (
        <p className="mt-2 text-sm text-ink-2">
          Resumos desligados.{' '}
          <Link to="/sobre" className="underline underline-offset-4">
            Ligar em Sobre
          </Link>
          .
        </p>
      )}
      {current && read === 0 && !state.settings.hideSummaries && (
        <p className="mt-2 text-sm text-ink-2">
          Marque até onde leu. O resumo de cada capítulo aparece depois que você passa dele.
        </p>
      )}
      <ol className="mt-4 flex flex-col gap-2">
        {views.map((v, i) => (
          <ChapterItem
            key={v.id}
            view={v}
            index={i}
            volume={volume}
            current={current}
            n={chapterNumber(v.number).n}
            prevN={i > 0 ? chapterNumber(data.chapters[i - 1]?.number ?? '0').n : null}
          />
        ))}
      </ol>
    </section>
  )
}

function ChapterItem({
  view,
  index,
  volume,
  current,
  n,
  prevN,
}: {
  view: ChapterView
  index: number
  volume: number
  current: boolean
  n: number
  prevN: number | null
}) {
  const { dispatch } = useDiary()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const bodyId = useId()
  const label = view.title ?? `Capítulo ${view.number}`

  function mark() {
    dispatch(
      { type: 'markChapter', volume, index, n },
      { toast: `Até o capítulo ${view.number}`, undoable: true },
    )
  }
  function unmark() {
    setOpen(false)
    dispatch(
      { type: 'unmarkChapter', volume, index, prevN },
      { toast: `Capítulo ${view.number} escondido de novo`, undoable: true },
    )
  }

  return (
    <li
      data-testid="chapter"
      data-read={view.read}
      className={cn(
        'rounded-card border px-3 py-2 sm:px-4',
        view.read ? 'border-line bg-surface' : 'border-dashed border-line bg-transparent',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-10 min-w-10 shrink-0 items-center justify-center rounded-control border px-1.5 font-display text-lg font-bold tabular',
            view.read ? 'border-line-strong bg-raised text-ember' : 'border-line text-ink-2',
          )}
        >
          {view.number}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('font-semibold', view.read ? 'text-ink' : 'text-ink-2')}>{label}</p>
          <p className="text-xs font-semibold text-ink-2">
            {view.read ? (view.edited ? 'lido · resumo seu' : 'lido') : 'ainda não lido'}
            {view.needsReview ? ' · resumo em revisão' : ''}
          </p>
        </div>
        {view.read && view.summary !== undefined ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={`${open ? 'Recolher' : 'Ver'} resumo de ${label}`}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-2 hover:text-ink"
          >
            <IconChevron size={20} className={cn('transition-transform', open && 'rotate-90')} />
          </button>
        ) : !view.read ? (
          <IconLock size={18} className="shrink-0 text-ink-2" />
        ) : null}
      </div>

      {view.read && view.summary !== undefined && open && (
        <div id={bodyId} className="mt-3 border-t border-line pt-3" data-testid="chapter-summary">
          {editing ? (
            <SummaryEditor
              view={view}
              volume={volume}
              index={index}
              n={n}
              onDone={() => setEditing(false)}
            />
          ) : (
            <>
              <p className="leading-relaxed whitespace-pre-wrap">{view.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setEditing(true)}>
                  {view.edited ? 'Editar minha versão' : 'Escrever minha versão'}
                </Button>
                {view.edited && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      dispatch(
                        { type: 'resetChapterSummary', id: view.id },
                        { toast: 'Resumo padrão de volta', undoable: true },
                      )
                    }
                  >
                    Voltar ao padrão
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {current && (
        <div className="mt-2 flex justify-end">
          {view.read ? (
            <Button variant="ghost" onClick={unmark} className="min-h-10 text-sm">
              <IconUndo size={16} />
              Não li ainda
            </Button>
          ) : (
            <Button onClick={mark} className="min-h-10 text-sm" data-testid="mark-chapter">
              <IconCheck size={16} />
              Li esse capítulo
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

function SummaryEditor({
  view,
  volume,
  index,
  n,
  onDone,
}: {
  view: ChapterView
  volume: number
  index: number
  n: number
  onDone: () => void
}) {
  const { dispatch } = useDiary()
  const [text, setText] = useState(view.summary ?? '')
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        dispatch(
          {
            type: 'editChapterSummary',
            id: view.id,
            volume,
            index,
            n,
            text,
            at: nowIso(),
          },
          { toast: 'Sua versão salva' },
        )
        onDone()
      }}
    >
      <TextArea
        label="Sua versão do resumo"
        hint="Fica no lugar do padrão. Dá pra voltar depois."
        rows={5}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={!text.trim()}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
