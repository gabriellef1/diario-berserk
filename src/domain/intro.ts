import { config, getEdition } from '@/config'
import type { DiaryState } from './schema'

export type IntroKind = 'full' | 'short' | 'off'

/**
 * Que entrada rodar nesta abertura do app. "Abertura" = carregar a página com
 * diário existente; navegar entre telas ou voltar pra aba não conta.
 */
export function introKind(state: DiaryState, today: string): IntroKind {
  const setting = state.settings.intro
  if (setting === 'off') return 'off'
  if (setting === 'short') return 'short'
  return state.intro.lastFullDay === today ? 'short' : 'full'
}

export interface IntroLine {
  kind: 'anniversary' | 'celebrate' | 'progress'
  text: string
}

/**
 * A linha pequena embaixo do nome. Prioridade: aniversário → volume recém
 * concluído → progresso. Nunca cita conteúdo: só número de volume.
 */
export function introLine(
  state: DiaryState,
  today: string,
  anniversary: { day: string; message: string } = {
    day: config.anniversaryDay,
    message: config.anniversaryMessage,
  },
): IntroLine {
  const message = anniversary.message.trim()
  if (message !== '' && today.slice(5) === anniversary.day) {
    return { kind: 'anniversary', text: message }
  }
  if (state.intro.celebrateVolume !== undefined) {
    return { kind: 'celebrate', text: `volume ${state.intro.celebrateVolume} concluído` }
  }
  const { currentVolume: cur, caughtUp, position } = state.reader
  const edition = getEdition(state.editionId)
  if (caughtUp) {
    return {
      kind: 'progress',
      text:
        edition.releasedUpTo < edition.totalVolumes
          ? `em dia. o volume ${edition.releasedUpTo + 1} vem em breve`
          : 'coleção inteira lida',
    }
  }
  const fresh = cur === 1 && position === null && Object.keys(state.readingLog).length === 0
  if (fresh) return { kind: 'progress', text: 'sua jornada começa aqui' }
  return { kind: 'progress', text: `volume ${cur} te esperando` }
}
