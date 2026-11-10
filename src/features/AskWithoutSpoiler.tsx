import { useEffect, useState } from 'react'
import { config } from '@/config'
import { Button } from '@/components/ui'
import { nowIso } from '@/domain/dates'
import { buildPrompt } from '@/domain/prompt'
import { IconCheck, IconExternal } from '@/icons'
import { useDiary, useDiaryState } from '@/store/DiaryContext'
import { AskClaude } from './AskClaude'
import { TextArea } from './TextArea'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback pra navegador sem clipboard API (ou sem permissão).
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    document.body.removeChild(ta)
    return ok
  }
}

/**
 * Ponte pro ChatGPT: monta o prompt sem spoiler, copia e abre o site.
 * Nada de API. Ligado a uma dúvida, deixa colar a resposta recebida.
 */
export function AskWithoutSpoiler({
  question,
  doubtId,
  onSaved,
}: {
  question: string
  doubtId?: string
  onSaved?: () => void
}) {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const [answer, setAnswer] = useState('')
  const prompt = buildPrompt(state, question)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), 2500)
    return () => window.clearTimeout(t)
  }, [copied])

  async function copy() {
    setCopied((await copyText(prompt)) ? 'ok' : 'fail')
  }

  function saveAnswer() {
    if (!doubtId || !answer.trim()) return
    dispatch(
      { type: 'saveGptAnswer', id: doubtId, text: answer, at: nowIso(), source: 'chatgpt' },
      { toast: 'Resposta guardada', undoable: true },
    )
    setAnswer('')
    onSaved?.()
  }

  return (
    <div className="flex flex-col gap-4">
      <AskClaude question={question} doubtId={doubtId} />
      {config.askUrl && (
        <p className="border-t border-line pt-4 text-sm font-semibold text-ink-2">
          Ou pelo ChatGPT:
        </p>
      )}
      <div>
        <p className="mb-1.5 text-sm font-semibold text-ink-2">A pergunta que vai pro ChatGPT</p>
        <p
          data-testid="prompt-text"
          className="rounded-control border border-line bg-bg p-3 text-base leading-relaxed whitespace-pre-wrap text-ink select-all"
        >
          {prompt}
        </p>
      </div>

      <div>
        <Button
          data-testid="copy-prompt"
          variant="primary"
          className="w-full"
          onClick={() => void copy()}
        >
          {copied === 'ok' ? (
            <>
              <IconCheck size={20} />
              Copiado
            </>
          ) : (
            'Copiar pergunta'
          )}
        </Button>
        <p role="status" className="mt-1.5 min-h-5 text-sm text-ember">
          {copied === 'fail' && 'Não deu pra copiar. Segure no texto acima e copie na mão.'}
        </p>
      </div>

      <div>
        <p className="mb-2 rounded-control border border-blood/70 bg-blood/15 px-3 py-2.5 text-sm text-ink">
          O ChatGPT pode errar. Se ele começar a contar, pare de ler.
        </p>
        <a
          data-testid="open-chatgpt"
          href={config.chatgptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-line-strong bg-raised px-4 font-semibold text-ink transition-colors duration-150 hover:border-gold"
        >
          Abrir o ChatGPT
          <IconExternal size={20} />
        </a>
      </div>

      {doubtId && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            saveAnswer()
          }}
        >
          <TextArea
            data-testid="gpt-answer-input"
            label="Colar a resposta que recebeu"
            hint="Fica guardada junto da dúvida."
            maxLength={4000}
            rows={4}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <Button type="submit" disabled={!answer.trim()}>
            Guardar resposta
          </Button>
        </form>
      )}
    </div>
  )
}
