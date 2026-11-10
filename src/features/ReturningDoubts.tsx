import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { getEdition } from '@/config'
import { Button, Eyebrow } from '@/components/ui'
import { nowIso } from '@/domain/dates'
import { returningDoubts } from '@/domain/gates'
import type { Doubt } from '@/domain/schema'
import { useDiary, useDiaryState } from '@/store/DiaryContext'
import { SelectField, TextArea } from './TextArea'

const ease = [0.2, 0.8, 0.2, 1] as const

function ReturningCard({ doubt }: { doubt: Doubt }) {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const edition = getEdition(state.editionId)
  const cur = state.reader.currentVolume
  const [mode, setMode] = useState<'ask' | 'answer' | 'postpone'>('ask')
  const [answer, setAnswer] = useState('')
  const [later, setLater] = useState(String(Math.min(cur + 1, edition.totalVolumes)))
  const ahead = Array.from({ length: edition.totalVolumes - cur }, (_, i) => cur + 1 + i)

  function saveAnswer() {
    if (!answer.trim()) return
    dispatch(
      { type: 'answerDoubt', id: doubt.id, text: answer, at: nowIso() },
      { toast: 'Dúvida respondida', undoable: true },
    )
  }

  function postpone() {
    const v = Number(later)
    if (!Number.isInteger(v) || v <= cur) return
    dispatch(
      { type: 'postponeDoubt', id: doubt.id, remindAt: v },
      { toast: `Volta no volume ${v}`, undoable: true },
    )
  }

  return (
    <>
      <Eyebrow>Uma dúvida voltou</Eyebrow>
      <p className="mt-1 text-lg font-semibold text-ink">
        Você chegou no volume {cur}. Lembra dessa dúvida?
      </p>
      <blockquote className="mt-3 border-l-2 border-ember pl-3 text-lg whitespace-pre-wrap text-ink">
        {doubt.text}
      </blockquote>

      {mode === 'ask' && (
        <>
          <p className="mt-4 text-ink-2">Ela foi respondida?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Button variant="primary" onClick={() => setMode('answer')}>
              Sim, respondida
            </Button>
            <Button
              onClick={() =>
                dispatch(
                  { type: 'doubtNotYet', id: doubt.id },
                  { toast: 'Ela fica na lista de abertas', undoable: true },
                )
              }
            >
              Ainda não
            </Button>
            {ahead.length > 0 && <Button onClick={() => setMode('postpone')}>Adiar</Button>}
          </div>
        </>
      )}

      {mode === 'answer' && (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            saveAnswer()
          }}
        >
          <TextArea
            label="A resposta, com suas palavras"
            maxLength={4000}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setMode('ask')}>Voltar</Button>
            <Button type="submit" variant="primary" disabled={!answer.trim()}>
              Salvar
            </Button>
          </div>
        </form>
      )}

      {mode === 'postpone' && (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            postpone()
          }}
        >
          <SelectField
            label="Lembrar de novo no"
            value={later}
            onChange={(e) => setLater(e.target.value)}
          >
            {ahead.map((v) => (
              <option key={v} value={v}>
                Volume {v}
              </option>
            ))}
          </SelectField>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setMode('ask')}>Voltar</Button>
            <Button type="submit" variant="primary">
              Adiar
            </Button>
          </div>
        </form>
      )}
    </>
  )
}

/** Destaque na tela Hoje: dúvidas que voltaram. */
export function ReturningDoubts() {
  const state = useDiaryState()
  const reduce = useReducedMotion()
  // Gate: returningDoubts já passa por visibleDoubts.
  const doubts = returningDoubts(state)
  if (doubts.length === 0) return null

  return (
    <ul className="mb-4 flex flex-col gap-4" aria-label="Dúvidas que voltaram">
      <AnimatePresence initial>
        {doubts.map((d, i) => (
          <motion.li
            key={d.id}
            data-testid="returning-doubt"
            className="riveted rounded-card border border-ember/70 bg-surface p-4 pt-8 sm:p-5 sm:pt-8"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.32, delay: Math.min(i, 3) * 0.06, ease },
            }}
            exit={{ opacity: 0, transition: { duration: 0.22, ease } }}
          >
            <ReturningCard doubt={d} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
