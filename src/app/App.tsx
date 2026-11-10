import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { Colecao } from '@/screens/Colecao'
import { Duvidas } from '@/screens/Duvidas'
import { Hoje } from '@/screens/Hoje'
import { Jornada } from '@/screens/Jornada'
import { Onboarding } from '@/screens/Onboarding'
import { Sobre } from '@/screens/Sobre'
import { useDiary } from '@/store/DiaryContext'
import { DiaryProvider } from '@/store/DiaryProvider'

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

export function App() {
  return (
    <DiaryProvider>
      <HashRouter>
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
      </HashRouter>
    </DiaryProvider>
  )
}
