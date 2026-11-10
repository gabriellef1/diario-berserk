import { getEdition } from '@/config'
import type { DiaryState } from './schema'

/** Onde ele está, em texto pro prompt. Usa o progresso ATUAL, não o da dúvida. */
export function whereAmI(state: DiaryState): string {
  const { currentVolume: v, position, caughtUp } = state.reader
  if (caughtUp) return `Li até o fim do volume ${v}`
  if (!position) return `Estou no volume ${v} (não marquei a página)`
  return `Li até o volume ${v}, ${position.kind === 'page' ? 'página' : 'capítulo'} ${position.value}`
}

/**
 * Prompt pronto pra colar no ChatGPT. Não leva nada da obra além do nome e
 * da edição: só o ponto de leitura dele e a pergunta que ele escreveu.
 */
export function buildPrompt(state: DiaryState, question: string): string {
  const edition = getEdition(state.editionId)
  return [
    `Estou lendo Berserk (edição brasileira ${edition.publisher}, ${edition.name}). ${whereAmI(state)}.`,
    'Não me dê NENHUMA informação de nada que acontece depois desse ponto, nem de forma indireta.',
    'Se a resposta for spoiler, diga só em qual volume isso fica mais claro.',
    `Minha pergunta: ${question.trim()}`,
  ].join(' ')
}
