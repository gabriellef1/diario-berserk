import { useId, useState } from 'react'
import { Button, Eyebrow } from '@/components/ui'
import { nowIso } from '@/domain/dates'
import { isNoteHidden, visibleNote } from '@/domain/gates'
import { reactions, type Reaction } from '@/domain/schema'
import { IconFlame, ReactionIcon } from '@/icons/reactions'
import { cn } from '@/lib/cn'
import { useDiary, useDiaryState } from '@/store/DiaryContext'
import { TextArea } from './TextArea'

const reactionLabels: Record<Reaction, string> = {
  impacto: 'Impacto',
  arrepio: 'Arrepio',
  risada: 'Risada',
  tensao: 'Tensão',
  tristeza: 'Tristeza',
  brasa: 'Brasa',
}

/** Anotação e reação de um volume (dentro do detalhe na Jornada). */
export function VolumeNotes({ volume }: { volume: number }) {
  const state = useDiaryState()
  // Gate: só a nota que ele pode ver agora.
  const note = visibleNote(state, volume)
  if (isNoteHidden(state, volume)) {
    return (
      <p data-testid="note-hidden" className="mt-6 border-t border-line pt-5 text-sm text-ink-2">
        Você já anotou algo sobre este volume num ponto mais à frente. Aparece quando chegar lá.
      </p>
    )
  }
  // Remonta o formulário quando muda o volume ou a nota salva.
  return <NoteForm key={`${volume}-${note?.updatedAt ?? 'novo'}`} volume={volume} />
}

function NoteForm({ volume }: { volume: number }) {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const note = visibleNote(state, volume)
  const [rating, setRating] = useState<number | undefined>(note?.rating)
  const [reaction, setReaction] = useState<Reaction | undefined>(note?.reaction)
  const [text, setText] = useState(note?.text ?? '')
  const ratingName = useId()
  const headingId = useId()

  const dirty =
    rating !== note?.rating || reaction !== note?.reaction || text.trim() !== (note?.text ?? '')

  function save() {
    const t = text.trim()
    dispatch(
      {
        type: 'saveNote',
        volume,
        ...(rating !== undefined ? { rating } : {}),
        ...(reaction !== undefined ? { reaction } : {}),
        ...(t ? { text: t } : {}),
        at: nowIso(),
      },
      { toast: 'Anotação salva', undoable: true },
    )
  }

  return (
    <form
      data-testid="note-form"
      aria-labelledby={headingId}
      className="mt-8 border-t border-line pt-6"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <Eyebrow>Sua anotação</Eyebrow>
      <h3 id={headingId} className="mt-1 text-2xl">
        O que achou do volume {volume}?
      </h3>

      <fieldset className="mt-5">
        <legend className="mb-1.5 text-sm font-semibold text-ink-2">Nota</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = rating !== undefined && n <= rating
            return (
              <label
                key={n}
                className={cn(
                  'flex size-12 cursor-pointer items-center justify-center rounded-control transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold',
                  on ? 'text-ember' : 'text-ink-2 hover:text-ink',
                )}
              >
                <input
                  type="radio"
                  name={ratingName}
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  aria-label={`Nota ${n} de 5`}
                  className="sr-only"
                />
                <IconFlame size={28} filled={on} />
              </label>
            )
          })}
        </div>
        {rating !== undefined && (
          <button
            type="button"
            className="mt-1 min-h-11 text-sm font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
            onClick={() => setRating(undefined)}
          >
            Tirar a nota
          </button>
        )}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-1.5 text-sm font-semibold text-ink-2">Reação</legend>
        <div className="grid grid-cols-3 gap-2">
          {reactions.map((r) => {
            const label = reactionLabels[r]
            const on = reaction === r
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setReaction(on ? undefined : r)}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 rounded-control border px-2 py-2 text-sm font-semibold transition-colors duration-150',
                  on
                    ? 'border-gold bg-raised text-ink'
                    : 'border-line bg-bg text-ink-2 hover:border-line-strong hover:text-ink',
                )}
              >
                <ReactionIcon reaction={r} size={24} className={on ? 'text-ember' : undefined} />
                {label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <TextArea
        className="mt-5"
        label="Anotação livre"
        placeholder="o que ficou na sua cabeça depois desse volume?"
        maxLength={4000}
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <Button type="submit" variant="primary" className="mt-5 w-full" disabled={!dirty}>
        Salvar anotação
      </Button>
    </form>
  )
}
