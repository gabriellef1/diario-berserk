import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { config, defaultEditionId, getEdition } from '@/config'
import { ImportBackupButton } from '@/components/BackupControls'
import { Button, Eyebrow, NumberField, Segmented } from '@/components/ui'
import { nowIso } from '@/domain/dates'
import { createState } from '@/domain/state'
import { AppMark, IconCheck } from '@/icons'
import { cn } from '@/lib/cn'
import { useDiary } from '@/store/DiaryContext'

type Track = 'page' | 'chapter' | 'none'

export function Onboarding() {
  const { replace } = useDiary()
  const navigate = useNavigate()
  const edition = getEdition(defaultEditionId)
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [volume, setVolume] = useState(1)
  const [track, setTrack] = useState<Track>('page')
  const [where, setWhere] = useState('')
  const [owned, setOwned] = useState<Set<number>>(new Set([1]))

  const released = Array.from({ length: edition.releasedUpTo }, (_, i) => i + 1)

  function goToCollection() {
    // Sugestão inicial: tem do 1 até o que está lendo.
    setOwned(new Set(released.filter((v) => v <= volume)))
    setStep(2)
  }

  function finish() {
    const value = Number(where)
    const position =
      track !== 'none' && where !== '' && Number.isInteger(value) && value >= 0
        ? { kind: track, value }
        : null
    const state = createState({
      editionId: edition.id,
      currentVolume: volume,
      position,
      owned: [...owned],
      at: nowIso(),
    })
    if (track !== 'none') state.reader.trackBy = track
    replace(state, 'Diário aberto. Boa leitura.')
    void navigate('/', { replace: true })
  }

  function toggle(v: number) {
    setOwned((s) => {
      const n = new Set(s)
      if (n.has(v)) n.delete(v)
      else n.add(v)
      return n
    })
  }

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 8 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -8 },
      }

  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6"
    >
      <div className="mb-8 flex items-center justify-between">
        <AppMark size={44} />
        <p className="text-sm font-semibold text-ink-2" aria-live="polite">
          Passo {step + 1} de 3
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={step}
          {...slide}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          className="flex flex-1 flex-col"
        >
          {step === 0 && (
            <>
              <Eyebrow className="mb-2">Um diário só seu</Eyebrow>
              <h1 className="text-[2.75rem] leading-[3rem]">Olá, {config.readerName}.</h1>
              <p className="mt-4 text-lg text-ink-2">
                Aqui fica até onde você leu, as dúvidas que aparecem no caminho e os volumes que já
                estão na sua estante.
              </p>
              <div className="riveted mt-8 rounded-card border border-line-strong bg-surface px-5 pt-7 pb-5">
                <h2 className="text-heading text-ember">A regra da casa</h2>
                <p className="mt-2">
                  Nada aqui fala da história. Tudo que você escrever fica preso ao volume em que
                  escreveu e só aparece quando você chegar lá.
                </p>
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-10">
                <Button variant="primary" size="lg" onClick={() => setStep(1)}>
                  Começar
                </Button>
                <ImportBackupButton
                  label="Já tenho um backup"
                  onDone={() => void navigate('/', { replace: true })}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-title">Qual volume você está lendo agora?</h1>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button
                  aria-label="Volume anterior"
                  className="size-14 text-2xl"
                  disabled={volume <= 1}
                  onClick={() => setVolume((v) => Math.max(1, v - 1))}
                >
                  −
                </Button>
                <p className="min-w-40 text-center" aria-live="polite">
                  <span className="block text-sm font-semibold text-ink-2">Volume</span>
                  <span className="font-display text-[4rem] leading-none font-bold tabular">
                    {volume}
                  </span>
                </p>
                <Button
                  aria-label="Próximo volume"
                  className="size-14 text-2xl"
                  disabled={volume >= edition.releasedUpTo}
                  onClick={() => setVolume((v) => Math.min(edition.releasedUpTo, v + 1))}
                >
                  +
                </Button>
              </div>
              <div className="mt-10 flex flex-col gap-4">
                <Segmented<Track>
                  legend="Como prefere marcar onde parou?"
                  value={track}
                  onChange={setTrack}
                  options={[
                    { value: 'page', label: 'Página' },
                    { value: 'chapter', label: 'Capítulo' },
                    { value: 'none', label: 'Só o volume' },
                  ]}
                />
                {track !== 'none' && (
                  <NumberField
                    label={
                      track === 'page'
                        ? 'Em que página parou? (opcional)'
                        : 'Em que capítulo parou? (opcional)'
                    }
                    min={0}
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                    placeholder={track === 'page' ? 'ex.: 87' : 'ex.: 5'}
                  />
                )}
              </div>
              <div className="mt-auto flex gap-3 pt-10">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Voltar
                </Button>
                <Button variant="primary" size="lg" className="flex-1" onClick={goToCollection}>
                  Continuar
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-title">Quais volumes já estão na sua estante?</h1>
              <p className="mt-2 text-ink-2">Toque pra marcar. Dá pra mudar depois na Coleção.</p>
              <ul className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-7" aria-label="Volumes">
                {released.map((v) => {
                  const on = owned.has(v)
                  return (
                    <li key={v}>
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`Volume ${v}`}
                        onClick={() => toggle(v)}
                        className={cn(
                          'relative flex h-12 w-full items-center justify-center rounded-control border text-base font-bold tabular transition-colors duration-150',
                          on
                            ? 'border-ember bg-raised text-ink'
                            : 'border-line text-ink-2 hover:border-line-strong',
                        )}
                      >
                        {v}
                        {on && (
                          <IconCheck size={14} className="absolute top-1 right-1 text-ember" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-sm text-ink-2" aria-live="polite">
                {owned.size === 0
                  ? 'Nenhum marcado ainda.'
                  : `${owned.size} ${owned.size === 1 ? 'volume marcado' : 'volumes marcados'}.`}
              </p>
              <div className="mt-auto flex gap-3 pt-10">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button variant="primary" size="lg" className="flex-1" onClick={finish}>
                  Abrir meu diário
                </Button>
              </div>
            </>
          )}
        </motion.section>
      </AnimatePresence>
    </main>
  )
}
