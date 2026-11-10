import { useState } from 'react'
import { getEdition } from '@/config'
import { Button, Card, PageHeader, Segmented, Sheet } from '@/components/ui'
import { formatDate, nowIso } from '@/domain/dates'
import { visibleDoubts } from '@/domain/gates'
import type { Doubt, Mark } from '@/domain/schema'
import { AskWithoutSpoiler } from '@/features/AskWithoutSpoiler'
import { SelectField, TextArea } from '@/features/TextArea'
import { IconQuestion } from '@/icons'
import { useDiary, useDiaryState } from '@/store/DiaryContext'

type Filter = 'open' | 'answered' | 'all'
type Action = 'answer' | 'remind' | 'delete' | 'ask'

function where(mark: Mark) {
  const base = `Feita no volume ${mark.volume}`
  if (mark.position)
    return `${base}, ${mark.position.kind === 'page' ? 'página' : 'capítulo'} ${mark.position.value}`
  if (mark.caughtUp) return `${base}, já no fim`
  return base
}

/** Volumes à frente do atual, pra lembretes. */
function useAheadVolumes() {
  const state = useDiaryState()
  const edition = getEdition(state.editionId)
  const cur = state.reader.currentVolume
  return Array.from({ length: Math.max(0, edition.totalVolumes - cur) }, (_, i) => cur + 1 + i)
}

function NewDoubt() {
  const { dispatch } = useDiary()
  const ahead = useAheadVolumes()
  const [text, setText] = useState('')
  const [remind, setRemind] = useState('')

  function save() {
    const t = text.trim()
    if (!t) return
    const r = Number(remind)
    dispatch(
      {
        type: 'addDoubt',
        id: crypto.randomUUID(),
        text: t,
        ...(remind !== '' && Number.isInteger(r) ? { remindAt: r } : {}),
        at: nowIso(),
      },
      { toast: 'Dúvida guardada', undoable: true },
    )
    setText('')
    setRemind('')
  }

  return (
    <Card>
      <form
        data-testid="doubt-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <TextArea
          label="Sua dúvida"
          hint="Ela fica marcada no ponto em que você está agora."
          placeholder="o que é aquilo que fica aparecendo?"
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {ahead.length > 0 && (
          <SelectField
            label="Lembrar quando eu chegar no volume"
            value={remind}
            onChange={(e) => setRemind(e.target.value)}
          >
            <option value="">Não precisa lembrar</option>
            {ahead.map((v) => (
              <option key={v} value={v}>
                Volume {v}
              </option>
            ))}
          </SelectField>
        )}
        <Button type="submit" variant="primary" disabled={!text.trim()}>
          Guardar dúvida
        </Button>
      </form>
    </Card>
  )
}

function QuickAsk() {
  const [q, setQ] = useState('')
  return (
    <Card className="mt-4" aria-labelledby="quick-ask">
      <h2 id="quick-ask" className="text-heading">
        Perguntar sem spoiler
      </h2>
      <p className="mt-1 text-ink-2">
        Uma pergunta rápida, sem guardar. A gente monta o pedido pro ChatGPT com o ponto onde você
        está.
      </p>
      <TextArea
        className="mt-4"
        label="Sua pergunta"
        placeholder="ex.: por que ele reagiu daquele jeito?"
        maxLength={1000}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim() && (
        <div className="mt-4">
          <AskWithoutSpoiler question={q} />
        </div>
      )}
    </Card>
  )
}

