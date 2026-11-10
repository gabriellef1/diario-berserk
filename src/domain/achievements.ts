import { ownedCount } from './collection'
import { visibleDoubts } from './gates'
import type { DiaryState } from './schema'
import { bestStreak, finishedCount } from './stats'

/** Nomes originais, sem citar nada da obra. */
export interface Achievement {
  id: string
  title: string
  description: string
  icon: 'marco' | 'pena' | 'chama' | 'estante' | 'selo' | 'tocha'
  unlocked: (state: DiaryState) => boolean
}

export const achievements: Achievement[] = [
  {
    id: 'primeiro-marco',
    title: 'Primeiro marco',
    description: 'Terminou o primeiro volume no diário.',
    icon: 'marco',
    unlocked: (s) => finishedCount(s) >= 1,
  },
  {
    id: 'cinco-marcos',
    title: 'Estrada longa',
    description: 'Cinco volumes lidos.',
    icon: 'marco',
    unlocked: (s) => finishedCount(s) >= 5,
  },
  {
    id: 'primeira-duvida',
    title: 'Pergunta guardada',
    description: 'Registrou a primeira dúvida.',
    icon: 'pena',
    unlocked: (s) => visibleDoubts(s).length >= 1,
  },
  {
    id: 'duvida-resolvida',
    title: 'Nó desfeito',
    description: 'Respondeu a primeira dúvida com as próprias palavras.',
    icon: 'selo',
    unlocked: (s) => visibleDoubts(s).some((d) => d.status === 'answered'),
  },
  {
    id: 'sete-dias',
    title: 'Chama acesa',
    description: 'Leu 7 dias seguidos.',
    icon: 'chama',
    unlocked: (s) => bestStreak(s) >= 7,
  },
  {
    id: 'trinta-dias',
    title: 'Fogo que não apaga',
    description: 'Leu 30 dias seguidos.',
    icon: 'tocha',
    unlocked: (s) => bestStreak(s) >= 30,
  },
  {
    id: 'estante-5',
    title: 'Estante de pé',
    description: 'Cinco volumes na estante.',
    icon: 'estante',
    unlocked: (s) => ownedCount(s) >= 5,
  },
  {
    id: 'estante-20',
    title: 'Prateleira cheia',
    description: 'Vinte volumes na estante.',
    icon: 'estante',
    unlocked: (s) => ownedCount(s) >= 20,
  },
]

export function unlockedAchievements(state: DiaryState): Achievement[] {
  return achievements.filter((a) => a.unlocked(state))
}

/** Desbloqueadas que ele ainda não viu (pra animar uma vez). */
export function newAchievements(state: DiaryState): Achievement[] {
  return unlockedAchievements(state).filter((a) => !state.achievementsSeen.includes(a.id))
}
