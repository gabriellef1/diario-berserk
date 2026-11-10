import { useState } from 'react'
import { config } from '@/config'
import { Button, TextField } from '@/components/ui'
import { nowIso } from '@/domain/dates'
import { useDiary, useDiaryState } from '@/store/DiaryContext'
import { askClaude, getPassword, setPassword, type AskResult } from './claudeClient'

const messages: Record<Exclude<AskResult, { ok: true }>['reason'], string> = {
  senha: 'Senha errada. Confere com a Gabs e tenta de novo.',
  limite: 'Chegou no limite de perguntas de hoje. Amanhã libera de novo.',
  recusa: 'O Claude não respondeu essa. Tenta pelo ChatGPT, logo abaixo.',
  falha: 'Não consegui falar com o Claude agora. Tenta de novo daqui a pouco.',
}

/** Pergunta direto pro Claude, sem sair do diário. Some se não houver endpoint. */
export function AskClaude({ question, doubtId }: { question: string; doubtId?: string }) {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const [password, setPw] = useState(getPassword)
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!config.askUrl) return null

  async function ask(pw: string) {
    setLoading(true)
    setError(null)
    setAnswer(null)
    setSaved(false)
    const result = await askClaude(state, question, pw)
    setLoading(false)
    if (result.ok) {
      setAnswer(result.answer)
      return
    }
    if (result.reason === 'senha') {
      setPassword(null)
      setPw(null)
    }
    setError(messages[result.reason])
  }

  function save() {
    if (!doubtId || !answer) return
    dispatch(
      { type: 'saveGptAnswer', id: doubtId, text: answer, at: nowIso(), source: 'claude' },
      { toast: 'Resposta guardada', undoable: true },
    )
    setSaved(true)
  }

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="claude-title"
      data-testid="ask-claude"
    >
      <h3 id="claude-title" className="font-sans text-base font-semibold tracking-normal text-ink">
        Perguntar ao Claude, aqui mesmo
      </h3>

      {!password ? (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const pw = typed.trim()
            if (!pw) return
            setPassword(pw)
            setPw(pw)
            setTyped('')
            void ask(pw)
          }}
        >
          <TextField
            className="flex-1"
            label="Senha do diário"
            hint="Só na primeira vez. Fica salva neste aparelho."
            type="password"
            autoComplete="current-password"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            className="mb-[1.625rem]"
            disabled={!typed.trim()}
          >
            Entrar
          </Button>
        </form>
      ) : (
        <Button
          variant="primary"
          data-testid="ask-claude-button"
          disabled={loading}
          onClick={() => void ask(password)}
        >
          {loading
            ? 'O Claude está pensando…'
            : answer
              ? 'Perguntar de novo'
              : 'Perguntar ao Claude'}
        </Button>
      )}

      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-sm font-semibold text-blood-text">
            {error}
          </p>
        )}
        {answer && (
          <div className="rounded-control border border-line bg-bg p-3" data-testid="claude-answer">
            <p className="leading-relaxed whitespace-pre-wrap text-ink">{answer}</p>
            <p className="mt-2 text-xs text-ink-2">
              O Claude pode errar. Se ele começar a contar, pare de ler.
            </p>
            {doubtId && (
              <Button className="mt-3" onClick={save} disabled={saved}>
                {saved ? 'Guardada na dúvida' : 'Guardar essa resposta'}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