function DoubtItem({ doubt, onAction }: { doubt: Doubt; onAction: (a: Action) => void }) {
  const { dispatch } = useDiary()
  const answered = doubt.status === 'answered'
  return (
    <li
      data-testid="doubt-item"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={
            answered ? 'text-sm font-semibold text-gold' : 'text-sm font-semibold text-blood-text'
          }
        >
          {answered ? 'Respondida' : 'Aberta'}
        </span>
        <span className="text-sm text-ink-2">{where(doubt.mark)}</span>
      </div>
      <p className="text-lg whitespace-pre-wrap text-ink">{doubt.text}</p>
      <p className="text-sm text-ink-2">
        {formatDate(doubt.askedAt)}
        {doubt.remindAt !== undefined && !answered && (
          <span className="text-ember"> · volta no volume {doubt.remindAt}</span>
        )}
      </p>

      {doubt.answer && (
        <div className="rounded-control border border-line bg-bg p-3">
          <p className="text-sm font-semibold text-gold">Sua resposta</p>
          <p className="mt-1 whitespace-pre-wrap text-ink">{doubt.answer.text}</p>
        </div>
      )}
      {doubt.gptAnswer && (
        <div className="rounded-control border border-line bg-bg p-3">
          <p className="text-sm font-semibold text-ink-2">Resposta do ChatGPT que você colou</p>
          <p className="mt-1 whitespace-pre-wrap text-ink-2">{doubt.gptAnswer.text}</p>
        </div>
      )}

      <div className="mt-1 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {answered ? (
          <Button
            onClick={() =>
              dispatch(
                { type: 'reopenDoubt', id: doubt.id },
                { toast: 'Dúvida reaberta', undoable: true },
              )
            }
          >
            Reabrir
          </Button>
        ) : (
          <Button variant="primary" onClick={() => onAction('answer')}>
            Responder
          </Button>
        )}
        <Button onClick={() => onAction('ask')}>Perguntar sem spoiler</Button>
        {!answered && <Button onClick={() => onAction('remind')}>Mudar lembrete</Button>}
        <Button variant="ghost" onClick={() => onAction('delete')}>
          Apagar
        </Button>
      </div>
    </li>
  )
}

function AnswerForm({ doubt, onDone }: { doubt: Doubt; onDone: () => void }) {
  const { dispatch } = useDiary()
  const [text, setText] = useState('')
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        dispatch(
          { type: 'answerDoubt', id: doubt.id, text, at: nowIso() },
          { toast: 'Dúvida respondida', undoable: true },
        )
        onDone()
      }}
    >
      <p className="text-ink-2">{doubt.text}</p>
      <TextArea
        label="A resposta, com suas palavras"
        maxLength={4000}
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit" variant="primary" disabled={!text.trim()}>
        Salvar resposta
      </Button>
    </form>
  )
}

function RemindForm({ doubt, onDone }: { doubt: Doubt; onDone: () => void }) {
  const { dispatch } = useDiary()
  const ahead = useAheadVolumes()
  const initial =
    doubt.remindAt !== undefined && ahead.includes(doubt.remindAt) ? String(doubt.remindAt) : ''
  const [remind, setRemind] = useState(initial)
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        const r = Number(remind)
        dispatch(
          {
            type: 'editDoubt',
            id: doubt.id,
            text: doubt.text,
            ...(remind !== '' && Number.isInteger(r) ? { remindAt: r } : {}),
          },
          {
            toast: remind ? `Volta no volume ${remind}` : 'Lembrete tirado',
            undoable: true,
          },
        )
        onDone()
      }}
    >
      <p className="text-ink-2">{doubt.text}</p>
      {ahead.length > 0 ? (
        <SelectField
          label="Lembrar quando eu chegar no volume"
          value={remind}
          onChange={(e) => setRemind(e.target.value)}
        >
          <option value="">Sem lembrete</option>
          {ahead.map((v) => (
            <option key={v} value={v}>
              Volume {v}
            </option>
          ))}
        </SelectField>
      ) : (
        <p className="text-ink-2">Não tem volume à frente pra lembrar.</p>
      )}
      <Button type="submit" variant="primary">
        Salvar lembrete
      </Button>
    </form>
  )
}

function DeleteConfirm({ doubt, onDone }: { doubt: Doubt; onDone: () => void }) {
  const { dispatch } = useDiary()
  return (
    <>
      <p className="text-ink-2">Essa dúvida e as respostas guardadas nela somem do diário.</p>
      <p className="mt-3 rounded-control border border-line bg-bg p-3 whitespace-pre-wrap text-ink">
        {doubt.text}
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button onClick={onDone}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={() => {
            dispatch(
              { type: 'deleteDoubt', id: doubt.id },
              { toast: 'Dúvida apagada', undoable: true },
            )
            onDone()
          }}
        >
          Apagar
        </Button>
      </div>
    </>
  )
}

