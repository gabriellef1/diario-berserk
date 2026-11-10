import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { type Achievement, newAchievements } from '@/domain/achievements'
import { AchievementIcon } from '@/icons/achievements'
import { useDiary } from '@/store/DiaryContext'

const SHOW_MS = 3000

interface Pending {
  achievement: Achievement
  /** Ids marcados como vistos junto com este aviso. */
  ids: string[]
}

/** Anima conquistas recém-desbloqueadas, uma vez. */
export function AchievementWatcher() {
  const { state, dispatch } = useDiary()
  const reduce = useReducedMotion()
  const [current, setCurrent] = useState<Pending | null>(null)

  // Ajuste de estado durante o render (padrão do React): pega a próxima da fila.
  const fresh = state ? newAchievements(state) : []
  const first = fresh[0]
  if (!current && first && state) {
    // Primeiro acesso (nada visto ainda): mostra só a primeira e marca todas,
    // pra não virar avalanche logo depois do onboarding.
    const ids = state.achievementsSeen.length === 0 ? fresh.map((a) => a.id) : [first.id]
    setCurrent({ achievement: first, ids })
  }

  useEffect(() => {
    if (!current) return
    dispatch({ type: 'markAchievementsSeen', ids: current.ids })
    const t = window.setTimeout(() => setCurrent(null), SHOW_MS)
    return () => window.clearTimeout(t)
  }, [current, dispatch])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.achievement.id}
            className="flex w-full max-w-sm items-center gap-3 rounded-card border border-gold/60 bg-raised/95 px-4 py-3 shadow-[0_8px_24px_rgb(0_0_0/0.45)] backdrop-blur"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] } }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.2 } }
                : { opacity: 0, y: -12, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }
            }
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-gold bg-bg text-ember">
              <AchievementIcon kind={current.achievement.icon} size={22} />
            </span>
            <p className="min-w-0 text-sm text-ink-2">
              Conquista desbloqueada:{' '}
              <span className="font-semibold text-ink">{current.achievement.title}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
