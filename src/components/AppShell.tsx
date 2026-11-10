import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router'
import { config } from '@/config'
import { AchievementWatcher } from '@/features/AchievementWatcher'
import {
  AppMark,
  IconCandle,
  IconCard,
  IconQuestion,
  IconQuill,
  IconRoad,
  IconShelf,
  IconUndo,
} from '@/icons'
import { cn } from '@/lib/cn'
import { useDiary } from '@/store/DiaryContext'
import { useUi } from '@/store/UiContext'

const nav = [
  { to: '/', label: 'Hoje', icon: IconCandle, end: true },
  { to: '/jornada', label: 'Jornada', icon: IconRoad, end: false },
  { to: '/duvidas', label: 'Dúvidas', icon: IconQuestion, end: false },
  { to: '/colecao', label: 'Coleção', icon: IconShelf, end: false },
  { to: '/ficha', label: 'Ficha', icon: IconCard, end: false },
]

function NavItems({ variant }: { variant: 'bottom' | 'top' }) {
  return (
    <ul className={cn('flex', variant === 'bottom' ? 'justify-around' : 'gap-1')}>
      {nav.map(({ to, label, icon: Icon, end }) => (
        <li key={to} className={variant === 'bottom' ? 'flex-1' : undefined}>
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center rounded-control font-semibold transition-colors duration-150',
                variant === 'bottom'
                  ? 'min-h-14 flex-col gap-0.5 text-xs'
                  : 'min-h-11 gap-2 px-3 text-sm',
                isActive ? 'text-ember' : 'text-ink-2 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={variant === 'bottom' ? 24 : 20} />
                <span>{label}</span>
                {variant === 'bottom' && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-0.5 w-6 rounded-full transition-colors',
                      isActive ? 'bg-ember' : 'bg-transparent',
                    )}
                  />
                )}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function SaveIndicator() {
  const { saveStatus } = useDiary()
  if (saveStatus === 'error') {
    return (
      <p role="alert" className="text-sm font-semibold text-blood-text">
        Não consegui salvar. Faça um backup em Sobre.
      </p>
    )
  }
  return (
    <p className="text-sm text-ink-2" aria-live="polite">
      {saveStatus === 'saved' ? 'Salvo neste aparelho' : ''}
    </p>
  )
}

function ToastHost() {
  const { toast, dismissToast, undo } = useDiary()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(dismissToast, toast.undo ? 8000 : 4000)
    return () => window.clearTimeout(t)
  }, [toast, dismissToast])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
            className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-card border border-line-strong bg-raised py-2 pr-2 pl-4 shadow-[0_8px_24px_rgb(0_0_0/0.5)]"
          >
            <p className="text-sm font-semibold">{toast.message}</p>
            {toast.undo && (
              <button
                type="button"
                onClick={undo}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-ember hover:bg-surface"
              >
                <IconUndo size={18} />
                Desfazer
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AppShell() {
  const { nameHandoff } = useUi()
  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-raised focus:p-3"
      >
        Pular para o conteúdo
      </a>
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-2 sm:px-6">
        <div className="flex items-center gap-3">
          <AppMark size={36} />
          <div>
            <p className="font-display text-xl leading-6 font-bold">
              Diário do{' '}
              {/* O layoutId só existe na passagem da entrada pro cabeçalho: assim o nome
                  voa do centro pra cá, e nunca o contrário. */}
              <motion.span
                key={nameHandoff ? 'handoff' : 'still'}
                layoutId={nameHandoff ? 'reader-name' : undefined}
                className="inline-block"
                transition={{ layout: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
              >
                {config.readerName}
              </motion.span>
            </p>
            <SaveIndicator />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <nav aria-label="Principal" className="hidden md:block">
            <NavItems variant="top" />
          </nav>
          <NavLink
            to="/sobre"
            aria-label="Sobre e backup"
            className={({ isActive }) =>
              cn(
                'inline-flex size-12 items-center justify-center rounded-control transition-colors duration-150',
                isActive ? 'text-ember' : 'text-ink-2 hover:text-ink',
              )
            }
          >
            <IconQuill />
          </NavLink>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-2xl px-4 pt-4 pb-nav sm:px-6 md:pb-16">
        <Outlet />
      </main>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <NavItems variant="bottom" />
      </nav>
      <ToastHost />
      <AchievementWatcher />
    </div>
  )
}