const titles: Record<Action, string> = {
  answer: 'Responder',
  remind: 'Mudar lembrete',
  delete: 'Apagar dúvida?',
  ask: 'Perguntar sem spoiler',
}

export function Duvidas() {
  const state = useDiaryState()
  // Gate: tudo que aparece aqui vem de visibleDoubts.
  const doubts = visibleDoubts(state)
  const [filter, setFilter] = useState<Filter>('open')
  const [volume, setVolume] = useState('')
  const [active, setActive] = useState<{ id: string; action: Action } | null>(null)

  const volumes = [...new Set(doubts.map((d) => d.mark.volume))].sort((a, b) => a - b)
  const vol = volume !== '' && volumes.includes(Number(volume)) ? Number(volume) : null
  const shown = doubts.filter(
    (d) => (filter === 'all' || d.status === filter) && (vol === null || d.mark.volume === vol),
  )
  const current = active ? doubts.find((d) => d.id === active.id) : undefined
  const close = () => setActive(null)

  return (
    <>
      <PageHeader
        eyebrow="Dúvidas"
        title="O que ficou no ar"
        lead="Anote as dúvidas no caminho. Cada uma fica presa ao ponto da leitura, sem spoiler."
      />

      <NewDoubt />
      <QuickAsk />

      <section className="mt-8" aria-labelledby="lista-duvidas">
        <h2 id="lista-duvidas" className="text-heading">
          Suas dúvidas
        </h2>

        {doubts.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-card border border-dashed border-line px-4 py-10 text-center">
            <IconQuestion size={36} className="text-ember" />
            <p className="mt-3 font-semibold text-ink">Nenhuma dúvida por enquanto.</p>
            <p className="mt-1 text-ink-2">Quando algo ficar no ar, anota ali em cima.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Segmented<Filter>
                  legend="Mostrar"
                  options={[
                    { value: 'open', label: 'Abertas' },
                    { value: 'answered', label: 'Resolvidas' },
                    { value: 'all', label: 'Todas' },
                  ]}
                  value={filter}
                  onChange={setFilter}
                />
              </div>
              {volumes.length > 1 && (
                <SelectField
                  className="sm:w-48"
                  label="Volume"
                  value={vol === null ? '' : String(vol)}
                  onChange={(e) => setVolume(e.target.value)}
                >
                  <option value="">Todos os volumes</option>
                  {volumes.map((v) => (
                    <option key={v} value={v}>
                      Volume {v}
                    </option>
                  ))}
                </SelectField>
              )}
            </div>

            {shown.length === 0 ? (
              <p className="mt-6 rounded-card border border-dashed border-line px-4 py-8 text-center text-ink-2">
                {filter === 'open'
                  ? 'Nenhuma dúvida aberta aqui. Tudo esclarecido, por enquanto.'
                  : filter === 'answered'
                    ? 'Nenhuma resolvida ainda. Uma hora elas se respondem.'
                    : 'Nada por aqui.'}
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-4">
                {shown.map((d) => (
                  <DoubtItem
                    key={d.id}
                    doubt={d}
                    onAction={(action) => setActive({ id: d.id, action })}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <Sheet
        open={!!current && !!active}
        onClose={close}
        title={active ? titles[active.action] : ''}
      >
        {current && active && (
          <div key={`${current.id}-${active.action}`}>
            {active.action === 'answer' && <AnswerForm doubt={current} onDone={close} />}
            {active.action === 'remind' && <RemindForm doubt={current} onDone={close} />}
            {active.action === 'delete' && <DeleteConfirm doubt={current} onDone={close} />}
            {active.action === 'ask' && (
              <>
                <p className="mb-4 text-ink-2">{current.text}</p>
                <AskWithoutSpoiler question={current.text} doubtId={current.id} onSaved={close} />
              </>
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}
