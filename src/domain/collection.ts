import { config, getEdition } from '@/config'
import type { CollectionStatus, DiaryState } from './schema'

export type VolumeShelfStatus = CollectionStatus | 'soon'

export function shelfStatus(state: DiaryState, volume: number): VolumeShelfStatus {
  const edition = getEdition(state.editionId)
  if (volume > edition.releasedUpTo) return 'soon'
  return state.collection[String(volume)]?.status ?? 'no'
}

export function owns(state: DiaryState, volume: number) {
  return state.collection[String(volume)]?.status === 'have'
}

/**
 * Próximo a comprar: o primeiro volume lançado, a partir do que ele está lendo,
 * que ainda não está na estante. É o que trava a leitura dele.
 */
export function nextToBuy(state: DiaryState): number | null {
  const edition = getEdition(state.editionId)
  for (let v = state.reader.currentVolume; v <= edition.releasedUpTo; v++) {
    if (!owns(state, v)) return v
  }
  return null
}

export function ownedCount(state: DiaryState): number {
  const edition = getEdition(state.editionId)
  let have = 0
  for (let v = 1; v <= edition.releasedUpTo; v++) if (owns(state, v)) have++
  return have
}

/** % da coleção sobre volumes já lançados. "Em breve" não conta. */
export function collectionPercent(state: DiaryState): number {
  const edition = getEdition(state.editionId)
  return Math.round((ownedCount(state) / edition.releasedUpTo) * 100)
}

export type BuyWarning =
  | { kind: 'low-pages'; volume: number; pagesLeft: number }
  | { kind: 'missing-next'; volume: number }
  | { kind: 'missing-current'; volume: number }

/** Aviso de compra pra tela Hoje. */
export function buyWarning(state: DiaryState): BuyWarning | null {
  const edition = getEdition(state.editionId)
  const cur = state.reader.currentVolume
  if (state.reader.caughtUp) return null
  if (!owns(state, cur)) return { kind: 'missing-current', volume: cur }
  const next = cur + 1
  if (next > edition.releasedUpTo || owns(state, next)) return null
  const total = state.volumes[String(cur)]?.pagesTotal
  const pos = state.reader.position
  if (total && pos?.kind === 'page') {
    const left = total - pos.value
    if (left <= config.lowPagesWarning) return { kind: 'low-pages', volume: next, pagesLeft: left }
  }
  return { kind: 'missing-next', volume: next }
}
