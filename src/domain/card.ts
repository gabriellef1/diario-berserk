import { collectionPercent } from './collection'
import { visibleDoubts } from './gates'
import type { DiaryState } from './schema'
import { bestStreak, finishedCount, pagesPerDay } from './stats'

export interface CardAttributes {
  /** Páginas por dia. 40+/dia = 99. */
  ritmo: number
  /** Melhor sequência de dias lendo. 30 dias = 99. */
  constancia: number
  /** Dúvidas registradas (só as visíveis). 12 = 99. */
  curiosidade: number
  /** % dos volumes lançados na estante. */
  colecao: number
  geral: number
  volumesLidos: number
}

function scale(value: number, full: number) {
  return Math.max(0, Math.min(99, Math.round((value / full) * 99)))
}

/**
 * Atributos da ficha. Base 40 em cada um: a carta começa "jogável" e sobe
 * com a leitura, sem nunca ficar zerada no primeiro dia.
 */
export function cardAttributes(state: DiaryState, nowIso: string): CardAttributes {
  const lift = (n: number) => Math.min(99, 40 + Math.round(n * 0.6))
  const ritmo = lift(scale(pagesPerDay(state, nowIso) ?? 0, 40))
  const constancia = lift(scale(bestStreak(state), 30))
  const curiosidade = lift(scale(visibleDoubts(state).length, 12))
  const colecao = lift(scale(collectionPercent(state), 100))
  const volumesLidos = finishedCount(state)
  // Geral: média dos quatro + bônus de volumes lidos, teto 99.
  const geral = Math.min(
    99,
    Math.round((ritmo + constancia + curiosidade + colecao) / 4 + Math.min(10, volumesLidos)),
  )
  return { ritmo, constancia, curiosidade, colecao, geral, volumesLidos }
}
