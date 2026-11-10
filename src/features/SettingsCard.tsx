import { useId } from 'react'
import { Card, Segmented } from '@/components/ui'
import type { Settings } from '@/domain/schema'
import { cn } from '@/lib/cn'
import { useDiary, useDiaryState } from '@/store/DiaryContext'

function Toggle({
  label,
  hint,
  checked,
  onChange,
  testId,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  testId?: string
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-ink-2">{hint}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        data-testid={testId}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold',
          checked ? 'border-ember bg-blood' : 'border-line-strong bg-bg',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5.5 rounded-full bg-ink transition-transform duration-150',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </label>
  )
}

export function SettingsCard() {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const set = (patch: Partial<Settings>) => dispatch({ type: 'setSettings', patch })
  return (
    <Card aria-labelledby="config-title">
      <h2 id="config-title" className="text-heading">
        Configurações
      </h2>
      <div className="mt-4 flex flex-col gap-4">
        <Toggle
          label="Esconder resumos de capítulo"
          hint="Some o resumo de todos os capítulos, lidos ou não."
          checked={state.settings.hideSummaries}
          onChange={(v) => set({ hideSummaries: v })}
          testId="toggle-summaries"
        />
        <Toggle
          label="Fundo animado"
          hint="Brasas e névoa atrás das telas."
          checked={state.settings.atmosphere}
          onChange={(v) => set({ atmosphere: v })}
          testId="toggle-atmosphere"
        />
        <Segmented<Settings['intro']>
          legend="Animação de entrada"
          value={state.settings.intro}
          onChange={(v) => set({ intro: v })}
          options={[
            { value: 'auto', label: 'Automática' },
            { value: 'short', label: 'Sempre curta' },
            { value: 'off', label: 'Desligada' },
          ]}
        />
        <p className="text-sm text-ink-2">
          Automática: a entrada completa roda uma vez por dia e a curta nas outras aberturas.
        </p>
      </div>
    </Card>
  )
}
