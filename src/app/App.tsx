import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { localDay, nowIso } from '@/domain/dates'
import { introKind, introLine, type IntroLine } from '@/domain/intro'
import Atmosphere from '@/features/atmosphere/Atmosphere'
import { Intro } from '@/features/intro/Intro'
import { Colecao } from '@/screens/Colecao'
import { Duvidas } from '@/screens/Duvidas'
import { Hoje } from '@/screens/Hoje'
import { Jornada } from '@/screens/Jornada'
import { Onboarding } from '@/screens/Onboarding'
import { Sobre } from '@/screens/Sobre'
import { Volume } from '@/screens/Volume'
import { useDiary } from '@/store/DiaryContext'
import { DiaryProvider } from '@/store/DiaryProvider'
import { UiContext } from '@/store/UiContext'

// Telas pesadas (html-to-image, página interna) carregam sob demanda.
const Ficha = lazy(() => import('@/screens/Ficha').then((m) => ({ default: m.Ficha })))
const Design = lazy(() => import('@/screens/Design').then((m) => ({ default: m.Design })))

function LoadNotice() {
  const { loadStatus, state } = useDiary()
  if (state || (loadStatus !== 'corrupt' && loadStatus !== 'unavailable')) return null
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 pt-4 sm:px-6">
      <p className="rounded-card border border-blood-text/60 bg-surface p-4 text-sm">
        {loadStatus === 'corrupt'
          ? 'Encontrei dados salvos que não consegui ler. Guardei uma cópia deles. Restaure um backup ou comece de novo.'
          : 'Este navegador está bloqueando o armazenamento. Sem ele, o diário não consegue salvar.'}
      </p>
    </div>
  )
}

function Gate() {
  const { state } = useDiary()
  if (!state) {
    return (
      <>
        <LoadNotice />
        <Onboarding />
      </>
    )
  }
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Hoje />} />
        <Route path="jornada" element={<Jornada />} />
        <Route path="volume/:n" element={<Volume />} />
        <Route path="duvidas" element={<Duvidas />} />
        <Route path="colecao" element={<Colecao />} />
        <Route
          path="ficha"
          element={
            <Suspense fallback={null}>
              <Ficha />
            </Suspense>
          }
        />
        <Route path="sobre" element={<Sobre />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * Decide a entrada UMA vez por abertura da página (não por navegação, nem por
 * volta da aba). Registra no diário antes de animar: pular também conta.
 */
function Shell() {
  const { state, dispatch } = useDiary()
  // Decidida uma vez, no estado inicial da página (o diário carrega síncrono).
  const [intro, setIntro] = useState<{
    kind: 'full' | 'short'
    line: IntroLine
    day: string
  } | null>(() => {
    if (!state) return null
    const day = localDay(nowIso())
    const kind = introKind(state, day)
    if (kind === 'off') return null
    return { kind, line: introLine(state, day), day }
  })
  const registered = useRef(false)

  useEffect(() => {
    if (!intro || registered.current) return
    registered.current = true
    dispatch({ type: 'introShown', day: intro.day, kind: intro.kind })
  }, [intro, dispatch])

  const [revealing, setRevealing] = useState(false)
  const done = useCallback(() => setIntro(null), [])
  const reveal = useCallback(() => setRevealing(true), [])
  const ui = useMemo(
    () => ({ introActive: intro !== null, nameHandoff: intro !== null && revealing }),
    [intro, revealing],
  )
  // Durante a entrada o app fica invisível (o fundo animado continua aparecendo);
  // na saída ele surge por baixo. Pular mostra na hora.
  const hidden = intro !== null && !revealing
  const atmosphere = state?.settings.atmosphere ?? true

  return (
    <UiContext value={ui}>
      <Atmosphere enabled={atmosphere} />
      <div
        className="relative z-[1] transition-opacity duration-[600ms] ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ opacity: hidden ? 0 : 1 }}
        inert={intro !== null}
      >
        <Routes>
          <Route
            path="/design"
            element={
              <Suspense fallback={null}>
                <Design />
              </Suspense>
            }
          />
          <Route path="*" element={<Gate />} />
        </Routes>
      </div>
      {intro && <Intro kind={intro.kind} line={intro.line} onExit={reveal} onDone={done} />}
    </UiContext>
  )
}

export function App() {
  return (
    <DiaryProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </DiaryProvider>
  )
}
